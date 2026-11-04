import { useEffect, useRef, useState } from "react";
import { ChevronDown, Image as ImageIcon, Play, Video } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { RoomOut } from "@/lib/types";
import { ErrorNote } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const TIPS = [
  "Film every room. A moved item is found in another room's video.",
  "20 to 30 seconds per room. Walk the same route each time.",
  "Pause one second at every shelf, table and counter.",
  "Open drawers and cabinets fully. Good light, no flash.",
];

const TIPS_KEY = "movemate_tips_open";

type RoomMedia = { url: string; kind: "video" | "photo" };

export function CapturePhase({ auditId, rooms, uploaded, failedStage, onChanged }: {
  auditId: string; rooms: RoomOut[]; uploaded: string[]; failedStage: string | null; onChanged: () => void;
}) {
  const [busyRoom, setBusyRoom] = useState<string | null>(null);
  const [busyLabel, setBusyLabel] = useState<string>("");
  const [progress, setProgress] = useState<string>("");
  const [media, setMedia] = useState<Record<string, RoomMedia[]>>({});
  const [tipsOpen, setTipsOpen] = useState<boolean>(() => {
    try { return localStorage.getItem(TIPS_KEY) === "1"; } catch { return false; }
  });
  const videoRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const photoRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    return () => {
      Object.values(media).flat().forEach((m) => URL.revokeObjectURL(m.url));
    };
  }, []);

  function toggleTips() {
    const next = !tipsOpen;
    setTipsOpen(next);
    try { localStorage.setItem(TIPS_KEY, next ? "1" : "0"); } catch { /* ignore */ }
  }

  async function uploadVideo(roomId: string, file: File) {
    setBusyRoom(roomId); setBusyLabel("Uploading video…");
    try {
      await api.uploadAuditVideo(auditId, roomId, file);
      const url = URL.createObjectURL(file);
      setMedia((m) => ({ ...m, [roomId]: [...(m[roomId] ?? []), { url, kind: "video" }] }));
      toast.success("Video uploaded");
      onChanged();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusyRoom(null); setBusyLabel(""); }
  }

  async function uploadPhotos(roomId: string, files: File[]) {
    if (files.length === 0) return;
    setBusyRoom(roomId);
    const urls = files.map((file) => URL.createObjectURL(file));
    setMedia((m) => ({ ...m, [roomId]: [...(m[roomId] ?? []), ...files.map((_f, i) => ({ url: urls[i], kind: "photo" as const }))] }));
    const BATCH = 20;
    for (let i = 0; i < files.length; i += BATCH) {
      const batch = files.slice(i, i + BATCH);
      setBusyLabel(`Uploading ${Math.min(i + batch.length, files.length)} of ${files.length}`);
      setProgress(`${Math.min(i + batch.length, files.length)} / ${files.length}`);
      try {
        await api.uploadAuditFrames(auditId, roomId, batch);
      } catch (e) {
        toast.error((e as Error).message);
        setBusyRoom(null); setBusyLabel(""); setProgress("");
        return;
      }
    }
    toast.success(`${files.length} photo${files.length === 1 ? "" : "s"} uploaded`);
    onChanged();
    setBusyRoom(null); setBusyLabel(""); setProgress("");
  }

  const doneCount = rooms.filter((r) => uploaded.includes(r.id) || (media[r.id]?.length ?? 0) > 0).length;
  const ready = doneCount > 0;

  return (
    <div className="space-y-4 pb-28">
      {failedStage && <ErrorNote message={`The check did not finish: ${failedStage}`} />}

      <button type="button" onClick={toggleTips}
        className="flex w-full items-center justify-between rounded-xl border bg-card px-4 py-3 text-left text-sm font-medium">
        <span>Filming tips</span>
        <ChevronDown className={`size-4 transition-transform ${tipsOpen ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {tipsOpen && (
        <ul className="space-y-1.5 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
          {TIPS.map((t) => <li key={t}>• {t}</li>)}
          <li className="pt-1 text-xs">Photos work best as 3-6 wide shots per room covering every shelf, table and counter. Video covers more. If a spot is not in a photo, we say "could not check", never "missing". Uploads can't be removed yet.</li>
        </ul>
      )}

      <div className="space-y-1.5" aria-live="polite">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">{doneCount} of {rooms.length} rooms ready</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${rooms.length ? (doneCount / rooms.length) * 100 : 0}%` }} />
        </div>
      </div>

      <div className={`grid gap-3 ${rooms.length > 4 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
        {rooms.map((r) => {
          const m = media[r.id] ?? [];
          const isReady = uploaded.includes(r.id) || m.length > 0;
          const isBusy = busyRoom === r.id;
          return (
            <Card key={r.id} className={`gap-3 p-4 ${isReady ? "border-ok/40" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 break-words font-semibold">{r.name}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isReady ? "bg-ok/15 text-ok" : "bg-muted text-muted-foreground"}`}>
                  {isBusy ? (busyLabel || "Uploading…") : isReady ? "Ready" : "Not started"}
                </span>
              </div>
              {isReady && (
                <p className="text-xs text-muted-foreground">
                  {m.filter((x) => x.kind === "video").length} video{m.filter((x) => x.kind === "video").length === 1 ? "" : "s"}
                  {m.filter((x) => x.kind === "photo").length > 0 && ` + ${m.filter((x) => x.kind === "photo").length} photo${m.filter((x) => x.kind === "photo").length === 1 ? "" : "s"}`}
                </p>
              )}
              {m.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {m.map((x, i) => (
                    <img key={i} src={x.url} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                  ))}
                </div>
              )}
              {isBusy && progress && <p className="text-xs text-muted-foreground">{progress}</p>}
              <div className="grid grid-cols-2 gap-2">
                <label className="flex min-h-14 cursor-pointer items-center justify-center rounded-xl border text-xs font-medium hover:bg-accent">
                  <input ref={(el) => { videoRefs.current[r.id] = el; }} type="file" accept="video/*" capture="environment" className="sr-only"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadVideo(r.id, f); e.target.value = ""; }} disabled={isBusy} />
                  <span className="flex flex-col items-center gap-1"><Video className="size-4" /> Record video</span>
                </label>
                <label className="flex min-h-14 cursor-pointer items-center justify-center rounded-xl border text-xs font-medium hover:bg-accent">
                  <input ref={(el) => { photoRefs.current[r.id] = el; }} type="file" accept="image/*" capture="environment" className="sr-only"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhotos(r.id, [f]); e.target.value = ""; }} disabled={isBusy} />
                  <span className="flex flex-col items-center gap-1"><ImageIcon className="size-4" /> Take photos</span>
                </label>

              </div>
            </Card>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-sticky border-t bg-background/95 px-4 py-3 backdrop-blur" data-allow-overlap style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="mx-auto max-w-[640px] space-y-1">
          <Button className="btn-tap w-full" disabled={!ready || !!busyRoom} onClick={async () => {
            try { await api.runAudit(auditId); onChanged(); } catch (e) { toast.error((e as Error).message); }
          }}>
            <Play className="size-4" /> {ready ? `Run check (${doneCount} of ${rooms.length} rooms ready)` : "Add a video or photos for at least one room"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">Film every room to catch moved items.</p>
        </div>
      </div>
    </div>
  );
}
