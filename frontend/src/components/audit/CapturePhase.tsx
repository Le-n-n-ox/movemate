import { useState } from "react";
import { Check, Clapperboard, Lightbulb, Play, Video } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { RoomOut } from "@/lib/types";
import { FilePicker } from "@/components/FilePicker";
import { ErrorNote, Pill } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const TIPS: [string, string][] = [
  ["Film every room.", "A moved item is found in another room's video."],
  ["20 to 30 seconds per room.", "Walk the same route each time."],
  ["Pause one second", "at every shelf, table and counter."],
  ["Open drawers and cabinets fully.", "Good light, no flash."],
];

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

  const doneCount = rooms.filter((r) => uploaded.includes(r.id)).length;
  const pct = rooms.length ? Math.round((doneCount / rooms.length) * 100) : 0;
  const allDone = rooms.length > 0 && doneCount === rooms.length;

  return (
    <>
      {failedStage && <ErrorNote message={`The check did not finish: ${failedStage}`} />}

      <Card className="card-info gap-3 p-4 text-sm">
        <h2 className="card-title">
          <span className="icon-badge bg-info/15 text-info"><Lightbulb className="size-5" aria-hidden /></span> Before you film
        </h2>
        <ul className="stagger space-y-2">
          {TIPS.map(([lead, rest]) => (
            <li key={lead} className="flex items-start gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span><strong>{lead}</strong> {rest}</span>
            </li>
          ))}
        </ul>
      </Card>

      {rooms.length > 0 && (
        <div className="space-y-1.5" aria-live="polite">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">{doneCount} of {rooms.length} rooms filmed</span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <div className="meter" role="progressbar" aria-label="Rooms filmed" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
            <span style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div className="stagger space-y-3">
        {rooms.map((r) => {
          const done = uploaded.includes(r.id);
          return (
            <Card key={r.id} className={`gap-3 p-4 ${done ? "card-ok" : ""}`}>
              <div className="flex items-center gap-3">
                <span className={`icon-badge ${done ? "pop bg-ok/15 text-ok" : ""}`}>
                  {done ? <Check className="size-5" aria-hidden /> : <Clapperboard className="size-5" aria-hidden />}
                </span>
                <p className="flex-1 font-display text-lg font-bold">{r.name}</p>
                {done ? <Pill tone="ok"><Check className="size-3.5" aria-hidden /> Uploaded</Pill> : <Pill>Waiting</Pill>}
              </div>
              {names[r.id] && <p className="truncate text-xs text-muted-foreground">{names[r.id]}</p>}
              <FilePicker kind="video" icon={<Video className="size-5" />} label={done ? "Record again" : "Record video"}
                busy={busyRoom === r.id} busyLabel="Uploading..." disabled={!!busyRoom || starting}
                onFile={(f) => upload(r.id, f)} />
            </Card>
          );
        })}
      </div>

      <Button className={`btn-tap w-full ${allDone ? "animate-pulse-ring" : ""}`} disabled={uploaded.length === 0 || !!busyRoom || starting} onClick={run}>
        <Play className="size-5" /> {starting ? "Starting..." : "Run check"}
      </Button>
      {uploaded.length === 0 && <p className="text-center text-sm text-muted-foreground">Upload at least one room video to run the check.</p>}
    </>
  );
}