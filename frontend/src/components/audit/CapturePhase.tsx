import { useState } from "react";
import { Check, Play, Video } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { RoomOut } from "@/lib/types";
import { FilePicker } from "@/components/FilePicker";
import { ErrorNote, Pill } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function CapturePhase({ auditId, rooms, uploaded, failedStage, onChanged }: {
  auditId: string; rooms: RoomOut[]; uploaded: string[]; failedStage: string | null; onChanged: () => void;
}) {
  const [busyRoom, setBusyRoom] = useState<string | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [starting, setStarting] = useState(false);

  async function upload(roomId: string, file: File) {
    setBusyRoom(roomId);
    try {
      await api.uploadAuditVideo(auditId, roomId, file);
      setNames((n) => ({ ...n, [roomId]: file.name }));
      toast.success("Video uploaded");
      onChanged();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusyRoom(null); }
  }

  async function run() {
    setStarting(true);
    try { await api.runAudit(auditId); onChanged(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setStarting(false); }
  }

  return (
    <>
      {failedStage && <ErrorNote message={`The check did not finish: ${failedStage}`} />}
      <Card className="gap-2 p-4 text-sm">
        <h2 className="text-lg font-semibold">Before you film</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Film every room.</strong> A moved item is found in another room's video.</li>
          <li>20 to 30 seconds per room. Walk the same route each time.</li>
          <li>Pause one second at every shelf, table and counter.</li>
          <li>Open drawers and cabinets fully. Good light, no flash.</li>
        </ul>
      </Card>

      {rooms.map((r) => {
        const done = uploaded.includes(r.id);
        return (
          <Card key={r.id} className="gap-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{r.name}</p>
              {done && <Pill tone="ok"><Check className="size-3.5" aria-hidden /> Uploaded</Pill>}
            </div>
            {names[r.id] && <p className="truncate text-xs text-muted-foreground">{names[r.id]}</p>}
            <FilePicker kind="video" icon={<Video className="size-5" />} label={done ? "Record again" : "Record video"}
              busy={busyRoom === r.id} busyLabel="Uploading..." disabled={!!busyRoom || starting}
              onFile={(f) => upload(r.id, f)} />
          </Card>
        );
      })}

      <Button className="btn-tap w-full" disabled={uploaded.length === 0 || !!busyRoom || starting} onClick={run}>
        <Play className="size-5" /> {starting ? "Starting..." : "Run check"}
      </Button>
      {uploaded.length === 0 && <p className="text-center text-sm text-muted-foreground">Upload at least one room video to run the check.</p>}
    </>
  );
}