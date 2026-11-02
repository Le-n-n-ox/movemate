import { useState } from "react";
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
      <h2 className="text-lg font-semibold">Host controls</h2>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Input aria-label="Assign to" placeholder="Assign to (name)" className="h-12" value={name} onChange={(e) => setName(e.target.value)} />
        <Button className="btn-tap" disabled={busy || !name.trim()} onClick={() => patch({ assigned_to: name.trim() })}>Assign</Button>
      </div>
      <label className="flex min-h-12 items-start gap-3 text-sm">
        <input type="checkbox" className="mt-0.5 size-5 accent-primary" checked={c.blocks_readiness} disabled={busy}
          onChange={(e) => patch({ blocks_readiness: e.target.checked })} />
        <span>Blocks readiness<span className="block text-xs text-muted-foreground">The property cannot be ready while this is open.</span></span>
      </label>
    </Card>
  );
}