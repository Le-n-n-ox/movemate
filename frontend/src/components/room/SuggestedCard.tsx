import { useEffect, useRef, useState } from "react";
import { Check, Minus, Package, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { ItemOut } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const clamp = (n: number) => Math.min(999, Math.max(1, n));
const parseQty = (s: string) => clamp(Number.parseInt(s, 10) || 1);

export function SuggestedCard({ item, onChanged }: { item: ItemOut; onChanged: () => void }) {
  const [label, setLabel] = useState(item.label);
  const [qtyText, setQtyText] = useState(String(item.quantity));
  const [notes, setNotes] = useState(item.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const qty = parseQty(qtyText);
  const lastSaved = useRef({ label: item.label, quantity: item.quantity, notes: item.notes ?? "" });

  /** Save the draft while the item is still "suggested", so "Confirm all" keeps the edits. */
  async function persist() {
    const next = { label: label.trim(), quantity: qty, notes };
    const prev = lastSaved.current;
    const same = next.label === prev.label && next.quantity === prev.quantity && next.notes === prev.notes;
    if (!next.label || same) return;
    lastSaved.current = next;
    try {
      await api.patchItem(item.id, next);
      setSaved(true);
    } catch (e) {
      lastSaved.current = prev;
      toast.error((e as Error).message);
    }
  }

  // Autosave 0.7 s after the last change (blur saves immediately).
  useEffect(() => {
    const t = setTimeout(() => void persist(), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, qtyText, notes]);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [saved]);

  async function act(fn: () => Promise<unknown>, message: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(message);
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  }

  function confirm() {
    const name = label.trim();
    lastSaved.current = { label: name, quantity: qty, notes };
    void act(() => api.patchItem(item.id, { label: name, quantity: qty, notes, status: "confirmed" }), `${name} confirmed`);
  }

  return (
    <Card className="card-info gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-info/10 px-2.5 py-1 text-xs font-semibold text-info">
          <Sparkles className="size-3.5" aria-hidden /> Suggested. Check it before you confirm
        </p>
        {saved && (
          <span role="status" className="pop inline-flex items-center gap-1 text-xs font-semibold text-ok">
            <Check className="size-3.5" aria-hidden /> Saved
          </span>
        )}
      </div>

      <div className="flex gap-3">
        {item.crop_url ? (
          <img src={item.crop_url} alt={item.label} className="size-20 shrink-0 rounded-xl border object-cover" />
        ) : (
          <div className="grid size-20 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground" aria-hidden>
            <Package className="size-7" />
          </div>
        )}
        <div className="flex-1 space-y-1.5">
          <Label htmlFor={`l-${item.id}`}>Name</Label>
          <Input
            id={`l-${item.id}`} className="h-12" value={label}
            onChange={(e) => setLabel(e.target.value)} onBlur={() => void persist()}
          />
        </div>
      </div>

      <div role="group" aria-label="How many" className="flex items-center gap-2">
        <span className="flex-1 text-sm font-semibold">How many</span>
        <div className="flex items-center gap-1 rounded-xl border bg-secondary p-1">
          <Button
            variant="ghost" size="icon" className="size-12" aria-label="Fewer" disabled={qty <= 1}
            onClick={() => setQtyText(String(clamp(qty - 1)))}
          >
            <Minus className="size-5" />
          </Button>
          <Input
            aria-label="Quantity" inputMode="numeric"
            className="h-12 w-16 text-center font-display text-xl font-extrabold tabular-nums"
            value={qtyText}
            onChange={(e) => setQtyText(e.target.value.replace(/\D/g, "").slice(0, 3))}
            onBlur={() => { setQtyText(String(qty)); void persist(); }}
          />
          <Button
            variant="ghost" size="icon" className="size-12" aria-label="More" disabled={qty >= 999}
            onClick={() => setQtyText(String(clamp(qty + 1)))}
          >
            <Plus className="size-5" />
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`n-${item.id}`}>Host note (the best source for guest instructions)</Label>
        <Textarea
          id={`n-${item.id}`} rows={3} value={notes}
          onChange={(e) => setNotes(e.target.value)} onBlur={() => void persist()}
          placeholder="Fill water at the back right, push the silver lever up"
        />
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Button className="btn-tap" disabled={busy || !label.trim()} onClick={confirm}>
          <Check className="size-5" /> Confirm
        </Button>
        <Button
          variant="outline" className="btn-tap text-danger" aria-label={`Delete ${item.label}`} disabled={busy}
          onClick={() => act(() => api.deleteItem(item.id), "Removed")}
        >
          <Trash2 className="size-5" />
        </Button>
      </div>
    </Card>
  );
}