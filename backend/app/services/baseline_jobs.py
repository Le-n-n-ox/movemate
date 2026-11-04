"""In-process baseline job worker: max 2 concurrent, each job own DB session."""
import asyncio
import logging
import time

from ..db import SessionLocal
from ..models import Capture, Room
from ..pipeline import baseline

log = logging.getLogger(__name__)
_sem = asyncio.Semaphore(2)
_active = 0


def active_jobs() -> int:
    return _active


async def run_baseline_job(capture_id: str, room_id: str, raw: bytes, kind: str, priority: str = "high", ext: str = "mp4", close_up: bool = False):
    global _active
    async with _sem:
        _active += 1
        db = SessionLocal()
        try:
            cap = db.get(Capture, capture_id)
            room = db.get(Room, room_id)
            if not cap or not room:
                return
            cap.status = "queued"; cap.stage = "Queued"; cap.progress = 0.0; db.commit()
            t0 = time.time()
            def _work():
                # sync work in thread, own session already opened here (not request session)
                if kind == "photo":
                    _, items = baseline.process_photo(db, room, raw, priority, close_up=close_up, capture=cap)
                else:
                    _, items = baseline.process_video(db, room, raw, ext=ext, capture=cap)
                return items
            items = await asyncio.to_thread(_work)
            cap = db.get(Capture, capture_id)
            cap.status = "done"; cap.progress = 1.0; cap.stage = "Done"; cap.error = None; cap.item_count = len(items); db.commit()
            log.info("scan capture=%s kind=%s time=%.1fs items=%d cost=%.4f", capture_id, kind, time.time()-t0, len(items), 0.01*len(items))
        except Exception as e:
            try:
                cap = db.get(Capture, capture_id)
                if cap:
                    cap.status = "failed"; cap.error = str(e)[:300] or "Scan failed"; cap.stage = "Failed"; db.commit()
            except Exception:
                pass
            log.exception("scan failed capture=%s", capture_id)
        finally:
            _active -= 1
            db.close()
