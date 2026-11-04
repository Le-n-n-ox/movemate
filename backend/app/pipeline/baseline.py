import hashlib
import logging

from sqlalchemy.orm import Session

from ..config import settings
from ..models import Capture, Item, Room
from ..services import imaging, storage
from ..services.frames import extract_frames
from ..services.models import get_client
from .matching import area, dedupe, iou, label_sim

log = logging.getLogger(__name__)


_label_cache: dict[str, object] = {}
_BACKGROUND_LABELS = {
    "background", "surface", "wall", "floor", "ceiling", "door", "window",
    "carpet", "tile", "countertop", "counter top", "counter",
}
_BACKGROUND_CATEGORIES = {"background", "structure", "surface", "architectural"}
_ITEM_LABEL_EXCEPTIONS = {"wall clock", "wall art", "floor lamp", "door mat"}
_MIN_SEGMENT_SCORE = 0.15
_MAX_SEGMENT_AREA = 0.45
_LONG_OBJECT_HINTS = ("remote", "pen", "cable", "cord", "ruler", "key", "chopstick")


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


def _is_long_object(label: str) -> bool:
    low = (label or "").casefold()
    return any(h in low for h in _LONG_OBJECT_HINTS)


def _aspect(bbox) -> float:
    if not bbox or bbox["w"] <= 0 or bbox["h"] <= 0:
        return 999.0
    return max(bbox["w"] / bbox["h"], bbox["h"] / bbox["w"])


def _call_segment(client, img: bytes, prompts=None):
    if prompts:
        try:
            return client.segment(img, prompts=prompts)
        except TypeError:
            return client.segment(img)
    return client.segment(img)


def nms(objs: list[dict], iou_same: float = 0.5, iou_cross: float = 0.7) -> list[dict]:
    kept: list[dict] = []
    for o in sorted(objs, key=lambda x: x.get("conf", x.get("score", 0)), reverse=True):
        if not o.get("bbox"):
            kept.append(o)
            continue
        suppress = False
        for k in kept:
            if not k.get("bbox"):
                continue
            overlap = iou(o["bbox"], k["bbox"])
            same = (o.get("label") or "").strip().casefold() == (k.get("label") or "").strip().casefold()
            if same and overlap > iou_same:
                suppress = True
                break
            if not same and overlap > iou_cross:
                suppress = True
                break
        if not suppress:
            kept.append(o)
    return kept


def filter_segments(objs: list[dict]) -> list[dict]:
    out = []
    for o in objs:
        if not o.get("bbox"):
            out.append(o)
            continue
        score = o.get("conf", o.get("score", 0))
        a = area(o["bbox"])
        if score < settings.segment_min_score:
            continue
        if a < settings.segment_min_area or a > settings.segment_max_area:
            continue
        if _aspect(o["bbox"]) > settings.segment_max_aspect and not _is_long_object(o.get("label", "")):
            continue
        out.append(o)
    return out


def _legacy_objects(client, img: bytes, frame_no: int) -> list[dict]:
    segs = [
        s for s in _call_segment(client, img)
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
                     "bbox": s.bbox, "frame": frame_no, "crop": crop, "image": img, "notes": None})
    return objs


def _tiled_segment(client, img: bytes, name: str) -> list:
    try:
        import io
        pil = imaging.open_image(img)
        W, H = pil.size
    except Exception:
        return []
    tiles = []
    for ty in (0, 1):
        for tx in (0, 1):
            x0 = int(tx * W * 0.4)
            y0 = int(ty * H * 0.4)
            x1 = min(W, x0 + int(W * 0.6))
            y1 = min(H, y0 + int(H * 0.6))
            tile = pil.crop((x0, y0, x1, y1))
            buf = io.BytesIO()
            tile.save(buf, "JPEG", quality=88)
            tiles.append((buf.getvalue(), x0 / W, y0 / H, (x1 - x0) / W, (y1 - y0) / H))
    out = []
    for tile_bytes, fx, fy, fw, fh in tiles:
        try:
            segs = _call_segment(client, tile_bytes, prompts=[name])
        except Exception:
            continue
        for s in segs:
            b = {"x": fx + s.bbox["x"] * fw, "y": fy + s.bbox["y"] * fh,
                 "w": s.bbox["w"] * fw, "h": s.bbox["h"] * fh}
            b["x"] = max(0.0, min(1.0, b["x"])); b["y"] = max(0.0, min(1.0, b["y"]))
            b["w"] = max(0.0, min(1.0 - b["x"], b["w"])); b["h"] = max(0.0, min(1.0 - b["y"], b["h"]))
            if b["w"] <= 0 or b["h"] <= 0:
                continue
            s.bbox = b
            out.append(s)
    return out


def _close_up_objects(client, img: bytes, frame_no: int) -> list[dict]:
    name = "Item"
    try:
        if hasattr(client, "name_main_object"):
            name = client.name_main_object(img)
        elif hasattr(client, "list_objects"):
            listed = client.list_objects(img) or []
            if listed:
                name = listed[0].name
        else:
            name = client.label(img).label
    except Exception:
        try:
            name = client.label(img).label
        except Exception:
            name = "Item"
    bbox = {"x": 0.03, "y": 0.03, "w": 0.94, "h": 0.94}
    return [{"label": str(name), "category": None, "conf": 0.8, "bbox": bbox,
             "frame": frame_no, "crop": img, "image": img, "notes": None}]


def _objects_in_image(client, img: bytes, frame_no: int, close_up: bool = False) -> list[dict]:
    if close_up:
        return _close_up_objects(client, img, frame_no)
    listed = []
    if hasattr(client, "list_objects"):
        try:
            listed = client.list_objects(img) or []
        except Exception:
            listed = []
    if not listed:
        return _legacy_objects(client, img, frame_no)
    listed = listed[: settings.baseline_max_names]
    raw_objs: list[dict] = []
    sam_calls = 0
    for item in listed:
        name = getattr(item, "name", str(item))
        size = getattr(item, "size", "medium")
        cat = getattr(item, "category", None)
        segs = []
        try:
            segs = _call_segment(client, img, prompts=[name])
            sam_calls += 1
        except Exception:
            segs = []
        if not segs and str(size).lower() == "small":
            segs = _tiled_segment(client, img, name)
            sam_calls += 1
        # Gateway often returns ALL objects regardless of prompt; only keep boxes
        # whose returned label matches the requested name. Keep only near-best matches
        # per prompt so a left-pillow query cannot also claim the orange pillow.
        scored = []
        for s in segs:
            seg_label = getattr(s, "label", None)
            sim = label_sim(seg_label, name) if seg_label else 1.0
            scored.append((sim, s))
        if scored:
            top = max(sim for sim, _ in scored)
            scored = [(sim, s) for sim, s in scored if sim >= 0.35 and sim >= top - 0.25]
        for sim, s in scored:
            raw_objs.append({"label": name, "category": cat, "conf": float(s.score),
                             "bbox": s.bbox, "frame": frame_no, "crop": None, "image": img, "score": float(s.score)})
    filtered = filter_segments(raw_objs)
    kept = nms(filtered, iou_same=settings.segment_nms_iou_same, iou_cross=settings.segment_nms_iou_cross)
    kept = sorted(kept, key=lambda x: x.get("conf", 0), reverse=True)[: settings.max_segments_per_image]
    objs: list[dict] = []
    verify_calls = 0
    kept_names = {o["label"].strip().casefold() for o in kept}
    for o in kept:
        try:
            crop = imaging.crop_bbox(img, o["bbox"])
        except Exception:
            crop = img
        notes = None
        if hasattr(client, "verify_crop") and verify_calls < settings.baseline_max_verify:
            try:
                matches, conf = client.verify_crop(crop, o["label"])
                verify_calls += 1
                if not matches or conf < 0.5:
                    notes = "check this one"
            except Exception:
                pass
        objs.append({"label": o["label"], "category": o.get("category"), "conf": o["conf"],
                     "bbox": o["bbox"], "frame": frame_no, "crop": crop, "image": img, "notes": notes})
    for item in listed:
        name = getattr(item, "name", str(item))
        if name.strip().casefold() not in kept_names:
            objs.append({"label": name, "category": getattr(item, "category", None), "conf": 0.5,
                         "bbox": None, "frame": frame_no, "crop": img, "image": img, "notes": "No box yet"})
    est_cost = 0.001 + sam_calls * 0.001 + verify_calls * 0.0005
    log.info("baseline photo: stageA=%d sam_calls=%d verify_calls=%d kept=%d est_cost=%.4f",
             len(listed), sam_calls, verify_calls, len(objs), est_cost)
    print(f"baseline photo: stageA={len(listed)} sam_calls={sam_calls} verify_calls={verify_calls} kept={len(objs)} est_cost={est_cost:.4f}")
    return objs


def _to_items(db: Session, room: Room, capture: Capture, objs: list[dict], source_rel_for, priority: str) -> list[Item]:
    items = []
    for o in objs:
        crop_rel = storage.save_bytes(f"crops/{room.id}", o["crop"])
        item = Item(room_id=room.id, capture_id=capture.id, label=o["label"], category=o.get("category"),
                    quantity=1, priority=priority, bbox=o.get("bbox"), crop_path=crop_rel,
                    source_image_path=source_rel_for(o), status="suggested", notes=o.get("notes"))
        db.add(item)
        items.append(item)
    db.commit()
    return items


def process_photo(db: Session, room: Room, raw: bytes, priority: str = "high", close_up: bool = False) -> tuple[Capture, list[Item]]:
    client = get_client()
    img = imaging.normalize_upload(raw)
    src_rel = storage.save_bytes(f"baseline/{room.id}", img)
    capture = Capture(room_id=room.id, kind="baseline_photo", media_path=src_rel)
    db.add(capture)
    db.commit()
    if priority == "close_up":
        close_up = True
        priority = "high"
    objs = _objects_in_image(client, img, 0, close_up=close_up)
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
    merged = dedupe([o for o in objs if o.get("bbox")])
    nulls = [o for o in objs if not o.get("bbox")]
    seen_null = set()
    for o in nulls:
        key = o["label"].strip().casefold()
        if key not in seen_null:
            seen_null.add(key)
            merged.append(o)
    return capture, _to_items(db, room, capture, merged, lambda o: frame_rels[o["frame"]], "normal")
