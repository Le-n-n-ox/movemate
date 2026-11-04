import { useState } from "react";
import { ShieldAlert, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { DiscrepancyDetail } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function HostControls({ c, actor, onChanged }: { c: DiscrepancyDetail; actor: string; onChanged: () => void }) {
  const [name, setName] = useState(c.assigned_to ?? "");
  const [busy, setBusy] = useState(false);

  async function patch(b: { assigned_to?: string; blocks_readiness?: boolean }) {
    if (!actor.trim()) return toast.error("Please enter your name at the top of the page.");
    setBusy(true);
    try { await api.patchCase(c.id, { role: "host", actor: actor.trim(), ...b }); onChanged(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <Card className="gap-3 p-4">
      <h2 className="card-title">
        <span className="icon-badge"><UserCheck className="size-5" aria-hidden /></span> Host controls
      </h2>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Input aria-label="Assign to" placeholder="Assign to (name)" className="h-12" value={name} onChange={(e) => setName(e.target.value)} />
        <Button className="btn-tap" disabled={busy || !name.trim()} onClick={() => patch({ assigned_to: name.trim() })}>Assign</Button>
      </div>
      <label className="flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border bg-card p-3 text-sm transition-colors has-[:checked]:border-warn has-[:checked]:bg-warn/10">
        <input type="checkbox" className="mt-0.5 size-5 accent-primary" checked={c.blocks_readiness} disabled={busy}
          onChange={(e) => patch({ blocks_readiness: e.target.checked })} />
        <span className="flex-1">
          <span className="flex items-center gap-1.5 font-semibold">
            <ShieldAlert className={`size-4 ${c.blocks_readiness ? "text-warn" : "text-muted-foreground"}`} aria-hidden /> Blocks readiness
          </span>
          <span className="block text-xs text-muted-foreground">The property cannot be ready while this is open.</span>
        </span>
      </label>
    </Card>
  );
}