from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import Base, engine
from .routers import audits, baseline, discrepancies, guest, inspections, items, properties
from .schemas import Health
from .services import storage


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    storage.data_root()
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

app.include_router(api)
app.mount("/media", StaticFiles(directory=str(storage.data_root())), name="media")
