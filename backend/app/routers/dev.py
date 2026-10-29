"""Dev helpers (only mounted when APP_ENV=dev). POST /api/dev/seed makes a demo property."""
import io

from fastapi import APIRouter, Depends
from PIL import Image, ImageDraw
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import ConditionEvent, Item, Property, Room
from ..schemas import SeedResult
from ..services import storage

router = APIRouter(tags=["dev"], prefix="/dev")

COLORS = [(214, 140, 90), (90, 140, 214), (120, 190, 120), (200, 120, 190), (230, 200, 90)]


def _scene(boxes: list[tuple[dict, str]]) -> tuple[bytes, list[bytes]]:
    W, H = 1200, 800
    img = Image.new("RGB", (W, H), (236, 232, 224))
    d = ImageDraw.Draw(img)
    d.rectangle([0, int(H * 0.62), W, H], fill=(205, 196, 180))
    crops = []
    for n, (b, name) in enumerate(boxes):
        box = (int(b["x"] * W), int(b["y"] * H), int((b["x"] + b["w"]) * W), int((b["y"] + b["h"]) * H))
        d.rounded_rectangle(box, radius=18, fill=COLORS[n % len(COLORS)])
        d.text((box[0] + 14, box[1] + 14), name, fill=(255, 255, 255))
    for b, _ in boxes:
        box = (int(b["x"] * W), int(b["y"] * H), int((b["x"] + b["w"]) * W), int((b["y"] + b["h"]) * H))
        buf = io.BytesIO()
        img.crop(box).save(buf, "JPEG")
        crops.append(buf.getvalue())
    buf = io.BytesIO()
    img.save(buf, "JPEG")
    return buf.getvalue(), crops


@router.post("/seed", response_model=SeedResult)
def seed(db: Session = Depends(get_db)):
    prop = Property(name="Demo loft (seeded)", address="12 Harbour Lane, Unit 4", property_type="apartment", capacity=4,
                    details="Second floor with lift. Wi-Fi password is on the fridge.",
                    rules="No shoes inside. Quiet hours after 22:00. No parties. Leave the keys in the lockbox at checkout.")
    db.add(prop)
    db.commit()

    def room(name, rtype):
        r = Room(property_id=prop.id, name=name, room_type=rtype)
        db.add(r)
        db.commit()
        return r

    def sub(parent, name):
        r = Room(property_id=prop.id, name=name, parent_id=parent.id)
        db.add(r)
        db.commit()
        return r

    living, kitchen, bath = room("Living room", "living"), room("Kitchen", "kitchen"), room("Bathroom", "bathroom")
    cabinet = sub(living, "Glass cabinet")
    top_shelf = sub(cabinet, "Top shelf")
    upper = sub(kitchen, "Upper cupboard")
    left_shelf = sub(upper, "Left shelf")
    under_sink = sub(kitchen, "Under-sink cupboard")

    # (label, qty, notes, bbox or None, hint, extras)
    spec = {
        living: [
            ("Samsung TV remote", 1, "[mock:moved=on the sofa, left cushion]", {"x": 0.08, "y": 0.55, "w": 0.18, "h": 0.12}, "On the coffee table",
             {"kind": "movable", "alternate_locations": ["TV console"]}),
            ("Black Roku remote", 1, "[mock:missing]", {"x": 0.35, "y": 0.58, "w": 0.16, "h": 0.10}, "On the coffee table, next to the lamp",
             {"kind": "movable"}),
            ("Wine glass set", 4, "[mock:count=3]", {"x": 0.60, "y": 0.30, "w": 0.28, "h": 0.30}, "Glass cabinet, top shelf",
             {"kind": "movable", "alternate_locations": ["dining table"], "location": top_shelf}),
            ("Samsung Smart TV", 1, None, {"x": 0.30, "y": 0.10, "w": 0.30, "h": 0.22}, "Wall mounted",
             {"kind": "fixed", "high_value": True}),
        ],
        kitchen: [
            ("Nespresso Vertuo Plus", 1, "Fill the water tank on the back right. Push the silver lever up to insert a pod. Press the top button once.",
             {"x": 0.10, "y": 0.25, "w": 0.30, "h": 0.40}, "Kitchen counter, left of the sink", {"kind": "movable", "high_value": True, "condition": "worn"}),
            ("Smart speaker", 1, "[mock:unverified]", {"x": 0.55, "y": 0.35, "w": 0.18, "h": 0.25}, "Shelf above the fridge", {"kind": "movable"}),
            ("Bottle opener", 1, "[mock:otherroom]", {"x": 0.62, "y": 0.66, "w": 0.16, "h": 0.10}, "Kitchen drawer by the sink", {"kind": "shared"}),
            ("Coffee pods", 20, None, None, "Upper cupboard, left shelf",
             {"kind": "consumable", "min_quantity": 6, "location": left_shelf}),
            ("Cleaning supplies", 6, None, None, "Under the sink",
             {"kind": "consumable", "min_quantity": 2, "availability": "staff_only", "location": under_sink}),
        ],
        bath: [
            ("Bath towels", 4, None, None, "Bathroom shelf", {"kind": "movable"}),
            ("Toilet paper rolls", 12, None, None, "Bathroom cabinet", {"kind": "consumable", "min_quantity": 4}),
        ],
    }
    for r, items in spec.items():
        boxed = [(b, label) for label, _, _, b, _, _ in items if b]
        src_rel, crops = (None, [])
        if boxed:
            src, crops = _scene(boxed)
            src_rel = storage.save_bytes(f"baseline/{r.id}", src)
        crop_iter = iter(crops)
        for label, qty, notes, bbox, hint, extra in items:
            loc = extra.get("location")
            item = Item(room_id=r.id, label=label, quantity=qty, notes=notes, bbox=bbox, location_hint=hint,
                        crop_path=storage.save_bytes(f"crops/{r.id}", next(crop_iter)) if bbox else None,
                        source_image_path=src_rel if bbox else None, priority="high" if bbox else "normal", status="confirmed",
                        kind=extra.get("kind", "movable"), high_value=extra.get("high_value", False),
                        availability=extra.get("availability", "guest"), min_quantity=extra.get("min_quantity"),
                        alternate_locations=extra.get("alternate_locations", []), location_id=loc.id if loc else None,
                        condition=extra.get("condition", "good"))
            db.add(item)
            db.commit()
            if item.condition == "worn":
                db.add(ConditionEvent(item_id=item.id, condition="good", note="Condition at first scan", actor="seed", role="host"))
                db.add(ConditionEvent(item_id=item.id, condition="worn", previous="good", note="Needs descaling", actor="seed", role="host"))
                db.commit()
    # one suggested (unconfirmed) item so the review screen has something to show
    src, crops = _scene([({"x": 0.2, "y": 0.3, "w": 0.3, "h": 0.3}, "Ceramic table lamp")])
    db.add(Item(room_id=living.id, label="Ceramic table lamp", bbox={"x": 0.2, "y": 0.3, "w": 0.3, "h": 0.3},
                crop_path=storage.save_bytes(f"crops/{living.id}", crops[0]),
                source_image_path=storage.save_bytes(f"baseline/{living.id}", src), status="suggested"))
    db.commit()
    return SeedResult(property_id=prop.id, guest_token=prop.guest_token, room_ids=[living.id, kitchen.id, bath.id])
