import { useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { RoomOut } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function PlacesCard({ pid, room, places, onChanged }: {
  pid: string; room: RoomOut; places: RoomOut[]; onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [parent, setParent] = useState(room.id);
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Please name the place.");
    setBusy(true);
    try {
      await api.createRoom(pid, { name: name.trim(), parent_id: parent });
      setName("");
      onChanged();
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <Card className="gap-3 p-4">
      <h2 className="text-lg font-semibold">Places in this room</h2>
      {places.length === 0 && <p className="text-sm text-muted-foreground">No places yet. Add a shelf, cabinet or drawer.</p>}
      <ul className="space-y-1 text-sm">
        {places.map((p) => (
          <li key={p.id} className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0 text-primary" aria-hidden /> {p.path}
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="space-y-2">
        <Input aria-label="Place name" placeholder="Glass cabinet" className="h-12" value={name} onChange={(e) => setName(e.target.value)} />
        <select aria-label="Inside" className="field" value={parent} onChange={(e) => setParent(e.target.value)}>
          <option value={room.id}>Inside {room.name}</option>
          {places.map((p) => <option key={p.id} value={p.id}>Inside {p.path}</option>)}
        </select>
        <Button type="submit" variant="outline" className="btn-tap w-full" disabled={busy}><Plus className="size-5" /> Add place</Button>
      </form>
    </Card>
  );
}