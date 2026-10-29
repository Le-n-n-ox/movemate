// Single place that talks to the backend. Pages never call fetch() directly.
import type * as T from "./types";

export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function req<R>(path: string, init?: RequestInit): Promise<R> {
  const res = await fetch(`${API}/api${path}`, init);
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail ?? detail; } catch {}
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return res.status === 204 ? (undefined as R) : res.json();
}

const json = (method: string, body?: unknown): RequestInit => ({
  method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body),
});
const form = (fields: Record<string, string | Blob | Blob[] | undefined | null>): RequestInit => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    (Array.isArray(v) ? v : [v]).forEach((x) => fd.append(k, x));
  }
  return { method: "POST", body: fd };
};

export const api = {
  health: () => req<T.Health>("/health"),
  seed: () => req<T.SeedResult>("/dev/seed", { method: "POST" }),

  listProperties: () => req<T.PropertyOut[]>("/properties"),
  createProperty: (body: T.PropertyCreate) => req<T.PropertyOut>("/properties", json("POST", body)),
  getProperty: (id: string) => req<T.PropertyDetail>(`/properties/${id}`),
  patchProperty: (id: string, patch: T.PropertyPatch) => req<T.PropertyOut>(`/properties/${id}`, json("PATCH", patch)),
  createRoom: (propertyId: string, body: { name: string; room_type?: T.RoomType; parent_id?: string }) =>
    req<T.RoomOut>(`/properties/${propertyId}/rooms`, json("POST", body)),
  getRoom: (id: string) => req<T.RoomOut>(`/rooms/${id}`),
  patchRoom: (id: string, patch: { name?: string; room_type?: T.RoomType }) => req<T.RoomOut>(`/rooms/${id}`, json("PATCH", patch)),
  listLocations: (roomId: string) => req<T.RoomOut[]>(`/rooms/${roomId}/locations`),
  roomPhoto: (roomId: string, file: File) => req<T.RoomOut>(`/rooms/${roomId}/photo`, form({ file })),
  sheetUrl: (roomId: string) => `${API}/api/rooms/${roomId}/sheet`,

  baselinePhoto: (roomId: string, file: File, priority: "high" | "normal" = "high") =>
    req<T.BaselineResult>(`/rooms/${roomId}/baseline/photo`, form({ file, priority })),
  baselineVideo: (roomId: string, file: File) => req<T.BaselineResult>(`/rooms/${roomId}/baseline/video`, form({ file })),
  listItems: (roomId: string, status?: T.ItemStatus) => req<T.ItemOut[]>(`/rooms/${roomId}/items${status ? `?status=${status}` : ""}`),
  patchItem: (id: string, patch: T.ItemPatch) => req<T.ItemOut>(`/items/${id}`, json("PATCH", patch)),
  deleteItem: (id: string) => req<void>(`/items/${id}`, { method: "DELETE" }),
  createItem: (roomId: string, body: T.ItemCreate) => req<T.ItemOut>(`/rooms/${roomId}/items`, json("POST", body)),
  setCondition: (itemId: string, f: { condition: T.Condition; note?: string; actor: string; role: T.Role; file?: File }) =>
    req<T.ItemOut>(`/items/${itemId}/condition`, form({ condition: f.condition, note: f.note, actor: f.actor, role: f.role, file: f.file })),
  itemHistory: (itemId: string) => req<T.ConditionEventOut[]>(`/items/${itemId}/history`),
  confirmAll: (roomId: string) => req<{ confirmed: number }>(`/rooms/${roomId}/items/confirm-all`, { method: "POST" }),

  guestProperty: (token: string) => req<T.GuestProperty>(`/guest/${token}`),
  guestAsk: (token: string, file: File) => req<T.GuestAnswer>(`/guest/${token}/ask`, form({ file })),

  createAudit: (propertyId: string) => req<T.AuditCreated>(`/properties/${propertyId}/audits`, { method: "POST" }),
  uploadAuditVideo: (auditId: string, roomId: string, file: File) =>
    req<T.UploadAck>(`/audits/${auditId}/rooms/${roomId}/video`, form({ file })),
  uploadAuditFrames: (auditId: string, roomId: string, files: Blob[]) =>
    req<T.UploadAck>(`/audits/${auditId}/rooms/${roomId}/frames`, form({ files })),
  runAudit: (auditId: string) => req<T.RunAck>(`/audits/${auditId}/run`, { method: "POST" }),
  getAudit: (auditId: string) => req<T.AuditDetail>(`/audits/${auditId}`),
  // inspections (human checklist)
  createInspection: (propertyId: string, body: { kind: T.InspectionKind; inspector: string; reservation_ref?: string }) =>
    req<T.InspectionOut>(`/properties/${propertyId}/inspections`, json("POST", body)),
  listInspections: (propertyId: string) => req<T.InspectionOut[]>(`/properties/${propertyId}/inspections`),
  getInspection: (id: string) => req<T.InspectionDetail>(`/inspections/${id}`),
  patchInspectionItem: (id: string, body: T.InspectionItemPatch) => req<T.InspectionItemOut>(`/inspection-items/${id}`, json("PATCH", body)),
  inspectionItemPhoto: (id: string, file: File, actor: string, role: T.Role) =>
    req<T.InspectionItemOut>(`/inspection-items/${id}/photo`, form({ file, actor, role })),
  patchCleaningCheck: (id: string, body: { actor: string; done: boolean }) => req<T.CleaningCheckOut>(`/cleaning-checks/${id}`, json("PATCH", body)),
  importAiSuggestions: (id: string, auditId: string) => req<{ applied: number }>(`/inspections/${id}/ai-suggestions`, json("POST", { audit_id: auditId })),
  completeInspection: (id: string, body: { role: T.Role; actor: string; exception_note?: string }) =>
    req<T.InspectionOut>(`/inspections/${id}/complete`, json("POST", body)),
  readiness: (id: string) => req<T.ReadinessReport>(`/inspections/${id}/readiness`),

  // discrepancy cases
  listCases: (propertyId: string, status?: T.DiscStatus) => req<T.DiscrepancyOut[]>(`/properties/${propertyId}/discrepancies${status ? `?status=${status}` : ""}`),
  getCase: (id: string) => req<T.DiscrepancyDetail>(`/discrepancies/${id}`),
  patchCase: (id: string, body: { role: T.Role; actor: string; status?: "open" | "investigating"; assigned_to?: string; blocks_readiness?: boolean }) =>
    req<T.DiscrepancyOut>(`/discrepancies/${id}`, json("PATCH", body)),
  addCaseEvent: (id: string, f: { role: T.Role; actor: string; kind: "note" | "search" | "evidence"; text?: string; file?: File }) =>
    req<T.DiscrepancyEventOut>(`/discrepancies/${id}/events`, form({ role: f.role, actor: f.actor, kind: f.kind, text: f.text, file: f.file })),
  resolveCase: (id: string, body: { role: T.Role; actor: string; outcome: T.Outcome; note?: string }) =>
    req<T.DiscrepancyOut>(`/discrepancies/${id}/resolve`, json("POST", body)),

  patchFinding: (id: string, patch: { role: T.Role; resolution?: T.Resolution; note?: string }) =>
    req<T.FindingOut>(`/findings/${id}`, json("PATCH", patch)),
};
