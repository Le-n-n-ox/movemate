import { useEffect, useRef, useState } from "react";
import { Camera, ScanLine, Video } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { BaselineResult, ItemOut } from "@/lib/types";
import { BBoxOverlay } from "@/components/BBoxOverlay";
import { FilePicker } from "@/components/FilePicker";
import { ErrorNote } from "@/components/Shell";
import { Card } from "@/components/ui/card";

type Capture = { preview: string | null; name: string; ids: string[] };

export function ScanCard({ roomId, suggested, onDone }: {
  roomId: string; suggested: ItemOut[]; onDone: () => void;
}) {
  const [important, setImportant] = useState(false);
  const [busy, setBusy] = useState<"photo" | "video" | null>(null);
  const [capture, setCapture] = useState<Capture | null>(null);
  const [error, setError] = useState<string | null>(null);
  const retry = useRef<(() => void) | null>(null);
  const previewRef = useRef<string | null>(null);

  // release the last preview when the card goes away
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  async function run(kind: "photo" | "video", file: File) {
    const preview = kind === "photo" ? URL.createObjectURL(file) : null;
    setBusy(kind); setError(null);
    retry.current = () => void run(kind, file);
    try {
      const r: BaselineResult = kind === "photo"
        ? await api.baselinePhoto(roomId, file, important ? "high" : "normal")
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

  return (
    <Card className={`gap-3 p-4 ${busy ? "card-info" : ""}`}>
      <h2 className="card-title">
        <span className="icon-badge bg-info/15 text-info"><ScanLine className="size-5" aria-hidden /></span> Scan this room
      </h2>
      <p className="hint-box">
        Get close: the item should fill at least a third of the photo. Open drawers fully and hold still for a second.
      </p>
      <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border bg-card p-3 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-accent">
        <input type="checkbox" className="size-5 accent-primary" checked={important} onChange={(e) => setImportant(e.target.checked)} />
        <span><span className="font-semibold">This is an important item</span> <span className="text-muted-foreground">(close-up)</span></span>
      </label>
      <div className="grid grid-cols-2 gap-3">
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
          {capture.preview && (
            <BBoxOverlay src={capture.preview} alt="Your photo with items marked"
              boxes={boxes.map((i) => ({ id: i.id, label: i.label, bbox: i.bbox }))} />
          )}
          {!capture.preview && <p className="text-sm text-muted-foreground">Uploaded: {capture.name}</p>}
          {capture.ids.length === 0 && (
            <p className="warn-box">We could not find any items. Try a closer photo with better light.</p>
          )}
        </div>
      )}
    </Card>
  );
}