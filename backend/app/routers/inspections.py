from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import (Audit, CleaningCheck, Discrepancy, DiscrepancyEvent, Finding, Inspection, InspectionItem, Item,
                      Property, Room)
from ..pipeline import inspection_logic as L
from ..pipeline.permissions import can_approve_exception
from ..schemas import (AiSuggestRequest, AiSuggestResult, AiSuggestion, CleaningCheckOut, CleaningCheckPatch,
                       CompleteRequest, InspectionCreate, InspectionDetail, InspectionItemOut, InspectionItemPatch,
                       InspectionOut, ReadinessReport, RoomInspection, RoomReadiness)
from ..services import locations, storage
from .common import MAX_IMAGE, get_or_404, read_upload, save_condition, save_photo

router = APIRouter(tags=["inspections"])

KIND_LABEL = {"after_checkout": "after-checkout", "after_cleaning": "after-cleaning", "before_checkin": "before-check-in"}


def _top_rooms(db: Session, property_id: str) -> list[Room]:
    return db.query(Room).filter(Room.property_id == property_id, Room.parent_id.is_(None)).order_by(Room.created_at).all()


def _editable(insp: Inspection) -> None:
    if insp.status != "in_progress":
        raise HTTPException(409, "This inspection is already completed.")


def _ai_out(d: dict | None) -> AiSuggestion | None:
    if not d:
        return None
    return AiSuggestion(type=d["type"], observed=d.get("observed"), confidence=d.get("confidence"),
                        evidence_frame_url=storage.url_for(d.get("evidence_frame_path")), audit_id=d["audit_id"])


def _latest_case(db: Session, ii_id: str) -> Discrepancy | None:
    return (db.query(Discrepancy).filter(Discrepancy.inspection_item_id == ii_id)
            .order_by(Discrepancy.created_at.desc()).first())


def _ii_out(db: Session, ii: InspectionItem, src: Item | None, case: Discrepancy | None) -> InspectionItemOut:
    return InspectionItemOut(
        id=ii.id, inspection_id=ii.inspection_id, room_id=ii.room_id, item_id=ii.item_id, label=ii.label, kind=ii.kind,
        high_value=bool(ii.high_value), expected_quantity=ii.expected_quantity, min_quantity=ii.min_quantity,
        result=ii.result, observed_quantity=ii.observed_quantity, note=ii.note, photo_url=storage.url_for(ii.photo_path),
        checked_by=ii.checked_by, checked_at=ii.checked_at,
        reference_crop_url=storage.url_for(src.crop_path) if src else None,
        location_path=(locations.room_path(db, src.location_id) if (src and src.location_id) else None) or (src.location_hint if src else None),
        alternate_locations=list(src.alternate_locations or []) if src else [], ai_suggestion=_ai_out(ii.ai_suggestion),
        discrepancy_id=case.id if case else None)


def _gather(db: Session, insp: Inspection):
    rooms = _top_rooms(db, insp.property_id)
    items = db.query(InspectionItem).filter(InspectionItem.inspection_id == insp.id).all()
    checks = db.query(CleaningCheck).filter(CleaningCheck.inspection_id == insp.id).all()
    cases = db.query(Discrepancy).filter(Discrepancy.inspection_id == insp.id).order_by(Discrepancy.created_at).all()
    return rooms, items, checks, cases


def _room_summaries(rooms, items, checks) -> list[dict]:
    out = []
    for r in rooms:
        its = [i for i in items if i.room_id == r.id]
        chs = [c for c in checks if c.room_id == r.id]
        if not its and not chs:
            continue
        out.append({"room": r, "items": its, "checks": chs, "name": r.name, "results": [i.result for i in its],
                    "cleaning_open": sum(1 for c in chs if not c.done),
                    "cleaning_status": L.section_status(sum(1 for c in chs if c.done), len(chs)),
                    "inventory_status": L.inventory_status([i.result for i in its])})
    return out


def _blockers(summaries, cases) -> list[str]:
    return L.compute_blockers(summaries, [{"item_label": c.item_label, "type": c.type, "status": c.status} for c in cases])


def _out(insp: Inspection) -> InspectionOut:
    return InspectionOut.model_validate(insp, from_attributes=True)


@router.post("/properties/{property_id}/inspections", response_model=InspectionOut)
def create_inspection(property_id: str, body: InspectionCreate, db: Session = Depends(get_db)):
    """Generates the checklist from the property's confirmed inventory (and cleaning tasks for after-cleaning
    and before-check-in inspections). Items already recorded as missing are not re-checked."""
    get_or_404(db, Property, property_id)
    insp = Inspection(property_id=property_id, kind=body.kind, inspector=body.inspector, reservation_ref=body.reservation_ref)
    db.add(insp)
    db.flush()
    for room in _top_rooms(db, property_id):
        items = (db.query(Item).filter(Item.room_id == room.id, Item.status == "confirmed", Item.condition != "missing")
                 .order_by(Item.created_at).all())
        for it in items:
            db.add(InspectionItem(inspection_id=insp.id, room_id=room.id, item_id=it.id, label=it.label, kind=it.kind or "movable",
                                  high_value=bool(it.high_value), expected_quantity=it.quantity, min_quantity=it.min_quantity))
        for label in L.default_cleaning_checks(room.room_type or "other", body.kind):
            db.add(CleaningCheck(inspection_id=insp.id, room_id=room.id, label=label))
    db.commit()
    return _out(insp)


@router.get("/properties/{property_id}/inspections", response_model=list[InspectionOut])
def list_inspections(property_id: str, db: Session = Depends(get_db)):
    get_or_404(db, Property, property_id)
    rows = db.query(Inspection).filter(Inspection.property_id == property_id).order_by(Inspection.created_at.desc()).all()
    return [_out(i) for i in rows]


@router.get("/inspections/{inspection_id}", response_model=InspectionDetail)
def get_inspection(inspection_id: str, db: Session = Depends(get_db)):
    insp = get_or_404(db, Inspection, inspection_id)
    rooms, items, checks, cases = _gather(db, insp)
    src = {i.id: i for i in db.query(Item).filter(Item.id.in_([x.item_id for x in items if x.item_id] or [""])).all()}
    case_by_item: dict[str, Discrepancy] = {}
    for c in cases:  # oldest first, so the latest case wins
        if c.inspection_item_id:
            case_by_item[c.inspection_item_id] = c
    summaries = _room_summaries(rooms, items, checks)
    blockers = _blockers(summaries, cases)
    room_out = [RoomInspection(
        room_id=s["room"].id, room_name=s["room"].name, room_type=s["room"].room_type or "other",
        cleaning_status=s["cleaning_status"], inventory_status=s["inventory_status"],
        items=[_ii_out(db, i, src.get(i.item_id), case_by_item.get(i.id)) for i in s["items"]],
        cleaning=[CleaningCheckOut(id=c.id, room_id=c.room_id, label=c.label, done=c.done, done_by=c.done_by, done_at=c.done_at)
                  for c in s["checks"]]) for s in summaries]
    return InspectionDetail(**_out(insp).model_dump(), rooms=room_out, blockers=blockers,
                            can_complete=insp.status == "in_progress" and not blockers)


def _sync_case(db: Session, insp: Inspection, ii: InspectionItem, previous: str, final: str, actor: str, role: str) -> None:
    """Open, update or leave alone the case for an inspection item. Cases are facts and an audit trail, never blame."""
    case = _latest_case(db, ii.id)
    unresolved = case is not None and case.status != "resolved"
    if final in L.PROBLEM_RESULTS:
        ctype = L.CASE_TYPE[final]
        if unresolved:
            if case.type != ctype:
                case.type = ctype
                db.add(DiscrepancyEvent(discrepancy_id=case.id, kind="status", actor=actor, role=role,
                                        text=f"Result changed to {final.replace('_', ' ')}."))
        elif case is None or previous != final:
            qty = f" Counted {ii.observed_quantity} of {ii.expected_quantity}." if ii.observed_quantity is not None else ""
            new = Discrepancy(property_id=insp.property_id, inspection_id=insp.id, inspection_item_id=ii.id, item_id=ii.item_id,
                              room_id=ii.room_id, item_label=ii.label, type=ctype)
            db.add(new)
            db.flush()
            db.add(DiscrepancyEvent(discrepancy_id=new.id, kind="detected", actor=actor, role=role,
                                    text=f"Marked {final.replace('_', ' ')} during the {KIND_LABEL.get(insp.kind, insp.kind)} inspection.{qty}"))
        if final == "damaged" and ii.item_id:
            it = db.get(Item, ii.item_id)
            if it and it.condition != "damaged":
                save_condition(db, it, "damaged", f"Seen damaged in inspection. {ii.note or ''}".strip(), actor, role)


@router.patch("/inspection-items/{ii_id}", response_model=InspectionItemOut)
def patch_inspection_item(ii_id: str, body: InspectionItemPatch, db: Session = Depends(get_db)):
    ii = get_or_404(db, InspectionItem, ii_id)
    insp = get_or_404(db, Inspection, ii.inspection_id)
    _editable(insp)
    if body.note is not None:
        ii.note = body.note
    if body.result is not None or body.observed_quantity is not None:
        final, observed, err = L.validate_result(
            kind=ii.kind, result=body.result, high_value=bool(ii.high_value), has_photo=bool(ii.photo_path),
            expected=ii.expected_quantity, observed=body.observed_quantity, min_quantity=ii.min_quantity)
        if err:
            raise HTTPException(422, err)
        case = _latest_case(db, ii.id)
        if final in ("ok", "low_stock") and case is not None and case.status != "resolved":
            raise HTTPException(409, "Resolve the open case first, so the record stays complete.")
        previous = ii.result
        ii.result, ii.observed_quantity = final, observed
        ii.checked_by, ii.checked_at = body.actor, L.now_utc()
        _sync_case(db, insp, ii, previous, final, body.actor, body.role)
    db.commit()
    return _ii_out(db, ii, db.get(Item, ii.item_id) if ii.item_id else None, _latest_case(db, ii.id))


@router.post("/inspection-items/{ii_id}/photo", response_model=InspectionItemOut)
async def inspection_item_photo(ii_id: str, file: UploadFile = File(...), actor: str = Form("unknown"),
                                role: str | None = Form(None), db: Session = Depends(get_db)):
    """Photo evidence for a check. Required before a high-value item can be marked OK. Also lands in the case trail."""
    ii = get_or_404(db, InspectionItem, ii_id)
    _editable(get_or_404(db, Inspection, ii.inspection_id))
    ii.photo_path = save_photo(await read_upload(file, MAX_IMAGE), f"inspections/{ii.inspection_id}")
    case = _latest_case(db, ii.id)
    if case is not None and case.status != "resolved":
        db.add(DiscrepancyEvent(discrepancy_id=case.id, kind="evidence", photo_path=ii.photo_path, actor=actor,
                                role=role if role in ("cleaner", "host") else None, text="Photo added during inspection."))
    db.commit()
    return _ii_out(db, ii, db.get(Item, ii.item_id) if ii.item_id else None, case)


@router.patch("/cleaning-checks/{check_id}", response_model=CleaningCheckOut)
def patch_cleaning_check(check_id: str, body: CleaningCheckPatch, db: Session = Depends(get_db)):
    c = get_or_404(db, CleaningCheck, check_id)
    _editable(get_or_404(db, Inspection, c.inspection_id))
    c.done = body.done
    c.done_by, c.done_at = (body.actor, L.now_utc()) if body.done else (None, None)
    db.commit()
    return CleaningCheckOut(id=c.id, room_id=c.room_id, label=c.label, done=c.done, done_by=c.done_by, done_at=c.done_at)


@router.post("/inspections/{inspection_id}/ai-suggestions", response_model=AiSuggestResult)
def import_ai_suggestions(inspection_id: str, body: AiSuggestRequest, db: Session = Depends(get_db)):
    """Copy AI video-audit findings onto the checklist as hints. They are NOT results: a person still checks every item."""
    insp = get_or_404(db, Inspection, inspection_id)
    audit = get_or_404(db, Audit, body.audit_id)
    if audit.property_id != insp.property_id:
        raise HTTPException(400, "That audit belongs to another property")
    items = db.query(InspectionItem).filter(InspectionItem.inspection_id == inspection_id).all()
    for i in items:
        i.ai_suggestion = None  # re-importing replaces earlier hints
    by_item = {i.item_id: i for i in items if i.item_id}
    applied = 0
    for f in db.query(Finding).filter(Finding.audit_id == body.audit_id).all():
        target = by_item.get(f.item_id)
        if target is not None and f.resolution != "dismissed":
            target.ai_suggestion = {"type": f.type, "observed": f.observed, "confidence": f.confidence,
                                    "evidence_frame_path": f.evidence_frame_path, "audit_id": body.audit_id}
            applied += 1
    db.commit()
    return AiSuggestResult(applied=applied)


@router.post("/inspections/{inspection_id}/complete", response_model=InspectionOut)
def complete_inspection(inspection_id: str, body: CompleteRequest, db: Session = Depends(get_db)):
    """Completes only when every check is done and every case is resolved, unless the host approves an exception."""
    insp = get_or_404(db, Inspection, inspection_id)
    _editable(insp)
    rooms, items, checks, cases = _gather(db, insp)
    blockers = _blockers(_room_summaries(rooms, items, checks), cases)
    if blockers:
        note = (body.exception_note or "").strip()
        if not can_approve_exception(body.role):
            raise HTTPException(409, "Cannot complete yet: " + "; ".join(blockers[:4]) + ". Finish these, or ask the host to approve an exception.")
        if not note:
            raise HTTPException(422, "Add a note explaining the exception: " + "; ".join(blockers[:4]))
        insp.status, insp.exception_note, insp.exception_by = "completed_with_exception", note, body.actor
    else:
        insp.status = "completed"
    insp.completed_at = L.now_utc()
    db.commit()
    return _out(insp)


@router.get("/inspections/{inspection_id}/readiness", response_model=ReadinessReport)
def readiness(inspection_id: str, db: Session = Depends(get_db)):
    """Room-by-room readiness for the next guest. Built from verified checks and recorded exceptions only."""
    insp = get_or_404(db, Inspection, inspection_id)
    prop = db.get(Property, insp.property_id)
    rooms, items, checks, cases = _gather(db, insp)
    summaries = _room_summaries(rooms, items, checks)
    case_dicts = [{"blocks_readiness": c.blocks_readiness, "status": c.status, "outcome": c.outcome} for c in cases]
    status = L.readiness_status(inspection_status=insp.status, cases=case_dicts)
    blocking = _blockers(summaries, cases) if insp.status == "in_progress" else []
    blocking += [f"{c.item_label}: essential item still unresolved ({(c.outcome or c.status).replace('_', ' ')})"
                 for c in cases if L.case_blocks_readiness({"blocks_readiness": c.blocks_readiness, "status": c.status, "outcome": c.outcome})]
    room_names = {r.id: r.name for r in rooms}
    gaps = [f"{i.label} ({i.condition.replace('_', ' ')}) in {room_names.get(i.room_id, '?')}"
            for i in db.query(Item).filter(Item.status == "confirmed", Item.condition.in_(["missing", "damaged", "under_repair"]),
                                           Item.room_id.in_(list(room_names) or [""])).all()]
    low = [f"{i.label}: {i.observed_quantity} left, minimum {i.min_quantity}" for i in items if i.result == "low_stock"]
    issues_by_room = []
    for s in summaries:
        issues = [f"{i.label}: {i.result.replace('_', ' ')}" for i in s["items"] if i.result in L.PROBLEM_RESULTS]
        issues += [f"{i.label}: low stock" for i in s["items"] if i.result == "low_stock"]
        issues += [f"Cleaning: {c.label}" for c in s["checks"] if not c.done]
        issues_by_room.append(RoomReadiness(room_name=s["name"], cleaning_status=s["cleaning_status"],
                                            inventory_status=s["inventory_status"], issues=issues))
    return ReadinessReport(
        inspection_id=insp.id, property_name=prop.name, kind=insp.kind, inspector=insp.inspector, reservation_ref=insp.reservation_ref,
        status=status, cleaning_status=L.overall_status([s["cleaning_status"] for s in summaries]),
        inventory_status=L.overall_status([s["inventory_status"] for s in summaries]),
        summary=L.summary_line(status, blocking, gaps, low), rooms=issues_by_room, blocking=blocking,
        open_cases=[f"{c.item_label} ({c.type.replace('_', ' ')})" for c in cases if c.status != "resolved"],
        known_gaps=gaps, low_stock=low, exception_note=insp.exception_note, exception_by=insp.exception_by,
        generated_at=L.now_utc())
