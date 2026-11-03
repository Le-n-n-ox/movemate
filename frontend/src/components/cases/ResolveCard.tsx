import { useState } from "react";
import { CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { CLEANER_OUTCOMES, OUTCOMES } from "@/lib/labels";
import type { Outcome, Role } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ResolveCard({ id, role, actor, onChanged }: { id: string; role: Role; actor: string; onChanged: () => void }) {
  const options = OUTCOMES.filter(([v]) => role === "host" || CLEANER_OUTCOMES.includes(v));
  const [outcome, setOutcome] = useState<Outcome>(options[0][0]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function resolve() {
    if (!actor.trim()) return toast.error("Please enter your name at the top of the page.");
    setBusy(true);
    try {
      await api.resolveCase(id, { role, actor: actor.trim(), outcome, note: note.trim() || undefined });
      toast.success("Case resolved");
      onChanged();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <Card className="card-ok gap-3 p-4">
      <h2 className="card-title">
        <span className="icon-badge bg-ok/15 text-ok"><CheckCircle2 className="size-5" aria-hidden /></span> Resolve
      </h2>
      <div className="space-y-1.5">
        <Label htmlFor="outcome">Outcome</Label>
        <select id="outcome" className="field" value={outcome} onChange={(e) => setOutcome(e.target.value as Outcome)}>
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="r-note">Note (optional)</Label>
        <Textarea id="r-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {role === "cleaner" && (
        <p className="hint-box flex items-start gap-2">
          <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden /> Other outcomes are chosen by the host.
        </p>
      )}
      <Button className="btn-tap" disabled={busy} onClick={resolve}>{busy ? "Saving..." : "Resolve case"}</Button>
    </Card>
  );
}