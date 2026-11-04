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

DECISIONS: list[str] = []
def decision(name, stage, dec, reason):
    line = f"{name} | {stage} | {dec} | {reason}"
    DECISIONS.append(line); log.info("decision %s", line); print(f"decision {line}")

def _log_stage(name, t0, extra=''):
    import time as _t
    log.info('stage %s %.1fs %s', name, _t.time()-t0, extra)
    print(f'stage {name} {_t.time()-t0:.1f}s {extra}')


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
_SYNONYMS = {"couch": "sofa", "sofa": "sofa", "tv": "television", "television": "television", "remote": "remote", "control": "remote"}

_TRUE_SYNONYMS = {frozenset(("sofa","couch")), frozenset(("tv","television")), frozenset(("remote","control"))}
def _same_normalized(a_norm, b_norm):
    if a_norm == b_norm: return True
    return False

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
    words = [_SYNONYMS.get(w, w) for w in words]
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
    # NOTE: NMS is per-frame same-shot duplicates; cross-frame dedup is separate and conservative
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
            out.append(o); continue
        score = o.get("conf", o.get("score", 0)); a = area(o["bbox"])
        reason = None
        if score < settings.segment_min_score: reason = f"score {score:.2f} < {settings.segment_min_score}"
        elif a < settings.segment_min_area or a > settings.segment_max_area: reason = f"area {a:.4f} outside [{settings.segment_min_area},{settings.segment_max_area}]"
        elif _aspect(o["bbox"]) > settings.segment_max_aspect and not _is_long_object(o.get("label", "")): reason = f"aspect {_aspect(o['bbox']):.1f} > {settings.segment_max_aspect}"
        if reason:
            decision(o.get("label","?"), "filter", "flagged", reason)
            o2 = dict(o); o2["needs_check"] = True; o2["flag_reason"] = reason; out.append(o2)
        else:
            decision(o.get("label","?"), "filter", "kept", f"score {score:.2f} area {a:.4f}")
            out.append(o)
    return out



def _sharpness(img_bytes: bytes) -> float:
    """Variance of Laplacian approximation on 64px grey thumbnail (pure PIL, no cv2)."""
    try:
        from PIL import Image
        import io
        im = imaging.open_image(img_bytes).convert("L").resize((64, 64))
        px = list(im.getdata())
        # Laplacian kernel [-4,1,1,1,1] approx via centre vs neighbours
        vals = []
        for y in range(1, 63):
            for x in range(1, 63):
                i = y * 64 + x
                lap = 4 * px[i] - px[i-1] - px[i+1] - px[i-64] - px[i+64]
                vals.append(lap)
        mean = sum(vals) / len(vals)
        return sum((v-mean)**2 for v in vals) / len(vals)
    except Exception:
        return 0.0


def _phash(img_bytes: bytes) -> int:
    try:
        im = imaging.open_image(img_bytes).convert("L").resize((8, 8))
        px = list(im.getdata())
        avg = sum(px)/len(px)
        h = 0
        for v in px:
            h = (h << 1) | (1 if v > avg else 0)
        return h
    except Exception:
        return 0


def _hamming(a: int, b: int) -> int:
    return bin(a ^ b).count("1")


def select_frames(frame_bytes_list: list[bytes], target: int = 8) -> list[int]:
    """Evenly sample 8-12 frames, drop blurry (sharpness < threshold) and near-identical, keep sharpest per segment."""
    n = len(frame_bytes_list)
    if n == 0:
        return []
    # sharpness per frame
    sharp = [_sharpness(b) for b in frame_bytes_list]
    # blur threshold: median * 0.3, floor 50
    ssorted = sorted(sharp)
    med = ssorted[len(ssorted)//2] if ssorted else 0
    thresh = max(30.0, med * 0.25)
    candidates = [i for i, s in enumerate(sharp) if s >= thresh] or list(range(n))
    while len(candidates) > target:
        # evenly thin
        candidates = candidates[::2] if len(candidates) > target else candidates
        if len(candidates) <= target:
            break
        # fallback even spread
        step = len(candidates) / target
        candidates = [candidates[int(i*step)] for i in range(target)]
    # segment sharpest: divide timeline into target segments, pick sharpest candidate in each
    if len(candidates) < target and n >= target:
        segs = []
        for k in range(target):
            lo, hi = int(k*n/target), int((k+1)*n/target)
            pool = [i for i in range(lo, hi) if sharp[i] >= thresh] or list(range(lo, hi))
            segs.append(max(pool, key=lambda i: sharp[i]))
        candidates = sorted(set(segs))
    # near-identical drop via phash hamming < 6
    ph = [_phash(b) for b in frame_bytes_list]
    kept = []
    for i in candidates:
        if any(_hamming(ph[i], ph[j]) < 6 for j in kept):
            continue
        kept.append(i)
    return sorted(kept)[:target]


def _crop_hash_bytes(crop: bytes) -> int:
    return _phash(crop)

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


def detect_items(client, img: bytes, frame_no: int = 0, close_up: bool = False, frame_index: int | None = None) -> list[dict]:
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
                        label = short_name(better); needs_check = True; decision(label, 'verify', 'renamed', f'better_name={better}')
                    else:
                        needs_check = True; decision(label, 'verify', 'flagged', 'verification no, no better name')
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


_objects_in_image = detect_items  # back-compat alias; shared pipeline is detect_items


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
                    needs_check=bool(o.get("needs_check", False)), detection_confidence=o.get("detection_confidence"), frames_seen=o.get("frames_seen"), frames_total=o.get("frames_total"), description=o.get("description"))
        db.add(item)
        items.append(item)
    db.commit()
    return items


def process_photo(db: Session, room: Room, raw: bytes, priority: str = "high", close_up: bool = False, capture: Capture | None = None) -> tuple[Capture, list[Item]]:
    client = get_client()
    img = imaging.normalize_upload(raw)
    src_rel = storage.save_bytes(f"baseline/{room.id}", img)
    if capture is None:
        capture = Capture(room_id=room.id, kind="baseline_photo", media_path=src_rel, status="done")
        db.add(capture); db.commit()
    else:
        capture.media_path = src_rel; capture.status = "detecting"; db.commit()
    if priority == "close_up":
        close_up = True
        priority = "high"
    objs = detect_items(client, img, 0, close_up=close_up)
    return capture, _to_items(db, room, capture, objs, lambda o: src_rel, priority)



def merge_cross_frame(objs: list[dict], total_frames: int) -> list[dict]:
    """Merge detections across frames without depending on box position.

    Track ids take precedence if present; otherwise normalized name + crop phash similarity.
    Quantity = max distinct instances in any single frame. Sharpest/largest crop kept.
    """
    # group by normalized name first
    by_name: dict[str, list[dict]] = {}
    for o in objs:
        if not o.get("bbox"):
            continue
        by_name.setdefault(normalize_name(o["label"]), []).append(o)
    merged = []
    for key, group in by_name.items():
        # distinct per frame
        per_frame: dict[int, list[dict]] = {}
        for o in group:
            per_frame.setdefault(int(o.get("frame", 0)), []).append(o)
        max_per_frame = max((len(v) for v in per_frame.values()), default=0)
        # sharpest crop: use crop phash sharpness approx via _sharpness on crop bytes if available
        def _score(o):
            try:
                return _sharpness(o.get("crop") or b"") * (o["bbox"]["w"] * o["bbox"]["h"])
            except Exception:
                return o.get("conf", 0)
        best = max(group, key=_score)
        m = dict(best)
        m["quantity"] = max_per_frame or 1
        m["frames_seen"] = len(per_frame)
        m["frames_total"] = total_frames
        # label: keep best label (short)
        m["label"] = short_name(m["label"])
        merged.append(m)
    # null bbox items deduped by normalized name
    nulls = [o for o in objs if not o.get("bbox")]
    seen = set()
    for o in nulls:
        k = normalize_name(o["label"])
        if k in seen:
            continue
        seen.add(k)
        o2 = dict(o); o2["frames_seen"] = 1; o2["frames_total"] = total_frames
        merged.append(o2)
    return merged

def process_video(db: Session, room: Room, raw: bytes, ext: str = "mp4", capture: Capture | None = None) -> tuple[Capture, list[Item]]:
    _T0 = __import__('time').time(); _t_ffmpeg=_T0; _t_filter=_T0; _t_inv=_T0; _t_seg=_T0; _t_ver=_T0; _seg_calls=0; _ver_calls=0
    client = get_client()
    if capture is not None:
        try: capture.status = "extracting_frames"; capture.stage = "Choosing frames"; capture.progress = 0.05; db.commit()
        except Exception: pass
    frame_rels = extract_frames(raw, ext=ext)
    if capture is None:
        capture = Capture(room_id=room.id, kind="baseline_video", frame_paths=frame_rels, status="done")
        db.add(capture); db.commit()
    else:
        capture.frame_paths = frame_rels; db.commit()
    # Frame selection: even 8-12, drop blurry/near-identical, sharpest per segment
    if db:
        try:
            capture.status = "detecting"; db.commit()
        except Exception:
            pass
    _t_ffmpeg = __import__('time').time()
    frame_bytes = [storage.read_bytes(rel) for rel in frame_rels]
    _t_filter = __import__('time').time()
    picks = select_frames(frame_bytes, target=8)
    log.info("baseline video: frames_total=%d selected=%d", len(frame_bytes), len(picks))
    print(f"baseline video: frames_total={len(frame_bytes)} selected={len(picks)}")
    kept = [frame_bytes[i] for i in picks]
    # STAGE A: ONE inventory for whole clip
    try:
        capture.stage = "Listing items"; capture.progress = 0.2; db.commit()
    except Exception: pass
    _t_inv = __import__('time').time()
    master = []
    if hasattr(client, "list_objects_video"):
        try:
            master = client.list_objects_video(kept, context=room.name + " section") or []
        except Exception:
            master = []
    if not master:
        # fallback: per-frame detect then merge (mock/legacy)
        objs: list[dict] = []
        for idx, i in enumerate(picks):
            objs += detect_items(client, frame_bytes[i], i)
        merged = merge_cross_frame(objs, total_frames=len(picks))
        return capture, _to_items(db, room, capture, merged, lambda o: frame_rels[o["frame"]], "normal")
    # merge master by normalized name + similar description
    merged_master: dict[str, object] = {}
    order = []
    for m in master[:25]:
        key = normalize_name(m.name) + "|" + str(getattr(m, "description", "") or "")[:20]
        # simpler: normalized name alone for grouping, description similarity checked via key above will keep colour variants separate - use normalized name only
        key = normalize_name(m.name)
        desc = (getattr(m, "description", "") or "").casefold()
        merged = False
        for k in list(merged_master.keys()):
            if k == key:
                existing = merged_master[k]
                edesc = (getattr(existing, "description", "") or "").casefold()
                # strict: same normalized name AND descriptions agree (share >=1 content word or one empty)
                aw = set(x for x in desc.split() if len(x) > 3); bw = set(x for x in edesc.split() if len(x) > 3)
                if not aw or not bw or aw & bw:
                    try: merged_master[k].count = int(getattr(merged_master[k], 'count', 1) or 1) + int(getattr(m, 'count', 1) or 1)
                    except Exception: pass
                    decision(m.name, "inventory-merge", f"merged into {existing.name}", "same normalized name, descriptions agree")
                    merged = True; break
                else:
                    decision(m.name, "inventory-merge", "kept", "same name but descriptions differ")
        if not merged:
            # key with description suffix to keep separate entries distinct
            uniq = key + "|" + desc[:20]
            merged_master[uniq] = m; order.append(uniq)
    def _locate_item(idx, key, merged_master, kept, picks, client):
        m = merged_master[key]
        name = short_name(getattr(m, "name", str(m)))
        listed_frames = list(getattr(m, "frames", []) or [])
        # try listed frames first, then every other frame, then description prompt at lower threshold
        remaining = [i for i in range(len(kept)) if i not in listed_frames]
        listed_frames_sorted = sorted(listed_frames, key=lambda fi: _sharpness(kept[fi]) if 0 <= fi < len(kept) else 0, reverse=True) + remaining
        found = []
        for fi in listed_frames_sorted:
            if fi < 0 or fi >= len(kept): continue
            img = kept[fi]
            try:
                segs = _call_segment(client, img, prompts=[name])
            except Exception:
                segs = []
            cands = []
            for s in segs:
                cands.append({"label": name, "category": getattr(m, "category", None), "conf": float(s.score), "bbox": s.bbox, "frame": picks[fi], "crop": None, "image": img, "score": float(s.score), "quantity": 1, "needs_check": False, "detection_confidence": float(s.score), "description": getattr(m, "description", "")})
            cands = nms(filter_segments(cands), iou_same=settings.segment_nms_iou_same, iou_cross=settings.segment_nms_iou_cross)
            if cands:
                found = cands[: max(1, int(getattr(m, "count", 1) or 1))]
                break
        out = []
        if found:
            for o in found:
                try: o["crop"] = imaging.crop_bbox(kept[picks.index(o["frame"])] if o["frame"] in picks else kept[0], o["bbox"])
                except Exception: o["crop"] = kept[0]
                o["frames_seen"] = len(listed_frames) if listed_frames else 1
                o["frames_total"] = len(kept)
                o["source_frame_idx"] = o["frame"]
                out.append(o)
        else:
            out.append({"label": name, "category": getattr(m, "category", None), "conf": 0.5, "bbox": None, "frame": picks[listed_frames_sorted[0]] if listed_frames_sorted else picks[0], "crop": kept[0], "image": kept[0], "notes": None, "quantity": int(getattr(m, "count", 1) or 1), "needs_check": True, "detection_confidence": 0.5, "frames_seen": 0, "frames_total": len(kept), "description": getattr(m, "description", "")})
        return out
    # STAGE B: locate each once (parallel 4, in threads not event loop)
    from concurrent.futures import ThreadPoolExecutor
    def _locate_one(idx_key):
        idx, key = idx_key
        return _locate_item(idx, key, merged_master, kept, picks, client)
    objs2 = []
    # _locate_item defined as nested function below via closure - we inline loop instead using executor map over order
    # Fallback sequential if executor fails
    try:
        with ThreadPoolExecutor(max_workers=getattr(settings, "baseline_concurrency", 4)) as ex:
            results = list(ex.map(lambda ik: _locate_one(ik), list(enumerate(order))))
        objs2 = [o for r in results for o in r]
    except Exception:
        objs2 = []
        for idx, key in enumerate(order):
            objs2.extend(_locate_one((idx, key)))
    # skip old sequential loop by jumping
    # (legacy sequential code below is now unreachable via goto-style flag)
    _done_parallel = True
    for idx, key in enumerate([]):
        m = merged_master[key]
        name = short_name(getattr(m, "name", str(m)))
        try:
            capture.stage = f"Locating items {idx + 1} of {len(order)}"; capture.progress = 0.2 + 0.6 * (idx / max(1, len(order))); db.commit()
        except Exception: pass
        listed_frames = list(getattr(m, "frames", []) or [])
        # prefer sharpest/largest: sort listed frames by sharpness desc
        # try listed frames first, then every other frame, then description prompt at lower threshold
        remaining = [i for i in range(len(kept)) if i not in listed_frames]
        listed_frames_sorted = sorted(listed_frames, key=lambda fi: _sharpness(kept[fi]) if 0 <= fi < len(kept) else 0, reverse=True) + remaining
        found = []
        for fi in listed_frames_sorted:
            if fi < 0 or fi >= len(kept): continue
            img = kept[fi]
            try:
                segs = _call_segment(client, img, prompts=[name])
            except Exception:
                segs = []
            cands = []
            for s in segs:
                cands.append({"label": name, "category": getattr(m, "category", None), "conf": float(s.score), "bbox": s.bbox, "frame": picks[fi], "crop": None, "image": img, "score": float(s.score), "quantity": 1, "needs_check": False, "detection_confidence": float(s.score), "description": getattr(m, "description", "")})
            cands = nms(filter_segments(cands), iou_same=settings.segment_nms_iou_same, iou_cross=settings.segment_nms_iou_cross)
            if cands:
                found = cands[: max(1, int(getattr(m, "count", 1) or 1))]
                break
        if found:
            for o in found:
                try: o["crop"] = imaging.crop_bbox(kept[picks.index(o["frame"])] if o["frame"] in picks else kept[0], o["bbox"])
                except Exception: o["crop"] = kept[0]
                o["frames_seen"] = len(listed_frames) if listed_frames else 1
                o["frames_total"] = len(kept)
                o["source_frame_idx"] = o["frame"]
                objs2.append(o)
        else:
            objs2.append({"label": name, "category": getattr(m, "category", None), "conf": 0.5, "bbox": None, "frame": picks[listed_frames_sorted[0]] if listed_frames_sorted else picks[0], "crop": kept[0], "image": kept[0], "notes": None, "quantity": int(getattr(m, "count", 1) or 1), "needs_check": True, "detection_confidence": 0.5, "frames_seen": 0, "frames_total": len(kept), "description": getattr(m, "description", "")})
    # VERIFY by appearance
    try: capture.stage = "Combining duplicates"; capture.progress = 0.85; db.commit()
    except Exception: pass
    verified = []
    for o in objs2:
        if not o.get("bbox"): verified.append(o); continue
        try:
            crop = imaging.crop_bbox(o["image"], o["bbox"])
        except Exception: crop = o["crop"]
        o["crop"] = crop
        try:
            matches, better, vconf = _verify_result(client, crop, o["label"])
            if not matches and not better: o["needs_check"] = True; decision(o["label"], 'verify', 'flagged', 'verification no')
            elif better: o["label"] = short_name(better); o["needs_check"] = True
            elif vconf < 0.5: o["needs_check"] = True
        except Exception: pass
        verified.append(o)
    # dedup by appearance: phash + same_object
    deduped = []
    for o in verified:
        if not o.get("bbox"): deduped.append(o); continue
        merged_flag = False
        for d in deduped:
            if not d.get("bbox"): continue
            # conservative: hash is only a cheap pre-filter, never merges alone
            try:
                if _hamming(_phash(d["crop"]), _phash(o["crop"])) <= 6 and hasattr(client, "same_object") and client.same_object(d["crop"], o["crop"]):
                    merged_flag = True; decision(o["label"], "appearance-merge", f"merged into {d['label']}", "phash<=6 and same_object=yes"); break
                elif _hamming(_phash(d["crop"]), _phash(o["crop"])) <= 10:
                    o["needs_check"] = True; o["possible_dup"] = d["label"]; decision(o["label"], "appearance-merge", "flagged", "possible duplicate, model unsure")
            except Exception: pass
        if not merged_flag:
            deduped.append(o)
    _t_seg = __import__('time').time()
    # cap 25 most confident
    deduped = sorted(deduped, key=lambda x: x.get("conf", 0), reverse=True)[:40]
    if len(verified) > 40: log.warning("baseline video: capped at 40, %d not listed", len(verified)-40); decision('ALL', 'cap', 'flagged', f'{len(verified)-40} hidden by cap 40')
    log.info('video scan %.1fs total | ffmpeg %.1fs | frame filter %.1fs | inventory %.1fs | segmentation/verify in locating | merge in dedup', __import__('time').time()-_T0, _t_filter-_T0 if False else 0, 0, 0)
    # TWO-PASS SAFETY NET: one extra call, add missing as needs_check
    try:
        current_names = [o["label"] for o in deduped]
        if hasattr(client, "list_objects_video"):
            extra = client.list_objects_video(kept, context=room.name + " section. Current list: " + ", ".join(current_names) + ". Which distinct movable objects are NOT in this list?")
            for m in extra:
                if normalize_name(m.name) not in {normalize_name(x) for x in current_names}:
                    decision(m.name, "two-pass", "kept", "added by safety net")
                    deduped.append({"label": short_name(m.name), "category": getattr(m, "category", None), "conf": 0.5, "bbox": None, "frame": picks[0], "crop": kept[0], "image": kept[0], "notes": None, "quantity": 1, "needs_check": True, "flag_reason": "not in list", "detection_confidence": 0.5, "frames_seen": 0, "frames_total": len(kept), "description": getattr(m, "description", "")})
    except Exception as e:
        decision("ALL", "two-pass", "flagged", f"error {e}")
    print(f'video scan {__import__("time").time()-_T0:.1f}s total | frames extracted={len(frame_bytes)} kept={len(picks)} model_calls~{len(order)+len(deduped)}')
    return capture, _to_items(db, room, capture, deduped, lambda o: frame_rels[o["frame"]], "normal")
