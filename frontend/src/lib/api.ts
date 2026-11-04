import type * as T from "./types";

// Docker sets VITE_API_URL explicitly (http://localhost:8000). When running
// Vite outside Docker we fall back to a same-origin relative URL so the dev
// server proxy in vite.config.ts handles the request (no CORS involved).
function resolveApiUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  // If the page was opened via a LAN IP or localhost, use the same host for the API
  // so PC (localhost) and phone (192.168.x.x) both work without a rebuild.
  if (host && envUrl) {
    try {
      const u = new URL(envUrl);
      const pageIsLocal = host === "localhost" || host === "127.0.0.1" || /^192\.168\./.test(host) || /^10\./.test(host) || /^172\.(1[6-9]|2[0-9]|3[01])\./.test(host);
      if (pageIsLocal && u.hostname !== host) {
        return `${u.protocol}//${host}:${u.port || 8000}`;
      }
    } catch { /* fall through */ }
  }
  return envUrl ?? (import.meta.env.DEV ? "" : "http://localhost:8000");
}
export const API_URL: string = resolveApiUrl();

// The backend returns absolute media URLs built from PUBLIC_BASE_URL, which may
// point at a different host than the one the browser used to reach the app
// (e.g. a LAN IP while the page is open on localhost). Re-base /media paths onto
// the API origin so photos always load wherever the app itself is reachable.
export function mediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.pathname.startsWith("/media/")) {
      return `${API_URL}${parsed.pathname}${parsed.search}`;
    }
  } catch { /* keep original */ }
  return url;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let _fails = 0;
export function recordFail() { _fails++; if (_fails >= 2) window.dispatchEvent(new Event("mm-offline")); }
export function recordOk() { _fails = 0; window.dispatchEvent(new Event("mm-online")); }

async function req<R>(path: string, init?: RequestInit, timeoutMs = 15000): Promise<R> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, { ...init, signal: ctrl.signal });
  } catch (e: any) {
    recordFail();
    if (e?.name === "AbortError") throw new Error("The server is busy or unreachable.");
    throw new Error(`Cannot reach the server (${API_URL}). Check that the backend is running (docker compose ps) and that you are on the same Wi-Fi.`);
  } finally { clearTimeout(timer); }
  recordOk();
  if (!res.ok) {
    let detail = `Something went wrong (${res.status}).`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") detail = body.detail;
      else if (Array.isArray(body.detail)) detail = body.detail.map((d: { msg: string }) => d.msg).join(", ");
    } catch { /* keep default */ }
    if (res.status === 413) detail = "That file is too big. Please record a shorter video.";
    if (res.status === 429) detail = "Too many requests, try again later.";
    throw new ApiError(detail, res.status);
  }
  if (res.status === 204) return undefined as R;
  return res.json() as Promise<R>;
}

const json = (method: string, body: unknown): RequestInit => ({
  method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

function form(fields: Record<string, string | number | boolean | Blob | undefined | null>): RequestInit {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    fd.append(k, v instanceof Blob ? v : String(v));
  }
  return { method: "POST", body: fd };
}

const qs = (o: Record<string, string | undefined>) => {
  const p = new URLSearchParams(Object.entries(o).filter(([, v]) => v) as [string, string][]).toString();
  return p ? `?${p}` : "";
};

export const api = {
  health: () => req<T.Health>("/health"),
  seed: () => req<T.SeedResult>("/dev/seed", { method: "POST" }),
  
  // dev/admin
  usage: () => req<T.UsageOut>("/meta/usage"),
  cleanup: () => req<T.CleanupResult>("/meta/cleanup", { method: "POST" }),

  // properties
  listProperties: () => req<T.PropertyOut[]>("/properties"),
  createProperty: (b: T.PropertyCreate) => req<T.PropertyOut>("/properties", json("POST", b)),
  getProperty: (id: string) => req<T.PropertyDetail>(`/properties/${id}`),
  patchProperty: (id: string, b: T.PropertyPatch) => req<T.PropertyOut>(`/properties/${id}`, json("PATCH", b)),

  // rooms
  listRooms: (pid: string) => req<T.RoomOut[]>(`/properties/${pid}/rooms`),
  createRoom: (pid: string, b: { name: string; room_type?: string; parent_id?: string }) =>
    req<T.RoomOut>(`/properties/${pid}/rooms`, json("POST", b)),
  getRoom: (rid: string) => req<T.RoomOut>(`/rooms/${rid}`),
  patchRoom: (rid: string, b: { name?: string; room_type?: string }) => req<T.RoomOut>(`/rooms/${rid}`, json("PATCH", b)),
  listLocations: (rid: string) => req<T.RoomOut[]>(`/rooms/${rid}/locations`),
  uploadRoomPhoto: (rid: string, file: File) => req<T.RoomOut>(`/rooms/${rid}/photo`, form({ file })),
  roomSheetUrl: (rid: string) => `${API_URL}/api/rooms/${rid}/sheet`,

  // baseline + items
  baselinePhoto: (rid: string, file: File, priority: "high" | "normal" = "normal") =>
    req<T.BaselineAck>(`/rooms/${rid}/baseline/photo`, form({ file, priority }), 60000),
  baselineVideo: (rid: string, file: File) => req<T.BaselineAck>(`/rooms/${rid}/baseline/video`, form({ file }), 60000),
  getCapture: (id: string) => req<T.CaptureStatus>(`/captures/${id}`),
  listRoomCaptures: (rid: string) => req<T.CaptureStatus[]>(`/rooms/${rid}/captures`),
  listItems: (rid: string, status?: string) => req<T.ItemOut[]>(`/rooms/${rid}/items${qs({ status })}`),
  createItem: (rid: string, b: T.ItemCreate) => req<T.ItemOut>(`/rooms/${rid}/items`, json("POST", b)),
  patchItem: (id: string, b: T.ItemPatch) => req<T.ItemOut>(`/items/${id}`, json("PATCH", b)),
  deleteItem: (id: string) => req<void>(`/items/${id}`, { method: "DELETE" }),
  confirmAll: (rid: string) => req<{ confirmed: number }>(`/rooms/${rid}/items/confirm-all`, { method: "POST" }),
  setCondition: (id: string, b: { condition: T.ItemCondition; actor: string; role: T.Role; note?: string; file?: File }) =>
    req<T.ItemOut>(`/items/${id}/condition`, form(b)),
  itemHistory: (id: string) => req<T.ConditionEventOut[]>(`/items/${id}/history`),

  // guest
  guest: (token: string) => req<T.GuestProperty>(`/guest/${token}`),
  stayHome: (token: string) => req<any>(`/s/${token}`),
  createStay: (pid: string, b?: { reservation_ref?: string; guest_name?: string }) => req<any>(`/properties/${pid}/stays`, json("POST", b ?? {})),
  stayUploadVideo: (token: string, roomId: string, file: File) => req<any>(`/s/${token}/checkout/rooms/${roomId}/video`, form({ file })),
  stayReport: (token: string, text: string, file?: File) => req<any>(`/s/${token}/checkout/report`, form({ text, file })),
  staySubmit: (token: string) => req<any>(`/s/${token}/checkout/submit`, { method: "POST" }),
  stayReceipt: (token: string) => req<any>(`/s/${token}/checkout/receipt`),
  stayLateNote: (token: string, text: string) => req<any>(`/s/${token}/checkout/notes`, form({ text })),
  guestAsk: (token: string, file: File) => req<T.GuestAnswer>(`/guest/${token}/ask`, form({ file })),

  // audits
  createAudit: (pid: string) => req<T.AuditCreated>(`/properties/${pid}/audits`, { method: "POST" }),
  uploadAuditVideo: async (aid: string, rid: string, file: File) => {
    try { 
      return await req<T.UploadAck>(`/audits/${aid}/rooms/${rid}/video`, form({ file })); 
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        throw new Error("We could not read that video, please try again.");
      }
      throw e;
    }
  },
  uploadAuditFrames: async (aid: string, rid: string, files: File[]) => {
    const fd = new FormData();
    for (const f of files) fd.append("files", f);
    try {
      const res = await fetch(`${API_URL}/api/audits/${aid}/rooms/${rid}/frames`, { method: "POST", body: fd });
      if (!res.ok) {
        let detail = `Something went wrong (${res.status}).`;
        try { const b = await res.json(); if (typeof b.detail === "string") detail = b.detail; } catch { /* */ }
        if (res.status === 413) detail = "That file is too large, try a smaller one.";
        if (res.status === 422) detail = "We could not read that file, please try again.";
        throw new ApiError(detail, res.status);
      }
      if (res.status === 204) return undefined as unknown as T.UploadAck;
      return (await res.json()) as T.UploadAck;
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new Error("Cannot reach the server. Check your connection and try again.");
    }
  },
  runAudit: (aid: string) => req<T.RunAck>(`/audits/${aid}/run`, { method: "POST" }),
  getAudit: (aid: string) => req<T.AuditDetail>(`/audits/${aid}`),
  patchFinding: (id: string, b: { role: T.Role; resolution?: T.Resolution; note?: string }) =>
    req<T.FindingOut>(`/findings/${id}`, json("PATCH", b)),

  // inspections
  startInspection: (pid: string, b: { kind: T.InspectionKind; inspector: string; reservation_ref?: string }) =>
    req<T.InspectionOut>(`/properties/${pid}/inspections`, json("POST", b)),
  listInspections: (pid: string) => req<T.InspectionOut[]>(`/properties/${pid}/inspections`),
  getInspection: (id: string) => req<T.InspectionDetail>(`/inspections/${id}`),
  patchInspectionItem: (id: string, b: T.InspectionItemPatch) =>
    req<T.InspectionItemOut>(`/inspection-items/${id}`, json("PATCH", b)),
  inspectionItemPhoto: (id: string, file: File, actor: string, role: T.Role) =>
    req<T.InspectionItemOut>(`/inspection-items/${id}/photo`, form({ file, actor, role })),
  patchCleaning: (id: string, b: { actor: string; done: boolean }) =>
    req<T.CleaningCheckOut>(`/cleaning-checks/${id}`, json("PATCH", b)),
  applyAiHints: (id: string, audit_id: string) =>
    req<{ applied: number }>(`/inspections/${id}/ai-suggestions`, json("POST", { audit_id })),
  completeInspection: (id: string, b: { role: T.Role; actor: string; exception_note?: string }) =>
    req<T.InspectionOut>(`/inspections/${id}/complete`, json("POST", b)),
  readiness: (id: string) => req<T.ReadinessReport>(`/inspections/${id}/readiness`),

  // cases
  listCases: (pid: string, status?: string) =>
    req<T.DiscrepancyOut[]>(`/properties/${pid}/discrepancies${qs({ status })}`),
  getCase: (id: string) => req<T.DiscrepancyDetail>(`/discrepancies/${id}`),
  patchCase: (id: string, b: { role: T.Role; actor: string; status?: T.CaseStatus; assigned_to?: string; blocks_readiness?: boolean }) =>
    req<T.DiscrepancyOut>(`/discrepancies/${id}`, json("PATCH", b)),
  addCaseEvent: (id: string, b: { role: T.Role; actor: string; kind: "note" | "search" | "evidence"; text?: string; file?: File }) =>
    req<T.DiscrepancyEventOut>(`/discrepancies/${id}/events`, form(b)),
  resolveCase: (id: string, b: { role: T.Role; actor: string; outcome: T.Outcome; note?: string }) =>
    req<T.DiscrepancyOut>(`/discrepancies/${id}/resolve`, json("POST", b)),
};