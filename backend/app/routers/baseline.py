from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Room
from ..pipeline import baseline
from ..schemas import BaselineResult
from .common import MAX_IMAGE, MAX_VIDEO, get_or_404, item_out, read_upload, video_ext

router = APIRouter(tags=["baseline"])


@router.post("/rooms/{room_id}/baseline/photo", response_model=BaselineResult)
async def baseline_photo(room_id: str, file: UploadFile = File(...), priority: str = Form("high"),
                         db: Session = Depends(get_db)):
    room = get_or_404(db, Room, room_id)
    raw = await read_upload(file, MAX_IMAGE)
    capture, items = baseline.process_photo(db, room, raw, "high" if priority == "high" else "normal")
    return BaselineResult(capture_id=capture.id, items=[item_out(i, db) for i in items])


@router.post("/rooms/{room_id}/baseline/video", response_model=BaselineResult)
async def baseline_video(room_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    room = get_or_404(db, Room, room_id)
    raw = await read_upload(file, MAX_VIDEO)
    capture, items = baseline.process_video(db, room, raw, video_ext(file))
    return BaselineResult(capture_id=capture.id, items=[item_out(i, db) for i in items])
