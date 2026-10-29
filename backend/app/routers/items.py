from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import ConditionEvent, Item, Room
from ..schemas import ConditionEventOut, ConfirmAllResult, ItemCreate, ItemOut, ItemPatch
from ..services import locations
from .common import (MAX_IMAGE, condition_event_out, get_or_404, item_out, read_upload, save_condition, save_photo)

router = APIRouter(tags=["items"])
CONDITIONS = {"new", "good", "worn", "damaged", "missing", "under_repair"}


def _place(db: Session, item: Item, location_id: str | None, property_id: str) -> None:
    """Put an item in a room or sub-location. The item always belongs to the top-level room of that place."""
    if location_id is None:
        item.location_id = None
        return
    loc = get_or_404(db, Room, location_id)
    if loc.property_id != property_id:
        raise HTTPException(400, "Location belongs to another property")
    root = locations.root_room(db, loc)
    item.room_id = root.id
    item.location_id = loc.id if loc.parent_id else None


@router.get("/rooms/{room_id}/items", response_model=list[ItemOut])
def list_items(room_id: str, status: str | None = Query(None), db: Session = Depends(get_db)):
    room = get_or_404(db, Room, room_id)
    col = Item.room_id if room.parent_id is None else Item.location_id
    q = db.query(Item).filter(col == room_id)
    if status:
        q = q.filter(Item.status == status)
    return [item_out(i, db) for i in q.order_by(Item.created_at).all()]


@router.post("/rooms/{room_id}/items", response_model=ItemOut)
def create_item(room_id: str, body: ItemCreate, db: Session = Depends(get_db)):
    """Add an item by hand (no photo needed), for example consumables like coffee or toilet paper."""
    room = get_or_404(db, Room, room_id)
    root = locations.root_room(db, room)
    item = Item(room_id=root.id, label=body.label, quantity=body.quantity, kind=body.kind, category=body.category,
                location_hint=body.location_hint, notes=body.notes, availability=body.availability,
                high_value=body.high_value, min_quantity=body.min_quantity,
                alternate_locations=body.alternate_locations, status="confirmed", priority="normal")
    if room.parent_id:
        item.location_id = room.id
    if body.location_id:
        _place(db, item, body.location_id, room.property_id)
    db.add(item)
    db.commit()
    return item_out(item, db)


@router.patch("/items/{item_id}", response_model=ItemOut)
def patch_item(item_id: str, body: ItemPatch, db: Session = Depends(get_db)):
    item = get_or_404(db, Item, item_id)
    data = body.model_dump(exclude_unset=True)
    if "location_id" in data:
        _place(db, item, data.pop("location_id"), db.get(Room, item.room_id).property_id)
    for k, v in data.items():
        setattr(item, k, v)
    if "notes" in data or "label" in data:
        item.instructions = None  # cached guest guide is stale
    db.commit()
    return item_out(item, db)


@router.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: str, db: Session = Depends(get_db)):
    db.delete(get_or_404(db, Item, item_id))
    db.commit()


@router.post("/rooms/{room_id}/items/confirm-all", response_model=ConfirmAllResult)
def confirm_all(room_id: str, db: Session = Depends(get_db)):
    get_or_404(db, Room, room_id)
    n = db.query(Item).filter(Item.room_id == room_id, Item.status == "suggested").update({"status": "confirmed"})
    db.commit()
    return ConfirmAllResult(confirmed=n)


@router.post("/items/{item_id}/condition", response_model=ItemOut)
async def set_condition(item_id: str, condition: str = Form(...), note: str | None = Form(None),
                        actor: str = Form("unknown"), role: str | None = Form(None),
                        file: UploadFile | None = File(None), db: Session = Depends(get_db)):
    """Record a condition change (new, good, worn, damaged, missing, under_repair) with an optional photo.
    The history keeps every change, so before and after photos stay available across stays."""
    item = get_or_404(db, Item, item_id)
    if condition not in CONDITIONS:
        raise HTTPException(400, f"Condition must be one of: {', '.join(sorted(CONDITIONS))}")
    photo = save_photo(await read_upload(file, MAX_IMAGE), f"conditions/{item.id}") if file is not None else None
    save_condition(db, item, condition, note, actor, role if role in ("cleaner", "host") else None, photo)
    db.commit()
    return item_out(item, db)


@router.get("/items/{item_id}/history", response_model=list[ConditionEventOut])
def condition_history(item_id: str, db: Session = Depends(get_db)):
    get_or_404(db, Item, item_id)
    events = db.query(ConditionEvent).filter(ConditionEvent.item_id == item_id).order_by(ConditionEvent.created_at.desc()).all()
    return [condition_event_out(e) for e in events]
