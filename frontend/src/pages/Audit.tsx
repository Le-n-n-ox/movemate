import { useParams } from "react-router-dom";
import { Copy, ScanSearch, ShieldCheck, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { usePolling } from "@/hooks/usePolling";
import { useRole } from "@/hooks/useRole";
import { plainSummary, sortFindings, summaryLine } from "@/lib/audit";
import { copyText } from "@/lib/labels";
import { EmptyState, ErrorNote, Pill, RoleBar, Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CapturePhase } from "@/components/audit/CapturePhase";
import { FindingCard } from "@/components/audit/FindingCard";
import { FindingsChart } from "@/components/audit/FindingsChart";

export default function Audit() {
  const { auditId = "" } = useParams();
  const { role, isHost, actor, setActor, linkFor, withRole } = useRole();
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
      title="AI video check" back={withRole(pid ? `/properties/${pid}` : "/properties")} backLabel="Property"
      right={health.data?.mock_models ? <Pill tone="warn">Demo mode</Pill> : undefined}
    >
      <p className="hint-box flex items-start gap-2">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
        This check only suggests. A person decides what is real.
      </p>
      <RoleBar role={role} actor={actor} onActor={setActor} />
      {isHost && (
        <Button variant="outline" className="no-print btn-tap w-full" onClick={() => copyText(linkFor("cleaner"), "Cleaner link copied")}>
          <Copy className="size-5" /> Copy link for the cleaner
        </Button>
      )}

      {audit.loading && [0, 1].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
      {audit.error && <ErrorNote message={audit.error} onRetry={() => audit.refresh()} />}

      {a && (a.status === "draft" || a.status === "failed") && (
        <CapturePhase
          auditId={a.id} rooms={rooms} uploaded={a.rooms_uploaded}
          failedStage={a.status === "failed" ? (a.stage ?? "Something went wrong.") : null} onChanged={refresh}
        />
      )}

      {a?.status === "running" && (
        <Card className="card-info items-center gap-5 p-8 text-center" role="status" aria-live="polite">
          <div className="relative grid size-24 place-items-center" aria-hidden>
            <span className="absolute inset-0 animate-ping rounded-full bg-info/20" />
            <span className="absolute inset-3 animate-pulse rounded-full bg-info/20" />
            <span className="relative grid size-14 place-items-center rounded-full bg-info text-white">
              <ScanSearch className="size-7" />
            </span>
          </div>
          <div className="space-y-1">
            <p className="font-display text-xl font-bold">{a.stage ?? "Starting the check..."}</p>
            <p className="text-sm text-muted-foreground">This can take a minute or two. You can leave this page open.</p>
          </div>
          <div className="meter w-full max-w-xs" aria-hidden>
            <span className="w-1/3 animate-pulse" style={{ background: "var(--info)" }} />
          </div>
        </Card>
      )}

      {a?.status === "done" && (
        <>
          <Card className="card-info gap-2 p-4">
            <h2 className="card-title">
              <span className="icon-badge pop bg-info/15 text-info"><Sparkles className="size-5" aria-hidden /></span>
              {summaryLine(a.findings, a.summary)}
            </h2>
            <p className="text-sm text-muted-foreground">Open ones first. Closed ones stay as the record.</p>
          </Card>
          <FindingsChart findings={a.findings} />
          {a.findings.length === 0 && <EmptyState title="Nothing to review" hint="Everything we checked looked as expected." />}
          <div className="stagger space-y-4">
            {sortFindings(a.findings).map((f) => (
              <FindingCard key={`${f.id}-${f.resolution}-${f.note ?? ""}`} f={f} role={role} roomName={roomName(f.room_id)} onChanged={refresh} />
            ))}
          </div>
          <Button variant="outline" className="no-print btn-tap w-full"
            onClick={() => copyText(plainSummary(a.findings, a.summary), "Summary copied")}>
            <Copy className="size-5" /> Copy summary
          </Button>
        </>
      )}
    </Shell>
  );
}