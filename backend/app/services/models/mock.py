"""Deterministic fake models so the whole product works with no API keys.

Mock behaviours the frontend can rely on:
- segment(): returns 3 fixed boxes
- label(): picks a name from a list by hashing the crop
- judge(): returns "missing" if the item's label contains MISSING (case-insensitive) or its
  notes contain [mock:missing]; "count_mismatch" if notes contain [mock:count=N];
  "not_visible" if notes contain [mock:unverified]; otherwise "present".
POST /api/dev/seed creates a demo property that exercises all of these.
"""
import hashlib

from .base import Guide, Judgement, Label, Segment

NAMES = [
    ("Nespresso Vertuo Plus", "appliance", "Nespresso", "Vertuo Plus"),
    ("Samsung TV remote", "remote", "Samsung", None),
    ("Wine glass set", "glassware", None, None),
    ("Smart speaker", "electronics", None, None),
    ("Ceramic table lamp", "decor", None, None),
    ("Wi-Fi router", "electronics", None, None),
]


def _h(data: bytes) -> int:
    return int(hashlib.md5(data).hexdigest(), 16)


class MockClient:
    def segment(self, image: bytes) -> list[Segment]:
        return [
            Segment(bbox={"x": 0.08, "y": 0.35, "w": 0.28, "h": 0.40}, score=0.95),
            Segment(bbox={"x": 0.42, "y": 0.50, "w": 0.18, "h": 0.22}, score=0.90),
            Segment(bbox={"x": 0.66, "y": 0.28, "w": 0.24, "h": 0.45}, score=0.88),
        ]

    def label(self, crop: bytes) -> Label:
        name, cat, brand, model = NAMES[_h(crop) % len(NAMES)]
        return Label(label=name, category=cat, confidence=0.82, brand=brand, model=model)

    def choose_candidate(self, image: bytes, candidates: list[str]) -> tuple[int, float]:
        if not candidates:
            return 0, 0.0
        return (_h(image) % len(candidates)) + 1, 0.85

    def guide(self, image: bytes, label: str, notes: str) -> Guide:
        base = [s.strip() for s in notes.split(".") if s.strip()] if notes else []
        steps = base[:5] or [f"Look at the {label} and find its main button or switch.",
                             "Press or turn it once and wait a few seconds.",
                             "If nothing happens, check that it is plugged in."]
        return Guide(title=f"How to use the {label}", steps=steps,
                     warnings=["Do not use near water."], seen=f"A {label} is visible in the photo.",
                     unsure=["Exact model buttons (mock mode)"])

    def judge(self, reference_crop, context_image, frames, label, quantity, location_hint, notes=None,
              scope="room") -> Judgement:
        notes = notes or ""
        if "[mock:otherroom]" in notes:
            if scope == "room":
                return Judgement("missing", 0, None, 0.9, "Mock: not seen in this room.")
            return Judgement("present", quantity, 1 if frames else None, 0.85, "Mock: seen in another room.",
                             where="on a surface in this room", at_usual_spot=False)
        if "missing" in label.lower() or "[mock:missing]" in notes:
            return Judgement("missing", 0, None, 0.9, "Mock: item not seen in any frame.")
        if "[mock:unverified]" in notes:
            return Judgement("not_visible", 0, None, 0.6, "Mock: usual spot not covered by the video.")
        if "[mock:moved=" in notes:
            where = notes.split("[mock:moved=")[1].split("]")[0]
            return Judgement("present", quantity, 1 if frames else None, 0.88, "Mock: item seen, but not at its usual spot.",
                             where=where, at_usual_spot=False)
        if "[mock:count=" in notes:
            n = int(notes.split("[mock:count=")[1].split("]")[0])
            return Judgement("present", n, 1 if frames else None, 0.88, f"Mock: only {n} visible.", at_usual_spot=True)
        return Judgement("present", quantity, 1 if frames else None, 0.9, "Mock: item visible.", at_usual_spot=True)
