"""Usage tracking and cost logging for model calls.

Logs every model call with route, model, units, and estimated cost.
"""
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import Column, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Session

from ..models import Base


class ModelUsage(Base):
    """Database model for tracking model usage and costs."""
    __tablename__ = "model_usage"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime, default=datetime.utcnow)
    route = Column(String, nullable=False)  # e.g., "POST /api/rooms/{id}/baseline/photo"
    model = Column(String, nullable=False)  # e.g., "sam-3.1", "muse-image"
    operation = Column(String, nullable=False)  # e.g., "segment", "label", "judge"
    units = Column(Integer, default=1)  # e.g., number of images, tokens
    estimated_cost = Column(Float, default=0.0)  # estimated cost in USD
    duration_ms = Column(Integer, default=0)  # call duration in milliseconds
    success = Column(String, default="success")  # "success" or error message
    extra = Column(Text, nullable=True)  # JSON extra data


@dataclass
class UsageEntry:
    """In-memory usage entry for quick logging."""
    route: str
    model: str
    operation: str
    units: int = 1
    estimated_cost: float = 0.0
    duration_ms: int = 0
    success: str = "success"
    extra: Optional[str] = None


# Cost estimates per operation (USD) - adjust based on actual pricing
COST_ESTIMATES = {
    "segment": 0.001,  # per image
    "label": 0.0005,   # per crop
    "choose_candidate": 0.0005,
    "guide": 0.001,
    "judge": 0.005,    # per judgment (includes multiple frames)
}


def estimate_cost(operation: str, units: int = 1) -> float:
    """Estimate cost for an operation."""
    base_cost = COST_ESTIMATES.get(operation, 0.001)
    return base_cost * units


class UsageTracker:
    """Track and log model usage."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def log(
        self,
        route: str,
        model: str,
        operation: str,
        units: int = 1,
        duration_ms: int = 0,
        success: str = "success",
        extra: Optional[str] = None,
    ) -> ModelUsage:
        """Log a model usage entry."""
        estimated_cost = estimate_cost(operation, units)
        
        entry = ModelUsage(
            route=route,
            model=model,
            operation=operation,
            units=units,
            estimated_cost=estimated_cost,
            duration_ms=duration_ms,
            success=success,
            extra=extra,
        )
        self.db.add(entry)
        self.db.commit()
        return entry
    
    def get_total_cost(self, since: Optional[datetime] = None) -> float:
        """Get total estimated cost since a given time."""
        query = self.db.query(ModelUsage)
        if since:
            query = query.filter(ModelUsage.created_at >= since)
        return sum(e.estimated_cost for e in query.all())
    
    def get_usage_by_model(self, since: Optional[datetime] = None) -> Dict[str, dict]:
        """Get usage breakdown by model."""
        query = self.db.query(ModelUsage)
        if since:
            query = query.filter(ModelUsage.created_at >= since)
        
        by_model = {}
        for entry in query.all():
            if entry.model not in by_model:
                by_model[entry.model] = {
                    "calls": 0,
                    "units": 0,
                    "cost": 0.0,
                }
            by_model[entry.model]["calls"] += 1
            by_model[entry.model]["units"] += entry.units
            by_model[entry.model]["cost"] += entry.estimated_cost
        
        return by_model
    
    def get_usage_by_route(self, since: Optional[datetime] = None) -> Dict[str, dict]:
        """Get usage breakdown by route."""
        query = self.db.query(ModelUsage)
        if since:
            query = query.filter(ModelUsage.created_at >= since)
        
        by_route = {}
        for entry in query.all():
            if entry.route not in by_route:
                by_route[entry.route] = {
                    "calls": 0,
                    "cost": 0.0,
                }
            by_route[entry.route]["calls"] += 1
            by_route[entry.route]["cost"] += entry.estimated_cost
        
        return by_route


def log_model_call(
    db: Session,
    route: str,
    model: str,
    operation: str,
    units: int = 1,
    duration_ms: int = 0,
    success: str = "success",
    extra: Optional[str] = None,
) -> ModelUsage:
    """Convenience function to log a model call."""
    tracker = UsageTracker(db)
    return tracker.log(route, model, operation, units, duration_ms, success, extra)
