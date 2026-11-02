import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, FileText } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { statusLabel } from "@/lib/labels";
import type { InspectionDetail, Role } from "@/lib/types";
import { Pill } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function FinishCard({ insp, role, actor, onChanged }: {
  insp: InspectionDetail; role: Role; actor: string; onChanged: () => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const isHost = role === "host";

  async function complete(exception?: string) {
    if (!actor.trim()) return toast.error("Please enter your name at the top of the page.");
    setBusy(true);
    try {
      await api.completeInspection(insp.id, { role, actor: actor.trim(), exception_note: exception });
      toast.success("Inspection completed");
      onChanged();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  if (insp.status !== "in_progress") {
    return (
      <Card className="gap-3 p-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <CheckCircle2 className="size-5 text-primary" aria-hidden /> Inspection {statusLabel[insp.status].toLowerCase()}
        </h2>
        {insp.exception_note && <p className="warn-box">Exception by {insp.exception_by}: {insp.exception_note}</p>}
        <p className="text-sm text-muted-foreground">Completed does not mean ready. Check the report.</p>
        <Button className="btn-tap" asChild>
          <Link to={`/inspection/${insp.id}/readiness?role=${role}`}><FileText className="size-5" /> Open readiness report</Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="gap-3 p-4">
      <h2 className="text-lg font-semibold">Finish</h2>
      {insp.blockers.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-medium">Still to do</p>
          <ul className="list-disc space-y-1 pl-5 text-sm">{insp.blockers.map((b, i) => <li key={i}>{b}</li>)}</ul>
        </div>
      )}
      <Button className="btn-tap" disabled={!insp.can_complete || busy} onClick={() => complete()}>
        {busy ? "Saving..." : "Complete inspection"}
      </Button>
      {isHost ? (
        <div className="space-y-2 border-t pt-3">
          <Label htmlFor="exc">Complete with exception (needs a reason)</Label>
          <Textarea id="exc" rows={3} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Why can this be completed with open checks?" />
          <Button variant="outline" className="btn-tap w-full" disabled={busy || !note.trim()} onClick={() => complete(note.trim())}>
            Complete with exception
          </Button>
          <p className="text-xs text-muted-foreground">An exception never hides an essential gap.</p>
        </div>
      ) : (
        <p className="rounded-lg bg-muted p-3 text-sm">Only the host can approve an exception.</p>
      )}
    </Card>
  );
}