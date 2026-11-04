import { useState } from "react";
import { Gem, History, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, mediaUrl } from "@/lib/api";
import { CONDITIONS, KINDS } from "@/lib/labels";
import type { ConditionEventOut, ItemCondition, ItemOut, ItemPatch, RoomOut } from "@/lib/types";
import { useRole } from "@/hooks/useRole";
import { FilePicker } from "@/components/FilePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// Red is reserved for "missing"; damaged is orange. Matches the insights charts.
const DOT: Record<ItemCondition, string> = {
  new: "var(--chart-1)", good: "var(--ok)", worn: "var(--warn)",
  under_repair: "var(--info)", damaged: "var(--chart-6)", missing: "var(--danger)",
};

export function ItemDetails({ item, places, actor, onChanged }: {
  item: ItemOut; places: RoomOut[]; actor: string; onChanged: () => void;
}) {
  const { role } = useRole();
  const [alts, setAlts] = useState(item.alternate_locations.join(", "));
  const [notes, setNotes] = useState(item.notes ?? "");
  const [min, setMin] = useState(item.min_quantity?.toString() ?? "");
  const [cNote, setCNote] = useState("");
  const [cPhoto, setCPhoto] = useState<File | null>(null);
  const [hist, setHist] = useState<ConditionEventOut[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(patch: ItemPatch) {
    try { await api.patchItem(item.id, patch); onChanged(); }
    catch (e) { toast.error((e as Error).message); }
  }
  const loadHist = () => api.itemHistory(item.id).then(setHist).catch((e) => toast.error(e.message));

  async function setCond(c: ItemCondition) {
    if (!actor.trim()) return toast.error("Please enter your name at the top of the page.");
    setBusy(true);
    try {
      await api.setCondition(item.id, { condition: c, actor: actor.trim(), role, note: cNote.trim() || undefined, file: cPhoto ?? undefined });
      setCNote(""); setCPhoto(null);
      toast.success("Condition saved");
      onChanged();
      if (hist) void loadHist();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  async function remove() {
    try { await api.deleteItem(item.id); onChanged(); } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`k-${item.id}`}>Type</Label>
          <select id={`k-${item.id}`} className="field" value={item.kind} onChange={(e) => save({ kind: e.target.value as ItemOut["kind"] })}>
            {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`a-${item.id}`}>Who can see it</Label>
          <select id={`a-${item.id}`} className="field" value={item.availability} onChange={(e) => save({ availability: e.target.value as ItemOut["availability"] })}>
            <option value="guest">Guests and staff</option>
            <option value="staff_only">Staff only (hidden from guests)</option>
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`p-${item.id}`}>Usual place</Label>
        <select id={`p-${item.id}`} className="field" value={item.location_id ?? ""} onChange={(e) => save({ location_id: e.target.value || null })}>
          <option value="">Anywhere in the room</option>
          {places.map((p) => <option key={p.id} value={p.id}>{p.path}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`alt-${item.id}`}>Other acceptable places (comma separated)</Label>
        <Input id={`alt-${item.id}`} className="h-12" value={alts} placeholder="TV console, Drawer"
          onChange={(e) => setAlts(e.target.value)}
          onBlur={() => save({ alternate_locations: alts.split(",").map((s) => s.trim()).filter(Boolean) })} />
      </div>
      <label className="flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border bg-card p-3 text-sm transition-colors has-[:checked]:border-warn has-[:checked]:bg-warn/10">
        <input type="checkbox" className="mt-0.5 size-5 accent-primary" checked={item.high_value}
          onChange={(e) => save({ high_value: e.target.checked })} />
        <span>
          <span className="flex items-center gap-1.5 font-semibold">
            <Gem className={cn("size-4", item.high_value ? "text-warn" : "text-muted-foreground")} aria-hidden /> High value
          </span>
          <span className="block text-xs text-muted-foreground">A photo is required to mark it OK.</span>
        </span>
      </label>
      {item.kind === "consumable" && (
        <div className="space-y-1.5">
          <Label htmlFor={`m-${item.id}`}>Minimum quantity</Label>
          <Input id={`m-${item.id}`} type="number" inputMode="numeric" min={0} className="h-12" value={min}
            onChange={(e) => setMin(e.target.value)} onBlur={() => save({ min_quantity: min ? Number(min) : null })} />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor={`nt-${item.id}`}>Host note</Label>
        <Textarea id={`nt-${item.id}`} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (item.notes ?? "") && save({ notes })} />
      </div>

      <div className="space-y-3 rounded-xl border bg-secondary p-3">
        <p className="font-display font-bold">Condition</p>
        <Input aria-label="Condition note" placeholder="Note (optional)" className="h-12 bg-card" value={cNote} onChange={(e) => setCNote(e.target.value)} />
        <FilePicker kind="image" label={cPhoto ? `Photo: ${cPhoto.name}` : "Add photo (optional)"} onFile={setCPhoto} />
        <div className="grid grid-cols-3 gap-2">
          {CONDITIONS.map(([v, l]) => (
            <Button key={v} variant={item.condition === v ? "default" : "outline"} disabled={busy}
              className="btn-tap gap-1.5 px-2 text-sm" aria-pressed={item.condition === v} onClick={() => setCond(v)}>
              <span className="size-2.5 shrink-0 rounded-full ring-2 ring-white/60" style={{ background: DOT[v] }} aria-hidden />
              {l}
            </Button>
          ))}
        </div>
      </div>

      <Button variant="ghost" className="btn-tap w-full" onClick={() => (hist ? setHist(null) : loadHist())}>
        <History className="size-5" /> {hist ? "Hide history" : "Show history"}
      </Button>
      {hist && (
        <ol className="stagger relative space-y-4 text-sm before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-0.5 before:bg-border">
          {hist.length === 0 && <li className="pl-6 text-muted-foreground">No changes yet.</li>}
          {hist.map((h) => (
            <li key={h.id} className="relative space-y-1 pl-6">
              <span className="absolute left-0 top-1.5 size-3 rounded-full ring-4 ring-card"
                style={{ background: DOT[h.condition as ItemCondition] ?? "var(--primary)" }} aria-hidden />
              <p className="font-semibold capitalize">{h.previous ? `${h.previous.replace("_", " ")} → ` : ""}{h.condition.replace("_", " ")}</p>
              <p className="text-xs text-muted-foreground">{h.actor}{h.role ? ` (${h.role})` : ""} · {new Date(h.created_at).toLocaleString()}</p>
              {h.note && <p>{h.note}</p>}
              {h.photo_url && <img src={mediaUrl(h.photo_url)} alt="Condition evidence" className="mt-2 max-h-40 rounded-lg border" />}
            </li>
          ))}
        </ol>
      )}
      <Button variant="outline" className="btn-tap w-full text-danger" onClick={remove}>
        <Trash2 className="size-5" /> Remove item
      </Button>
    </div>
  );
}