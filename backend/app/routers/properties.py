from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Audit, Discrepancy, Inspection, Item, Property, Room
from ..schemas import PropertyCreate, PropertyDetail, PropertyOut, PropertyPatch, RoomCreate, RoomOut, RoomPatch
from ..services import locations, storage
from ..services.sheet import render_room_sheet
from .common import MAX_IMAGE, get_or_404, read_upload, save_photo

router = APIRouter(tags=["properties"])


def _room_out(db: Session, r: Room) -> RoomOut:
    col = Item.room_id if r.parent_id is None else Item.location_id
    counts = {s: db.query(Item).filter(col == r.id, Item.status == s).count() for s in ("confirmed", "suggested")}
    return RoomOut(id=r.id, property_id=r.property_id, parent_id=r.parent_id, name=r.name, room_type=r.room_type or "other",
                   path=locations.room_path(db, r.id) or r.name, reference_photo_url=storage.url_for(r.reference_photo_path),
                   confirmed_items=counts["confirmed"], suggested_items=counts["suggested"])


def _top_rooms(db: Session, property_id: str) -> list[Room]:
    return db.query(Room).filter(Room.property_id == property_id, Room.parent_id.is_(None)).order_by(Room.created_at).all()


@router.post("/properties", response_model=PropertyOut)
def create_property(body: PropertyCreate, db: Session = Depends(get_db)):
    p = Property(**body.model_dump())
    db.add(p)
    db.commit()
    return p


@router.get("/properties", response_model=list[PropertyOut])
def list_properties(db: Session = Depends(get_db)):
    return db.query(Property).order_by(Property.created_at.desc()).all()


@router.get("/properties/{property_id}", response_model=PropertyDetail)
def get_property(property_id: str, db: Session = Depends(get_db)):
    p = get_or_404(db, Property, property_id)
    audit = db.query(Audit).filter(Audit.property_id == p.id).order_by(Audit.created_at.desc()).first()
    insp = db.query(Inspection).filter(Inspection.property_id == p.id).order_by(Inspection.created_at.desc()).first()
    open_cases = db.query(Discrepancy).filter(Discrepancy.property_id == p.id, Discrepancy.status != "resolved").count()
    base = PropertyOut.model_validate(p, from_attributes=True).model_dump()
    return PropertyDetail(**base, rooms=[_room_out(db, r) for r in _top_rooms(db, p.id)],
                          latest_audit_id=audit.id if audit else None, latest_inspection_id=insp.id if insp else None,
                          open_discrepancies=open_cases)


@router.patch("/properties/{property_id}", response_model=PropertyOut)
def patch_property(property_id: str, body: PropertyPatch, db: Session = Depends(get_db)):
    p = get_or_404(db, Property, property_id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    return p


@router.post("/properties/{property_id}/rooms", response_model=RoomOut)
def create_room(property_id: str, body: RoomCreate, db: Session = Depends(get_db)):
    get_or_404(db, Property, property_id)
    if body.parent_id:
        parent = get_or_404(db, Room, body.parent_id)
        if parent.property_id != property_id:
            raise HTTPException(400, "Parent location belongs to another property")
    r = Room(property_id=property_id, name=body.name, room_type=body.room_type, parent_id=body.parent_id)
    db.add(r)
    db.commit()
    return _room_out(db, r)


@router.get("/properties/{property_id}/rooms", response_model=list[RoomOut])
def list_rooms(property_id: str, db: Session = Depends(get_db)):
    get_or_404(db, Property, property_id)
    return [_room_out(db, r) for r in _top_rooms(db, property_id)]


@router.get("/rooms/{room_id}", response_model=RoomOut)
def get_room(room_id: str, db: Session = Depends(get_db)):
    return _room_out(db, get_or_404(db, Room, room_id))


@router.patch("/rooms/{room_id}", response_model=RoomOut)
def patch_room(room_id: str, body: RoomPatch, db: Session = Depends(get_db)):
    r = get_or_404(db, Room, room_id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    db.commit()
    return _room_out(db, r)


@router.get("/rooms/{room_id}/locations", response_model=list[RoomOut])
def list_locations(room_id: str, db: Session = Depends(get_db)):
    """Every sub-location below this room, at any depth, ordered by path."""
    root = get_or_404(db, Room, room_id)
    rooms = db.query(Room).filter(Room.property_id == root.property_id).all()
    children: dict[str, list[Room]] = {}
    for r in rooms:
        if r.parent_id:
            children.setdefault(r.parent_id, []).append(r)
    out, stack = [], list(children.get(root.id, []))
    while stack:
        cur = stack.pop()
        out.append(cur)
        stack.extend(children.get(cur.id, []))
    res = [_room_out(db, r) for r in out]
    return sorted(res, key=lambda x: x.path)


@router.post("/rooms/{room_id}/photo", response_model=RoomOut)
async def room_photo(room_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Reference photo of the room as it should look."""
    r = get_or_404(db, Room, room_id)
    raw = await read_upload(file, MAX_IMAGE)
    r.reference_photo_path = save_photo(raw, f"rooms/{r.id}")
    db.commit()
    return _room_out(db, r)


@router.get("/rooms/{room_id}/sheet", response_class=HTMLResponse)
def room_sheet(room_id: str, db: Session = Depends(get_db)):
    """Printable inventory sheet for one room (open in a browser, press Print)."""
    r = get_or_404(db, Room, room_id)
    p = db.get(Property, r.property_id)
    items = db.query(Item).filter(Item.room_id == r.id, Item.status == "confirmed").order_by(Item.created_at).all()
    rows = [{"label": i.label, "quantity": i.quantity, "kind": i.kind, "high_value": i.high_value,
             "availability": i.availability, "notes": (i.notes or "") if not (i.notes or "").startswith("[mock:") else "",
             "alternates": list(i.alternate_locations or []), "crop_url": storage.url_for(i.crop_path),
             "location": (locations.room_path(db, i.location_id) if i.location_id else None) or i.location_hint}
            for i in items]
    html = render_room_sheet(p.name, r.name, p.rules, storage.url_for(r.reference_photo_path), rows,
                             datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"))
    return HTMLResponse(html)
