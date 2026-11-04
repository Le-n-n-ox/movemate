export type Role = "cleaner" | "host";
export interface BBox { x: number; y: number; w: number; h: number }

export interface RoomOut {
  id: string; property_id: string; parent_id: string | null; name: string; room_type: string;
  path: string; reference_photo_url: string | null; confirmed_items: number; suggested_items: number;
}
export interface PropertyOut {
  id: string; name: string; guest_token: string; created_at: string;
  address: string | null; property_type: string | null; capacity: number | null;
  details: string | null; rules: string | null;
}
export interface PropertyCreate {
  name: string; address?: string; property_type?: string; capacity?: number; details?: string; rules?: string;
}
export type PropertyPatch = Partial<Omit<PropertyCreate, never>>;
export interface PropertyDetail extends PropertyOut {
  rooms: RoomOut[]; latest_audit_id: string | null; latest_inspection_id: string | null; open_discrepancies: number;
}

export type ItemKind = "fixed" | "movable" | "shared" | "consumable";
export type ItemCondition = "new" | "good" | "worn" | "damaged" | "missing" | "under_repair";
export type Availability = "guest" | "staff_only";
export interface ItemOut {
  id: string; room_id: string; label: string; category: string | null; quantity: number; priority: string;
  bbox: BBox | null; crop_url: string | null; source_image_url: string | null;
  location_hint: string | null; notes: string | null; status: "suggested" | "confirmed" | "retired";
  location_id: string | null; location_path: string | null; kind: ItemKind; condition: ItemCondition;
  availability: Availability; high_value: boolean; min_quantity: number | null; alternate_locations: string[];
  needs_check: boolean; detection_confidence: number | null;
}
export interface ItemCreate {
  label: string; quantity?: number; bbox?: BBox | null; kind?: ItemKind; category?: string; location_id?: string;
  location_hint?: string; notes?: string; availability?: Availability; high_value?: boolean;
  min_quantity?: number; alternate_locations?: string[];
}
export interface ItemPatch {
  label?: string; quantity?: number; bbox?: BBox | null; notes?: string; location_hint?: string; status?: ItemOut["status"];
  kind?: ItemKind; availability?: Availability; high_value?: boolean; min_quantity?: number | null;
  alternate_locations?: string[]; location_id?: string | null;
}
export interface ConditionEventOut {
  id: string; item_id: string; condition: ItemCondition; previous: ItemCondition | null;
  note: string | null; photo_url: string | null; actor: string; role: Role | null; created_at: string;
}
export interface BaselineResult { capture_id: string; items: ItemOut[] }

export interface GuestProperty { property_name: string; item_labels: string[]; house_rules: string | null }
export interface GuestGuide { title: string; steps: string[]; warnings: string[]; seen: string; unsure: string[] }
export interface GuestAnswer { matched: boolean; message: string; item_label: string | null; guide: GuestGuide | null }

export type FindingType = "missing" | "misplaced" | "count_mismatch" | "extra" | "unverified";
export type Resolution = "open" | "found" | "confirmed" | "dismissed";
export interface FindingOut {
  id: string; audit_id: string; item_id: string | null; room_id: string | null; item_label: string;
  type: FindingType; expected: string | null; observed: string | null; confidence: number | null;
  evidence_frame_url: string | null; reference_crop_url: string | null; resolution: Resolution;
  resolved_by: Role | null; resolved_at: string | null; note: string | null;
}
export interface AuditCreated { id: string; property_id: string; status: string }
export interface UploadAck { audit_id: string; room_id: string; frames: number }
export interface RunAck { audit_id: string; status: string }
export interface AuditDetail {
  id: string; property_id: string; status: "draft" | "running" | "done" | "failed";
  stage: string | null; summary: string | null; rooms_uploaded: string[]; findings: FindingOut[]; created_at: string;
}
export interface SeedResult { property_id: string; guest_token: string; room_ids: string[] }
export interface Health { status: string; mock_models: boolean }

export type InspectionKind = "after_checkout" | "after_cleaning" | "before_checkin";
export type InspectionStatus = "in_progress" | "completed" | "completed_with_exception";
export type ItemResult = "pending" | "ok" | "not_seen" | "misplaced" | "missing" | "damaged" | "low_stock";
export type PartStatus = "pending" | "in_progress" | "done" | "not_applicable";
export interface InspectionOut {
  id: string; property_id: string; kind: InspectionKind; inspector: string; reservation_ref: string | null;
  status: InspectionStatus; exception_note: string | null; exception_by: string | null;
  created_at: string; completed_at: string | null;
}
export interface AiSuggestion {
  type: FindingType; observed: string | null; confidence: number | null; evidence_frame_url: string | null; audit_id: string;
}
export interface InspectionItemOut {
  id: string; inspection_id: string; room_id: string; item_id: string | null; label: string; kind: ItemKind;
  high_value: boolean; expected_quantity: number; min_quantity: number | null; result: ItemResult;
  observed_quantity: number | null; note: string | null; photo_url: string | null; checked_by: string | null;
  checked_at: string | null; reference_crop_url: string | null; location_path: string | null;
  alternate_locations: string[]; ai_suggestion: AiSuggestion | null; discrepancy_id: string | null;
}
export interface CleaningCheckOut {
  id: string; room_id: string; label: string; done: boolean; done_by: string | null; done_at: string | null;
}
export interface RoomInspection {
  room_id: string; room_name: string; room_type: string; cleaning_status: PartStatus;
  inventory_status: PartStatus; items: InspectionItemOut[]; cleaning: CleaningCheckOut[];
}
export interface InspectionDetail extends InspectionOut {
  rooms: RoomInspection[]; blockers: string[]; can_complete: boolean;
}
export interface InspectionItemPatch {
  role: Role; actor: string; result?: ItemResult; observed_quantity?: number; note?: string;
}
export type Readiness = "ready" | "ready_with_exceptions" | "not_ready";
export interface ReadinessReport {
  inspection_id: string; property_name: string; kind: InspectionKind; inspector: string;
  reservation_ref: string | null; status: Readiness; cleaning_status: string; inventory_status: string;
  summary: string; rooms: { room_name: string; cleaning_status: string; inventory_status: string; issues: string[] }[];
  blocking: string[]; open_cases: string[]; known_gaps: string[]; low_stock: string[];
  exception_note: string | null; exception_by: string | null; generated_at: string;
}

export type CaseType = "missing" | "misplaced" | "damaged" | "not_seen";
export type CaseStatus = "open" | "investigating" | "resolved";
export type Outcome = "found" | "restored_to_place" | "repaired" | "replaced" | "recorded_missing";
export interface DiscrepancyOut {
  id: string; property_id: string; inspection_id: string | null; item_id: string | null; room_id: string | null;
  room_name: string | null; item_label: string; type: CaseType; status: CaseStatus; assigned_to: string | null;
  blocks_readiness: boolean; outcome: Outcome | null; resolution_note: string | null;
  resolved_by: string | null; resolved_at: string | null; created_at: string;
}
export interface DiscrepancyEventOut {
  id: string; kind: "detected" | "note" | "search" | "evidence" | "assigned" | "status" | "resolved";
  text: string | null; photo_url: string | null; actor: string; role: Role | null; created_at: string;
}
export interface DiscrepancyDetail extends DiscrepancyOut {
  events: DiscrepancyEventOut[]; reference_crop_url: string | null; expected_location: string | null;
  ai_suggestion: AiSuggestion | null;
}


export interface UsageOut {
  period_hours: number; total_cost: number;
  by_model: Record<string, unknown>; by_route: Record<string, unknown>;
}
export interface CleanupResult {
  status: string; guest_photos_deleted: number; audit_videos_deleted: number; audit_frames_deleted: number;
}