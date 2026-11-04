import asyncio
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Item, Property, Room
from ..pipeline import guest
from ..schemas import GuestAnswer, GuestGuide, GuestProperty
from ..services.rate_limit import guest_rate_limiter
from ..services import storage
from .common import MAX_IMAGE, MAX_VIDEO, read_upload

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
async def guest_ask(token: str, request: Request, file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Rate limit: 10 requests per hour per IP
    guest_rate_limiter.check(request)
    
    p = _property_by_token(db, token)
    raw = await read_upload(file, MAX_IMAGE)
    try:
        item, img, guess = await run_in_threadpool(guest.identify, db, p, raw)
    except Exception as e:
        raise HTTPException(502, f"Model call failed: {e}")
    if not item:
        return GuestAnswer(matched=False, item_label=guess or None,
                           message="I could not match this to your host's list of items. Try another angle, or contact your host.")
    try:
        data = await run_in_threadpool(guest.guide_for, db, item, img)
    except Exception as e:
        raise HTTPException(502, f"Model call failed: {e}")
    return GuestAnswer(matched=True, item_label=item.label, message="Here is how to use it.", guide=GuestGuide(**data))


@router.post("/guest/{token}/checkout/video")
async def guest_checkout_video(token: str, request: Request, file: UploadFile = File(...), db: Session = Depends(get_db)):
    p = _property_by_token(db, token)
    raw = await read_upload(file, MAX_VIDEO)
    ctype = (file.content_type or "").lower()
    ext = "jpg" if ctype.startswith("image/") else "mp4"
    rel = storage.save_bytes("checkout", raw, ext)
    return {"path": rel, "property": p.name, "type": "image" if ext == "jpg" else "video"}
