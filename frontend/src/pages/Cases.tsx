import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight, FolderCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { useRole } from "@/hooks/useRole";
import { caseStatusLabel, caseStatusTone, caseTypeLabel, outcomeLabel } from "@/lib/labels";
import { EmptyState, ErrorNote, Pill, Shell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Cases() {
  const { id = "" } = useParams();
  const { withRole } = useRole();
  const list = useAsync(() => api.listCases(id), [id]);
  const [showResolved, setShowResolved] = useState(false);

  const all = list.data ?? [];
  const shown = all
    .filter((c) => showResolved || c.status !== "resolved")
    .sort((a, b) => Number(b.blocks_readiness) - Number(a.blocks_readiness) || b.created_at.localeCompare(a.created_at));
  const resolvedCount = all.filter((c) => c.status === "resolved").length;

  return (
    <Shell title="Cases" back={withRole(`/properties/${id}`)} backLabel="Property">
      <p className="text-muted-foreground">
        A case is a record of something that needs a look. It is not a list of who to blame.
      </p>
      <label className="flex min-h-12 items-center gap-3 text-sm">
        <input type="checkbox" className="size-5 accent-primary" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
        Show resolved ({resolvedCount})
      </label>

      {list.loading && <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>}
      {list.error && <ErrorNote message={list.error} onRetry={() => list.refresh()} />}
      {!list.loading && !list.error && shown.length === 0 && (
        <EmptyState icon={<FolderCheck className="size-8" />} title="No open cases" hint="Cases appear when an inspection finds something off." />
      )}

      <ul className="space-y-4" aria-label="Cases">
        {shown.map((c) => (
          <li key={c.id}>
            <Link to={withRole(`/cases/${c.id}`)} className="block">
              <Card className={`row-link ${c.status === "resolved" ? "card-dim" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{c.item_label}</p>
                    <p className="text-sm text-muted-foreground">{caseTypeLabel[c.type]}{c.room_name ? ` · ${c.room_name}` : ""}</p>
                  </div>
                  <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Pill tone={caseStatusTone[c.status]}>{caseStatusLabel[c.status]}</Pill>
                  {c.blocks_readiness && <Pill tone="danger">Blocks readiness</Pill>}
                  {c.assigned_to && <Pill>Assigned to {c.assigned_to}</Pill>}
                  {c.outcome && <Pill tone="ok">{outcomeLabel(c.outcome)}</Pill>}
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </Shell>
  );
}
