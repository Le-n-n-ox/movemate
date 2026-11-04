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
from .base import Guide, Judgement, Label, ListedObject, Segment, Verification

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


def _extract_text(raw: dict) -> str:
    """Extract assistant text from the /v1/responses response envelope.

    Output items can be:
    - type "message": content array with output_text items
    - type "reasoning": summary array with summary_text items
    """
    parts: list[str] = []
    for item in raw.get("output", []):
        if item.get("type") == "message":
            for content in item.get("content", []):
                if content.get("type") == "output_text":
                    parts.append(content.get("text", ""))
        elif item.get("type") == "reasoning":
            for summary in item.get("summary", []):
                if summary.get("type") == "summary_text":
                    parts.append(summary.get("text", ""))
    return "\n".join(parts).strip()




LIST_OBJECTS_PROMPT = (
    "List every distinct, guest-relevant or host-relevant object in this photo. "
    "Ignore walls, floors, fabric patterns, shadows and generic textures. "
    "Name items specifically with at most 4 words, colour first only when it distinguishes items, for example \"black TV remote\", \"orange cushion\", \"Bible\". "
    'Return JSON only: an array of {"name": "...", "description": "...", "count": 1, "size": "small|medium|large"}. '
    "If none, return []."
)

VERIFY_PROMPT = (
    "Does the crop show the named object? If not, suggest a better name. Return JSON only: {\"matches\": true|false, \"better_name\": \"short name or null\", \"confidence\": <0 to 1>}"
)


def _clamp01(v):
    return max(0.0, min(1.0, float(v)))


def _points_to_bbox(points, image_w, image_h):
    """Derive normalized bbox from mask/polygon points (preferred over trusting polygon)."""
    pts = []
    if isinstance(points, dict):
        # mask as {x:..., y:...} single point not useful
        return None
    if not isinstance(points, (list, tuple)):
        return None
    for pt in points:
        if isinstance(pt, (list, tuple)) and len(pt) >= 2:
            pts.append((float(pt[0]), float(pt[1])))
        elif isinstance(pt, dict) and "x" in pt and "y" in pt:
            pts.append((float(pt["x"]), float(pt["y"])))
    if not pts:
        return None
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    # pixel if any coord > 1.5, else normalized
    if max(max(xs), max(ys)) > 1.5:
        x0, x1 = min(xs), max(xs)
        y0, y1 = min(ys), max(ys)
        return {"x": _clamp01(x0 / image_w), "y": _clamp01(y0 / image_h),
                "w": _clamp01((x1 - x0) / image_w), "h": _clamp01((y1 - y0) / image_h)}
    return {"x": _clamp01(min(xs)), "y": _clamp01(min(ys)),
            "w": _clamp01(max(xs) - min(xs)), "h": _clamp01(max(ys) - min(ys))}


def _vals_to_xywh(vals, image_w, image_h, fmt=None):
    """vals are 4 numbers. fmt: xywh|xyxy|None. None assumes xywh (legacy SAM prompt)."""
    v = [float(x) for x in vals]
    if len(v) != 4:
        return None
    is_norm = max(v) <= 1.5 and min(v) >= -0.01
    if fmt == "xyxy":
        if is_norm:
            x0, y0, x1, y1 = v
            return {"x": _clamp01(x0), "y": _clamp01(y0), "w": _clamp01(x1 - x0), "h": _clamp01(y1 - y0)}
        x0, y0, x1, y1 = v
        return {"x": _clamp01(x0 / image_w), "y": _clamp01(y0 / image_h),
                "w": _clamp01((x1 - x0) / image_w), "h": _clamp01((y1 - y0) / image_h)}
    # xywh default, but model sometimes returns xyxy in same slot.
    # If xywh interpretation would overflow the image, reinterpret as xyxy.
    if is_norm:
        if v[0] + v[2] > 1.05 or v[1] + v[3] > 1.05:
            # try xyxy normalized
            if v[2] > v[0] and v[3] > v[1]:
                return {"x": _clamp01(v[0]), "y": _clamp01(v[1]), "w": _clamp01(v[2] - v[0]), "h": _clamp01(v[3] - v[1])}
        return {"x": _clamp01(v[0]), "y": _clamp01(v[1]), "w": _clamp01(v[2]), "h": _clamp01(v[3])}
    if v[0] + v[2] > image_w * 1.02 or v[1] + v[3] > image_h * 1.02:
        if v[2] <= image_w and v[3] <= image_h and v[2] > v[0] and v[3] > v[1]:
            return {"x": _clamp01(v[0] / image_w), "y": _clamp01(v[1] / image_h),
                    "w": _clamp01((v[2] - v[0]) / image_w), "h": _clamp01((v[3] - v[1]) / image_h)}
    return {"x": _clamp01(v[0] / image_w), "y": _clamp01(v[1] / image_h),
            "w": _clamp01(v[2] / image_w), "h": _clamp01(v[3] / image_h)}



def _batch_is_xyxy(raw_boxes, image_w, image_h):
    """Decide if a whole response batch is xyxy instead of xywh.

    Model flips format nondeterministically. If any box interpreted as xywh
    would overflow the image, the batch is almost certainly xyxy.
    """
    if not raw_boxes or not image_w or not image_h:
        return False
    for s in raw_boxes:
        if not isinstance(s, dict):
            continue
        b = s.get("bbox")
        if not (isinstance(b, (list, tuple)) and len(b) == 4 and all(isinstance(x, (int, float)) for x in b)):
            continue
        x, y, w, h = [float(v) for v in b]
        if max(b) <= 1.5:
            continue  # normalized, handled per-box
        if x + w > image_w * 1.02 or y + h > image_h * 1.02:
            return True
    return False

def to_normalized_bbox(raw, image_w, image_h):
    """Convert any received box format to normalized 0..1 {x,y,w,h}; None if invalid.

    Supports: xyxy pixels, xywh pixels, normalized xyxy, normalized xywh,
    mask/polygon/points derived (preferred, clamped to image).
    Dicts may carry format hints: {"format": "xyxy"|"xywh"} or x1/y1/x2/y2 keys.
    Lists are treated as xywh (the format our prompt requests).
    """
    if raw is None or not image_w or not image_h:
        return None
    try:
        if isinstance(raw, dict):
            # mask-derived first
            for key in ("mask", "polygon", "points"):
                if key in raw and raw[key] is not None:
                    b = _points_to_bbox(raw[key], image_w, image_h)
                    if b is not None:
                        return b
            if any(k in raw for k in ("x1", "y1", "x2", "y2", "xmin", "ymin", "xmax", "ymax")):
                x0 = raw.get("x1", raw.get("xmin"))
                y0 = raw.get("y1", raw.get("ymin"))
                x1 = raw.get("x2", raw.get("xmax"))
                y1 = raw.get("y2", raw.get("ymax"))
                if None in (x0, y0, x1, y1):
                    return None
                return _vals_to_xywh([x0, y0, x1, y1], image_w, image_h, fmt="xyxy")
            if all(k in raw for k in ("x", "y", "w", "h")):
                fmt = str(raw.get("format", "")).lower() or None
                return _vals_to_xywh([raw["x"], raw["y"], raw["w"], raw["h"]], image_w, image_h, fmt=fmt)
            if "bbox" in raw:
                b = raw["bbox"]
                fmt = str(raw.get("format", "")).lower() or None
                if isinstance(b, (list, tuple)) and fmt in ("xyxy", "xywh"):
                    return _vals_to_xywh(list(b), image_w, image_h, fmt=fmt)
                return to_normalized_bbox(b, image_w, image_h)
            return None
        if isinstance(raw, (list, tuple)):
            # list of points (mask) vs 4 numbers
            if len(raw) == 4 and all(isinstance(x, (int, float)) for x in raw):
                return _vals_to_xywh(list(raw), image_w, image_h, fmt="xywh")
            b = _points_to_bbox(raw, image_w, image_h)
            return b
    except Exception:
        return None
    return None

def _debug_sanitize(obj):
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if k == "image_url" and isinstance(v, str) and v.startswith("data:"):
                out[k] = f"data:image/jpeg;base64,<{len(v)} chars redacted>"
            elif k.lower() in ("authorization", "api_key", "apikey", "key"):
                out[k] = "<redacted>"
            else:
                out[k] = _debug_sanitize(v)
        return out
    if isinstance(obj, list):
        return [_debug_sanitize(x) for x in obj]
    return obj


def _save_segment_debug(image, request_body, raw_response, segments):
    """BASELINE_DEBUG=true: save model image, sanitized request/response, overlay."""
    import hashlib as _h
    from pathlib import Path as _P
    if not settings.baseline_debug:
        return None
    try:
        from PIL import Image, ImageDraw, ImageFont
    except Exception:
        return None
    digest = _h.sha1(image or b"").hexdigest()[:16]
    base = _P(settings.data_dir) / "debug" / digest
    base.mkdir(parents=True, exist_ok=True)
    (base / "model_image.jpg").write_bytes(image or b"")
    (base / "request.json").write_text(json.dumps(_debug_sanitize(request_body or {}), indent=2), encoding="utf-8")
    (base / "response.json").write_text(json.dumps(_debug_sanitize(raw_response or {}), indent=2), encoding="utf-8")
    try:
        import io as _io
        img = Image.open(_io.BytesIO(image)).convert("RGB")
        W, H = img.size
        draw = ImageDraw.Draw(img)
        colors = [(255,0,0),(0,255,0),(0,128,255),(255,255,0),(255,0,255),(0,255,255),(255,128,0),(128,255,0)]
        try:
            font = ImageFont.load_default()
        except Exception:
            font = None
        for i, s in enumerate(segments or []):
            b = s.bbox if isinstance(s, dict) else getattr(s, "bbox", {})
            score = s.get("score", 0) if isinstance(s, dict) else getattr(s, "score", 0)
            if not b:
                continue
            x0, y0 = float(b.get("x", 0)) * W, float(b.get("y", 0)) * H
            x1, y1 = x0 + float(b.get("w", 0)) * W, y0 + float(b.get("h", 0)) * H
            col = colors[i % len(colors)]
            draw.rectangle([x0, y0, x1, y1], outline=col, width=4)
            label_txt = f"#{i} {score:.2f}"
            draw.rectangle([x0, max(0, y0-20), x0+len(label_txt)*7, y0], fill=col)
            draw.text((x0+2, max(0, y0-18)), label_txt, fill=(0,0,0), font=font)
        img.save(base / "overlay.jpg", "JPEG", quality=88)
    except Exception:
        pass
    return str(base)

class MetaClient:
    def _post(self, path: str, body: dict) -> dict:
        r = httpx.post(f"{settings.meta_api_base}{path}", json=body, timeout=90,
                       headers={"Authorization": f"Bearer {settings.meta_api_key}"})
        r.raise_for_status()
        return r.json()

    def _chat(self, model: str, images: list[bytes], prompt: str) -> str:
        """Send images + prompt to /v1/responses.

        Images are sent as structured ``input_image`` content parts (the format
        the gateway requires); the prompt is an ``input_text`` part. Inlining
        base64 into the text field is rejected by vision-capable models here.
        """
        content = []
        for img in images or []:
            content.append({"type": "input_image", "image_url": f"data:image/jpeg;base64,{_b64(img)}"})
        content.append({"type": "input_text", "text": prompt})
        raw = self._post("/responses", {"model": model,
                                       "input": [{"role": "user", "content": content}]})
        return _extract_text(raw)

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

    def segment(self, image: bytes, height: int = None, width: int = None, prompts: list[str] | None = None) -> list[Segment]:
        """Segment an image and return normalized bounding boxes.

        SAM 3.1 typically returns boxes in pixels (x, y, w, h).
        Normalize them to 0..1 based on image dimensions.
        If height/width not provided, try to read from image metadata.
        """
        import io
        from PIL import Image

        def _do_segment():
            # SAM 3.1 segments from a text prompt; send one with the image.
            # With prompts (two-stage), ask for exactly that named object; else generic.
            if prompts:
                names = ", ".join(prompts)
                sam_prompt = (f"Detect and segment only: {names}. "
                              "Return JSON only: an array of objects "
                              '{"label": "...", "bbox": [x, y, w, h], "score": 0.9} '
                              "where bbox is in PIXELS (x, y, width, height) relative to the image. If none, return [].")
            else:
                sam_prompt = ("Detect and segment all household items in this image "
                              "(appliances, remotes, glasses, lamps, and similar). "
                              "Return JSON only: an array of objects "
                              '{"label": "...", "bbox": [x, y, w, h], "score": 0.9} '
                              "where bbox is in PIXELS (x, y, width, height). If none, return [].")
            content = [{"type": "input_image", "image_url": f"data:image/jpeg;base64,{_b64(image)}"},
                       {"type": "input_text", "text": sam_prompt}]
            _req_body = {"model": settings.meta_segment_model,
                                            "input": [{"role": "user", "content": content}]}
            raw = self._post("/responses", _req_body)
            text = _extract_text(raw)
            if not re.search(r"\[[\s\S]*\]", text):
                # SAM returned no boxes; fall back to the vision model to detect items.
                content = [{"type": "input_image", "image_url": f"data:image/jpeg;base64,{_b64(image)}"},
                           {"type": "input_text", "text": ("Identify each distinct object in this image and return its "
                                                          "bounding box. Return JSON only: an array of objects "
                                                          '{"label": "...", "bbox": [x, y, w, h], "score": 0.9} '
                                                          "where bbox is in PIXELS (x, y, width, height) relative "
                                                          "to the image. If none, return [].")}]
                raw = self._post("/responses", {"model": settings.meta_reason_model,
                                                "input": [{"role": "user", "content": content}]})
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

            # Extract segments from the response text
            text = _extract_text(raw)
            m = re.search(r"\[[\s\S]*\]", text)
            if m:
                try:
                    segs = json.loads(m.group(0))
                    _batch_xyxy = _batch_is_xyxy(segs, w, h) if w and h else False
                    for s in segs:
                        if not isinstance(s, dict):
                            continue
                        # Prefer mask-derived box; to_normalized_bbox handles all formats.
                        if _batch_xyxy and isinstance(s.get("bbox"), (list, tuple)):
                            s = {**s, "format": "xyxy"}
                        bbox = to_normalized_bbox(s, w, h) if w and h else to_normalized_bbox(s.get("bbox", s), w or 1, h or 1)
                        if bbox is None:
                            continue
                        score = float(s.get("score", s.get("confidence", 1.0)))
                        lbl = s.get("label") or (prompts[0] if prompts else None)
                        out.append(Segment(bbox=bbox, score=score, polygon=s.get("polygon", s.get("points", None)), label=lbl))
                except (json.JSONDecodeError, IndexError, TypeError, ValueError):
                    pass
            if settings.baseline_debug:
                try:
                    _save_segment_debug(image, _req_body, raw, out)
                except Exception:
                    pass
            return out

        return self._with_retry(_do_segment)


    def list_objects(self, image: bytes) -> list[ListedObject]:
        def _do():
            text = self._chat(settings.meta_reason_model, [image], LIST_OBJECTS_PROMPT)
            m = re.search(r"\[[\s\S]*\]", text)
            if not m:
                return []
            try:
                data = json.loads(m.group(0))
            except Exception:
                return []
            if isinstance(data, dict):
                data = data.get("items") or data.get("objects") or []
            out = []
            for d in data if isinstance(data, list) else []:
                if not isinstance(d, dict):
                    continue
                name = d.get("name") or d.get("label")
                if not name:
                    continue
                try:
                    cnt = int(d.get("count", 1))
                except Exception:
                    cnt = 1
                size = str(d.get("size", "medium")).lower()
                if size not in ("small", "medium", "large"):
                    size = "medium"
                fr = d.get("frames") or d.get("frame_numbers") or []
                out.append(ListedObject(name=str(name), description=str(d.get("description", "")),
                                        count=max(1, cnt), size=size, category=d.get("category"), frames=[int(x) for x in fr] if isinstance(fr, list) else []))
            return out
        return self._with_retry(_do)

    def list_objects_video(self, frames, context: str = "") -> list[ListedObject]:
        def _do():
            ctx = context or "one area"
            prompt = (
                f"Context: {ctx}. These {len(frames)} frames are from ONE continuous video of ONE area, from different angles. "
                "List every distinct physical object ONCE. If an object appears in several frames, list it once. "
                "Give a short canonical name (at most 4 words), the count of identical items, a short visual description (color, material, size), and the frame numbers (0-based, as sent) where it is clearly visible. "
                "Do not list walls, floors, ceilings, windows, or fixtures that cannot be moved. Return strict JSON only."
            )
            text = self._chat(settings.meta_reason_model, list(frames), prompt)
            m = re.search(r"\[[\s\S]*\]", text)
            if not m:
                return []
            try:
                data = json.loads(m.group(0))
            except Exception:
                return []
            if isinstance(data, dict):
                data = data.get("items") or data.get("objects") or []
            out = []
            for d in data if isinstance(data, list) else []:
                if not isinstance(d, dict) or not (d.get("name") or d.get("label")):
                    continue
                try: cnt = int(d.get("count", 1))
                except Exception: cnt = 1
                fr = d.get("frames") or d.get("frame_numbers") or []
                out.append(ListedObject(name=str(d.get("name") or d.get("label")), description=str(d.get("description", "")), count=max(1, cnt), size=str(d.get("size", "medium")).lower() if str(d.get("size", "medium")).lower() in ("small","medium","large") else "medium", category=d.get("category"), frames=[int(x) for x in fr] if isinstance(fr, list) else []))
            return out
        return self._with_retry(_do)

    def same_object(self, crop_a: bytes, crop_b: bytes) -> bool:
        def _do():
            d = _parse_json(self._chat(settings.meta_reason_model, [crop_a, crop_b], "Are these the same physical object? Return JSON only: {\"same\": true|false}"))
            return bool(d.get("same", False))
        try:
            return self._with_retry(_do)
        except Exception:
            return False

    def verify_crop(self, crop: bytes, name: str) -> Verification:
        def _do():
            prompt = "Named object: " + name + ". " + VERIFY_PROMPT
            d = _parse_json(self._chat(settings.meta_reason_model, [crop], prompt))
            bn = d.get("better_name")
            return Verification(matches=bool(d.get("matches", False)), better_name=str(bn) if bn else None, confidence=float(d.get("confidence", 0.5)))
        return self._with_retry(_do)

    def name_main_object(self, image: bytes) -> str:
        d = _parse_json(self._chat(settings.meta_reason_model, [image], LABEL_PROMPT))
        return str(d.get("label", "Item"))

    def label(self, crop: bytes) -> Label:
        def _do_label():
            d = _parse_json(self._chat(settings.meta_reason_model, [crop], LABEL_PROMPT))
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

    def _judge_with_retry(self, images: list[bytes], prompt: str, max_retries: int = 1) -> dict:
        """Call the judge and retry once when the response is invalid JSON."""
        for attempt in range(max_retries + 1):
            try:
                if settings.vision_llm_url:
                    text = self._call_vision_llm(images, prompt)
                else:
                    text = self._chat(settings.meta_reason_model, images, prompt)
                return _parse_json(text)
            except (httpx.HTTPError, ValueError):
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

        d = self._judge_with_retry(images, prompt)

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
