"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ErrorNote, Pill, Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import type { DiscrepancyOut } from "@/lib/types";
import { useRole, withRole } from "@/lib/useRole";

export default function CasesPage() {
  return <Suspense fallback={null}><Cases /></Suspense>;
}

function Cases() {
  const { id } = useParams<{ id: string }>();
  const role = useRole();
  const [list, setList] = useState<DiscrepancyOut[] | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { api.listCases(id).then(setList).catch((e) => setErr(e.message)); }, [id]);
  const shown = (list ?? []).filter((c) => showResolved || c.status !== "resolved");
  return (
    <Shell title="Cases" back={{ href: `/properties/${id}`, label: "Property" }}>
      <ErrorNote message={err} />
      <p className="text-sm text-stone-600">A case records what was not where expected, what was done about it and how it ended. It is a record, not a blame list.</p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} /> Show resolved</label>
      {shown.map((c) => (
        <Link key={c.id} href={withRole(`/cases/${c.id}`, role)} className="card block">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{c.item_label}</span>
            <Pill tone={c.status === "resolved" ? "green" : c.status === "investigating" ? "amber" : "red"}>{c.status}</Pill>
            <Pill>{c.type.replace("_", " ")}</Pill>
            {c.blocks_readiness && <Pill tone="red">blocks readiness</Pill>}
          </div>
          <div className="text-sm text-stone-500">{c.room_name ?? ""}{c.assigned_to ? ` · assigned to ${c.assigned_to}` : ""}{c.outcome ? ` · ${c.outcome.replace(/_/g, " ")}` : ""}</div>
        </Link>
      ))}
      {list && shown.length === 0 && <p className="text-stone-500">No cases.</p>}
    </Shell>
  );
}
