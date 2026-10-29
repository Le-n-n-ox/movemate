"""API contract (v2). The frontend mirrors these in frontend/lib/types.ts.
Change this file, docs/API_CONTRACT.md and frontend/lib/types.ts together, in one PR.
"""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class BBox(BaseModel):
    """Normalized 0..1 relative to image width/height."""
    x: float
    y: float
    w: float
    h: float


RoomType = Literal["bedroom", "bathroom", "kitchen", "living", "balcony", "garage", "laundry", "storage", "other"]
PropertyType = Literal["apartment", "house", "studio", "villa", "cabin", "other"]
ItemKind = Literal["fixed", "movable", "shared", "consumable"]
Condition = Literal["new", "good", "worn", "damaged", "missing", "under_repair"]
Availability = Literal["guest", "staff_only"]
InspectionKind = Literal["after_checkout", "after_cleaning", "before_checkin"]
InspectionStatus = Literal["in_progress", "completed", "completed_with_exception"]
CheckResult = Literal["pending", "ok", "not_seen", "misplaced", "missing", "damaged", "low_stock"]
SectionStatus = Literal["pending", "in_progress", "done", "not_applicable"]
DiscStatus = Literal["open", "investigating", "resolved"]
DiscType = Literal["missing", "misplaced", "damaged", "not_seen"]
Outcome = Literal["found", "restored_to_place", "repaired", "replaced", "recorded_missing"]
EventKind = Literal["detected", "note", "search", "evidence", "assigned", "status", "resolved"]
ReadinessStatus = Literal["ready", "ready_with_exceptions", "not_ready"]
ItemStatus = Literal["suggested", "confirmed", "retired"]
FindingType = Literal["missing", "misplaced", "count_mismatch", "extra", "unverified"]
Resolution = Literal["open", "found", "confirmed", "dismissed"]
Role = Literal["cleaner", "host"]
AuditStatus = Literal["draft", "running", "done", "failed"]


class Health(BaseModel):
    status: str
    mock_models: bool


# ---- properties and rooms ----
class PropertyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    address: str | None = None
    property_type: PropertyType | None = None
    capacity: int | None = Field(default=None, ge=1, le=99)
    details: str | None = None
    rules: str | None = None


class PropertyPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    address: str | None = None
    property_type: PropertyType | None = None
    capacity: int | None = Field(default=None, ge=1, le=99)
    details: str | None = None
    rules: str | None = None


class RoomCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    room_type: RoomType = "other"
    parent_id: str | None = None  # set to create a sub-location (Kitchen > Upper cupboard)


class RoomPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    room_type: RoomType | None = None


class RoomOut(BaseModel):
    id: str
    property_id: str
    parent_id: str | None = None
    name: str
    room_type: RoomType = "other"
    path: str  # "Kitchen > Upper cupboard > Left shelf"
    reference_photo_url: str | None = None
    confirmed_items: int = 0
    suggested_items: int = 0


class PropertyOut(BaseModel):
    id: str
    name: str
    guest_token: str
    created_at: datetime
    address: str | None = None
    property_type: PropertyType | None = None
    capacity: int | None = None
    details: str | None = None
    rules: str | None = None


class PropertyDetail(PropertyOut):
    rooms: list[RoomOut]  # top-level rooms only; sub-locations via GET /rooms/{id}/locations
    latest_audit_id: str | None = None
    latest_inspection_id: str | None = None
    open_discrepancies: int = 0


# ---- items ----
class ItemOut(BaseModel):
    id: str
    room_id: str
    label: str
    category: str | None = None
    quantity: int
    priority: Literal["high", "normal"]
    bbox: BBox | None = None
    crop_url: str | None = None
    source_image_url: str | None = None
    location_hint: str | None = None
    notes: str | None = None
    status: ItemStatus
    location_id: str | None = None
    location_path: str | None = None
    kind: ItemKind = "movable"
    condition: Condition = "good"
    availability: Availability = "guest"
    high_value: bool = False
    min_quantity: int | None = None
    alternate_locations: list[str] = []


class ItemCreate(BaseModel):
    label: str = Field(min_length=1, max_length=300)
    quantity: int = Field(default=1, ge=1, le=999)
    kind: ItemKind = "movable"
    category: str | None = None
    location_id: str | None = None
    location_hint: str | None = None
    notes: str | None = None
    availability: Availability = "guest"
    high_value: bool = False
    min_quantity: int | None = Field(default=None, ge=0, le=999)
    alternate_locations: list[str] = []


class ItemPatch(BaseModel):
    label: str | None = None
    quantity: int | None = Field(default=None, ge=1, le=999)
    notes: str | None = None
    location_hint: str | None = None
    status: ItemStatus | None = None
    kind: ItemKind | None = None
    availability: Availability | None = None
    high_value: bool | None = None
    min_quantity: int | None = Field(default=None, ge=0, le=999)
    alternate_locations: list[str] | None = None
    location_id: str | None = None  # send null to clear


class ConditionEventOut(BaseModel):
    id: str
    item_id: str
    condition: Condition
    previous: Condition | None = None
    note: str | None = None
    photo_url: str | None = None
    actor: str
    role: Role | None = None
    created_at: datetime


class BaselineResult(BaseModel):
    capture_id: str
    items: list[ItemOut]


class ConfirmAllResult(BaseModel):
    confirmed: int


# ---- guest ----
class GuestProperty(BaseModel):
    property_name: str
    item_labels: list[str]  # guest-available items only (staff-only items are hidden)
    house_rules: str | None = None


class GuestGuide(BaseModel):
    title: str
    steps: list[str]
    warnings: list[str] = []
    seen: str = ""
    unsure: list[str] = []


class GuestAnswer(BaseModel):
    matched: bool
    message: str
    item_label: str | None = None
    guide: GuestGuide | None = None


# ---- audits ----
class AuditCreated(BaseModel):
    id: str
    property_id: str
    status: AuditStatus


class UploadAck(BaseModel):
    audit_id: str
    room_id: str
    frames: int


class FindingOut(BaseModel):
    id: str
    audit_id: str
    item_id: str | None = None
    room_id: str | None = None
    item_label: str
    type: FindingType
    expected: str | None = None
    observed: str | None = None
    confidence: float | None = None
    evidence_frame_url: str | None = None
    reference_crop_url: str | None = None
    resolution: Resolution
    resolved_by: Role | None = None
    resolved_at: datetime | None = None
    note: str | None = None


class FindingPatch(BaseModel):
    """role says who is pressing the button (stand-in for login in v1).
    cleaner may only set 'found' (or 'open' to undo their own 'found'); host may set anything."""
    role: Role
    resolution: Resolution | None = None
    note: str | None = None


class AuditDetail(BaseModel):
    id: str
    property_id: str
    status: AuditStatus
    stage: str | None = None
    summary: str | None = None
    rooms_uploaded: list[str]
    findings: list[FindingOut]
    created_at: datetime


class RunAck(BaseModel):
    audit_id: str
    status: AuditStatus


class SeedResult(BaseModel):
    property_id: str
    guest_token: str
    room_ids: list[str]


# ---- inspections (human checklist; separate from the AI video audit) ----
class InspectionCreate(BaseModel):
    kind: InspectionKind
    inspector: str = Field(min_length=1, max_length=100)
    reservation_ref: str | None = Field(default=None, max_length=100)


class InspectionOut(BaseModel):
    id: str
    property_id: str
    kind: InspectionKind
    inspector: str
    reservation_ref: str | None = None
    status: InspectionStatus
    exception_note: str | None = None
    exception_by: str | None = None
    created_at: datetime
    completed_at: datetime | None = None


class AiSuggestion(BaseModel):
    """A hint from the AI video audit. Not verified. Never counts as a result."""
    type: FindingType
    observed: str | None = None
    confidence: float | None = None
    evidence_frame_url: str | None = None
    audit_id: str


class InspectionItemOut(BaseModel):
    id: str
    inspection_id: str
    room_id: str
    item_id: str | None = None
    label: str
    kind: ItemKind
    high_value: bool
    expected_quantity: int
    min_quantity: int | None = None
    result: CheckResult
    observed_quantity: int | None = None
    note: str | None = None
    photo_url: str | None = None
    checked_by: str | None = None
    checked_at: datetime | None = None
    reference_crop_url: str | None = None
    location_path: str | None = None
    alternate_locations: list[str] = []
    ai_suggestion: AiSuggestion | None = None
    discrepancy_id: str | None = None


class CleaningCheckOut(BaseModel):
    id: str
    room_id: str
    label: str
    done: bool
    done_by: str | None = None
    done_at: datetime | None = None


class RoomInspection(BaseModel):
    room_id: str
    room_name: str
    room_type: RoomType = "other"
    cleaning_status: SectionStatus
    inventory_status: SectionStatus  # separate from cleaning: a room can be clean but missing a remote
    items: list[InspectionItemOut]
    cleaning: list[CleaningCheckOut]


class InspectionDetail(InspectionOut):
    rooms: list[RoomInspection]
    blockers: list[str]
    can_complete: bool


class InspectionItemPatch(BaseModel):
    role: Role
    actor: str = Field(default="unknown", max_length=100)
    result: CheckResult | None = None
    observed_quantity: int | None = Field(default=None, ge=0, le=999)
    note: str | None = None


class CleaningCheckPatch(BaseModel):
    actor: str = Field(default="unknown", max_length=100)
    done: bool


class AiSuggestRequest(BaseModel):
    audit_id: str


class AiSuggestResult(BaseModel):
    applied: int


class CompleteRequest(BaseModel):
    role: Role
    actor: str = Field(default="unknown", max_length=100)
    exception_note: str | None = None  # host only: approves completing with unresolved checks


class RoomReadiness(BaseModel):
    room_name: str
    cleaning_status: SectionStatus
    inventory_status: SectionStatus
    issues: list[str]


class ReadinessReport(BaseModel):
    inspection_id: str
    property_name: str
    kind: InspectionKind
    inspector: str
    reservation_ref: str | None = None
    status: ReadinessStatus
    cleaning_status: SectionStatus
    inventory_status: SectionStatus
    summary: str
    rooms: list[RoomReadiness]
    blocking: list[str]
    open_cases: list[str]
    known_gaps: list[str]  # items currently missing, damaged or under repair
    low_stock: list[str]
    exception_note: str | None = None
    exception_by: str | None = None
    generated_at: datetime


# ---- discrepancy cases ----
class DiscrepancyOut(BaseModel):
    id: str
    property_id: str
    inspection_id: str | None = None
    item_id: str | None = None
    room_id: str | None = None
    room_name: str | None = None
    item_label: str
    type: DiscType
    status: DiscStatus
    assigned_to: str | None = None
    blocks_readiness: bool
    outcome: Outcome | None = None
    resolution_note: str | None = None
    resolved_by: str | None = None
    resolved_at: datetime | None = None
    created_at: datetime


class DiscrepancyEventOut(BaseModel):
    id: str
    kind: EventKind
    text: str | None = None
    photo_url: str | None = None
    actor: str
    role: Role | None = None
    created_at: datetime


class DiscrepancyDetail(DiscrepancyOut):
    events: list[DiscrepancyEventOut]
    reference_crop_url: str | None = None
    expected_location: str | None = None  # path plus acceptable alternates
    ai_suggestion: AiSuggestion | None = None


class DiscrepancyPatch(BaseModel):
    role: Role
    actor: str = Field(default="unknown", max_length=100)
    status: Literal["open", "investigating"] | None = None
    assigned_to: str | None = Field(default=None, max_length=100)  # host only
    blocks_readiness: bool | None = None  # host only


class DiscrepancyResolve(BaseModel):
    role: Role
    actor: str = Field(default="unknown", max_length=100)
    outcome: Outcome
    note: str | None = None
