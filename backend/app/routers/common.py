from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..models import Audit, ConditionEvent, Finding, Item, Property, Room
from ..schemas import ConditionEventOut, FindingOut, ItemOut
from ..services import imaging, locations, storage

MAX_IMAGE = 15 * 1024 * 1024
MAX_VIDEO = 150 * 1024 * 1024


async def read_upload(f: UploadFile, max_bytes: int) -> bytes:
    data = await f.read()
    if not data:
        raise HTTPException(400, "Empty file")
    if len(data) > max_bytes:
        raise HTTPException(413, f"File too large (max {max_bytes // 1024 // 1024} MB)")
    return data


def video_ext(f: UploadFile) -> str:
    name = (f.filename or "").lower()
    for e in ("mp4", "mov", "webm", "m4v", "3gp"):
        if name.endswith("." + e):
            return e
    return "mp4"


def get_or_404(db: Session, model, id_: str):
    obj = db.get(model, id_)
    if not obj:
        raise HTTPException(404, f"{model.__name__} not found")
    return obj


def item_out(i: Item, db: Session | None = None) -> ItemOut:
    return ItemOut(id=i.id, room_id=i.room_id, label=i.label, category=i.category, quantity=i.quantity,
                   priority=i.priority, bbox=i.bbox, crop_url=storage.url_for(i.crop_path),
                   source_image_url=storage.url_for(i.source_image_path), location_hint=i.location_hint,
                   notes=i.notes, status=i.status, location_id=i.location_id,
                   location_path=locations.room_path(db, i.location_id) if (db is not None and i.location_id) else None,
                   kind=i.kind or "movable", condition=i.condition or "good", availability=i.availability or "guest",
                   high_value=bool(i.high_value), min_quantity=i.min_quantity,
                   alternate_locations=list(i.alternate_locations or []))


def save_condition(db: Session, item: Item, condition: str, note: str | None, actor: str, role: str | None,
                   photo_path: str | None = None) -> ConditionEvent:
    """Append to the item's condition history and update its current condition. Never overwrites history."""
    ev = ConditionEvent(item_id=item.id, condition=condition, previous=item.condition, note=note,
                        photo_path=photo_path, actor=actor or "unknown", role=role)
    item.condition = condition
    db.add(ev)
    return ev


def condition_event_out(e: ConditionEvent) -> ConditionEventOut:
    return ConditionEventOut(id=e.id, item_id=e.item_id, condition=e.condition, previous=e.previous, note=e.note,
                             photo_url=storage.url_for(e.photo_path), actor=e.actor, role=e.role, created_at=e.created_at)


def save_photo(raw: bytes, subdir: str) -> str:
    """Fix rotation, shrink, store. Returns the relative path."""
    return storage.save_bytes(subdir, imaging.normalize_upload(raw, max_side=1600))


def finding_out(f: Finding) -> FindingOut:
    return FindingOut(id=f.id, audit_id=f.audit_id, item_id=f.item_id, room_id=f.room_id, item_label=f.item_label,
                      type=f.type, expected=f.expected, observed=f.observed, confidence=f.confidence,
                      evidence_frame_url=storage.url_for(f.evidence_frame_path),
                      reference_crop_url=storage.url_for(f.reference_crop_path),
                      resolution=f.resolution, resolved_by=f.resolved_by, resolved_at=f.resolved_at, note=f.note)
