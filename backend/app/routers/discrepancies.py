from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Discrepancy, DiscrepancyEvent, InspectionItem, Item, Property, Room
from ..pipeline.inspection_logic import now_utc
from ..pipeline.permissions import can_assign, can_resolve
from ..schemas import (AiSuggestion, DiscrepancyDetail, DiscrepancyEventOut, DiscrepancyOut, DiscrepancyPatch,
                       DiscrepancyResolve)
from ..services import locations, storage
from .common import MAX_IMAGE, get_or_404, read_upload, save_condition, save_photo

router = APIRouter(tags=["discrepancies"])

# What each outcome does to the item's recorded condition. Cases never name or blame a person.
OUTCOME_CONDITION = {"recorded_missing": "missing", "replaced": "new", "repaired": "good"}


def _out(db: Session, d: Discrepancy) -> DiscrepancyOut:
    room = db.get(Room, d.room_id) if d.room_id else None
    return DiscrepancyOut(
        id=d.id, property_id=d.property_id, inspection_id=d.inspection_id, item_id=d.item_id, room_id=d.room_id,
        room_name=room.name if room else None, item_label=d.item_label, type=d.type, status=d.status,
        assigned_to=d.assigned_to, blocks_readiness=bool(d.blocks_readiness), outcome=d.outcome,
        resolution_note=d.resolution_note, resolved_by=d.resolved_by, resolved_at=d.resolved_at, created_at=d.created_at)


def _event_out(e: DiscrepancyEvent) -> DiscrepancyEventOut:
    return DiscrepancyEventOut(id=e.id, kind=e.kind, text=e.text, photo_url=storage.url_for(e.photo_path),
                               actor=e.actor, role=e.role, created_at=e.created_at)


def _add(db: Session, d: Discrepancy, kind: str, text: str | None, actor: str, role: str | None, photo: str | None = None):
    db.add(DiscrepancyEvent(discrepancy_id=d.id, kind=kind, text=text, photo_path=photo, actor=actor or "unknown", role=role))


@router.get("/properties/{property_id}/discrepancies", response_model=list[DiscrepancyOut])
def list_cases(property_id: str, status: str | None = Query(None), db: Session = Depends(get_db)):
    get_or_404(db, Property, property_id)
    q = db.query(Discrepancy).filter(Discrepancy.property_id == property_id)
    if status:
        q = q.filter(Discrepancy.status == status)
    return [_out(db, d) for d in q.order_by(Discrepancy.created_at.desc()).all()]


@router.get("/discrepancies/{case_id}", response_model=DiscrepancyDetail)
def get_case(case_id: str, db: Session = Depends(get_db)):
    d = get_or_404(db, Discrepancy, case_id)
    events = db.query(DiscrepancyEvent).filter(DiscrepancyEvent.discrepancy_id == d.id).order_by(DiscrepancyEvent.created_at).all()
    item = db.get(Item, d.item_id) if d.item_id else None
    expected = None
    if item:
        where = (locations.room_path(db, item.location_id) if item.location_id else None) or item.location_hint or "its saved place"
        alts = [a for a in (item.alternate_locations or []) if a]
        expected = where + (f". Also acceptable: {', '.join(alts)}" if alts else "")
    ai = None
    ii = db.get(InspectionItem, d.inspection_item_id) if d.inspection_item_id else None
    if ii and ii.ai_suggestion:
        a = ii.ai_suggestion
        ai = AiSuggestion(type=a["type"], observed=a.get("observed"), confidence=a.get("confidence"),
                          evidence_frame_url=storage.url_for(a.get("evidence_frame_path")), audit_id=a["audit_id"])
    return DiscrepancyDetail(**_out(db, d).model_dump(), events=[_event_out(e) for e in events],
                             reference_crop_url=storage.url_for(item.crop_path) if item else None,
                             expected_location=expected, ai_suggestion=ai)


@router.patch("/discrepancies/{case_id}", response_model=DiscrepancyOut)
def patch_case(case_id: str, body: DiscrepancyPatch, db: Session = Depends(get_db)):
    d = get_or_404(db, Discrepancy, case_id)
    if d.status == "resolved":
        raise HTTPException(409, "This case is resolved.")
    if body.status is not None and body.status != d.status:
        d.status = body.status
        _add(db, d, "status", f"Status: {body.status}.", body.actor, body.role)
    if body.assigned_to is not None:
        if not can_assign(body.role):
            raise HTTPException(403, "Only the host can assign a case.")
        d.assigned_to = body.assigned_to or None
        _add(db, d, "assigned", f"Assigned to {body.assigned_to}." if body.assigned_to else "Unassigned.", body.actor, body.role)
    if body.blocks_readiness is not None:
        if not can_assign(body.role):
            raise HTTPException(403, "Only the host can mark a case as blocking readiness.")
        d.blocks_readiness = body.blocks_readiness
        _add(db, d, "note", "Marked as blocking guest readiness." if body.blocks_readiness else "No longer blocks guest readiness.",
             body.actor, body.role)
    db.commit()
    return _out(db, d)


@router.post("/discrepancies/{case_id}/events", response_model=DiscrepancyEventOut)
async def add_event(case_id: str, role: str = Form(...), actor: str = Form("unknown"), kind: str = Form("note"),
                    text: str | None = Form(None), file: UploadFile | None = File(None), db: Session = Depends(get_db)):
    """Record a verification step: where you searched, a note, or photo evidence."""
    d = get_or_404(db, Discrepancy, case_id)
    if role not in ("cleaner", "host"):
        raise HTTPException(422, "role must be cleaner or host")
    if kind not in ("note", "search", "evidence"):
        raise HTTPException(422, "kind must be note, search or evidence")
    if d.status == "resolved":
        raise HTTPException(409, "This case is resolved.")
    if not (text or "").strip() and file is None:
        raise HTTPException(422, "Add a note or a photo.")
    photo = save_photo(await read_upload(file, MAX_IMAGE), f"cases/{d.id}") if file is not None else None
    ev = DiscrepancyEvent(discrepancy_id=d.id, kind="evidence" if (photo and kind == "note") else kind, text=(text or "").strip() or None,
                          photo_path=photo, actor=actor or "unknown", role=role)
    db.add(ev)
    if d.status == "open" and kind in ("search", "evidence"):
        d.status = "investigating"
    db.commit()
    db.refresh(ev)
    return _event_out(ev)


@router.post("/discrepancies/{case_id}/resolve", response_model=DiscrepancyOut)
def resolve_case(case_id: str, body: DiscrepancyResolve, db: Session = Depends(get_db)):
    """Close a case with a recorded outcome. Cleaners can record 'found' or 'restored to place'.
    Repairs, replacements and formally recording an item as missing are host decisions."""
    d = get_or_404(db, Discrepancy, case_id)
    if d.status == "resolved":
        raise HTTPException(409, "This case is already resolved.")
    if not can_resolve(body.role, body.outcome):
        raise HTTPException(403, "Only the host can record a repair, a replacement, or an item as missing. Cleaners can record found or restored to place.")
    d.status, d.outcome, d.resolution_note = "resolved", body.outcome, body.note
    d.resolved_by, d.resolved_at = body.actor, now_utc()
    _add(db, d, "resolved", f"Outcome: {body.outcome.replace('_', ' ')}. {body.note or ''}".strip(), body.actor, body.role)
    item = db.get(Item, d.item_id) if d.item_id else None
    if item is not None:
        new_cond = OUTCOME_CONDITION.get(body.outcome)
        if new_cond is None and item.condition in ("missing",):  # found or restored: it exists again
            new_cond = "good"
        if new_cond and new_cond != item.condition:
            save_condition(db, item, new_cond, f"Case resolved: {body.outcome.replace('_', ' ')}. {body.note or ''}".strip(), body.actor, body.role)
    db.commit()
    return _out(db, d)
