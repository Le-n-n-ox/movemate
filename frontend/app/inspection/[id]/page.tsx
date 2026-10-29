"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { FilePicker } from "@/components/FilePicker";
import { ErrorNote, Pill, RoleBar, Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import type { CheckResult, InspectionDetail, InspectionItemOut, PropertyDetail, Role } from "@/lib/types";
import { useActor, useRole, withRole } from "@/lib/useRole";

const RESULTS: { r: CheckResult; label: string }[] = [
  { r: "ok", label: "OK" }, { r: "not_seen", label: "Not seen" }, { r: "misplaced", label: "Misplaced" },
  { r: "missing", label: "Missing" }, { r: "damaged", label: "Damaged" },
];

export default function InspectionPage() {
  return <Suspense fallback={null}><Inspection /></Suspense>;
}

function Inspection() {
  const { id } = useParams<{ id: string }>();
  const role = useRole();
  const [actor, setActor] = useActor();
  const [d, setD] = useState<InspectionDetail | null>(null);
  const [prop, setProp] = useState<PropertyDetail | null>(null);
  const [exception, setException] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => api.getInspection(id).then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (d && !prop) api.getProperty(d.property_id).then(setProp).catch(() => {}); }, [d, prop]);

  const done = d ? d.status !== "in_progress" : false;
  const needName = () => { if (!actor.trim()) { setErr("Enter your name first."); return true; } return false; };
  const run = async (fn: () => Promise<unknown>) => { setErr(null); try { await fn(); await load(); } catch (x) { setErr((x as Error).message); } };

  const complete = (withException: boolean) => run(async () => {
    if (needName()) return;
    await api.completeInspection(id, { role, actor: actor.trim(), exception_note: withException ? exception.trim() : undefined });
    setMsg("Inspection saved. Open the readiness report to see if the property is ready.");
  });

  return (
    <Shell title="Inspection" back={d ? { href: `/properties/${d.property_id}`, label: "Property" } : undefined}>
      <ErrorNote message={err} />
      {msg && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</p>}
      <RoleBar role={role} actor={actor} setActor={setActor} />
      {d && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Pill tone={d.status === "in_progress" ? "amber" : "green"}>{d.status.replace(/_/g, " ")}</Pill>
          <span className="text-stone-600">{d.kind.replace(/_/g, " ")} · {d.inspector}{d.reservation_ref ? ` · ${d.reservation_ref}` : ""}</span>
        </div>
      )}

      {prop?.latest_audit_id && !done && (
        <button className="btn-ghost w-full" onClick={() => run(async () => {
          const r = await api.importAiSuggestions(id, prop.latest_audit_id!);
          setMsg(`Added AI hints to ${r.applied} item(s). They are suggestions only; you decide each result.`);
        })}>Use hints from the latest AI video check</button>
      )}

      {d?.rooms.map((r) => (
        <section key={r.room_id} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-medium">{r.room_name}</h2>
            <Pill tone={r.cleaning_status === "done" ? "green" : "stone"}>cleaning: {r.cleaning_status.replace(/_/g, " ")}</Pill>
            <Pill tone={r.inventory_status === "done" ? "green" : "stone"}>inventory: {r.inventory_status.replace(/_/g, " ")}</Pill>
          </div>
          {r.cleaning.length > 0 && (
            <div className="card space-y-2">
              <div className="font-medium">Cleaning</div>
              {r.cleaning.map((c) => (
                <label key={c.id} className="flex items-center gap-2">
                  <input type="checkbox" checked={c.done} disabled={done}
                    onChange={(e) => run(async () => { if (needName()) return; await api.patchCleaningCheck(c.id, { actor: actor.trim(), done: e.target.checked }); })} />
                  {c.label}
                </label>
              ))}
            </div>
          )}
          {r.items.map((it) => (
            <ItemRow key={it.id} it={it} role={role} actor={actor} disabled={done} run={run} needName={needName} />
          ))}
          {r.items.length === 0 && <p className="text-sm text-stone-500">No items to check in this room.</p>}
        </section>
      ))}

      {d && !done && (
        <section className="card space-y-3">
          <h2 className="font-medium">Finish</h2>
          {d.blockers.length > 0 && (
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <div className="font-medium">Still to do</div>
              <ul className="ml-4 list-disc">{d.blockers.map((b) => <li key={b}>{b}</li>)}</ul>
            </div>
          )}
          <button className="btn w-full" disabled={!d.can_complete} onClick={() => complete(false)}>Complete inspection</button>
          {role === "host" ? (
            <div className="space-y-2">
              <p className="text-sm text-stone-600">Host only: finish with an exception. Needs a reason. Essential items that are missing still block readiness.</p>
              <textarea className="input" rows={2} placeholder="Reason for exception" value={exception} onChange={(e) => setException(e.target.value)} />
              <button className="btn-ghost w-full" disabled={exception.trim().length < 3} onClick={() => complete(true)}>Complete with exception</button>
            </div>
          ) : (
            <p className="text-sm text-stone-500">Only the host can approve an exception. Open this page with <Link className="text-brand" href={withRole(`/inspection/${id}`, "host")}>host view</Link>.</p>
          )}
        </section>
      )}

      {d && done && <Link href={withRole(`/inspection/${id}/readiness`, role)} className="btn w-full">Open readiness report</Link>}
      {d && <Link href={withRole(`/properties/${d.property_id}/cases`, role)} className="btn-ghost w-full">Cases for this property</Link>}
    </Shell>
  );
}

function ItemRow({ it, role, actor, disabled, run, needName }: {
  it: InspectionItemOut; role: Role; actor: string; disabled: boolean; run: (fn: () => Promise<unknown>) => Promise<void>; needName: () => boolean;
}) {
  const [qty, setQty] = useState(it.observed_quantity ?? it.expected_quantity);
  const [note, setNote] = useState(it.note ?? "");
  const consumable = it.kind === "consumable";
  const set = (result: CheckResult) => run(async () => {
    if (needName()) return;
    await api.patchInspectionItem(it.id, { role, actor: actor.trim(), result, note: note.trim() || undefined,
      observed_quantity: consumable || result === "ok" ? qty : undefined });
  });
  const hint = it.ai_suggestion;
  return (
    <div className="card space-y-2">
      <div className="flex gap-3">
        {it.reference_crop_url && /* eslint-disable-next-line @next/next/no-img-element */ <img src={it.reference_crop_url} alt="" className="h-16 w-16 rounded-lg object-cover" />}
        <div className="flex-1">
          <div className="font-medium">{it.label} <span className="text-stone-500">x{it.expected_quantity}</span></div>
          <div className="text-sm text-stone-500">{it.location_path ?? "Anywhere in the room"}{it.alternate_locations.length ? ` (also: ${it.alternate_locations.join(", ")})` : ""}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {it.high_value && <Pill tone="amber">photo required</Pill>}
            {consumable && <Pill tone="blue">consumable</Pill>}
            {it.result !== "pending" && <Pill tone={it.result === "ok" ? "green" : "red"}>{it.result.replace("_", " ")}</Pill>}
            {it.discrepancy_id && <Link href={withRole(`/cases/${it.discrepancy_id}`, role)} className="text-sm text-brand">case</Link>}
          </div>
        </div>
      </div>
      {hint && <p className="rounded-lg bg-sky-50 p-2 text-sm text-sky-900">AI hint (not a result): {hint.type.replace("_", " ")}{hint.observed ? ` — ${hint.observed}` : ""}</p>}
      <div className="flex items-center gap-2 text-sm">
        {consumable && (<>Counted <input className="input !w-20" type="number" min={0} value={qty} disabled={disabled} onChange={(e) => setQty(Math.max(0, Number(e.target.value) || 0))} /></>)}
        {!consumable && <input className="input" placeholder="Note (optional)" value={note} disabled={disabled} onChange={(e) => setNote(e.target.value)} />}
      </div>
      {!disabled && (
        <div className="flex flex-wrap gap-2">
          {consumable ? (
            <button className={it.result === "ok" || it.result === "low_stock" ? "btn" : "btn-ghost"} onClick={() => set("ok")}>Save count</button>
          ) : RESULTS.map((x) => (
            <button key={x.r} className={it.result === x.r ? "btn !px-3 !py-1" : "btn-ghost !px-3 !py-1"} onClick={() => set(x.r)}>{x.label}</button>
          ))}
        </div>
      )}
      {!disabled && (
        <div>
          <FilePicker kind="image" label={it.photo_url ? "Replace photo" : "Add photo"} onFile={async (f) => { if (needName()) return; await run(() => api.inspectionItemPhoto(it.id, f, actor.trim(), role)); }} />
          {it.photo_url && /* eslint-disable-next-line @next/next/no-img-element */ <img src={it.photo_url} alt="" className="mt-2 h-24 rounded-lg object-cover" />}
        </div>
      )}
    </div>
  );
}
