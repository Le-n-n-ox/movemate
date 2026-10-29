"""Turnover audit: compare baseline reference photos to walkthrough video frames.

Funnel (how 'the photos I took' are matched to 'the video I took later'):
 1. Frames: video -> keyframes (ffmpeg, 2 fps, capped).
 2. Shortlist: for each confirmed item, pick the frames most likely to show it.
 3. Judge: send the item's REFERENCE CROP (+ wide baseline photo) and those frames to the vision model.
 4. Moved or missing items: second look with more frames, then a search in the other rooms' frames.
 5. Map the verdict to a finding. The decision logic lives in verdicts.py. 'not_visible' never becomes 'missing'.
"""
import logging

from sqlalchemy.orm import Session

from ..config import settings
from ..db import SessionLocal
from ..models import Audit, Capture, Finding, Item, Room
from ..services import imaging, locations, storage
from ..services.models import get_client
from .matching import even_spread
from .verdicts import RoomFrames, check_item

log = logging.getLogger("audit")


def _set_stage(db: Session, audit: Audit, stage: str) -> None:
    audit.stage = stage
    db.commit()


def _observe(client, frames: list[bytes]) -> list[list[str]]:
    """Label objects in a sample of frames. Unsampled frames get an empty list."""
    labels: list[list[str]] = [[] for _ in frames]
    for i in even_spread(len(frames), min(12, len(frames))):
        segs = client.segment(frames[i])[: settings.max_segments_per_image]
        labels[i] = [client.label(imaging.crop_bbox(frames[i], s.bbox)).label for s in segs]
    return labels


def run_audit(audit_id: str) -> None:
    db = SessionLocal()
    try:
        audit = db.get(Audit, audit_id)
        audit.status = "running"
        db.query(Finding).filter(Finding.audit_id == audit_id).delete()
        _set_stage(db, audit, "Preparing frames")
        client = get_client()

        rels_by_room: dict[str, list[str]] = {}
        for c in db.query(Capture).filter(Capture.audit_id == audit_id).all():
            rels_by_room.setdefault(c.room_id, []).extend(c.frame_paths or [])
        rels_by_room = {k: v[: settings.max_frames_per_room] for k, v in rels_by_room.items() if v}

        rooms: dict[str, RoomFrames] = {}
        for rid, rels in rels_by_room.items():
            if settings.audit_mode == "direct":
                # Direct mode: skip frame labeling, use evenly spread frames
                rooms[rid] = RoomFrames(db.get(Room, rid).name, [storage.read_bytes(r) for r in rels],
                                        lambda frames, c=client: [[] for _ in frames])
            else:
                rooms[rid] = RoomFrames(db.get(Room, rid).name, [storage.read_bytes(r) for r in rels],
                                        lambda frames, c=client: _observe(c, frames))

        checked, findings = 0, []
        for rid, rf in rooms.items():
            items = db.query(Item).filter(Item.room_id == rid, Item.status == "confirmed", Item.kind != "consumable").all()  # consumables are checked by quantity, never as missing
            if items:
                _set_stage(db, audit, f"Finding items in {rf.name}")
            for n, item in enumerate(items, 1):
                _set_stage(db, audit, f"Checking {rf.name}: {item.label} ({n}/{len(items)})")
                ref = storage.read_bytes(item.crop_path) if item.crop_path else rf.frames[0]
                ctx = storage.read_bytes(item.source_image_path) if item.source_image_path else None
                hint = item.location_hint or (locations.room_path(db, item.location_id) if item.location_id else None)
                r = check_item(client, label=item.label, quantity=item.quantity, hint=hint, alternates=item.alternate_locations or [],
                               notes=item.notes, ref=ref, ctx=ctx, room_id=rid, rooms=rooms,
                               on_stage=lambda s: _set_stage(db, audit, s))
                checked += 1
                if r:
                    ev = r["evidence"]
                    findings.append(Finding(
                        audit_id=audit_id, item_id=item.id, room_id=rid, item_label=item.label, type=r["type"],
                        expected=r["expected"], observed=r["observed"], confidence=r["confidence"],
                        evidence_frame_path=rels_by_room[ev[0]][ev[1]] if ev else None,
                        reference_crop_path=item.crop_path))

        db.add_all(findings)
        issues = sum(1 for f in findings if f.type != "unverified")
        unverified = len(findings) - issues
        audit.summary = f"{checked} items checked: {issues} issues, {unverified} could not be verified, {checked - len(findings)} OK."
        audit.status = "done"
        _set_stage(db, audit, "Done")
    except Exception as e:  # noqa: BLE001
        log.exception("audit failed")
        db.rollback()
        audit = db.get(Audit, audit_id)
        audit.status = "failed"
        audit.stage = f"Failed: {str(e)[:150]}"
        db.commit()
    finally:
        db.close()
