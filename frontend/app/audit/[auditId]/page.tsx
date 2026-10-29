"use client";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { FilePicker } from "@/components/FilePicker";
import { ErrorNote, Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import type { AuditDetail, FindingOut, PropertyDetail, Role } from "@/lib/types";
import { usePolling } from "@/lib/usePolling";

const BADGE: Record<FindingOut["type"], string> = {
  missing: "bg-red-100 text-red-700", count_mismatch: "bg-amber-100 text-amber-800",
  unverified: "bg-yellow-100 text-yellow-800", misplaced: "bg-orange-100 text-orange-800", extra: "bg-stone-200 text-stone-700",
};

/** Role stand-in for v1 (no login): /audit/<id>?role=host for the host, ?role=cleaner (default) for the cleaner. */
export default function AuditPage() {
  return <Suspense fallback={null}><Audit /></Suspense>;
}

function Audit() {
  const { auditId } = useParams<{ auditId: string }>();
  const role: Role = useSearchParams().get("role") === "host" ? "host" : "cleaner";
  const [prop, setProp] = useState<PropertyDetail | null>(null);
  const [starting, setStarting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data: audit, refresh } = usePolling<AuditDetail>(() => api.getAudit(auditId), (a) => a.status !== "running", 2000);
  const running = audit?.status === "running";
  useEffect(() => { if (running) { const t = setInterval(refresh, 2000); return () => clearInterval(t); } }, [running]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (audit && !prop) api.getProperty(audit.property_id).then(setProp).catch((e) => setErr(e.message)); }, [audit, prop]);

  const roomName = (id: string | null) => prop?.rooms.find((r) => r.id === id)?.name ?? "";
  const resolve = async (f: FindingOut, resolution: FindingOut["resolution"], note?: string) => {
    try { await api.patchFinding(f.id, { role, resolution, note }); await refresh(); } catch (x) { setErr((x as Error).message); }
  };
  const copyCleanerLink = () => navigator.clipboard.writeText(`${window.location.origin}/audit/${auditId}?role=cleaner`);

  return (
    <Shell title="AI video check (suggestions)" back={audit ? { href: `/properties/${audit.property_id}`, label: "Property" } : undefined}>
      <ErrorNote message={err} />
      <p className="text-sm text-stone-500">Viewing as <b>{role}</b>.</p>
      {role === "host" && <button className="btn-ghost w-full" onClick={copyCleanerLink}>Copy link for the cleaner</button>}

      {audit?.status === "draft" || audit?.status === "failed" ? (
        <section className="space-y-3">
          <p className="text-stone-600">Film a 20 to 30 second walkthrough of each room. Pan slowly and pause on shelves and tables.</p>
          {prop?.rooms.map((r) => (
            <div key={r.id} className="card space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{r.name}</span>
                {audit.rooms_uploaded.includes(r.id) && <span className="text-sm text-emerald-700">Uploaded</span>}
              </div>
              <FilePicker kind="video" label={audit.rooms_uploaded.includes(r.id) ? "Re-record video" : "Record video"}
                onFile={async (f) => { await api.uploadAuditVideo(auditId, r.id, f); await refresh(); }} />
            </div>
          ))}
          <button className="btn w-full" disabled={starting || audit.rooms_uploaded.length === 0} onClick={async () => {
            setStarting(true);
            try { await api.runAudit(auditId); await refresh(); } catch (x) { setErr((x as Error).message); } finally { setStarting(false); }
          }}>Run audit</button>
          {audit.status === "failed" && <ErrorNote message={audit.stage} />}
        </section>
      ) : null}

      {running && <div className="card"><p className="font-medium">Checking your rooms...</p><p className="text-stone-600">{audit?.stage}</p></div>}

      {audit?.status === "done" && (
        <section className="space-y-3">
          <div className="card font-medium">{audit.summary}</div>
          {audit.findings.length === 0 && <p className="text-emerald-700">Everything checked looks in place.</p>}
          {[...audit.findings].sort((a, b) => rank(a) - rank(b)).map((f) => (
            <FindingCard key={f.id} f={f} role={role} room={roomName(f.room_id)} onResolve={(r, note) => resolve(f, r, note)} />
          ))}
        </section>
      )}
    </Shell>
  );
}

const rank = (f: FindingOut) => ({ missing: 0, count_mismatch: 1, misplaced: 2, unverified: 3, extra: 4 }[f.type]) + (f.resolution === "open" ? 0 : 10);

function FindingCard({ f, role, room, onResolve }: {
  f: FindingOut; role: Role; room: string; onResolve: (r: FindingOut["resolution"], note?: string) => void;
}) {
  const [note, setNote] = useState(f.note ?? "");
  const closed = f.resolution === "confirmed" || f.resolution === "dismissed";
  const moved = f.type === "misplaced";
  return (
    <div className={`card space-y-2 ${closed ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[f.type]}`}>{f.type.replace("_", " ")}</span>
        <span className="font-medium">{f.item_label}</span>
        <span className="text-sm text-stone-500">{room}</span>
      </div>
      <p className="text-sm text-stone-700">Expected: {f.expected}. {f.observed}</p>
      <div className="grid grid-cols-2 gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {f.reference_crop_url && <figure><img src={f.reference_crop_url} alt="" className="rounded-lg" /><figcaption className="text-xs text-stone-500">Baseline photo</figcaption></figure>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {f.evidence_frame_url && <figure><img src={f.evidence_frame_url} alt="" className="rounded-lg" /><figcaption className="text-xs text-stone-500">Evidence frame</figcaption></figure>}
      </div>
      {moved && f.resolution === "open" && <p className="text-sm text-orange-800">The item was seen, but not in its usual place. It may need to be put back.</p>}
      {f.type === "unverified" && f.resolution === "open" && <p className="text-sm text-yellow-800">Could not check. Please re-film this area.</p>}

      <textarea className="input" rows={2} placeholder="Add a note (for example: it was in the drawer)" value={note}
        disabled={closed && role !== "host"} onChange={(e) => setNote(e.target.value)}
        onBlur={() => note !== (f.note ?? "") && onResolve(f.resolution, note)} />

      <Status f={f} />

      {role === "cleaner" && (f.resolution === "open" || f.resolution === "found") && (
        <div className="flex gap-2">
          {f.resolution === "open"
            ? <button className="btn flex-1" onClick={() => onResolve("found", note)}>{moved ? "I put it back" : "It was found"}</button>
            : f.resolved_by === "cleaner" && <button className="btn-ghost flex-1" onClick={() => onResolve("open")}>Undo</button>}
        </div>
      )}
      {role === "host" && (
        <div className="flex gap-2">
          {f.resolution !== "confirmed" && <button className="btn flex-1" onClick={() => onResolve("confirmed", note)}>{moved ? "Confirm it moved" : "Confirm loss"}</button>}
          {f.resolution !== "dismissed" && <button className="btn-ghost flex-1" onClick={() => onResolve("dismissed", note)}>Dismiss</button>}
          {f.resolution !== "open" && <button className="btn-ghost" onClick={() => onResolve("open")}>Reopen</button>}
        </div>
      )}
    </div>
  );
}

function Status({ f }: { f: FindingOut }) {
  if (f.resolution === "open") return null;
  const text = {
    found: f.type === "misplaced" ? "Cleaner says it was put back. Host to review." : "Cleaner says it was found. Host to review.",
    confirmed: f.type === "misplaced" ? "Confirmed by the host: the item was moved." : "Confirmed as a loss by the host.",
    dismissed: "Dismissed by the host.",
  }[f.resolution];
  return <p className="rounded-lg bg-stone-100 p-2 text-sm text-stone-700">{text}</p>;
}
