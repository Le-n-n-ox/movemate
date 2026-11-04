import hashlib

from sqlalchemy.orm import Session

from ..config import settings
from ..models import Capture, Item, Room
from ..services import imaging, storage
from ..services.frames import extract_frames
from ..services.models import get_client
from .matching import area, dedupe


_label_cache: dict[str, object] = {}
_BACKGROUND_LABELS = {
    "background", "surface", "wall", "floor", "ceiling", "door", "window",
    "carpet", "tile", "countertop", "counter top", "counter",
}
_BACKGROUND_CATEGORIES = {"background", "structure", "surface", "architectural"}
_ITEM_LABEL_EXCEPTIONS = {"wall clock", "wall art", "floor lamp", "door mat"}
_MIN_SEGMENT_SCORE = 0.15
_MAX_SEGMENT_AREA = 0.45


def _crop_hash(crop: bytes) -> str:
    return hashlib.md5(crop).hexdigest()


def _cached_label(client, crop: bytes):
    key = _crop_hash(crop)
    if key not in _label_cache:
        _label_cache[key] = client.label(crop)
    return _label_cache[key]


def _is_background(label: str, category: str | None) -> bool:
    normalized_label = " ".join(label.casefold().replace("-", " ").split())
    normalized_category = (category or "").strip().casefold()
    if normalized_label in _ITEM_LABEL_EXCEPTIONS:
        return False
    return (
        normalized_category in _BACKGROUND_CATEGORIES
        or normalized_label in _BACKGROUND_LABELS
        or any(normalized_label.endswith(f" {term}") for term in _BACKGROUND_LABELS)
    )


def _objects_in_image(client, img: bytes, frame_no: int) -> list[dict]:
    segs = [
        s for s in client.segment(img)
        if _MIN_SEGMENT_SCORE <= s.score and 0.002 < area(s.bbox) <= _MAX_SEGMENT_AREA
    ]
    segs = sorted(segs, key=lambda s: s.score, reverse=True)[: settings.max_segments_per_image]
    objs = []
    for s in segs:
        crop = imaging.crop_bbox(img, s.bbox)
        lab = _cached_label(client, crop)
        if _is_background(lab.label, lab.category):
            continue
        objs.append({"label": lab.label, "category": lab.category, "conf": lab.confidence,
                     "bbox": s.bbox, "frame": frame_no, "crop": crop, "image": img})
    return objs


def _to_items(db: Session, room: Room, capture: Capture, objs: list[dict], source_rel_for, priority: str) -> list[Item]:
    items = []
    for o in objs:
        crop_rel = storage.save_bytes(f"crops/{room.id}", o["crop"])
        item = Item(room_id=room.id, capture_id=capture.id, label=o["label"], category=o["category"],
                    quantity=1, priority=priority, bbox=o["bbox"], crop_path=crop_rel,
                    source_image_path=source_rel_for(o), status="suggested")
        db.add(item)
        items.append(item)
    db.commit()
    return items


def process_photo(db: Session, room: Room, raw: bytes, priority: str = "high") -> tuple[Capture, list[Item]]:
    client = get_client()
    img = imaging.normalize_upload(raw)
    src_rel = storage.save_bytes(f"baseline/{room.id}", img)
    capture = Capture(room_id=room.id, kind="baseline_photo", media_path=src_rel)
    db.add(capture)
    db.commit()
    objs = _objects_in_image(client, img, 0)
    return capture, _to_items(db, room, capture, objs, lambda o: src_rel, priority)


def process_video(db: Session, room: Room, raw: bytes, ext: str = "mp4") -> tuple[Capture, list[Item]]:
    client = get_client()
    frame_rels = extract_frames(raw, ext=ext)
    capture = Capture(room_id=room.id, kind="baseline_video", frame_paths=frame_rels)
    db.add(capture)
    db.commit()
    # segment every 3rd frame (cap 10 frames) to control cost
    picks = list(range(0, len(frame_rels), 3))[:10]
    objs: list[dict] = []
    for i in picks:
        img = storage.read_bytes(frame_rels[i])
        objs += _objects_in_image(client, img, i)
    merged = dedupe(objs)
    return capture, _to_items(db, room, capture, merged, lambda o: frame_rels[o["frame"]], "normal")
