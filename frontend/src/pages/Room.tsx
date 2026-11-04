import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCheck, ListChecks, MapPin, Plus, ScanLine, Sparkles } from "lucide-react";
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
import { ReviewQueue } from "@/components/room/ReviewQueue";
import { ConfirmedItem } from "@/components/room/ConfirmedItem";
import type { CaptureStatus } from "@/lib/types";

const jump = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

export default function Room() {
  const { id = "", roomId = "" } = useParams();
  const { role, actor, setActor, withRole } = useRole();
  const room = useAsync(() => api.getRoom(roomId), [roomId]);
  const items = useAsync(() => api.listItems(roomId), [roomId]);
  const places = useAsync(() => api.listLocations(roomId), [roomId]);
  const [name, setName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeScan, setActiveScan] = useState<CaptureStatus | null>(null);
  const [groupPhoto, setGroupPhoto] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const caps = await api.listRoomCaptures(roomId);
        if (cancelled) return;
        const a = caps.find((c) => c.status !== "done" && c.status !== "failed") || null;
        setActiveScan(a);
        if (!a && caps.some((c) => c.status === "done")) refresh();
      } catch {}
    };
    void tick();
    const iv = setInterval(tick, 2000);
    return () => { cancelled = true; clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

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
  const sections = [
    { id: "scan", label: "Scan", Icon: ScanLine, show: true },
    { id: "review", label: `To review (${suggested.length})`, Icon: Sparkles, show: suggested.length > 0 },
    { id: "confirmed", label: `Items (${confirmed.length})`, Icon: ListChecks, show: true },
    { id: "places", label: "Places", Icon: MapPin, show: true },
  ].filter((s) => s.show);

  return (
    <Shell title={room.data?.name ?? "Room"} back={withRole(`/properties/${id}`)} backLabel="Property">
      <RoleBar role={role} actor={actor} onActor={setActor} />
      {(room.loading || items.loading) && <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>}
      {err && <ErrorNote message={err} onRetry={refresh} />}
      {room.data && (
        <div className="space-y-5">
          <nav className="jump-bar no-print" aria-label="Jump to section">
            {sections.map(({ id: sid, label, Icon }) => (
              <button key={sid} type="button" onClick={() => jump(sid)}>
                <Icon className="size-4" aria-hidden /> {label}
              </button>
            ))}
          </nav>

          <RoomHeader room={room.data} onChanged={refresh} />

          {activeScan && (
            <div className="sticky top-2 z-40 space-y-1 rounded-xl border bg-card p-3 shadow" role="status" aria-live="polite">
              <p className="text-sm font-medium">Scan running: {activeScan.stage || "Processing"} ({Math.round((activeScan.progress || 0) * 100)}%)</p>
              <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.round((activeScan.progress || 0) * 100)}%` }} /></div>
              <p className="text-xs text-muted-foreground">You can leave this page - it keeps running on the server.</p>
            </div>
          )}
          <div id="scan" className="jump-target">
            <ScanCard roomId={roomId} suggested={suggested} onDone={refresh} selectedId={selectedId} onSelect={setSelectedId} />
          </div>

          {suggested.length > 0 && (
            <section id="review" className="jump-target space-y-3" aria-label="Items to review">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="card-title">
                  <span className="icon-badge bg-info/15 text-info"><Sparkles className="size-5" aria-hidden /></span>
                  Items we found
                  <span className="rounded-full bg-info/15 px-2 py-0.5 text-sm font-semibold text-info">{suggested.length}</span>
                  <span className="text-sm text-muted-foreground">{suggested.length} items found, {suggested.filter((i) => i.needs_check).length} need a quick check</span>
                </h2>
                <Button variant="outline" className="btn-tap" onClick={confirmAll}><CheckCheck className="size-5" /> Confirm all</Button>
                <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={!!groupPhoto} onChange={(e) => setGroupPhoto(e.target.checked)} /> Group by photo</label>
              </div>
              <div className="stagger space-y-4">
                <ReviewQueue items={suggested} onChanged={refresh} onConfirmAll={confirmAll} onSelect={setSelectedId} />
                {suggested.some((i) => (i as any).possible_dup) && (
                  <div className="space-y-2 rounded-xl border p-3">
                    <p className="font-medium">Possible duplicates</p>
                    {suggested.filter((i) => (i as any).possible_dup).map((i) => (
                      <div key={i.id} className="flex items-center justify-between gap-2 text-sm"><span>{i.label} ~ {(i as any).possible_dup}</span></div>
                    ))}
                    <p className="text-xs text-muted-foreground">Use Merge with in review mode, or Keep both.</p>
                  </div>
                )}
                <details className="rounded-xl border p-3">
                  <summary className="cursor-pointer font-medium">Compact list (old cards)</summary>
                  <div className="mt-3 space-y-4">
                    {suggested.map((i, idx) => <SuggestedCard key={i.id} item={i} index={idx} highlighted={selectedId === i.id} onSelect={setSelectedId} onChanged={refresh} />)}
                  </div>
                </details>
              </div>
            </section>
          )}

          <section id="confirmed" className="jump-target space-y-3" aria-label="Confirmed items">
            <h2 className="card-title">
              <span className="icon-badge"><ListChecks className="size-5" aria-hidden /></span>
              Confirmed items
              <span className="rounded-full bg-accent px-2 py-0.5 text-sm font-semibold text-accent-foreground">{confirmed.length}</span>
            </h2>
            {!items.loading && confirmed.length === 0 && (
              <EmptyState icon={<ListChecks className="size-8" />} title="Nothing confirmed yet" hint="Take an item photo or add an item by name." />
            )}
            <div className="stagger space-y-3">
              {confirmed.map((i) => (
                <ConfirmedItem key={i.id} item={i} places={places.data ?? []} actor={actor} onChanged={refresh} />
              ))}
            </div>
            <form onSubmit={addItem} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl border-2 border-dashed bg-card/60 p-3 transition-colors focus-within:border-primary hover:border-primary/50">
              <Input aria-label="Item name" placeholder="Add an item by name" className="h-12" value={name} onChange={(e) => setName(e.target.value)} />
              <Button type="submit" className="btn-tap" aria-label="Add item"><Plus className="size-5" /></Button>
            </form>
          </section>

          <div id="places" className="jump-target">
            <PlacesCard key={room.data.id} pid={id} room={room.data} places={places.data ?? []} onChanged={refresh} />
          </div>
        </div>
      )}
    </Shell>
  );
}