"use client";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BBoxOverlay } from "@/components/BBoxOverlay";
import { FilePicker } from "@/components/FilePicker";
import { ErrorNote, Pill, Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { useActor } from "@/lib/useRole";
import type { Availability, Condition, ConditionEventOut, ItemKind, ItemOut, ItemPatch, RoomOut } from "@/lib/types";

const KINDS: ItemKind[] = ["movable", "fixed", "shared", "consumable"];
const CONDITIONS: Condition[] = ["new", "good", "worn", "damaged", "missing", "under_repair"];

/** Host screen for one room: reference photo, sub-locations, scan + review, item details, printable sheet. */
export default function RoomPage() {
  const { id, roomId } = useParams<{ id: string; roomId: string }>();
  const [actor, setActor] = useActor();
  const [room, setRoom] = useState<RoomOut | null>(null);
  const [locs, setLocs] = useState<RoomOut[]>([]);
  const [items, setItems] = useState<ItemOut[]>([]);
  const [locName, setLocName] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const load = () => {
    api.getRoom(roomId).then(setRoom).catch((e) => setErr(e.message));
    api.listLocations(roomId).then(setLocs).catch((e) => setErr(e.message));
    api.listItems(roomId).then(setItems).catch((e) => setErr(e.message));
  };
  useEffect(() => { load(); }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  const suggested = items.filter((i) => i.status === "suggested");
  const confirmed = items.filter((i) => i.status === "confirmed");
  const bySource = useMemo(() => {
    const m = new Map<string, ItemOut[]>();
    suggested.forEach((i) => i.source_image_url && m.set(i.source_image_url, [...(m.get(i.source_image_url) ?? []), i]));
    return [...m.entries()];
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = async (i: ItemOut, p: ItemPatch) => {
    try { await api.patchItem(i.id, p); load(); } catch (x) { setErr((x as Error).message); }
  };
  const del = async (i: ItemOut) => { try { await api.deleteItem(i.id); load(); } catch (x) { setErr((x as Error).message); } };
  const card = (i: ItemOut) => (
    <ItemCard key={i.id} item={i} locations={locs} actor={actor} onPatch={(p) => patch(i, p)} onDelete={() => del(i)} onChanged={load} onError={setErr} />
  );

  return (
    <Shell title={room?.name ?? "Room"} back={{ href: `/properties/${id}`, label: "Property" }}>
      <ErrorNote message={err} />
      <input className="input" placeholder="Your name (used in condition history)" value={actor} onChange={(e) => setActor(e.target.value)} />

      <section className="card space-y-2">
        <h2 className="font-medium">Room reference photo</h2>
        {room?.reference_photo_url && /* eslint-disable-next-line @next/next/no-img-element */ <img src={room.reference_photo_url} alt="Room reference" className="w-full rounded-lg" />}
        <FilePicker kind="image" label={room?.reference_photo_url ? "Replace reference photo" : "Add reference photo (how it should look)"}
          onFile={async (f) => { await api.roomPhoto(roomId, f); load(); }} />
        <a className="btn-ghost w-full" href={api.sheetUrl(roomId)} target="_blank" rel="noreferrer">Print room sheet</a>
      </section>

      <section className="card space-y-2">
        <h2 className="font-medium">Places in this room</h2>
        <div className="flex flex-wrap gap-2">
          {locs.map((l) => <Pill key={l.id}>{l.path}</Pill>)}
          {locs.length === 0 && <span className="text-sm text-stone-500">None yet (e.g. Closet, Top shelf, Drawer 2).</span>}
        </div>
        <form className="flex gap-2" onSubmit={async (e) => {
          e.preventDefault();
          if (!locName.trim()) return;
          try { await api.createRoom(id, { name: locName.trim(), parent_id: roomId }); setLocName(""); load(); } catch (x) { setErr((x as Error).message); }
        }}>
          <input className="input" placeholder="Add a place" value={locName} onChange={(e) => setLocName(e.target.value)} />
          <button className="btn-ghost">Add</button>
        </form>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <FilePicker kind="image" label="Add item photo" onFile={async (f) => { await api.baselinePhoto(roomId, f); load(); }} />
        <FilePicker kind="video" label="10-sec room sweep" onFile={async (f) => { await api.baselineVideo(roomId, f); load(); }} />
      </div>

      {suggested.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">To review ({suggested.length})</h2>
            <button className="btn" onClick={async () => { try { await api.confirmAll(roomId); load(); } catch (x) { setErr((x as Error).message); } }}>Confirm all</button>
          </div>
          {bySource.map(([src, group]) => (
            <BBoxOverlay key={src} src={src} boxes={group.filter((g) => g.bbox).map((g) => ({ id: g.id, label: g.label, bbox: g.bbox! }))} />
          ))}
          {suggested.map(card)}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-medium">Confirmed ({confirmed.length})</h2>
        {confirmed.map(card)}
        {confirmed.length === 0 && <p className="text-stone-500">Nothing confirmed yet.</p>}
        <form className="flex gap-2" onSubmit={async (e) => {
          e.preventDefault();
          if (!newLabel.trim()) return;
          try { await api.createItem(roomId, { label: newLabel.trim() }); setNewLabel(""); load(); } catch (x) { setErr((x as Error).message); }
        }}>
          <input className="input" placeholder="Add an item by name (no photo)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
          <button className="btn-ghost">Add</button>
        </form>
      </section>
    </Shell>
  );
}

function ItemCard({ item, locations, actor, onPatch, onDelete, onChanged, onError }: {
  item: ItemOut; locations: RoomOut[]; actor: string; onPatch: (p: ItemPatch) => void; onDelete: () => void;
  onChanged: () => void; onError: (m: string) => void;
}) {
  const [label, setLabel] = useState(item.label);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [alts, setAlts] = useState(item.alternate_locations.join(", "));
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<ConditionEventOut[] | null>(null);
  const [condNote, setCondNote] = useState("");
  const isConsumable = item.kind === "consumable";

  const setCondition = async (c: Condition) => {
    if (!actor.trim()) { onError("Enter your name first (top of the page)."); return; }
    try { await api.setCondition(item.id, { condition: c, note: condNote.trim() || undefined, actor: actor.trim(), role: "host" }); setCondNote(""); setHistory(null); onChanged(); }
    catch (x) { onError((x as Error).message); }
  };

  return (
    <div className="card space-y-2">
      <div className="flex gap-3">
        {item.crop_url && /* eslint-disable-next-line @next/next/no-img-element */ <img src={item.crop_url} alt="" className="h-20 w-20 rounded-lg object-cover" />}
        <div className="flex-1 space-y-2">
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} onBlur={() => label.trim() && label !== item.label && onPatch({ label: label.trim() })} />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            Qty
            <input className="input !w-20" type="number" min={1} max={999} value={item.quantity} onChange={(e) => onPatch({ quantity: Math.min(999, Math.max(1, Number(e.target.value) || 1)) })} />
            <Pill tone={item.condition === "damaged" || item.condition === "missing" ? "red" : item.condition === "under_repair" ? "amber" : "stone"}>{item.condition.replace("_", " ")}</Pill>
            {item.high_value && <Pill tone="amber">high value</Pill>}
            {item.availability === "staff_only" && <Pill tone="blue">staff only</Pill>}
          </div>
        </div>
      </div>
      <textarea className="input" rows={2} placeholder="Host note for guests (how to use it)" value={notes}
        onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (item.notes ?? "") && onPatch({ notes })} />
      <div className="flex gap-2">
        {item.status === "suggested" && <button className="btn flex-1" onClick={() => onPatch({ status: "confirmed" })}>Confirm</button>}
        <button className="btn-ghost flex-1" onClick={() => setOpen(!open)}>{open ? "Hide details" : "Details"}</button>
        <button className="btn-ghost flex-1" onClick={onDelete}>Delete</button>
      </div>

      {open && (
        <div className="space-y-3 border-t border-stone-200 pt-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1"><span>Type</span>
              <select className="input" value={item.kind} onChange={(e) => onPatch({ kind: e.target.value as ItemKind })}>
                {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
            <label className="space-y-1"><span>Who can see it</span>
              <select className="input" value={item.availability} onChange={(e) => onPatch({ availability: e.target.value as Availability })}>
                <option value="guest">Guests</option><option value="staff_only">Staff only</option>
              </select>
            </label>
          </div>
          <label className="block space-y-1"><span>Usual place</span>
            <select className="input" value={item.location_id ?? ""} onChange={(e) => onPatch({ location_id: e.target.value || null })}>
              <option value="">Anywhere in the room</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.path}</option>)}
            </select>
          </label>
          <label className="block space-y-1"><span>Other acceptable places (comma separated)</span>
            <input className="input" value={alts} placeholder="Sofa, Bedside table" onChange={(e) => setAlts(e.target.value)}
              onBlur={() => onPatch({ alternate_locations: alts.split(",").map((s) => s.trim()).filter(Boolean) })} />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={item.high_value} onChange={(e) => onPatch({ high_value: e.target.checked })} />
            High value (a photo is required when checking it)
          </label>
          {isConsumable && (
            <label className="block space-y-1"><span>Restock when below</span>
              <input className="input !w-24" type="number" min={0} value={item.min_quantity ?? ""} onChange={(e) => onPatch({ min_quantity: e.target.value === "" ? undefined : Number(e.target.value) })} />
            </label>
          )}

          <div className="space-y-2">
            <div className="font-medium">Condition</div>
            <input className="input" placeholder="Note (optional)" value={condNote} onChange={(e) => setCondNote(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map((c) => (
                <button key={c} className={c === item.condition ? "btn !px-3 !py-1" : "btn-ghost !px-3 !py-1"} onClick={() => setCondition(c)}>{c.replace("_", " ")}</button>
              ))}
            </div>
            <button className="text-brand" onClick={async () => { try { setHistory(await api.itemHistory(item.id)); } catch (x) { onError((x as Error).message); } }}>Show history</button>
            {history?.map((h) => (
              <div key={h.id} className="rounded-lg bg-stone-50 p-2">
                <b>{h.previous ? `${h.previous.replace("_", " ")} → ` : ""}{h.condition.replace("_", " ")}</b> · {h.actor} · {new Date(h.created_at).toLocaleString()}
                {h.note && <div className="text-stone-600">{h.note}</div>}
              </div>
            ))}
            {history?.length === 0 && <p className="text-stone-500">No changes recorded yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
