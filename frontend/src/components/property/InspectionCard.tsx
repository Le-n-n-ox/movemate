import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { INSPECTION_KINDS, kindLabel, statusLabel } from "@/lib/labels";
import type { InspectionKind, InspectionOut } from "@/lib/types";
import { Pill } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function InspectionCard({ pid, recent, actor, setActor, hasRooms }: {
  pid: string; recent: InspectionOut[]; actor: string; setActor: (v: string) => void; hasRooms: boolean;
}) {
  const nav = useNavigate();
  const [kind, setKind] = useState<InspectionKind>("after_checkout");
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);

  async function start() {
    if (!actor.trim()) return toast.error("Please enter your name first.");
    setBusy(true);
    try {
      const i = await api.startInspection(pid, { kind, inspector: actor.trim(), reservation_ref: ref.trim() || undefined });
      nav(`/inspection/${i.id}?role=host`);
    } catch (e) { toast.error((e as Error).message); setBusy(false); }
  }

  return (
    <Card className="gap-3 p-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><ClipboardCheck className="size-5 text-primary" aria-hidden /> Inspection</h2>
      <p className="text-sm text-muted-foreground">Walk the checklist and see if the home is ready.</p>
      <select aria-label="Inspection type" className="field" value={kind} onChange={(e) => setKind(e.target.value as InspectionKind)}>
        {INSPECTION_KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <Input aria-label="Your name" placeholder="Your name" className="h-12" value={actor} onChange={(e) => setActor(e.target.value)} />
      <Input aria-label="Reservation reference" placeholder="Reservation reference (optional)" className="h-12" value={ref} onChange={(e) => setRef(e.target.value)} />
      <Button className="btn-tap" onClick={start} disabled={busy || !hasRooms}>{busy ? "Starting..." : "Start inspection"}</Button>
      {!hasRooms && <p className="text-sm text-muted-foreground">Add a room first.</p>}
      {recent.length > 0 && (
        <ul className="space-y-2 border-t pt-3">
          {recent.slice(0, 5).map((i) => (
            <li key={i.id}>
              <Link to={`/inspection/${i.id}?role=host`} className="flex min-h-12 items-center justify-between gap-2 rounded-lg p-2 active:bg-accent">
                <span className="text-sm">
                  <span className="font-medium">{kindLabel(i.kind)}</span>
                  <span className="block text-xs text-muted-foreground">{i.inspector} · {new Date(i.created_at).toLocaleDateString()}</span>
                </span>
                <Pill tone={i.status === "in_progress" ? "warn" : i.status === "completed" ? "ok" : "info"}>{statusLabel[i.status]}</Pill>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}