"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorNote, Pill, Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import type { ReadinessReport } from "@/lib/types";

const TONE = { ready: "green", ready_with_exceptions: "amber", not_ready: "red" } as const;

/** Printable summary. Inspection complete does NOT mean ready: this page says which. */
export default function Readiness() {
  const { id } = useParams<{ id: string }>();
  const [r, setR] = useState<ReadinessReport | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { api.readiness(id).then(setR).catch((e) => setErr(e.message)); }, [id]);

  const list = (title: string, xs: string[]) => xs.length > 0 && (
    <section className="card"><h2 className="font-medium">{title}</h2><ul className="ml-4 list-disc text-sm">{xs.map((x) => <li key={x}>{x}</li>)}</ul></section>
  );
  return (
    <Shell title="Readiness report" back={{ href: `/inspection/${id}`, label: "Inspection" }}>
      <ErrorNote message={err} />
      {r && (<>
        <div className="card space-y-1">
          <div className="flex items-center gap-2"><h2 className="text-lg font-medium">{r.property_name}</h2><Pill tone={TONE[r.status]}>{r.status.replace(/_/g, " ")}</Pill></div>
          <p className="text-sm">{r.summary}</p>
          <p className="text-sm text-stone-500">{r.kind.replace(/_/g, " ")} · {r.inspector}{r.reservation_ref ? ` · ${r.reservation_ref}` : ""} · {new Date(r.generated_at).toLocaleString()}</p>
          <p className="text-sm">Cleaning: <b>{r.cleaning_status.replace(/_/g, " ")}</b> · Inventory: <b>{r.inventory_status.replace(/_/g, " ")}</b></p>
          {r.exception_note && <p className="text-sm">Exception by {r.exception_by}: {r.exception_note}</p>}
        </div>
        {list("Blocking readiness", r.blocking)}
        {list("Open cases", r.open_cases)}
        {list("Known gaps (recorded missing)", r.known_gaps)}
        {list("Low stock", r.low_stock)}
        <section className="space-y-2">
          <h2 className="font-medium">By room</h2>
          {r.rooms.map((x) => (
            <div key={x.room_name} className="card text-sm">
              <div className="font-medium">{x.room_name}</div>
              <div className="text-stone-600">cleaning {x.cleaning_status.replace(/_/g, " ")} · inventory {x.inventory_status.replace(/_/g, " ")}</div>
              {x.issues.length > 0 && <ul className="ml-4 list-disc">{x.issues.map((i) => <li key={i}>{i}</li>)}</ul>}
            </div>
          ))}
        </section>
        <button className="btn-ghost w-full print:hidden" onClick={() => window.print()}>Print</button>
      </>)}
    </Shell>
  );
}
