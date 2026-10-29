"""Decide what one baseline item's audit result is. Pure logic (no database), so it is easy to test.

For each confirmed item:
 1. Judge with the 4 best frames of its own room.
 2. If it was not clearly present, look again with 8 frames. 'missing' only survives if both passes agree.
 3. If it is still not present, look for it in the frames of the OTHER rooms (max 3 rooms).
    Found there -> 'misplaced'.
 4. If it is present but the model says it is not in its usual spot -> 'misplaced'.
 5. Present, usual spot, fewer than expected -> 'count_mismatch'.
 6. Otherwise map missing / not_visible to 'missing' (confidence >= MIN_MISSING_CONFIDENCE) or 'unverified'.
"""
from typing import Callable

from ..config import settings
from .matching import even_spread, shortlist_frames

FIRST_PASS, SECOND_PASS, MAX_OTHER_ROOMS = 4, 8, 3


class RoomFrames:
    """Frames of one room plus lazily computed object labels (labels cost model calls, so only when needed)."""

    def __init__(self, name: str, frames: list[bytes], labeler: Callable[[list[bytes]], list[list[str]]] | None = None):
        self.name, self.frames, self._labeler, self._labels = name, frames, labeler, None

    @property
    def labels(self) -> list[list[str]]:
        if self._labels is None:
            self._labels = self._labeler(self.frames) if self._labeler else [[] for _ in self.frames]
        return self._labels


def _pick(rf: RoomFrames, label: str, k: int) -> list[int]:
    if settings.mock_models or not rf._labeler:
        return even_spread(len(rf.frames), k)
    return shortlist_frames(rf.labels, label, k)


def _evidence(j, picks: list[int], room_id: str):
    if j.evidence_frame and 1 <= j.evidence_frame <= len(picks):
        return (room_id, picks[j.evidence_frame - 1])
    return (room_id, picks[0]) if picks and j.status == "present" else None


def check_item(client, *, label: str, quantity: int, hint: str | None, notes: str | None, ref: bytes,
               ctx: bytes | None, room_id: str, rooms: dict[str, RoomFrames], alternates: list[str] | None = None,
               on_stage: Callable[[str], None] = lambda s: None) -> dict | None:
    """Return a finding dict {type, observed, confidence, evidence: (room_id, frame_index)|None, expected} or None if OK."""
    home = rooms[room_id]
    expected = f"{quantity} x {label}" + (f" ({hint})" if hint else "")

    def run(rf: RoomFrames, picks: list[int], scope: str):
        return client.judge(ref, ctx, [rf.frames[i] for i in picks], label, quantity, hint, notes, scope=scope)

    picks = _pick(home, label, FIRST_PASS)
    j = run(home, picks, "room")

    if j.status != "present":  # second look with more frames
        picks2 = _pick(home, label, SECOND_PASS)
        if picks2 != picks:
            j2 = run(home, picks2, "room")
            if j2.status == "present" or (j.status == "missing" and j2.status != "missing"):
                j, picks = j2, picks2
            elif j.status == "missing" and j2.status == "missing":
                j.confidence = min(j.confidence, j2.confidence)

    if j.status != "present":  # look in the other rooms
        others = [(rid, rf) for rid, rf in rooms.items() if rid != room_id and rf.frames][:MAX_OTHER_ROOMS]
        for rid, rf in others:
            on_stage(f"Looking for {label} in {rf.name}")
            p3 = _pick(rf, label, FIRST_PASS)
            j3 = run(rf, p3, "other_rooms")
            if j3.status == "present" and j3.confidence >= settings.min_misplaced_confidence:
                where = f", {j3.where}" if j3.where else ""
                return {"type": "misplaced", "expected": expected, "confidence": j3.confidence,
                        "observed": f"Found in {rf.name}{where}. It belongs in {home.name}.",
                        "evidence": _evidence(j3, p3, rid) or (rid, p3[0])}

    if j.status == "present":
        seen_at = (j.where or "").lower()
        acceptable = any(a.strip() and a.strip().lower() in seen_at for a in (alternates or []))  # host-approved alternate place
        if j.at_usual_spot is False and not acceptable and j.confidence >= settings.min_misplaced_confidence:
            where = j.where or "somewhere other than its usual spot"
            return {"type": "misplaced", "expected": expected, "confidence": j.confidence,
                    "observed": f"Seen {where}. Usually: {hint or 'its saved spot'}.",
                    "evidence": _evidence(j, picks, room_id)}
        if j.count_seen < quantity:
            return {"type": "count_mismatch", "expected": expected, "confidence": j.confidence,
                    "observed": f"{j.count_seen} of {quantity} seen. {j.reason}".strip(),
                    "evidence": _evidence(j, picks, room_id)}
        return None

    if j.status == "missing":
        if j.confidence >= settings.min_missing_confidence:
            return {"type": "missing", "expected": expected, "confidence": j.confidence,
                    "observed": j.reason or "Not seen in the walkthrough.", "evidence": None}
        return {"type": "unverified", "expected": expected, "confidence": j.confidence,
                "observed": f"Possibly missing, low confidence. {j.reason}", "evidence": None}
    return {"type": "unverified", "expected": expected, "confidence": j.confidence,
            "observed": j.reason or "Its usual spot was not covered. Please re-film this area.", "evidence": None}
