import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { partLabel, partTone } from "@/lib/labels";
import type { RoomInspection, Role } from "@/lib/types";
import { Pill } from "@/components/Shell";
import { InspectionItemCard } from "./InspectionItemCard";

export function RoomSection({ room, role, actor, readOnly, onChanged }: {
  room: RoomInspection; role: Role; actor: string; readOnly: boolean; onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function tick(id: string, done: boolean) {
    if (!actor.trim()) return toast.error("Please enter your name at the top of the page.");
    setBusyId(id);
    try { await api.patchCleaning(id, { actor: actor.trim(), done }); onChanged(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusyId(null); }
  }

  return (
    <details open className="rounded-xl border bg-card">
      <summary className="flex min-h-14 cursor-pointer flex-wrap items-center gap-2 p-4">
        <span className="mr-auto text-lg font-semibold">{room.room_name}</span>
        <Pill tone={partTone[room.cleaning_status]}>Cleaning: {partLabel[room.cleaning_status]}</Pill>
        <Pill tone={partTone[room.inventory_status]}>Items: {partLabel[room.inventory_status]}</Pill>
      </summary>
      <div className="space-y-4 p-4 pt-0">
        {room.cleaning.length > 0 && (
          <fieldset className="space-y-1">
            <legend className="mb-1 text-sm font-medium">Cleaning checks</legend>
            {room.cleaning.map((c) => (
              <label key={c.id} className="flex min-h-12 items-center gap-3 text-base">
                <input type="checkbox" className="size-6 accent-primary" checked={c.done}
                  disabled={readOnly || busyId === c.id} onChange={(e) => tick(c.id, e.target.checked)} />
                <span className={c.done ? "text-muted-foreground line-through" : ""}>{c.label}</span>
              </label>
            ))}
          </fieldset>
        )}
        {room.items.length === 0 && <p className="text-sm text-muted-foreground">No items to check in this room.</p>}
        {room.items.map((i) => (
          <InspectionItemCard key={i.id} item={i} role={role} actor={actor} readOnly={readOnly} onChanged={onChanged} />
        ))}
      </div>
    </details>
  );
}