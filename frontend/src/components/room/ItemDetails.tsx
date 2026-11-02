import { useState } from "react";
import { History, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { CONDITIONS, KINDS } from "@/lib/labels";
import type { ConditionEventOut, ItemCondition, ItemOut, ItemPatch, RoomOut } from "@/lib/types";
import { FilePicker } from "@/components/FilePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function ItemDetails({ item, places, actor, onChanged }: {
  item: ItemOut; places: RoomOut[]; actor: string; onChanged: () => void;
}) {
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
      await api.setCondition(item.id, { condition: c, actor: actor.trim(), role: "host", note: cNote.trim() || undefined, file: cPhoto ?? undefined });
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
      <label className="flex min-h-12 items-center gap-3 text-sm">
        <input type="checkbox" className="size-5 accent-primary" checked={item.high_value}
          onChange={(e) => save({ high_value: e.target.checked })} />
        High value (a photo is required to mark it OK)
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

      <div className="space-y-2 rounded-lg bg-secondary p-3">
        <p className="text-sm font-medium">Condition</p>
        <Input aria-label="Condition note" placeholder="Note (optional)" className="h-12 bg-card" value={cNote} onChange={(e) => setCNote(e.target.value)} />
        <FilePicker kind="image" label={cPhoto ? `Photo: ${cPhoto.name}` : "Add photo (optional)"} onFile={setCPhoto} />
        <div className="grid grid-cols-3 gap-2">
          {CONDITIONS.map(([v, l]) => (
            <Button key={v} variant={item.condition === v ? "default" : "outline"} disabled={busy}
              className={cn("btn-tap px-2 text-sm")} aria-pressed={item.condition === v} onClick={() => setCond(v)}>
              {l}
            </Button>
          ))}
        </div>
      </div>

      <Button variant="ghost" className="btn-tap w-full" onClick={() => (hist ? setHist(null) : loadHist())}>
        <History className="size-5" /> {hist ? "Hide history" : "Show history"}
      </Button>
      {hist && (
        <ul className="space-y-2 text-sm">
          {hist.length === 0 && <li className="text-muted-foreground">No changes yet.</li>}
          {hist.map((h) => (
            <li key={h.id} className="rounded-lg border p-2">
              <p className="font-medium">{h.previous ? `${h.previous} → ` : ""}{h.condition}</p>
              <p className="text-xs text-muted-foreground">{h.actor}{h.role ? ` (${h.role})` : ""} · {new Date(h.created_at).toLocaleString()}</p>
              {h.note && <p>{h.note}</p>}
              {h.photo_url && <img src={h.photo_url} alt="Condition evidence" className="mt-2 max-h-40 rounded-md" />}
            </li>
          ))}
        </ul>
      )}
      <Button variant="outline" className="btn-tap w-full text-danger" onClick={remove}>
        <Trash2 className="size-5" /> Remove item
      </Button>
    </div>
  );
}