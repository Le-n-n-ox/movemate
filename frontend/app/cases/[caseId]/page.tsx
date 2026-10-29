"use client";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { FilePicker } from "@/components/FilePicker";
import { ErrorNote, Pill, RoleBar, Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import type { DiscrepancyDetail, Outcome } from "@/lib/types";
import { useActor, useRole } from "@/lib/useRole";

const HOST_OUTCOMES: Outcome[] = ["found", "restored_to_place", "repaired", "replaced", "recorded_missing"];
const CLEANER_OUTCOMES: Outcome[] = ["found", "restored_to_place"];

export default function CasePage() {
  return <Suspense fallback={null}><Case /></Suspense>;
}

function Case() {
  const { caseId } = useParams<{ caseId: string }>();
  const role = useRole();
  const [actor, setActor] = useActor();
  const [c, setC] = useState<DiscrepancyDetail | null>(null);
  const [text, setText] = useState("");
  const [assignee, setAssignee] = useState("");
  const [outcome, setOutcome] = useState<Outcome>("found");
  const [resNote, setResNote] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const load = () => api.getCase(caseId).then(setC).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [caseId]); // eslint-disable-line react-hooks/exhaustive-deps
  const run = async (fn: () => Promise<unknown>) => {
    setErr(null);
    if (!actor.trim()) { setErr("Enter your name first."); return; }
    try { await fn(); await load(); } catch (x) { setErr((x as Error).message); }
  };
  const who = actor.trim();
  const outcomes = role === "host" ? HOST_OUTCOMES : CLEANER_OUTCOMES;
  const resolved = c?.status === "resolved";

  return (
    <Shell title={c?.item_label ?? "Case"} back={c ? { href: `/properties/${c.property_id}/cases?role=${role}`, label: "Cases" } : undefined}>
      <ErrorNote message={err} />
      <RoleBar role={role} actor={actor} setActor={setActor} />
      {c && (<>
        <div className="card space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={resolved ? "green" : c.status === "investigating" ? "amber" : "red"}>{c.status}</Pill>
            <Pill>{c.type.replace("_", " ")}</Pill>
            {c.blocks_readiness && <Pill tone="red">blocks readiness</Pill>}
          </div>
          <p className="text-sm text-stone-600">{c.room_name}{c.expected_location ? ` · expected at ${c.expected_location}` : ""}{c.assigned_to ? ` · assigned to ${c.assigned_to}` : ""}</p>
          {c.reference_crop_url && /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.reference_crop_url} alt="Reference" className="h-28 rounded-lg object-cover" />}
          {c.ai_suggestion && <p className="rounded-lg bg-sky-50 p-2 text-sm text-sky-900">AI hint (not a result): {c.ai_suggestion.type.replace("_", " ")}{c.ai_suggestion.observed ? ` — ${c.ai_suggestion.observed}` : ""}</p>}
          {resolved && <p className="text-sm"><b>{c.outcome?.replace(/_/g, " ")}</b>{c.resolution_note ? `: ${c.resolution_note}` : ""} ({c.resolved_by})</p>}
        </div>

        <section className="space-y-2">
          <h2 className="font-medium">History</h2>
          {c.events.map((e) => (
            <div key={e.id} className="rounded-lg bg-stone-50 p-2 text-sm">
              <div><b>{e.kind}</b> · {e.actor}{e.role ? ` (${e.role})` : ""} · {new Date(e.created_at).toLocaleString()}</div>
              {e.text && <div>{e.text}</div>}
              {e.photo_url && /* eslint-disable-next-line @next/next/no-img-element */ <img src={e.photo_url} alt="" className="mt-1 h-24 rounded-lg object-cover" />}
            </div>
          ))}
        </section>

        {!resolved && (<>
          <section className="card space-y-2">
            <h2 className="font-medium">Add to the record</h2>
            <textarea className="input" rows={2} placeholder="What was searched or found?" value={text} onChange={(e) => setText(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-ghost" disabled={!text.trim()} onClick={() => run(async () => { await api.addCaseEvent(caseId, { role, actor: who, kind: "search", text: text.trim() }); setText(""); })}>Log search</button>
              <button className="btn-ghost" disabled={!text.trim()} onClick={() => run(async () => { await api.addCaseEvent(caseId, { role, actor: who, kind: "note", text: text.trim() }); setText(""); })}>Add note</button>
            </div>
            <FilePicker kind="image" label="Add photo evidence" onFile={async (f) => { await run(() => api.addCaseEvent(caseId, { role, actor: who, kind: "evidence", text: text.trim() || undefined, file: f })); setText(""); }} />
          </section>

          {role === "host" && (
            <section className="card space-y-2">
              <h2 className="font-medium">Host controls</h2>
              <div className="flex gap-2">
                <input className="input" placeholder="Assign to (name)" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
                <button className="btn-ghost" disabled={!assignee.trim()} onClick={() => run(async () => { await api.patchCase(caseId, { role, actor: who, assigned_to: assignee.trim(), status: "investigating" }); setAssignee(""); })}>Assign</button>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={c.blocks_readiness} onChange={(e) => run(() => api.patchCase(caseId, { role, actor: who, blocks_readiness: e.target.checked }))} />
                Blocks readiness (essential item)
              </label>
            </section>
          )}

          <section className="card space-y-2">
            <h2 className="font-medium">Resolve</h2>
            {role !== "host" && <p className="text-sm text-stone-500">Cleaners can close a case only as found or put back. Other outcomes are for the host.</p>}
            <select className="input" value={outcome} onChange={(e) => setOutcome(e.target.value as Outcome)}>
              {outcomes.map((o) => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
            </select>
            <textarea className="input" rows={2} placeholder="Note (where was it, what was done)" value={resNote} onChange={(e) => setResNote(e.target.value)} />
            <button className="btn w-full" onClick={() => run(() => api.resolveCase(caseId, { role, actor: who, outcome, note: resNote.trim() || undefined }))}>Resolve case</button>
          </section>
        </>)}
      </>)}
    </Shell>
  );
}
