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



_COLOUR_PATTERN = {"geometric","patterned","damask","decorative","dark","light","small","large","wooden","fabric","loveseat","throw","and","the","with","on","of"}

def short_name(name: str) -> str:
    words = [w for w in str(name).replace("-", " ").split() if w]
    return " ".join(words[:4]) if words else "Item"

def normalize_name(name: str) -> str:
    words = []
    for w in str(name).lower().replace("-", " ").replace("'", "").split():
        if w in {"cushion", "cushions", "pillow", "pillows"}:
            words.append("cushion")
            continue
        if w in _COLOUR_PATTERN:
            continue
        if len(w) > 3 and w.endswith("s") and not w.endswith("ss"):
            w = w[:-1]
        words.append(w)
    return " ".join(words).strip() or str(name).casefold()

def _verify_result(client, crop, name):
    """Return (matches, better_name, confidence) supporting Verification dataclass or legacy tuple."""
    r = client.verify_crop(crop, name)
    if isinstance(r, (list, tuple)):
        return bool(r[0]), None, float(r[1]) if len(r) > 1 else 0.9
    return bool(getattr(r, "matches", True)), getattr(r, "better_name", None), float(getattr(r, "confidence", 0.9))

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
        # Pairing rule: every box returned for THIS prompt inherits THIS name.
        name = short_name(getattr(item, "name", str(item)))
        cat = getattr(item, "category", None)
        segs = []
        try:
            segs = _call_segment(client, img, prompts=[name])
            sam_calls += 1
        except Exception:
            segs = []
        for s in segs:
            raw_objs.append({"label": name, "category": cat, "conf": float(s.score),
                             "bbox": s.bbox, "frame": frame_no, "crop": None, "image": img, "score": float(s.score),
                             "quantity": 1, "needs_check": False, "detection_confidence": float(s.score)})
    filtered = filter_segments(raw_objs)
    kept = nms(filtered, iou_same=settings.segment_nms_iou_same, iou_cross=settings.segment_nms_iou_cross)
    kept = sorted(kept, key=lambda x: x.get("conf", 0), reverse=True)[: settings.max_segments_per_image]
    objs: list[dict] = []
    verify_calls = 0
    dropped_verify = 0
    for o in kept:
        try:
            crop = imaging.crop_bbox(img, o["bbox"])
        except Exception:
            crop = img
        label = o["label"]
        needs_check = False
        vconf = o["conf"]
        if hasattr(client, "verify_crop") and verify_calls < settings.baseline_max_verify:
            try:
                matches, better, vconf = _verify_result(client, crop, label)
                verify_calls += 1
                if not matches:
                    if better:
                        label = short_name(better)
                        needs_check = True
                    else:
                        dropped_verify += 1
                        continue
                elif vconf < 0.5:
                    needs_check = True
            except Exception:
                pass
        o2 = dict(o); o2["label"] = label; o2["crop"] = crop; o2["needs_check"] = needs_check
        o2["detection_confidence"] = vconf; o2["notes"] = None
        objs.append(o2)
    grouped: dict[str, dict] = {}
    order: list[str] = []
    for o in sorted(objs, key=lambda x: x.get("conf", 0), reverse=True):
        if not o.get("bbox"):
            continue
        key = normalize_name(o["label"])
        if key not in grouped:
            grouped[key] = o; order.append(key)
        else:
            g = grouped[key]
            g["quantity"] = int(g.get("quantity", 1)) + int(o.get("quantity", 1))
    grouped_objs = [grouped[k] for k in order]
    kept_norm = {normalize_name(o["label"]) for o in grouped_objs}
    null_objs: list[dict] = []
    for item in listed:
        name = short_name(getattr(item, "name", str(item)))
        if normalize_name(name) in kept_norm:
            continue
        segs = []
        try:
            # Cost bound: total SAM calls per photo capped at baseline_max_names (12).
            # Tiled retry is 4 calls, so only do it while budget remains.
            if sam_calls < settings.baseline_max_names:
                segs = _tiled_segment(client, img, name)
                sam_calls += 1
        except Exception:
            segs = []
        tiled_objs = []
        for s in segs:
            tiled_objs.append({"label": name, "category": getattr(item, "category", None), "conf": float(s.score),
                               "bbox": s.bbox, "frame": frame_no, "crop": None, "image": img, "score": float(s.score),
                               "quantity": 1, "needs_check": False, "detection_confidence": float(s.score)})
        tiled_kept = nms(filter_segments(tiled_objs), iou_same=settings.segment_nms_iou_same, iou_cross=settings.segment_nms_iou_cross)
        # Tiled returns are noisy (gateway returns all objects); only keep plausible small boxes
        tiled_kept = [o for o in tiled_kept if o["bbox"]["w"] * o["bbox"]["h"] < 0.2]
        if tiled_kept:
            for o in tiled_kept[:2]:
                try:
                    crop = imaging.crop_bbox(img, o["bbox"])
                except Exception:
                    crop = img
                o2 = dict(o); o2["crop"] = crop; o2["notes"] = None
                grouped_objs.append(o2)
            kept_norm.add(normalize_name(name))
        else:
            null_objs.append({"label": name, "category": getattr(item, "category", None), "conf": 0.5,
                         "bbox": None, "frame": frame_no, "crop": img, "image": img, "notes": None,
                         "quantity": 1, "needs_check": True, "detection_confidence": 0.5})
    objs = grouped_objs + null_objs
    est_cost = 0.001 + sam_calls * 0.001 + verify_calls * 0.0005
    log.info("baseline photo: stageA=%d sam_calls=%d verify_calls=%d dropped_verify=%d kept=%d est_cost=%.4f",
             len(listed), sam_calls, verify_calls, dropped_verify, len(objs), est_cost)
    print(f"baseline photo: stageA={len(listed)} sam_calls={sam_calls} verify_calls={verify_calls} dropped_verify={dropped_verify} kept={len(objs)} est_cost={est_cost:.4f}")
    return objs


def _to_items(db: Session, room: Room, capture: Capture, objs: list[dict], source_rel_for, priority: str) -> list[Item]:
    # (d) do not create suggested duplicate if same normalized name already confirmed in room
    confirmed_norm = {normalize_name(i.label) for i in db.query(Item).filter(Item.room_id == room.id, Item.status == "confirmed").all()}
    items = []
    for o in objs:
        if normalize_name(o["label"]) in confirmed_norm:
            log.info("baseline skip already confirmed: %s", o["label"])
            continue
        crop_rel = storage.save_bytes(f"crops/{room.id}", o["crop"])
        item = Item(room_id=room.id, capture_id=capture.id, label=o["label"], category=o.get("category"),
                    quantity=int(o.get("quantity", 1)), priority=priority, bbox=o.get("bbox"), crop_path=crop_rel,
                    source_image_path=source_rel_for(o), status="suggested", notes=None,
                    needs_check=bool(o.get("needs_check", False)), detection_confidence=o.get("detection_confidence"))
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
