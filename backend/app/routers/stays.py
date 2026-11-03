"""Stays: per-stay guest links for checkout recording (foundation)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..services import storage
from ..db import get_db

router = APIRouter(tags=["stays"])


class StayCreate(schemas.BaseModel if False else object):
    pass


from pydantic import BaseModel


class StayIn(BaseModel):
    reservation_ref: str | None = None
    guest_name: str | None = None


class StayOut(BaseModel):
    id: str
    property_id: str
    stay_token: str
    reservation_ref: str | None
    guest_name: str | None
    status: str
    created_at: str


@router.post("/properties/{property_id}/stays", response_model=StayOut)
def create_stay(property_id: str, body: StayIn, db: Session = Depends(get_db)):
    prop = db.get(models.Property, property_id)
    if not prop:
        raise HTTPException(404, "property not found")
    stay = models.Stay(property_id=property_id, reservation_ref=body.reservation_ref, guest_name=body.guest_name)
    db.add(stay)
    db.commit()
    db.refresh(stay)
    return StayOut(id=stay.id, property_id=stay.property_id, stay_token=stay.stay_token,
                   reservation_ref=stay.reservation_ref, guest_name=stay.guest_name,
                   status=stay.status, created_at=stay.created_at.isoformat())


@router.get("/s/{token}")
def guest_home(token: str, db: Session = Depends(get_db)):
    stay = db.query(models.Stay).filter(models.Stay.stay_token == token).first()
    if not stay:
        raise HTTPException(404, "stay not found")
    prop = db.get(models.Property, stay.property_id)
    confirmed = []
    for r in prop.rooms:
        for it in r.items:
            if it.status == "confirmed" and it.availability == "guest":
                confirmed.append(it.label)
    return {"property_name": prop.name, "house_rules": prop.rules, "stay_token": stay.stay_token,
            "status": stay.status, "guest_token": prop.guest_token, "item_labels": confirmed,
            "rooms": [{"id": r.id, "name": r.name, "room_type": r.room_type} for r in prop.rooms]}


from fastapi import UploadFile, File, Form


def _stay_or_404(token_or_id, db, by_token=True):
    if by_token:
        stay = db.query(models.Stay).filter(models.Stay.stay_token == token_or_id).first()
    else:
        stay = db.get(models.Stay, token_or_id)
    if not stay:
        raise HTTPException(404, "stay not found")
    return stay


@router.post("/s/{token}/checkout/rooms/{room_id}/video")
async def upload_room_video(token: str, room_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    stay = _stay_or_404(token, db)
    if stay.status == "closed":
        raise HTTPException(409, "stay is closed")
    data = await file.read()
    ext = (file.filename or "mp4").rsplit(".", 1)[-1]
    rel = storage.save_bytes("checkout", data, ext)
    rec = models.CheckoutRecording(stay_id=stay.id, room_id=room_id, media_path=rel)
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return {"id": rec.id, "room_id": room_id, "url": storage.url_for(rel), "created_at": rec.created_at.isoformat()}


@router.post("/s/{token}/checkout/rooms/{room_id}/note")
def add_room_note(token: str, room_id: str, text: str = Form(...), db: Session = Depends(get_db)):
    stay = _stay_or_404(token, db)
    if stay.status == "closed":
        raise HTTPException(409, "stay is closed")
    rec = models.CheckoutRecording(stay_id=stay.id, room_id=room_id, note=text)
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return {"id": rec.id, "room_id": room_id, "note": text, "created_at": rec.created_at.isoformat()}


@router.post("/s/{token}/checkout/report")
async def report_problem(token: str, text: str = Form(...), file: UploadFile | None = File(None), db: Session = Depends(get_db)):
    stay = _stay_or_404(token, db)
    if stay.status == "closed":
        raise HTTPException(409, "stay is closed")
    photo_rel = None
    if file is not None:
        data = await file.read()
        ext = (file.filename or "jpg").rsplit(".", 1)[-1]
        photo_rel = storage.save_bytes("checkout", data, ext)
    note = models.CheckoutNote(stay_id=stay.id, text=text, photo_path=photo_rel)
    db.add(note)
    db.commit()
    db.refresh(note)
    return {"id": note.id, "text": text, "photo_url": storage.url_for(photo_rel), "created_at": note.created_at.isoformat()}


@router.post("/s/{token}/checkout/submit")
def submit_checkout(token: str, db: Session = Depends(get_db)):
    stay = _stay_or_404(token, db)
    if stay.status != "open":
        raise HTTPException(409, "already submitted or closed")
    stay.status = "recorded"
    db.commit()
    db.refresh(stay)
    recs = db.query(models.CheckoutRecording).filter(models.CheckoutRecording.stay_id == stay.id).all()
    return {"reference": stay.stay_token, "submitted_at": stay.created_at.isoformat(),
            "rooms_recorded": len({r.room_id for r in recs if r.media_path}),
            "status": stay.status}


@router.get("/s/{token}/checkout/receipt")
def checkout_receipt(token: str, db: Session = Depends(get_db)):
    stay = _stay_or_404(token, db)
    recs = db.query(models.CheckoutRecording).filter(models.CheckoutRecording.stay_id == stay.id).all()
    notes = db.query(models.CheckoutNote).filter(models.CheckoutNote.stay_id == stay.id).all()
    return {"reference": stay.stay_token, "submitted_at": stay.created_at.isoformat(),
            "status": stay.status,
            "rooms_recorded": len({r.room_id for r in recs if r.media_path}),
            "notes": [{"text": n.text, "photo_url": storage.url_for(n.photo_path), "created_at": n.created_at.isoformat()} for n in notes]}


@router.post("/s/{token}/checkout/notes")
def late_note(token: str, text: str = Form(...), db: Session = Depends(get_db)):
    stay = _stay_or_404(token, db)
    if stay.status == "closed":
        raise HTTPException(409, "stay is closed")
    note = models.CheckoutNote(stay_id=stay.id, text=text)
    db.add(note)
    db.commit()
    db.refresh(note)
    return {"id": note.id, "text": text, "created_at": note.created_at.isoformat()}


@router.post("/stays/{stay_id}/close")
def close_stay(stay_id: str, db: Session = Depends(get_db)):
    stay = db.get(models.Stay, stay_id)
    if not stay:
        raise HTTPException(404, "stay not found")
    stay.status = "closed"
    from datetime import datetime, timezone
    stay.closed_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": stay.status}
