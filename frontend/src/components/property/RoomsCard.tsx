import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, DoorOpen, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { ROOM_TYPES } from "@/lib/labels";
import type { RoomOut } from "@/lib/types";
import { useRole } from "@/hooks/useRole";
import { EmptyState, Pill } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function RoomsCard({
  pid,
  rooms,
  onChanged,
}: {
  pid: string;
  rooms: RoomOut[];
  onChanged: () => void;
}) {
  const { withRole } = useRole();
  const [name, setName] = useState("");
  const [type, setType] = useState("other");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Please name the room.");
    setBusy(true);
    try {
      await api.createRoom(pid, { name: name.trim(), room_type: type });
      setName("");
      onChanged();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="gap-3 p-4">
      <h2 className="text-lg font-semibold">Rooms</h2>
      {rooms.length === 0 && (
        <EmptyState
          icon={<DoorOpen className="size-8" />}
          title="No rooms yet"
          hint="Add your first room below."
        />
      )}
      <ul className="space-y-2">
        {rooms.map((r) => (
          <li key={r.id}>
            <Link
              to={withRole(`/properties/${pid}/rooms/${r.id}`)}
              className="flex min-h-14 items-center gap-3 rounded-lg border p-3 active:bg-accent"
            >
              {r.reference_photo_url ? (
                <img
                  src={r.reference_photo_url}
                  alt={`${r.name} reference`}
                  className="size-12 shrink-0 rounded-md object-cover"
                />
              ) : (
                <div className="grid size-12 shrink-0 place-items-center rounded-md bg-muted">
                  <DoorOpen
                    className="size-5 text-muted-foreground"
                    aria-hidden
                  />
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate font-medium">{r.name}</p>
                <div className="flex flex-wrap gap-1">
                  <Pill tone="brand">{r.confirmed_items} items</Pill>
                  {r.suggested_items > 0 && (
                    <Pill tone="warn">{r.suggested_items} to review</Pill>
                  )}
                </div>
              </div>
              <ChevronRight
                className="size-5 shrink-0 text-muted-foreground"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="grid grid-cols-[1fr_auto] gap-2">
        <Input
          aria-label="Room name"
          placeholder="Kitchen"
          className="h-12"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          aria-label="Room type"
          className="field w-auto"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {ROOM_TYPES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={busy} className="btn-tap col-span-2">
          <Plus className="size-5" /> Add room
        </Button>
      </form>
    </Card>
  );
}