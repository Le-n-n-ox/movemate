"""Root-level meta endpoints (no /api prefix).

Health is aliased here so load balancers / clients that hit /health directly
get a 200 instead of a 404. /models and /v1/models mirror the model registry
in an OpenAI-compatible list shape so any model-client tooling probing the
backend gets a sensible response instead of a 404.
"""
import time

from fastapi import APIRouter

from ..config import settings
from ..schemas import Health

router = APIRouter(tags=["meta"])

_MODEL_START = time.time()


def _model_list() -> list[dict]:
    models = []
    if settings.mock_models:
        models.append({
            "id": "mock-vision",
            "object": "model",
            "created": int(_MODEL_START),
            "owned_by": "movemate",
        })
    else:
        models.append({
            "id": settings.meta_label_model or "meta-label",
            "object": "model",
            "created": int(_MODEL_START),
            "owned_by": "movemate",
        })
        models.append({
            "id": settings.meta_segment_model or "meta-segment",
            "object": "model",
            "created": int(_MODEL_START),
            "owned_by": "movemate",
        })
        models.append({
            "id": settings.meta_reason_model or "meta-reason",
            "object": "model",
            "created": int(_MODEL_START),
            "owned_by": "movemate",
        })
    return models


@router.get("/health", response_model=Health, include_in_schema=False)
def health_root():
    return Health(status="ok", mock_models=settings.mock_models)


@router.get("/models", include_in_schema=False)
@router.get("/v1/models", include_in_schema=False)
def list_models():
    return {"object": "list", "data": _model_list()}
