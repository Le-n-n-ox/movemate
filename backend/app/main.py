import threading
import time

from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import Base, SessionLocal, engine
from .routers import audits, baseline, discrepancies, guest, inspections, items, properties, meta, meta_api
from .schemas import Health
from .services import storage


def _run_retention_cleanup():
    """Background thread that runs retention cleanup daily."""
    while True:
        try:
            db = SessionLocal()
            from .services.retention import run_retention_cleanup
            run_retention_cleanup(db)
            db.close()
        except Exception:
            pass
        # Sleep for 24 hours
        time.sleep(86400)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    storage.data_root()
    # Start retention cleanup thread
    cleanup_thread = threading.Thread(target=_run_retention_cleanup, daemon=True)
    cleanup_thread.start()
    yield


app = FastAPI(title="MoveMate Host Edition API", version="2.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=[settings.frontend_origin, "http://127.0.0.1:3000"],
                   allow_methods=["*"], allow_headers=["*"])

api = APIRouter(prefix="/api")


@api.get("/health", response_model=Health, tags=["meta"])
def health():
    return Health(status="ok", mock_models=settings.mock_models)


for r in (properties.router, baseline.router, items.router, guest.router, audits.router, inspections.router, discrepancies.router):
    api.include_router(r)
if settings.app_env == "dev":
    from .routers import dev
    api.include_router(dev.router)
api.include_router(meta_api.router)

app.include_router(api)
app.include_router(meta.router)
app.mount("/media", StaticFiles(directory=str(storage.data_root())), name="media")
