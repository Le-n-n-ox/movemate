import { useState } from "react";
import { Check, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, mediaUrl } from "@/lib/api";
import type { ItemOut } from "@/lib/types";
import { BBoxOverlay, BOX_COLORS } from "@/components/BBoxOverlay";
import { Pill } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ReviewQueue({ items, onChanged, onConfirmAll, onSelect }: {
  items: ItemOut[]; onChanged: () => void; onConfirmAll: () => void; onSelect?: (id: string) => void;
}) {
  const [idx, setIdx] = useState(() => { const f = items.findIndex((i) => i.source_image_url); return f >= 0 ? f : 0; });
  const [listMode, setListMode] = useState(false);
  const [label, setLabel] = useState("");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [drawBox, setDrawBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const item = items[Math.min(idx, Math.max(0, items.length - 1))];

  useState(() => {});
  // reset local edit state when item changes
  const [lastId, setLastId] = useState(item?.id);
  if (item && item.id !== lastId) { setLastId(item.id); setLabel(item.label); setQty(item.quantity); setDrawBox(null); }
  if (!label && item) { /* initial */ }

  const next = () => setIdx((i) => Math.min(i + 1, items.length - 1));

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    try { await fn(); onChanged(); next(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  if (!item) return null;
  const source = mediaUrl(item.source_image_url);
  const crop = mediaUrl(item.crop_url);
  const curLabel = label || item.label;
  const curQty = qty || item.quantity;
  const progress = items.length ? ((idx + 1) / items.length) * 100 : 0;

  if (listMode) {
    return (
      <div className="space-y-2">
        <Button variant="outline" onClick={() => setListMode(false)}>Back to review</Button>
        {items.map((it, i) => {
          const thumb = mediaUrl(it.crop_url);
          return (
            <button key={it.id} type="button" onClick={() => { setIdx(i); setListMode(false); onSelect?.(it.id); }}
              className="pressable flex w-full items-center gap-3 rounded-xl border bg-card p-2 text-left hover:bg-accent/40">
              {thumb && <img src={thumb} alt={it.label} className="size-14 shrink-0 rounded-lg object-cover" />}
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ backgroundColor: BOX_COLORS[i % BOX_COLORS.length] }}>{i + 1}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{it.label}</span>
              <span className="text-sm text-muted-foreground">x{it.quantity}</span>
              <span className={`status-dot ${it.needs_check ? "status-dot-warn" : "status-dot-ok"}`} aria-label={it.needs_check ? "Check this one" : "OK"} />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <Card className="gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">Item {idx + 1} of {items.length}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setListMode(true)}>See list</Button>
          <Button variant="outline" onClick={onConfirmAll}>Confirm all remaining</Button>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" aria-label="Progress"><div className="h-full bg-primary" style={{ width: `${progress}%` }} /></div>
      {item.needs_check && <Pill tone="warn">Check this one</Pill>}
      {item.frames_seen != null && item.frames_total != null && <p className="text-xs text-muted-foreground">Seen in {item.frames_seen} of {item.frames_total} frames</p>}
      {source ? (
        <div onMouseDown={(e) => {
          if (!drawBox && !item.bbox) return;
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const sx = (e.clientX - rect.left) / rect.width, sy = (e.clientY - rect.top) / rect.height;
          const move = (ev: MouseEvent) => {
            const x = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
            const y = Math.max(0, Math.min(1, (ev.clientY - rect.top) / rect.height));
            setDrawBox({ x: Math.min(sx, x), y: Math.min(sy, y), w: Math.abs(x - sx), h: Math.abs(y - sy) });
          };
          const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
          window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
        }}>
          <BBoxOverlay src={source} alt={item.label}
            boxes={[{ id: item.id, label: item.label, bbox: drawBox ?? item.bbox }]} selectedId={item.id} />
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">No box yet</p>
          <Button variant="outline" onClick={() => toast("Draw a box on the scan photo, or use Scan box editor.")}>Draw box</Button>
        </div>
      )}
      {crop && (
        <a href={crop} target="_blank" rel="noreferrer"><img src={crop} alt={item.label} className="h-40 w-full rounded-xl object-cover" /></a>
      )}
      <div className="space-y-1.5">
        <label htmlFor="review-name" className="text-sm font-medium">Name</label>
        <input id="review-name" className="min-h-12 w-full rounded-xl border bg-card px-3 text-base" value={curLabel} onChange={(e) => setLabel(e.target.value)} />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">How many</span>
        <Button variant="outline" size="icon" className="size-12" aria-label="Fewer" onClick={() => setQty(Math.max(1, (qty || item.quantity) - 1))}><Minus className="size-5" /></Button>
        <span className="w-10 text-center text-lg font-semibold">{curQty}</span>
        <Button variant="outline" size="icon" className="size-12" aria-label="More" onClick={() => setQty(Math.min(999, (qty || item.quantity) + 1))}><Plus className="size-5" /></Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm">Merge with: <select className="rounded-xl border bg-card px-2 py-2" value="" onChange={async (e) => { const otherId = e.target.value; if (!otherId) return; const other = items.find((i) => i.id === otherId); if (!other) return; try { await api.patchItem(item.id, { quantity: (item.quantity || 1) + (other.quantity || 1) }); await api.deleteItem(otherId); toast.success("Merged"); onChanged(); } catch (err) { toast.error((err as Error).message); } }}><option value="">Select item</option>{items.filter((i) => i.id !== item.id).map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}</select></label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => act(() => api.patchItem(item.id, { label: curLabel.trim(), quantity: curQty, status: "confirmed" }))}><Check className="size-5" /> Confirm</Button>
        <Button variant="outline" disabled={busy} onClick={() => act(() => api.deleteItem(item.id))}><Trash2 className="size-5" /> Not an item</Button>
        <Button variant="outline" onClick={next}>Skip</Button>
      </div>
      {drawBox && (
        <Button disabled={busy} onClick={() => act(() => api.patchItem(item.id, { bbox: drawBox }))}>Save box</Button>
      )}
    </Card>
  );
}
