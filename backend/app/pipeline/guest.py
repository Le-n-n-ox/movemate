from sqlalchemy.orm import Session

from ..models import Item, Property, Room
from ..services import imaging
from ..services.models import get_client
from .matching import area, label_sim, rank_candidates

MIN_MATCH_CONFIDENCE = 0.6


def identify(db: Session, prop: Property, raw: bytes):
    """Return (item or None, guest_image_bytes, guess_label)."""
    client = get_client()
    img = imaging.normalize_upload(raw)
    segs = sorted(client.segment(img), key=lambda s: area(s.bbox), reverse=True)
    crop = imaging.crop_bbox(img, segs[0].bbox) if segs else img
    guess = client.label(crop).label

    items = (db.query(Item).join(Room, Item.room_id == Room.id)
             .filter(Room.property_id == prop.id, Item.status == "confirmed", Item.availability == "guest").all())
    if not items:
        return None, img, guess
    labels = [i.label for i in items]
    order = rank_candidates(labels, guess, top=5)
    cands = [items[i] for i in order]
    pick, conf = client.choose_candidate(img, [c.label for c in cands])
    if pick == 0 or conf < MIN_MATCH_CONFIDENCE:
        return None, img, guess
    return cands[pick - 1], img, guess


def guide_for(db: Session, item: Item, img: bytes) -> dict:
    if item.instructions:
        return item.instructions
    g = get_client().guide(img, item.label, item.notes or "")
    data = {"title": g.title, "steps": g.steps, "warnings": g.warnings, "seen": g.seen, "unsure": g.unsure}
    item.instructions = data
    db.commit()
    return data
