// Mirrors backend/app/schemas.py (API contract v2). Change both together, in one PR.

export type BBox = { x: number; y: number; w: number; h: number }; // normalized 0..1
export type ItemStatus = "suggested" | "confirmed" | "retired";
export type FindingType = "missing" | "misplaced" | "count_mismatch" | "extra" | "unverified";
export type Resolution = "open" | "found" | "confirmed" | "dismissed";
export type RoomType = "bedroom" | "bathroom" | "kitchen" | "living" | "balcony" | "garage" | "laundry" | "storage" | "other";
export type PropertyType = "apartment" | "house" | "studio" | "villa" | "cabin" | "other";
export type ItemKind = "fixed" | "movable" | "shared" | "consumable";
export type Condition = "new" | "good" | "worn" | "damaged" | "missing" | "under_repair";
export type Availability = "guest" | "staff_only";
export type InspectionKind = "after_checkout" | "after_cleaning" | "before_checkin";
export type InspectionStatus = "in_progress" | "completed" | "completed_with_exception";
export type CheckResult = "pending" | "ok" | "not_seen" | "misplaced" | "missing" | "damaged" | "low_stock";
export type SectionStatus = "pending" | "in_progress" | "done" | "not_applicable";
export type DiscStatus = "open" | "investigating" | "resolved";
export type DiscType = "missing" | "misplaced" | "damaged" | "not_seen";
export type Outcome = "found" | "restored_to_place" | "repaired" | "replaced" | "recorded_missing";
export type EventKind = "detected" | "note" | "search" | "evidence" | "assigned" | "status" | "resolved";
export type ReadinessStatus = "ready" | "ready_with_exceptions" | "not_ready";
export type Role = "cleaner" | "host";
export type AuditStatus = "draft" | "running" | "done" | "failed";

export type Health = { status: string; mock_models: boolean };

export type RoomOut = {
  id: string; property_id: string; parent_id: string | null; name: string; room_type: RoomType; path: string;
  reference_photo_url: string | null; confirmed_items: number; suggested_items: number;
};
export type PropertyOut = {
  id: string; name: string; guest_token: string; created_at: string; address: string | null;
  property_type: PropertyType | null; capacity: number | null; details: string | null; rules: string | null;
};
export type PropertyCreate = { name: string; address?: string; property_type?: PropertyType; capacity?: number; details?: string; rules?: string };
export type PropertyPatch = Partial<Omit<PropertyCreate, "name">> & { name?: string };
export type PropertyDetail = PropertyOut & {
  rooms: RoomOut[]; latest_audit_id: string | null; latest_inspection_id: string | null; open_discrepancies: number;
};

export type ItemOut = {
  id: string; room_id: string; label: string; category: string | null; quantity: number;
  priority: "high" | "normal"; bbox: BBox | null; crop_url: string | null; source_image_url: string | null;
  location_hint: string | null; notes: string | null; status: ItemStatus;
  location_id: string | null; location_path: string | null; kind: ItemKind; condition: Condition;
  availability: Availability; high_value: boolean; min_quantity: number | null; alternate_locations: string[];
};
export type ItemCreate = {
  label: string; quantity?: number; kind?: ItemKind; category?: string; location_id?: string; location_hint?: string;
  notes?: string; availability?: Availability; high_value?: boolean; min_quantity?: number; alternate_locations?: string[];
};
export type ItemPatch = Partial<Pick<ItemOut, "label" | "quantity" | "notes" | "location_hint" | "status" | "kind" | "availability"
  | "high_value" | "min_quantity" | "alternate_locations" | "location_id">>;
export type ConditionEventOut = {
  id: string; item_id: string; condition: Condition; previous: Condition | null; note: string | null;
  photo_url: string | null; actor: string; role: Role | null; created_at: string;
};
export type BaselineResult = { capture_id: string; items: ItemOut[] };

export type GuestProperty = { property_name: string; item_labels: string[]; house_rules: string | null };
export type GuestGuide = { title: string; steps: string[]; warnings: string[]; seen: string; unsure: string[] };
export type GuestAnswer = { matched: boolean; message: string; item_label: string | null; guide: GuestGuide | null };

export type AuditCreated = { id: string; property_id: string; status: AuditStatus };
export type UploadAck = { audit_id: string; room_id: string; frames: number };
export type FindingOut = {
  id: string; audit_id: string; item_id: string | null; room_id: string | null; item_label: string;
  type: FindingType; expected: string | null; observed: string | null; confidence: number | null;
  evidence_frame_url: string | null; reference_crop_url: string | null; resolution: Resolution;
  resolved_by: Role | null; resolved_at: string | null; note: string | null;
};
export type AuditDetail = {
  id: string; property_id: string; status: AuditStatus; stage: string | null; summary: string | null;
  rooms_uploaded: string[]; findings: FindingOut[]; created_at: string;
};
export type RunAck = { audit_id: string; status: AuditStatus };
export type SeedResult = { property_id: string; guest_token: string; room_ids: string[] };

// ---- inspections ----
export type InspectionOut = {
  id: string; property_id: string; kind: InspectionKind; inspector: string; reservation_ref: string | null;
  status: InspectionStatus; exception_note: string | null; exception_by: string | null; created_at: string; completed_at: string | null;
};
export type AiSuggestion = { type: FindingType; observed: string | null; confidence: number | null; evidence_frame_url: string | null; audit_id: string };
export type InspectionItemOut = {
  id: string; inspection_id: string; room_id: string; item_id: string | null; label: string; kind: ItemKind; high_value: boolean;
  expected_quantity: number; min_quantity: number | null; result: CheckResult; observed_quantity: number | null; note: string | null;
  photo_url: string | null; checked_by: string | null; checked_at: string | null; reference_crop_url: string | null;
  location_path: string | null; alternate_locations: string[]; ai_suggestion: AiSuggestion | null; discrepancy_id: string | null;
};
export type CleaningCheckOut = { id: string; room_id: string; label: string; done: boolean; done_by: string | null; done_at: string | null };
export type RoomInspection = {
  room_id: string; room_name: string; room_type: RoomType; cleaning_status: SectionStatus; inventory_status: SectionStatus;
  items: InspectionItemOut[]; cleaning: CleaningCheckOut[];
};
export type InspectionDetail = InspectionOut & { rooms: RoomInspection[]; blockers: string[]; can_complete: boolean };
export type InspectionItemPatch = { role: Role; actor: string; result?: CheckResult; observed_quantity?: number; note?: string };
export type RoomReadiness = { room_name: string; cleaning_status: SectionStatus; inventory_status: SectionStatus; issues: string[] };
export type ReadinessReport = {
  inspection_id: string; property_name: string; kind: InspectionKind; inspector: string; reservation_ref: string | null;
  status: ReadinessStatus; cleaning_status: SectionStatus; inventory_status: SectionStatus; summary: string; rooms: RoomReadiness[];
  blocking: string[]; open_cases: string[]; known_gaps: string[]; low_stock: string[];
  exception_note: string | null; exception_by: string | null; generated_at: string;
};

// ---- discrepancy cases ----
export type DiscrepancyOut = {
  id: string; property_id: string; inspection_id: string | null; item_id: string | null; room_id: string | null; room_name: string | null;
  item_label: string; type: DiscType; status: DiscStatus; assigned_to: string | null; blocks_readiness: boolean;
  outcome: Outcome | null; resolution_note: string | null; resolved_by: string | null; resolved_at: string | null; created_at: string;
};
export type DiscrepancyEventOut = { id: string; kind: EventKind; text: string | null; photo_url: string | null; actor: string; role: Role | null; created_at: string };
export type DiscrepancyDetail = DiscrepancyOut & {
  events: DiscrepancyEventOut[]; reference_crop_url: string | null; expected_location: string | null; ai_suggestion: AiSuggestion | null;
};
