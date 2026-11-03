import { useState } from "react";
import { Check, Minus, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { ItemOut } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SuggestedCard({ item, onChanged }: { item: ItemOut; onChanged: () => void }) {
  const [label, setLabel] = useState(item.label);
  const [qty, setQty] = useState(item.quantity);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [busy, setBusy] = useState(false);
  const clamp = (n: number) => Math.min(999, Math.max(1, n));

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    try { await fn(); onChanged(); } catch (e) { toast.error((e as Error).message); setBusy(false); }
  }

  return (
    <Card className="card-info gap-3 p-4">
      <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-info/10 px-2.5 py-1 text-xs font-semibold text-info">
        <Sparkles className="size-3.5" aria-hidden /> Suggested. Check it before you confirm
      </p>
      <div className="flex gap-3">
        {item.crop_url && <img src={item.crop_url} alt={item.label} className="size-20 shrink-0 rounded-xl border object-cover" />}
        <div className="flex-1 space-y-1.5">
          <Label htmlFor={`l-${item.id}`}>Name</Label>
          <Input id={`l-${item.id}`} className="h-12" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="flex-1 text-sm font-semibold">How many</span>
        <div className="flex items-center gap-1 rounded-xl border bg-secondary p-1">
          <Button variant="ghost" size="icon" className="size-11" aria-label="Fewer" onClick={() => setQty(clamp(qty - 1))}><Minus className="size-5" /></Button>
          <span className="w-10 text-center font-display text-xl font-extrabold tabular-nums" aria-live="polite">{qty}</span>
          <Button variant="ghost" size="icon" className="size-11" aria-label="More" onClick={() => setQty(clamp(qty + 1))}><Plus className="size-5" /></Button>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`n-${item.id}`}>Host note (the best source for guest instructions)</Label>
        <Textarea id={`n-${item.id}`} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Fill water at the back right, push the silver lever up" />
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Button className="btn-tap" disabled={busy || !label.trim()}
          onClick={() => act(() => api.patchItem(item.id, { label: label.trim(), quantity: qty, notes, status: "confirmed" }))}>
          <Check className="size-5" /> Confirm
        </Button>
        <Button variant="outline" className="btn-tap text-danger" aria-label={`Delete ${item.label}`} disabled={busy}
          onClick={() => act(() => api.deleteItem(item.id))}>
          <Trash2 className="size-5" />
        </Button>
      </div>
    </Card>
  );
}