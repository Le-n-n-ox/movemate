"""Meta API endpoints for cost tracking, usage stats, and retention.

Mounted under /api/meta.
"""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..services.retention import run_retention_cleanup
from ..services.usage import UsageTracker

router = APIRouter(prefix="/meta", tags=["meta"])


@router.get("/usage")
def get_usage_stats(
    since_hours: int = 24,
    db: Session = Depends(get_db),
):
    """Get usage statistics for model calls."""
    tracker = UsageTracker(db)
    since = datetime.utcnow() - timedelta(hours=since_hours)
    
    return {
        "period_hours": since_hours,
        "total_cost": tracker.get_total_cost(since),
        "by_model": tracker.get_usage_by_model(since),
        "by_route": tracker.get_usage_by_route(since),
    }


@router.post("/cleanup")
def run_cleanup(db: Session = Depends(get_db)):
    """Run retention cleanup tasks."""
    result = run_retention_cleanup(db)
    return {
        "status": "completed",
        **result,
    }
