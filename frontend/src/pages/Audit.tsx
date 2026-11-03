import { useParams } from "react-router-dom";
import { Copy, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { usePolling } from "@/hooks/usePolling";
import { useRole } from "@/hooks/useRole";
import { plainSummary, sortFindings, summaryLine } from "@/lib/audit";
import { copyText } from "@/lib/labels";
import { EmptyState, ErrorNote, Pill, Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CapturePhase } from "@/components/audit/CapturePhase";
import { FindingCard } from "@/components/audit/FindingCard";
import { FindingsChart } from "@/components/audit/FindingsChart";

export default function Audit() {
  const { auditId = "" } = useParams();
  const { role } = useRole();
  const audit = useAsync(() => api.getAudit(auditId), [auditId]);
  const a = audit.data;
  const pid = a?.property_id;
  const prop = useAsync(async () => (pid ? api.getProperty(pid) : null), [pid]);
  const health = useAsync(api.health);
  const refresh = () => void audit.refresh(true);

  usePolling(refresh, a?.status === "running");

  const rooms = prop.data?.rooms ?? [];
  const roomName = (id: string | null) => rooms.find((r) => r.id === id)?.name;

  return (
    <Shell
      title="AI video check" back={pid ? `/properties/${pid}` : "/properties"} backLabel="Property"
      right={health.data?.mock_models ? <Pill tone="warn">Demo mode</Pill> : undefined}
    >
      <p className="text-sm text-muted-foreground">Suggestions only. A person decides.</p>

      {audit.loading && <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>}
      {audit.error && <ErrorNote message={audit.error} onRetry={() => audit.refresh()} />}

      {(a?.status === "draft" || a?.status === "failed") && (
        <CapturePhase auditId={a.id} rooms={rooms} uploaded={a.rooms_uploaded}
          failedStage={a.status === "failed" ? (a.stage ?? "Something went wrong.") : null} onChanged={refresh} />
      )}

      {a?.status === "running" && (
        <Card className="items-center gap-3 p-6 text-center" role="status" aria-live="polite">
          <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
          <p className="text-lg font-semibold">{a.stage ?? "Starting the check…"}</p>
          <p className="text-sm text-muted-foreground">This can take a minute or two. You can leave this page open.</p>
        </Card>
      )}

      {a?.status === "done" && (
        <>
          <Card className="gap-1 p-4">
            <p className="text-lg font-semibold">{summaryLine(a.findings, a.summary)}</p>
            <p className="text-sm text-muted-foreground">Open ones first. Closed ones stay as the record.</p>
          </Card>
          <FindingsChart findings={a.findings} />
          {a.findings.length === 0 && <EmptyState title="Nothing to review" hint="Everything we checked looked as expected." />}
          {sortFindings(a.findings).map((f) => (
            <FindingCard key={`${f.id}-${f.resolution}-${f.note ?? ""}`} f={f} role={role} roomName={roomName(f.room_id)} onChanged={refresh} />
          ))}
          <Button variant="outline" className="no-print btn-tap w-full mt-4"
            onClick={() => copyText(plainSummary(a.findings, a.summary), "Summary copied")}>
            <Copy className="size-5" /> Copy summary
          </Button>
        </>
      )}
    </Shell>
  );
}
