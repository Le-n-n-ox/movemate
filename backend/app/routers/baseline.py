import asyncio
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Capture, Room
from ..pipeline import baseline
from ..schemas import BaselineAck, CaptureStatus
from ..services import storage
from ..services.baseline_jobs import run_baseline_job
from ..services.frames import video_duration_seconds
from .common import MAX_IMAGE, MAX_VIDEO, get_or_404, item_out, read_upload, video_ext

router = APIRouter(tags=["baseline"])


@router.post("/rooms/{room_id}/baseline/photo", response_model=BaselineAck, status_code=202)
async def baseline_photo(room_id: str, file: UploadFile = File(...), priority: str = Form("high"),
                         db: Session = Depends(get_db)):
    room = get_or_404(db, Room, room_id)
    raw = await read_upload(file, MAX_IMAGE)
    # save upload + capture row immediately, process in background
    from ..services import imaging
    img = imaging.normalize_upload(raw)
    src_rel = storage.save_bytes(f"baseline/{room.id}", img)
    close_up = priority == "close_up"
    capture = Capture(room_id=room.id, kind="baseline_photo", media_path=src_rel, status="queued", progress=0.0, stage="Queued")
    db.add(capture); db.commit(); db.refresh(capture)
    # process_photo will re-normalize raw in job; keep raw bytes in memory for job (photo small)
    asyncio.create_task(run_baseline_job(capture.id, room.id, raw, "photo", "high" if close_up else ("high" if priority == "high" else "normal"), close_up=close_up))
    return BaselineAck(capture_id=capture.id, status="processing")


@router.post("/rooms/{room_id}/baseline/video", response_model=BaselineAck, status_code=202)
async def baseline_video(room_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    room = get_or_404(db, Room, room_id)
    raw = await read_upload(file, MAX_VIDEO)
    ext = video_ext(file)
    # cap video length 30s
    dur = await asyncio.to_thread(video_duration_seconds, raw, ext)
    if dur is not None and dur > 30:
        raise HTTPException(413, "Video too long (max 30 seconds for a 10-second sweep). Please record a shorter video.")
    capture = Capture(room_id=room.id, kind="baseline_video", status="queued", progress=0.0, stage="Queued")
    # store upload for job (frames extracted in job to avoid holding decoded frames)
    rel = storage.save_bytes("baseline_video", raw, ext)
    capture.media_path = rel
    db.add(capture); db.commit(); db.refresh(capture)
    # job will read from storage? For simplicity pass raw bytes (video <=150MB, one job at a time limited by semaphore)
    asyncio.create_task(run_baseline_job(capture.id, room.id, raw, "video", "normal", ext=ext))
    return BaselineAck(capture_id=capture.id, status="processing")


@router.get("/captures/{capture_id}", response_model=CaptureStatus)
def get_capture(capture_id: str, db: Session = Depends(get_db)):
    cap = get_or_404(db, Capture, capture_id)
    items = []
    if cap.status == "done":
        from ..models import Item
        items = db.query(Item).filter(Item.capture_id == cap.id).order_by(Item.created_at).all()
    return CaptureStatus(capture_id=cap.id, status=cap.status, progress=float(cap.progress or 0), stage=cap.stage, error=cap.error, item_count=int(cap.item_count or len(items)), frames_seen=int(cap.frames_seen or 0), frames_total=int(cap.frames_total or 0), items=[item_out(i, db) for i in items])


@router.get("/rooms/{room_id}/captures", response_model=list[CaptureStatus])
def list_room_captures(room_id: str, db: Session = Depends(get_db)):
    room = get_or_404(db, Room, room_id)
    caps = db.query(Capture).filter(Capture.room_id == room.id).order_by(Capture.created_at.desc()).limit(5).all()
    out = []
    for cap in caps:
        items = []
        if cap.status == "done":
            from ..models import Item
            items = db.query(Item).filter(Item.capture_id == cap.id).all()
        out.append(CaptureStatus(capture_id=cap.id, status=cap.status, progress=float(cap.progress or 0), stage=cap.stage, error=cap.error, item_count=int(cap.item_count or len(items)), frames_seen=int(cap.frames_seen or 0), frames_total=int(cap.frames_total or 0), items=[item_out(i, db) for i in items]))
    return out
