import { useEffect, useRef, useState } from "react";
import { Camera, ScanLine, Video } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { BaselineResult, ItemOut, BBox } from "@/lib/types";
import { BBoxOverlay } from "@/components/BBoxOverlay";
import { FilePicker } from "@/components/FilePicker";
import { ErrorNote } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Capture = { preview: string | null; name: string; ids: string[] };

export function ScanCard({ roomId, suggested, onDone, selectedId, onSelect }: {
  roomId: string; suggested: ItemOut[]; onDone: () => void;
  selectedId?: string | null; onSelect?: (id: string | null) => void;
}) {
  const [important, setImportant] = useState(false);
  const [busy, setBusy] = useState<"photo" | "video" | null>(null);
  const [capture, setCapture] = useState<Capture | null>(null);
  const [error, setError] = useState<string | null>(null);
  const retry = useRef<(() => void) | null>(null);
  const previewRef = useRef<string | null>(null);

  // release the last preview when the card goes away
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  const [drawBox, setDrawBox] = useState<BBox | null>(null);
  const [drawTarget, setDrawTarget] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const editorRef = useRef<HTMLDivElement | null>(null);

  async function run(kind: "photo" | "video", file: File) {
    const preview = kind === "photo" ? URL.createObjectURL(file) : null;
    setBusy(kind); setError(null);
    retry.current = () => void run(kind, file);
    try {
      const r: BaselineResult = kind === "photo"
        ? await api.baselinePhoto(roomId, file, important ? ("close_up" as "high") : "normal")
        : await api.baselineVideo(roomId, file);
      // success: the new preview replaces the old one, so release the old one
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = preview;
      setCapture({ preview, name: file.name, ids: r.items.map((i) => i.id) });
      if (r.items.length) toast.success(`${r.items.length} items found`);
      onDone();
    } catch (e) {
      // failure: the new preview was never shown, so release it. The old one stays on screen.
      if (preview) URL.revokeObjectURL(preview);
      setError((e as Error).message);
    }
    finally { setBusy(null); }
  }

  const boxes = capture ? suggested.filter((i) => capture.ids.includes(i.id)) : [];
  const sourceSrc = boxes.find((b) => b.source_image_url)?.source_image_url ?? capture?.preview ?? null;
  const [hideBoxes, setHideBoxes] = useState(false);

  return (
    <Card className={`gap-3 p-4 ${busy ? "card-info" : ""}`}>
      <h2 className="card-title">
        <span className="icon-badge bg-info/15 text-info"><ScanLine className="size-5" aria-hidden /></span> Scan this room
      </h2>
      <p className="hint-box">
        Stand 1 to 2 metres away. One surface per photo (a table, a shelf). Good light, no flash. Use Item photo for single important items.
      </p>
      <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border bg-card p-3 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-accent">
        <input type="checkbox" className="size-5 accent-primary" checked={important} onChange={(e) => setImportant(e.target.checked)} />
        <span><span className="font-semibold">This is an important item</span> <span className="text-muted-foreground">(close-up)</span></span>
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FilePicker kind="image" label="Item photo" icon={<Camera className="size-5" />}
          busy={busy === "photo"} busyLabel="Finding items..." disabled={!!busy} onFile={(f) => run("photo", f)} />
        <FilePicker kind="video" label="10-second sweep" icon={<Video className="size-5" />}
          busy={busy === "video"} busyLabel="Finding items..." disabled={!!busy} onFile={(f) => run("video", f)} />
      </div>
      {busy && (
        <div role="status" className="space-y-2">
          <div className="meter" aria-hidden><span className="animate-pulse" style={{ width: "65%" }} /></div>
          <p className="text-sm text-muted-foreground">This can take up to 30 seconds. Please keep this page open.</p>
        </div>
      )}
      {error && <ErrorNote message={error} onRetry={() => retry.current?.()} />}
      {capture && !busy && (
        <div className="pop space-y-2">
          {sourceSrc && (
            <div
              ref={editorRef}
              className="relative"
              onMouseDown={(e) => {
                if (!drawTarget && !drawBox) return;
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                const startX = (e.clientX - rect.left) / rect.width;
                const startY = (e.clientY - rect.top) / rect.height;
                const move = (ev: MouseEvent) => {
                  const x = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
                  const y = Math.max(0, Math.min(1, (ev.clientY - rect.top) / rect.height));
                  setDrawBox({ x: Math.min(startX, x), y: Math.min(startY, y), w: Math.abs(x - startX), h: Math.abs(y - startY) });
                };
                const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
                window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
              }}
            >
              <BBoxOverlay src={sourceSrc} alt="Your photo with items marked" hidden={hideBoxes}
                boxes={[...boxes.map((i) => ({ id: i.id, label: i.label, bbox: i.bbox })), ...(drawBox ? [{ id: "draft", label: "drawn box", bbox: drawBox }] : [])]}
                selectedId={selectedId} onSelect={(id) => { onSelect?.(id); document.getElementById("card-" + id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />
            </div>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setHideBoxes(!hideBoxes)}>{hideBoxes ? "Show boxes" : "Hide boxes"}</Button>
          </div>
          {!capture.preview && <p className="text-sm text-muted-foreground">Uploaded: {capture.name}</p>}
          {capture.ids.length < 3 && (
            <p className="warn-box">We found few items. Try a closer, brighter photo, or add items by drawing boxes.</p>
          )}
          <div className="space-y-2 rounded-xl border p-3">
            <p className="text-sm font-semibold">Box editor</p>
            <p className="text-sm text-muted-foreground">Drag on the photo to draw a box. Save calls PATCH with bbox.</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => { setDrawTarget("new"); setDrawBox(null); }}>Draw box</Button>
              <Button type="button" variant="outline" disabled={!drawBox} onClick={() => setDrawBox(null)}>Remove</Button>
              <Button type="button" disabled={!drawBox || !selectedId} onClick={async () => {
                if (!drawBox || !selectedId) return;
                try { await api.patchItem(selectedId, { bbox: drawBox }); toast.success("Box saved"); setDrawBox(null); onDone(); }
                catch (e) { toast.error((e as Error).message); }
              }}>Save box</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input aria-label="New item name" placeholder="Name for drawn box" value={newName} onChange={(e) => setNewName(e.target.value)} className="min-w-40 flex-1" />
              <Button type="button" variant="outline" disabled={!newName.trim() || !drawBox} onClick={async () => {
                try { const it = await api.createItem(roomId, { label: newName.trim() }); if (drawBox && it.source_image_url) { try { await api.patchItem(it.id, { bbox: drawBox }); } catch {} } toast.success("Item added"); setDrawBox(null); setNewName(""); onDone(); }
                catch (e) { toast.error((e as Error).message); }
              }}>Add item</Button>
            </div>
            <p className="text-xs text-muted-foreground">Suggest a name: type a name, or use the label call on the crop after saving the box.</p>
          </div>
        </div>
      )}
    </Card>
  );
}