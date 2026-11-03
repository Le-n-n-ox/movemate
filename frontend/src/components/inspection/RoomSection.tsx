import { useState } from "react";
import { ChevronDown, SprayCan } from "lucide-react";
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

  const doneCount = room.cleaning.filter((c) => c.done).length;
  const pct = room.cleaning.length ? Math.round((doneCount / room.cleaning.length) * 100) : 0;

  return (
    <details open className="group overflow-hidden rounded-xl border bg-card" style={{ boxShadow: "var(--shadow-rest)" }}>
      <summary className="flex min-h-14 cursor-pointer list-none flex-wrap items-center gap-2 p-4 [&::-webkit-details-marker]:hidden">
        <span className="mr-auto font-display text-xl font-bold">{room.room_name}</span>
        <Pill tone={partTone[room.cleaning_status]}>Cleaning: {partLabel[room.cleaning_status]}</Pill>
        <Pill tone={partTone[room.inventory_status]}>Items: {partLabel[room.inventory_status]}</Pill>
        <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 group-open:text-primary" aria-hidden />
      </summary>
      <div className="space-y-4 p-4 pt-0">
        {room.cleaning.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="mb-1 flex w-full items-center gap-2 text-sm font-semibold">
              <SprayCan className="size-4 text-primary" aria-hidden /> Cleaning checks
              <span className="ml-auto font-normal text-muted-foreground">{doneCount} of {room.cleaning.length}</span>
            </legend>
            <div className="meter" role="progressbar" aria-label="Cleaning progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
              <span style={{ width: `${pct}%` }} />
            </div>
            <div className="stagger space-y-2 pt-1">
              {room.cleaning.map((c) => (
                <label key={c.id}
                  className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border bg-card p-3 text-base transition-colors has-[:checked]:border-ok/50 has-[:checked]:bg-ok/10 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-70">
                  <input type="checkbox" className="size-6 accent-primary" checked={c.done}
                    disabled={readOnly || busyId === c.id} onChange={(e) => tick(c.id, e.target.checked)} />
                  <span className={c.done ? "text-muted-foreground line-through" : ""}>{c.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {room.items.length === 0 && <p className="text-sm text-muted-foreground">No items to check in this room.</p>}
        <div className="stagger space-y-4">
          {room.items.map((i) => (
            <InspectionItemCard key={i.id} item={i} role={role} actor={actor} readOnly={readOnly} onChanged={onChanged} />
          ))}
        </div>
      </div>
    </details>
  );
}