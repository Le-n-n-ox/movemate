import { useState } from "react";
import { useParams } from "react-router-dom";
import { Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { buildCleanerLink } from "@/lib/links";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { useRole } from "@/hooks/useRole";
import { copyText, kindLabel, statusLabel } from "@/lib/labels";
import { ErrorNote, Pill, RoleBar, Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { RoomSection } from "@/components/inspection/RoomSection";
import { FinishCard } from "@/components/inspection/FinishCard";

export default function Inspection() {
  const { id = "" } = useParams();
  const { role, isHost, actor, setActor, withRole } = useRole();
  const insp = useAsync(() => api.getInspection(id), [id]);
  const pid = insp.data?.property_id;
  const prop = useAsync(async () => (pid ? api.getProperty(pid) : null), [pid]);
  const [hintBusy, setHintBusy] = useState(false);
  const refresh = () => void insp.refresh(true);

  const d = insp.data;
  const auditId = prop.data?.latest_audit_id;
  const open = d?.status === "in_progress";

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

  if (role === "cleaner" && !actor) {
    return (
      <div className="page flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">What's your name?</h1>
          <p className="text-sm text-muted-foreground">
            Your name goes on everything you confirm, so the host knows who checked what.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="cleaner-name" className="sr-only">Your name</Label>
            <Input
              id="cleaner-name"
              placeholder="Your name"
              autoFocus
              autoComplete="name"
              className="h-12"
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                const v = (e.target as HTMLInputElement).value.trim();
                if (v) setActor(v);
              }}
            />
          </div>
          <Button className="btn-tap w-full" onClick={() => {
            const v = (document.getElementById("cleaner-name") as HTMLInputElement).value.trim();
            if (v) setActor(v);
          }}>Continue</Button>
        </div>
      </div>
    );
  }

  return (
    <Shell title={d ? kindLabel(d.kind) : "Inspection"} back={withRole(pid ? `/properties/${pid}` : "/properties")} backLabel="Property">
      <RoleBar role={role} actor={actor} onActor={setActor} />
      {insp.loading && <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}</div>}
      {insp.error && <ErrorNote message={insp.error} onRetry={() => insp.refresh()} />}
      {d && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Pill tone={open ? "warn" : d.status === "completed" ? "ok" : "info"}>{statusLabel[d.status]}</Pill>
            <span>By {d.inspector}</span>
            {d.reservation_ref && <span>· Ref {d.reservation_ref}</span>}
          </div>

          {isHost && (
            <Button variant="outline" className="no-print btn-tap w-full" onClick={() => copyText(buildCleanerLink("inspection", id), "Cleaner link copied")}>
              <Copy className="size-5" /> Copy link for the cleaner
            </Button>
          )}

          {open && auditId && (
            <Card className="gap-2 p-4">
              <p className="text-sm text-muted-foreground">Add hints from the latest AI video check. They never change a result.</p>
              <Button variant="outline" className="btn-tap w-full" disabled={hintBusy} onClick={useHints}>
                <Sparkles className="size-5" /> {hintBusy ? "Adding…" : "Use hints from the latest AI video check"}
              </Button>
            </Card>
          )}

          {d.rooms.map((r) => (
            <RoomSection key={r.room_id} room={r} role={role} actor={actor} readOnly={!open} onChanged={refresh} />
          ))}
          <FinishCard insp={d} role={role} actor={actor} onChanged={refresh} />
        </>
      )}
    </Shell>
  );
}
