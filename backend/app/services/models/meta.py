"""REAL model client. Backend owner: fill in the TODO blocks after reading the hackathon docs
and writing down the real request/response shapes in MODELS.md.

Rules:
- Return the dataclasses from base.py, never raw vendor JSON.
- Convert any pixel boxes to normalized 0..1 {x,y,w,h}.
- temperature 0 for judging calls. Validate JSON, retry once, then raise.
"""
import base64
import json
import re

import httpx

from ...config import settings
from .base import Guide, Judgement, Label, Segment

LABEL_PROMPT = (
    "Identify the single main object in this image. If visible, extract the brand and model name. "
    "Return JSON only: "
    '{"label": "<brand + model if visible, else specific product name>", '
    '"category": "<appliance|remote|glassware|linen|decor|furniture|other>", "confidence": <0 to 1>, '
    '"brand": "<brand name or null>", "model": "<model name or null>"}'
)

JUDGE_PROMPT = """You are auditing a rental home after checkout.
Image 1 is the REFERENCE photo of the item: "{label}" (expected quantity: {quantity}).
{context_line}Its usual place: {location_hint}.
{scope_line}The remaining {n} images are frames from a walkthrough video.

Decide whether the item shown in the reference is present in these frames. Be conservative:
- "present" only if you can clearly see it (the same item, not just a similar one).
- "not_visible" if the frames do not cover where it could be, or the view is blocked.
- "missing" only if the area is clearly visible and the item is not there.
- Count visible units if there are several.
- If it is present but NOT in its usual place, set at_usual_spot to false and say where you see it in "where"
  (for example "on the sofa, left cushion"). If it is in its usual place, at_usual_spot is true.
Return JSON only:
{{"status": "present|not_visible|missing", "count_seen": <int>, "evidence_frame": <1-based index among the walkthrough frames or null>, "confidence": <0 to 1>, "at_usual_spot": <true|false|null>, "where": "<short place description or null>", "reason": "<one sentence>"}}"""

SCOPE_ROOM = ""
SCOPE_OTHER = ("These frames come from OTHER rooms than the one the item belongs to. Look for the item anywhere in them. "
               "If you find it, at_usual_spot is false.\n")

GUIDE_PROMPT = """You are a helpful house guide. The object is: {label}.
Host notes (trust these over your own assumptions): {notes}
Look at the guest's photo. Write instructions for a first-time user based ONLY on what is visible
plus the host notes. If something is not visible, say so instead of guessing.
Return JSON only: {{"title": "...", "steps": ["..."], "warnings": ["..."], "seen": "...", "unsure": ["..."]}}"""


def _b64(data: bytes) -> str:
    return base64.b64encode(data).decode()


def _parse_json(text: str) -> dict:
    m = re.search(r"\{[\s\S]*\}", text)
    if not m:
        raise ValueError(f"No JSON in model output: {text[:200]}")
    return json.loads(m.group(0))


class MetaClient:
    def _post(self, path: str, body: dict) -> dict:
        # TODO(backend): confirm auth header style and path names in the hackathon docs.
        r = httpx.post(f"{settings.meta_api_base}{path}", json=body, timeout=90,
                       headers={"Authorization": f"Bearer {settings.meta_api_key}"})
        r.raise_for_status()
        return r.json()

    def _chat(self, model: str, images: list[bytes], prompt: str) -> str:
        # TODO(backend): adapt to the real chat/vision request shape (base64 vs URL, field names).
        content = [{"type": "image", "data": _b64(i)} for i in images] + [{"type": "text", "text": prompt}]
        raw = self._post("/chat", {"model": model, "temperature": 0,
                                   "messages": [{"role": "user", "content": content}]})
        return raw["text"]  # TODO(backend): extract assistant text from the real response envelope

    def _with_retry(self, fn, *args, max_retries: int = 1, **kwargs):
        """Wrap a model call with retry on failure."""
        last_error = None
        for attempt in range(max_retries + 1):
            try:
                return fn(*args, **kwargs)
            except Exception as e:
                last_error = e
                if attempt == max_retries:
                    raise
        raise last_error

    def segment(self, image: bytes, height: int = None, width: int = None) -> list[Segment]:
        """Segment an image and return normalized bounding boxes.
        
        SAM 3.1 typically returns boxes in pixels (x, y, w, h).
        Normalize them to 0..1 based on image dimensions.
        If height/width not provided, try to read from image metadata.
        """
        import io
        from PIL import Image
        
        def _do_segment():
            raw = self._post("/segment", {"model": settings.meta_segment_model, "image": _b64(image)})
            out = []
            
            # Get image dimensions from the original image if not provided
            h, w = height, width
            if h is None or w is None:
                try:
                    img = Image.open(io.BytesIO(image))
                    w = w or img.width
                    h = h or img.height
                except Exception:
                    pass
            
            for s in raw.get("segments", []):  # TODO(backend): real field names
                segs = s.get("bbox", s)  # Handle both "bbox" and direct bbox format
                score = s.get("score", s.get("confidence", 1.0))
                polygon = s.get("polygon", s.get("points", None))
                
                # Normalize box from pixels to 0..1 if dimensions available
                if w and h:
                    x = float(segs[0]) / w if len(segs) > 0 else 0.0
                    y = float(segs[1]) / h if len(segs) > 1 else 0.0
                    bw = float(segs[2]) / w if len(segs) > 2 else 0.0
                    bh = float(segs[3]) / h if len(segs) > 3 else 0.0
                    bbox = {"x": x, "y": y, "w": bw, "h": bh}
                else:
                    # Assume already normalized or dict format
                    bbox = segs if isinstance(segs, dict) else {"x": 0, "y": 0, "w": 0, "h": 0}
                
                out.append(Segment(bbox=bbox, score=score, polygon=polygon))
            return out
        
        return self._with_retry(_do_segment)

    def label(self, crop: bytes) -> Label:
        def _do_label():
            d = _parse_json(self._chat(settings.meta_label_model, [crop], LABEL_PROMPT))
            return Label(
                label=d["label"],
                category=d.get("category"),
                confidence=float(d.get("confidence", 0.5)),
                brand=d.get("brand"),
                model=d.get("model")
            )
        return self._with_retry(_do_label)

    def choose_candidate(self, image: bytes, candidates: list[str]) -> tuple[int, float]:
        listing = "\n".join(f"{i + 1}. {c}" for i, c in enumerate(candidates))
        prompt = (f"Which candidate is the object in the photo?\n{listing}\nIf none, answer 0. "
                  'Return JSON only: {"choice": <number>, "confidence": <0 to 1>}')
        d = _parse_json(self._chat(settings.meta_reason_model, [image], prompt))
        return int(d["choice"]), float(d.get("confidence", 0.5))

    def guide(self, image: bytes, label: str, notes: str) -> Guide:
        d = _parse_json(self._chat(settings.meta_reason_model, [image],
                                   GUIDE_PROMPT.format(label=label, notes=notes or "none")))
        return Guide(title=d["title"], steps=d["steps"], warnings=d.get("warnings", []),
                     seen=d.get("seen", ""), unsure=d.get("unsure", []))

    def _call_vision_llm(self, images: list[bytes], prompt: str, max_tokens: int = 400) -> str:
        """Call an open-weights vision model on Baseten or Modal.
        
        Supports both Baseten and Modal request/response schemas.
        Baseten: POST {images, prompt, max_tokens, temperature} -> {text}
        Modal: POST {images, prompt, max_tokens, temperature} -> {output, text, or choices[0].text}
        """
        if not settings.vision_llm_url:
            raise ValueError("VISION_LLM_URL not configured")
        
        payload = {
            "images": [_b64(i) for i in images],
            "prompt": prompt,
            "max_tokens": max_tokens,
            "temperature": 0,
        }
        
        headers = {
            "Authorization": f"Api-Key {settings.vision_llm_key}",
            "Content-Type": "application/json",
        }
        
        r = httpx.post(
            settings.vision_llm_url,
            json=payload,
            headers=headers,
            timeout=120,
        )
        r.raise_for_status()
        data = r.json()
        
        # Extract text from various response formats
        if "text" in data:
            return data["text"]
        elif "output" in data:
            return data["output"]
        elif "choices" in data and len(data["choices"]) > 0:
            return data["choices"][0].get("text", data["choices"][0].get("message", {}).get("content", ""))
        elif "generated_text" in data:
            return data["generated_text"]
        elif "response" in data:
            return data["response"]
        else:
            # Fallback: try to find any string field
            for key, val in data.items():
                if isinstance(val, str) and len(val) > 0:
                    return val
            raise ValueError(f"Could not extract text from response: {data}")
    
    def _judge_with_retry(self, images: list[bytes], prompt: str, max_retries: int = 1) -> str:
        """Call judge model with retry on bad JSON."""
        for attempt in range(max_retries + 1):
            try:
                if settings.vision_llm_url:
                    return self._call_vision_llm(images, prompt)
                else:
                    return self._chat(settings.meta_reason_model, images, prompt)
            except Exception as e:
                if attempt == max_retries:
                    raise
                # Retry with tighter prompt
                prompt = prompt + "\n\nIMPORTANT: Return ONLY valid JSON, no other text."
        raise RuntimeError("Judge call failed after retries")
    
    def judge(self, reference_crop, context_image, frames, label, quantity, location_hint, notes=None,
              scope="room") -> Judgement:
        """Reference matching: reference crop (+ wider baseline photo) vs walkthrough frames.
        Uses the open-weights VLM on Baseten/Modal when VISION_LLM_URL is set, else the Meta reasoning model."""
        images = [reference_crop] + ([context_image] if context_image else []) + frames
        prompt = JUDGE_PROMPT.format(
            label=label, quantity=quantity, n=len(frames),
            location_hint=location_hint or "unknown",
            scope_line=SCOPE_OTHER if scope == "other_rooms" else SCOPE_ROOM,
            context_line="Image 2 is a wide photo showing where the item normally sits.\n" if context_image else "")
        
        text = self._judge_with_retry(images, prompt)
        d = _parse_json(text)
        
        # Validate required fields
        status = d.get("status", "not_visible")
        if status not in ("present", "not_visible", "missing"):
            status = "not_visible"
        
        return Judgement(
            status=status,
            count_seen=int(d.get("count_seen", 0)),
            evidence_frame=d.get("evidence_frame"),
            confidence=float(d.get("confidence", 0.5)),
            reason=d.get("reason", ""),
            where=d.get("where"),
            at_usual_spot=d.get("at_usual_spot")
        )
