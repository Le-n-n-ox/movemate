import { useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCheck, ListChecks, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { useRole } from "@/hooks/useRole";
import { EmptyState, ErrorNote, RoleBar, Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { RoomHeader } from "@/components/room/RoomHeader";
import { ScanCard } from "@/components/room/ScanCard";
import { PlacesCard } from "@/components/room/PlacesCard";
import { SuggestedCard } from "@/components/room/SuggestedCard";
import { ConfirmedItem } from "@/components/room/ConfirmedItem";

export default function Room() {
  const { id = "", roomId = "" } = useParams();
  const { actor, setActor } = useRole();
  const room = useAsync(() => api.getRoom(roomId), [roomId]);
  const items = useAsync(() => api.listItems(roomId), [roomId]);
  const places = useAsync(() => api.listLocations(roomId), [roomId]);
  const [name, setName] = useState("");

  const refresh = () => { void room.refresh(true); void items.refresh(true); void places.refresh(true); };
  const suggested = items.data?.filter((i) => i.status === "suggested") ?? [];
  const confirmed = items.data?.filter((i) => i.status === "confirmed") ?? [];

  async function confirmAll() {
    try { const r = await api.confirmAll(roomId); toast.success(`${r.confirmed} items confirmed`); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const it = await api.createItem(roomId, { label: name.trim() });
      if (it.status === "suggested") await api.patchItem(it.id, { status: "confirmed" });
      setName(""); refresh();
    } catch (err) { toast.error((err as Error).message); }
  }

  const err = room.error ?? items.error;
  return (
    <Shell title={room.data?.name ?? "Room"} back={`/properties/${id}`} backLabel="Property">
      <RoleBar role="host" actor={actor} onActor={setActor} />
      {(room.loading || items.loading) && [0, 1].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
      {err && <ErrorNote message={err} onRetry={refresh} />}
      {room.data && (
        <>
          <RoomHeader room={room.data} onChanged={refresh} />
          <ScanCard roomId={roomId} suggested={suggested} onDone={refresh} />

          {suggested.length > 0 && (
            <section className="space-y-3" aria-label="Items to review">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Items we found ({suggested.length})</h2>
                <Button variant="outline" className="btn-tap" onClick={confirmAll}><CheckCheck className="size-5" /> Confirm all</Button>
              </div>
              {suggested.map((i) => <SuggestedCard key={i.id} item={i} onChanged={refresh} />)}
            </section>
          )}

          <section className="space-y-3" aria-label="Confirmed items">
            <h2 className="text-lg font-semibold">Confirmed items ({confirmed.length})</h2>
            {!items.loading && confirmed.length === 0 && (
              <EmptyState icon={<ListChecks className="size-8" />} title="Nothing confirmed yet" hint="Take an item photo or add an item by name." />
            )}
            {confirmed.map((i) => (
              <ConfirmedItem key={i.id} item={i} places={places.data ?? []} actor={actor} onChanged={refresh} />
            ))}
            <form onSubmit={addItem} className="grid grid-cols-[1fr_auto] gap-2">
              <Input aria-label="Item name" placeholder="Add an item by name" className="h-12" value={name} onChange={(e) => setName(e.target.value)} />
              <Button type="submit" className="btn-tap" aria-label="Add item"><Plus className="size-5" /></Button>
            </form>
          </section>

          <PlacesCard pid={id} room={room.data} places={places.data ?? []} onChanged={refresh} />
        </>
      )}
    </Shell>
  );
}