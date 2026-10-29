"""Model interface. Pipelines only talk to this, never to a vendor SDK directly.
Swap Mock for Meta (or anything else) without touching pipeline code."""
from dataclasses import dataclass, field
from typing import Literal, Protocol


@dataclass
class Segment:
    bbox: dict  # normalized {x,y,w,h}
    score: float = 1.0
    polygon: list | None = None


@dataclass
class Label:
    label: str
    category: str | None = None
    confidence: float = 0.8


@dataclass
class Guide:
    title: str
    steps: list[str]
    warnings: list[str] = field(default_factory=list)
    seen: str = ""
    unsure: list[str] = field(default_factory=list)


@dataclass
class Judgement:
    status: Literal["present", "not_visible", "missing"]
    count_seen: int
    evidence_frame: int | None  # 1-based index into the frames list sent
    confidence: float
    reason: str = ""
    where: str | None = None          # short description of where the item was seen
    at_usual_spot: bool | None = None  # False = seen, but not where it normally sits


class VisionClient(Protocol):
    def segment(self, image: bytes) -> list[Segment]: ...

    def label(self, crop: bytes) -> Label: ...

    def choose_candidate(self, image: bytes, candidates: list[str]) -> tuple[int, float]:
        """Return (1-based index of the matching candidate or 0 for none, confidence)."""
        ...

    def guide(self, image: bytes, label: str, notes: str) -> Guide: ...

    def judge(self, reference_crop: bytes, context_image: bytes | None, frames: list[bytes],
              label: str, quantity: int, location_hint: str | None, notes: str | None = None,
              scope: Literal["room", "other_rooms"] = "room") -> Judgement:
        """THE reference-matching call: is the item from the baseline photo visible in these video frames?
        scope="other_rooms": the frames are from OTHER rooms; look for the item anywhere in them."""
        ...
