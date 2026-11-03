import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { useRole } from "@/hooks/useRole";
import { caseStatusLabel, caseStatusTone, caseTypeLabel, outcomeLabel } from "@/lib/labels";
import { ErrorNote, Pill, RoleBar, Shell } from "@/components/Shell";
import { LinkButton } from "@/components/LinkButton";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trail } from "@/components/cases/Trail";
import { AddToRecord } from "@/components/cases/AddToRecord";
import { HostControls } from "@/components/cases/HostControls";
import { ResolveCard } from "@/components/cases/ResolveCard";

export default function CaseDetail() {
  const { caseId = "" } = useParams();
  const { role, isHost, actor, setActor } = useRole();
  const q = useAsync(() => api.getCase(caseId), [caseId]);
  const c = q.data;
  const refresh = () => void q.refresh(true);
  const resolved = c?.status === "resolved";

  return (
    <Shell title={c?.item_label ?? "Case"} back={c ? `/properties/${c.property_id}/cases?role=${role}` : "/properties"} backLabel="Cases">
      <RoleBar role={role} actor={actor} onActor={setActor} />
      {q.loading && <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>}
      {q.error && <ErrorNote message={q.error} onRetry={() => q.refresh()} />}
      {c && (
        <>
          <Card className="gap-3 p-4">
            <div className="flex flex-wrap gap-1.5">
              <Pill tone={caseStatusTone[c.status]}>{caseStatusLabel[c.status]}</Pill>
              <Pill>{caseTypeLabel[c.type]}</Pill>
              {c.blocks_readiness && <Pill>Blocks readiness</Pill>}
              {c.assigned_to && <Pill>Assigned to {c.assigned_to}</Pill>}
            </div>
            <div className="flex gap-3 mt-3">
              {c.reference_crop_url && <img src={c.reference_crop_url} alt={`Reference for ${c.item_label}`} className="size-24 shrink-0 rounded-lg object-cover" />}
              <div className="flex-1 space-y-1">
                {c.room_name && (
                  <div className="text-sm"><dt className="text-muted-foreground">Room</dt><dd className="text-foreground">{c.room_name}</dd></div>
                )}
                {c.expected_location && (
                  <div className="text-sm"><dt className="text-muted-foreground">Expected place</dt><dd className="text-foreground">{c.expected_location}</dd></div>
                )}
              </div>
            </div>
            {c.ai_suggestion && (
              <div className="hint-box space-y-2 mt-3">
                <p className="font-semibold">AI hint (not a result)</p>
                <p className="text-sm">{c.ai_suggestion.type.replace("_", " ")}{c.ai_suggestion.observed ? `: ${c.ai_suggestion.observed}` : ""}</p>
                {c.ai_suggestion.evidence_frame_url && (
                  <img src={c.ai_suggestion.evidence_frame_url} alt="Video frame for this hint" className="max-h-40 rounded-md" />
                )}
              </div>
            )}
            {resolved && (
              <div className="rounded-lg border border-ok/30 bg-ok/10 p-3 text-sm mt-3">
                <p className="mb-1 flex items-center gap-2 font-semibold text-ok">
                  <span className="size-5" aria-hidden>✓</span> Outcome: {c.outcome ? outcomeLabel(c.outcome) : "Resolved"}
                </p>
                {c.resolution_note && <p className="text-sm">{c.resolution_note}</p>}
                <p className="text-xs text-muted-foreground">{c.resolved_by} · {c.resolved_at && new Date(c.resolved_at).toLocaleString()}</p>
              </div>
            )}
            {c.inspection_id && (
              <LinkButton variant="outline" className="mt-3 w-full" to={`/inspection/${c.inspection_id}?role=${role}`}>
                Back to inspection
              </LinkButton>
            )}
          </Card>

          <Trail events={c.events} />
          {!resolved && (
            <>
              <AddToRecord id={c.id} role={role} actor={actor} onChanged={refresh} />
              {isHost && <HostControls c={c} actor={actor} onChanged={refresh} />}
              <ResolveCard key={role} id={c.id} role={role} actor={actor} onChanged={refresh} />
            </>
          )}
        </>
      )}
    </Shell>
  );
}
