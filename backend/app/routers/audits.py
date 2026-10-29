from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Audit, Capture, Finding, Property, Room
from datetime import datetime, timezone

from ..pipeline.audit import run_audit
from ..pipeline.permissions import can_set
from ..schemas import AuditCreated, AuditDetail, FindingOut, FindingPatch, RunAck, UploadAck
from ..services import imaging, storage
from ..services.frames import extract_frames
from .common import MAX_IMAGE, MAX_VIDEO, finding_out, get_or_404, read_upload, video_ext

router = APIRouter(tags=["audits"])


@router.post("/properties/{property_id}/audits", response_model=AuditCreated)
def create_audit(property_id: str, db: Session = Depends(get_db)):
    get_or_404(db, Property, property_id)
    a = Audit(property_id=property_id)
    db.add(a)
    db.commit()
    return AuditCreated(id=a.id, property_id=a.property_id, status=a.status)


def _audit_room(db: Session, audit_id: str, room_id: str) -> tuple[Audit, Room]:
    a = get_or_404(db, Audit, audit_id)
    r = get_or_404(db, Room, room_id)
    if r.property_id != a.property_id:
        raise HTTPException(400, "Room does not belong to this audit's property")
    if a.status == "running":
        raise HTTPException(409, "Audit is already running")
    return a, r


@router.post("/audits/{audit_id}/rooms/{room_id}/video", response_model=UploadAck)
async def upload_video(audit_id: str, room_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    _audit_room(db, audit_id, room_id)
    raw = await read_upload(file, MAX_VIDEO)
    try:
        frames = extract_frames(raw, ext=video_ext(file))
    except RuntimeError as e:
        raise HTTPException(422, str(e))
    db.add(Capture(audit_id=audit_id, room_id=room_id, kind="audit_video", frame_paths=frames))
    db.commit()
    return UploadAck(audit_id=audit_id, room_id=room_id, frames=len(frames))


@router.post("/audits/{audit_id}/rooms/{room_id}/frames", response_model=UploadAck)
async def upload_frames(audit_id: str, room_id: str, files: list[UploadFile] = File(...), db: Session = Depends(get_db)):
    """Alternative to /video: send already-extracted JPEG frames (field name: files)."""
    _audit_room(db, audit_id, room_id)
    rels = []
    for f in files[:60]:
        data = imaging.normalize_upload(await read_upload(f, MAX_IMAGE), max_side=1280)
        rels.append(storage.save_bytes("frames", data))
    db.add(Capture(audit_id=audit_id, room_id=room_id, kind="audit_frames", frame_paths=rels))
    db.commit()
    return UploadAck(audit_id=audit_id, room_id=room_id, frames=len(rels))


@router.post("/audits/{audit_id}/run", response_model=RunAck, status_code=202)
def run(audit_id: str, background: BackgroundTasks, db: Session = Depends(get_db)):
    a = get_or_404(db, Audit, audit_id)
    if a.status == "running":
        raise HTTPException(409, "Audit is already running")
    if not db.query(Capture).filter(Capture.audit_id == audit_id).count():
        raise HTTPException(400, "Upload at least one room video or frames first")
    a.status = "running"
    a.stage = "Queued"
    db.commit()
    background.add_task(run_audit, audit_id)
    return RunAck(audit_id=a.id, status=a.status)


@router.get("/audits/{audit_id}", response_model=AuditDetail)
def get_audit(audit_id: str, db: Session = Depends(get_db)):
    a = get_or_404(db, Audit, audit_id)
    rooms = sorted({c.room_id for c in db.query(Capture).filter(Capture.audit_id == audit_id) if c.room_id})
    findings = db.query(Finding).filter(Finding.audit_id == audit_id).all()
    return AuditDetail(id=a.id, property_id=a.property_id, status=a.status, stage=a.stage, summary=a.summary,
                       rooms_uploaded=rooms, findings=[finding_out(f) for f in findings], created_at=a.created_at)


@router.patch("/findings/{finding_id}", response_model=FindingOut)
def patch_finding(finding_id: str, body: FindingPatch, db: Session = Depends(get_db)):
    f = get_or_404(db, Finding, finding_id)
    if body.resolution is not None and body.resolution != f.resolution:
        if not can_set(body.role, body.resolution, f.resolution, f.resolved_by):
            raise HTTPException(403, "Only the host can confirm or dismiss a finding. Cleaners can mark it as found.")
        f.resolution = body.resolution
        f.resolved_by = None if body.resolution == "open" else body.role
        f.resolved_at = None if body.resolution == "open" else datetime.now(timezone.utc)
    if body.note is not None:
        f.note = body.note
    db.commit()
    return finding_out(f)
