from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Item, Property, Room
from ..pipeline import guest
from ..schemas import GuestAnswer, GuestGuide, GuestProperty
from .common import MAX_IMAGE, read_upload

router = APIRouter(tags=["guest"])


def _property_by_token(db: Session, token: str) -> Property:
    p = db.query(Property).filter(Property.guest_token == token).first()
    if not p:
        raise HTTPException(404, "Invalid guest link")
    return p


@router.get("/guest/{token}", response_model=GuestProperty)
def guest_property(token: str, db: Session = Depends(get_db)):
    p = _property_by_token(db, token)
    labels = [i.label for i in db.query(Item).join(Room, Item.room_id == Room.id).filter(
        Room.property_id == p.id, Item.status == "confirmed", Item.availability == "guest")]
    return GuestProperty(property_name=p.name, item_labels=sorted(set(labels)), house_rules=p.rules)


@router.post("/guest/{token}/ask", response_model=GuestAnswer)
async def guest_ask(token: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    p = _property_by_token(db, token)
    raw = await read_upload(file, MAX_IMAGE)
    item, img, guess = guest.identify(db, p, raw)
    if not item:
        return GuestAnswer(matched=False, item_label=guess or None,
                           message="I could not match this to your host's list of items. Try another angle, or contact your host.")
    data = guest.guide_for(db, item, img)
    return GuestAnswer(matched=True, item_label=item.label, message="Here is how to use it.", guide=GuestGuide(**data))
