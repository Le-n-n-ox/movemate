import { useRef, useState } from "react";
import { Camera, Video } from "lucide-react";
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

  async function run(kind: "photo" | "video", file: File) {
    const preview = kind === "photo" ? URL.createObjectURL(file) : null;
    setBusy(kind); setError(null);
    retry.current = () => void run(kind, file);
    try {
      const r: BaselineResult = kind === "photo"
        ? await api.baselinePhoto(roomId, file, important ? "high" : "normal")
        : await api.baselineVideo(roomId, file);
      setCapture({ preview, name: file.name, ids: r.items.map((i) => i.id) });
      if (r.items.length) toast.success(`${r.items.length} items found`);
      onDone();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(null); }
  }

  const boxes = capture ? suggested.filter((i) => capture.ids.includes(i.id)) : [];

  return (
    <Card className="gap-3 p-4">
      <h2 className="text-lg font-semibold">Scan this room</h2>
      <p className="text-sm text-muted-foreground">
        Get close: the item should fill at least a third of the photo. Open drawers fully and hold still for a second.
      </p>
      <label className="flex min-h-12 items-center gap-3 text-sm">
        <input type="checkbox" className="size-5 accent-primary" checked={important} onChange={(e) => setImportant(e.target.checked)} />
        This is an important item (close-up)
      </label>
      <div className="grid grid-cols-2 gap-3">
        <FilePicker kind="image" label="Item photo" icon={<Camera className="size-5" />}
          busy={busy === "photo"} busyLabel="Finding items..." disabled={!!busy} onFile={(f) => run("photo", f)} />
        <FilePicker kind="video" label="10-second sweep" icon={<Video className="size-5" />}
          busy={busy === "video"} busyLabel="Finding items..." disabled={!!busy} onFile={(f) => run("video", f)} />
      </div>
      {busy && <p role="status" className="text-sm text-muted-foreground">This can take up to 30 seconds. Please keep this page open.</p>}
      {error && <ErrorNote message={error} onRetry={() => retry.current?.()} />}
      {capture && !busy && (
        <div className="space-y-2">
          {capture.preview && (
            <BBoxOverlay src={capture.preview} alt="Your photo with items marked"
              boxes={boxes.map((i) => ({ id: i.id, label: i.label, bbox: i.bbox }))} />
          )}
          {!capture.preview && <p className="text-sm text-muted-foreground">Uploaded: {capture.name}</p>}
          {capture.ids.length === 0 && (
            <p className="rounded-lg bg-muted p-3 text-sm">We could not find any items. Try a closer photo with better light.</p>
          )}
        </div>
      )}
    </Card>
  );
}