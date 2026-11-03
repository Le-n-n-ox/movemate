import { useState } from "react";
import { useParams } from "react-router-dom";
import { Copy, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { useRole } from "@/hooks/useRole";
import { copyText, kindLabel, statusLabel } from "@/lib/labels";
import { ErrorNote, Pill, RoleBar, Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RoomSection } from "@/components/inspection/RoomSection";
import { FinishCard } from "@/components/inspection/FinishCard";

export default function Inspection() {
  const { id = "" } = useParams();
  const { role, isHost, actor, setActor, linkFor, withRole } = useRole();
  const insp = useAsync(() => api.getInspection(id), [id]);
  const pid = insp.data?.property_id;
  const prop = useAsync(async () => (pid ? api.getProperty(pid) : null), [pid]);
  const [hintBusy, setHintBusy] = useState(false);
  const refresh = () => void insp.refresh(true);

  const d = insp.data;
  const auditId = prop.data?.latest_audit_id;
  const open = d?.status === "in_progress";

  const checks = d?.rooms.flatMap((r) => r.cleaning) ?? [];
  const checksDone = checks.filter((c) => c.done).length;
  const pct = checks.length ? Math.round((checksDone / checks.length) * 100) : 0;

  async function useHints() {
    if (!auditId) return;
    setHintBusy(true);
    try {
      const r = await api.applyAiHints(id, auditId);
      toast.success(r.applied ? `${r.applied} hints added` : "No hints to add");
      refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setHintBusy(false); }
  }

  return (
    <Shell title={d ? kindLabel(d.kind) : "Inspection"} back={withRole(pid ? `/properties/${pid}` : "/properties")} backLabel="Property">
      <RoleBar role={role} actor={actor} onActor={setActor} />
      {insp.loading && [0, 1].map((i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
      {insp.error && <ErrorNote message={insp.error} onRetry={() => insp.refresh()} />}
      {d && (
        <>
          <Card className={`gap-3 p-4 ${open ? "card-warn" : d.status === "completed" ? "card-ok" : "card-info"}`}>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Pill tone={open ? "warn" : d.status === "completed" ? "ok" : "info"}>{statusLabel[d.status]}</Pill>
              <span className="inline-flex items-center gap-1"><User className="size-4" aria-hidden /> {d.inspector}</span>
              {d.reservation_ref && <span>· Ref {d.reservation_ref}</span>}
            </div>
            {checks.length > 0 && (
              <div className="space-y-1.5" aria-live="polite">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{checksDone} of {checks.length} cleaning checks done</span>
                  <span className="text-muted-foreground">{pct}%</span>
                </div>
                <div className="meter" role="progressbar" aria-label="Cleaning checks done" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
                  <span style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}
          </Card>

          {isHost && (
            <Button variant="outline" className="no-print btn-tap w-full"
              onClick={() => copyText(linkFor("cleaner"), "Cleaner link copied")}>
              <Copy className="size-5" /> Copy link for the cleaner
            </Button>
          )}

          {open && auditId && (
            <Card className="card-info gap-3 p-4">
              <h2 className="card-title">
                <span className="icon-badge bg-info/15 text-info"><Sparkles className="size-5" aria-hidden /></span> AI hints
              </h2>
              <p className="text-sm text-muted-foreground">Add hints from the latest AI video check. They never change a result.</p>
              <Button variant="outline" className="btn-tap" disabled={hintBusy} onClick={useHints}>
                <Sparkles className="size-5" /> {hintBusy ? "Adding..." : "Use hints from the latest AI video check"}
              </Button>
            </Card>
          )}

          <div className="stagger space-y-4">
            {d.rooms.map((r) => (
              <RoomSection key={r.room_id} room={r} role={role} actor={actor} readOnly={!open} onChanged={refresh} />
            ))}
          </div>
          <FinishCard insp={d} role={role} actor={actor} onChanged={refresh} />
        </>
      )}
    </Shell>
  );
}