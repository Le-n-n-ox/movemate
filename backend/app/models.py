"""Database tables. Ids are string UUIDs so SQLite (tests) and Postgres behave the same."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def new_id() -> str:
    return str(uuid.uuid4())


def now() -> datetime:
    return datetime.now(timezone.utc)


class Property(Base):
    __tablename__ = "properties"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(200))
    guest_token: Mapped[str] = mapped_column(String(64), unique=True, default=lambda: uuid.uuid4().hex)
    address: Mapped[str | None] = mapped_column(String(300), nullable=True)
    property_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    rules: Mapped[str | None] = mapped_column(Text, nullable=True)  # house rules and operating procedures
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    rooms: Mapped[list["Room"]] = relationship(back_populates="property", cascade="all, delete-orphan")
    audits: Mapped[list["Audit"]] = relationship(back_populates="property", cascade="all, delete-orphan")


class Room(Base):
    __tablename__ = "rooms"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    property_id: Mapped[str] = mapped_column(ForeignKey("properties.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(200))
    parent_id: Mapped[str | None] = mapped_column(String(36), nullable=True)  # set = sub-location (Kitchen > Upper cupboard)
    room_type: Mapped[str] = mapped_column(String(32), default="other")
    reference_photo_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    property: Mapped[Property] = relationship(back_populates="rooms")
    items: Mapped[list["Item"]] = relationship(back_populates="room", cascade="all, delete-orphan")


class Capture(Base):
    """One uploaded photo/video (baseline, audit or guest)."""
    __tablename__ = "captures"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    room_id: Mapped[str | None] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"), nullable=True)
    audit_id: Mapped[str | None] = mapped_column(ForeignKey("audits.id", ondelete="CASCADE"), nullable=True)
    kind: Mapped[str] = mapped_column(String(32))  # baseline_photo | baseline_video | audit_video | audit_frames | guest_photo
    media_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    frame_paths: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Item(Base):
    __tablename__ = "items"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    room_id: Mapped[str] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"))
    capture_id: Mapped[str | None] = mapped_column(ForeignKey("captures.id", ondelete="SET NULL"), nullable=True)
    label: Mapped[str] = mapped_column(String(300))
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    priority: Mapped[str] = mapped_column(String(16), default="normal")  # high | normal
    bbox: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # normalized 0..1 {x,y,w,h}
    crop_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    source_image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    location_hint: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    instructions: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="suggested")  # suggested | confirmed | retired
    # inventory rules (v2)
    location_id: Mapped[str | None] = mapped_column(String(36), nullable=True)  # a sub-location (rooms row with parent_id)
    kind: Mapped[str] = mapped_column(String(16), default="movable")  # fixed | movable | shared | consumable
    condition: Mapped[str] = mapped_column(String(16), default="good")  # new | good | worn | damaged | missing | under_repair
    availability: Mapped[str] = mapped_column(String(16), default="guest")  # guest | staff_only
    high_value: Mapped[bool] = mapped_column(Boolean, default=False)  # needs extra verification
    min_quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)  # consumables: restock below this
    alternate_locations: Mapped[list] = mapped_column(JSON, default=list)  # acceptable other places
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    room: Mapped[Room] = relationship(back_populates="items")


class Audit(Base):
    __tablename__ = "audits"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    property_id: Mapped[str] = mapped_column(ForeignKey("properties.id", ondelete="CASCADE"))
    status: Mapped[str] = mapped_column(String(16), default="draft")  # draft | running | done | failed
    stage: Mapped[str | None] = mapped_column(String(200), nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    property: Mapped[Property] = relationship(back_populates="audits")
    findings: Mapped[list["Finding"]] = relationship(back_populates="audit", cascade="all, delete-orphan")


class Finding(Base):
    __tablename__ = "findings"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    audit_id: Mapped[str] = mapped_column(ForeignKey("audits.id", ondelete="CASCADE"))
    item_id: Mapped[str | None] = mapped_column(ForeignKey("items.id", ondelete="SET NULL"), nullable=True)
    room_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    item_label: Mapped[str] = mapped_column(String(300))
    type: Mapped[str] = mapped_column(String(24))  # missing | misplaced | count_mismatch | extra | unverified
    expected: Mapped[str | None] = mapped_column(Text, nullable=True)
    observed: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    evidence_frame_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    reference_crop_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    resolution: Mapped[str] = mapped_column(String(16), default="open")  # open | found | confirmed | dismissed
    resolved_by: Mapped[str | None] = mapped_column(String(16), nullable=True)  # cleaner | host
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    audit: Mapped[Audit] = relationship(back_populates="findings")


class ConditionEvent(Base):
    """History of an item's condition across stays. Never overwritten, only appended."""
    __tablename__ = "condition_events"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    item_id: Mapped[str] = mapped_column(ForeignKey("items.id", ondelete="CASCADE"))
    condition: Mapped[str] = mapped_column(String(16))
    previous: Mapped[str | None] = mapped_column(String(16), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    actor: Mapped[str] = mapped_column(String(100), default="unknown")
    role: Mapped[str | None] = mapped_column(String(16), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Inspection(Base):
    """One checklist session. Separate from items, so inspecting next month never overwrites last stay."""
    __tablename__ = "inspections"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    property_id: Mapped[str] = mapped_column(ForeignKey("properties.id", ondelete="CASCADE"))
    kind: Mapped[str] = mapped_column(String(24))  # after_checkout | after_cleaning | before_checkin
    inspector: Mapped[str] = mapped_column(String(100))
    reservation_ref: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="in_progress")  # in_progress | completed | completed_with_exception
    exception_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    exception_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class InspectionItem(Base):
    __tablename__ = "inspection_items"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    inspection_id: Mapped[str] = mapped_column(ForeignKey("inspections.id", ondelete="CASCADE"))
    room_id: Mapped[str] = mapped_column(String(36))
    item_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    label: Mapped[str] = mapped_column(String(300))
    kind: Mapped[str] = mapped_column(String(16), default="movable")
    high_value: Mapped[bool] = mapped_column(Boolean, default=False)
    expected_quantity: Mapped[int] = mapped_column(Integer, default=1)
    min_quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    result: Mapped[str] = mapped_column(String(16), default="pending")  # pending | ok | not_seen | misplaced | missing | damaged | low_stock
    observed_quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    checked_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ai_suggestion: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # AI hint, never counted as verified


class CleaningCheck(Base):
    __tablename__ = "cleaning_checks"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    inspection_id: Mapped[str] = mapped_column(ForeignKey("inspections.id", ondelete="CASCADE"))
    room_id: Mapped[str] = mapped_column(String(36))
    label: Mapped[str] = mapped_column(String(200))
    done: Mapped[bool] = mapped_column(Boolean, default=False)
    done_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    done_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Discrepancy(Base):
    """A case: detect, verify, record and assign, resolve. Facts only, never blame."""
    __tablename__ = "discrepancies"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    property_id: Mapped[str] = mapped_column(ForeignKey("properties.id", ondelete="CASCADE"))
    inspection_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    inspection_item_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    item_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    room_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    item_label: Mapped[str] = mapped_column(String(300))
    type: Mapped[str] = mapped_column(String(16))  # missing | misplaced | damaged | not_seen
    status: Mapped[str] = mapped_column(String(16), default="open")  # open | investigating | resolved
    assigned_to: Mapped[str | None] = mapped_column(String(100), nullable=True)
    blocks_readiness: Mapped[bool] = mapped_column(Boolean, default=False)
    outcome: Mapped[str | None] = mapped_column(String(24), nullable=True)  # found | restored_to_place | repaired | replaced | recorded_missing
    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class DiscrepancyEvent(Base):
    """Audit trail of a case. Append only."""
    __tablename__ = "discrepancy_events"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    discrepancy_id: Mapped[str] = mapped_column(ForeignKey("discrepancies.id", ondelete="CASCADE"))
    kind: Mapped[str] = mapped_column(String(16))  # detected | note | search | evidence | assigned | status | resolved
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    actor: Mapped[str] = mapped_column(String(100), default="unknown")
    role: Mapped[str | None] = mapped_column(String(16), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
