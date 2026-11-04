import { useState } from "react";
import { Check, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, mediaUrl } from "@/lib/api";
import type { ItemOut } from "@/lib/types";
import { BOX_COLORS } from "@/components/BBoxOverlay";
import { Pill } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SuggestedCard({ item, onChanged, index, highlighted, onSelect }: { item: ItemOut; onChanged: () => void; index?: number; highlighted?: boolean; onSelect?: (id: string) => void }) {
  const [label, setLabel] = useState(item.label);
  const [qty, setQty] = useState(item.quantity);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [busy, setBusy] = useState(false);
  const clamp = (n: number) => Math.min(999, Math.max(1, n));
  const crop = mediaUrl(item.crop_url);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    try { await fn(); onChanged(); } catch (e) { toast.error((e as Error).message); setBusy(false); }
  }

  return (
    <Card id={`card-${item.id}`} className={`gap-3 p-4 ${highlighted ? "ring-4 ring-warn/50" : ""}`} onClick={() => onSelect?.(item.id)}>
      {typeof index === "number" && (
        <span className="flex size-6 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ backgroundColor: BOX_COLORS[index % BOX_COLORS.length] }} aria-label={`Item ${index + 1}`}>{index + 1}</span>
      )}
      {item.needs_check && <Pill tone="warn">Check this one</Pill>}
      {!item.bbox && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">No box yet</span>
          <Button type="button" variant="outline" onClick={(e) => { e.stopPropagation(); document.getElementById("scan")?.scrollIntoView({ behavior: "smooth" }); toast("Draw a box on the photo above, then Add item."); }}>Draw box</Button>
        </div>
      )}
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[auto_minmax(0,1fr)]">
        {crop && <a href={crop} target="_blank" rel="noreferrer"><img src={crop} alt={item.label} className="h-40 w-full shrink-0 rounded-lg object-cover" /></a>}
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor={`l-${item.id}`}>Name</Label>
          <textarea id={`l-${item.id}`} className="min-h-12 w-full rounded-xl border bg-card px-3 py-3 text-base" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">How many</span>
        <Button variant="outline" size="icon" className="size-12" aria-label="Fewer" onClick={() => setQty(clamp(qty - 1))}><Minus className="size-5" /></Button>
        <span className="w-10 text-center text-lg font-semibold" aria-live="polite">{qty}</span>
        <Button variant="outline" size="icon" className="size-12" aria-label="More" onClick={() => setQty(clamp(qty + 1))}><Plus className="size-5" /></Button>
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