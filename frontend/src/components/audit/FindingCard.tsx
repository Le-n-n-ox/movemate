import { useState } from "react";
import { api } from "@/lib/api";
import { isClosed, typeLabel, typeTone } from "@/lib/audit";
import type { FindingOut, Resolution, Role } from "@/lib/types";
import { Pill } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function statusLine(f: FindingOut) {
  const moved = f.type === "misplaced";
  switch (f.resolution) {
    case "found": return f.resolved_by === "host" ? "Marked as found by the host." : "Cleaner says it was found. Host to review.";
    case "confirmed": return moved ? "Confirmed as moved by the host." : "Confirmed as a loss by the host.";
    case "dismissed": return "Dismissed by the host.";
    default: return "Open. Nobody has looked yet.";
  }
}

type Btn = { label: string; res: Resolution; primary?: boolean };

function buttons(f: FindingOut, isHost: boolean): Btn[] {
  const moved = f.type === "misplaced";
  const found: Btn = { label: moved ? "I put it back" : "It was found", res: "found", primary: true };
  const confirm: Btn = { label: moved ? "Confirm it moved" : "Confirm loss", res: "confirmed", primary: true };
  const dismiss: Btn = { label: "Dismiss", res: "dismissed" };
  const reopen: Btn = { label: "Reopen", res: "open" };
  if (!isHost) {
    if (f.resolution === "open") return [found];
    if (f.resolution === "found" && f.resolved_by === "cleaner") return [{ label: "Undo", res: "open" }];
    return [];
  }
  switch (f.resolution) {
    case "open": return [confirm, dismiss];
    case "found": return [confirm, dismiss, reopen];
    case "confirmed": return [dismiss, reopen];
    case "dismissed": return [confirm, reopen];
  }
}

export function FindingCard({ f, role, roomName, onChanged }: {
  f: FindingOut; role: Role; roomName?: string; onChanged: () => void;
}) {
  const isHost = role === "host";
  const closed = isClosed(f);
  const [note, setNote] = useState(f.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update(b: { resolution?: Resolution; note?: string }) {
    setBusy(true); setError(null);
    try { await api.patchFinding(f.id, { role, ...b }); onChanged(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  const canEditNote = isHost || !closed;
  const btns = buttons(f, isHost);

  return (
    <Card className={cn("gap-3 p-4", closed && "card-dim")}>
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={typeTone[f.type]}>{typeLabel[f.type]}</Pill>
        {roomName && <span className="text-sm text-muted-foreground">{roomName}</span>}
      </div>
      <p className="text-lg font-semibold leading-tight">{f.item_label}</p>

      <div className="grid grid-cols-2 gap-2">
        {[["Baseline photo", f.reference_crop_url], ["From the video", f.evidence_frame_url]].map(([cap, src]) => (
          <figure key={cap} className="space-y-1">
            {src
              ? <img src={src} alt={cap ?? ""} className="aspect-square w-full rounded-lg object-cover" />
              : <div className="grid aspect-square place-items-center rounded-lg bg-muted text-xs text-muted-foreground">No image</div>}
            <figcaption className="text-center text-xs text-muted-foreground">{cap}</figcaption>
          </figure>
        ))}
      </div>

      <dl className="space-y-1 text-sm">
        {f.expected && <div><dt className="inline font-medium">Expected: </dt><dd className="inline">{f.expected}</dd></div>}
        {f.observed && <div><dt className="inline font-medium">Seen: </dt><dd className="inline">{f.observed}</dd></div>}
      </dl>
      {f.type === "unverified" && <p className="warn-box">Please re-film this area.</p>}
      {f.confidence != null && <p className="text-xs text-muted-foreground">Model confidence {Math.round(f.confidence * 100)}%. The photos are the proof.</p>}

      <div className="space-y-1.5">
        <label htmlFor={`n-${f.id}`} className="text-sm font-medium">Note</label>
        <Textarea id={`n-${f.id}`} rows={2} value={note} readOnly={!canEditNote} placeholder="For example: it was in the drawer"
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => canEditNote && note !== (f.note ?? "") && update({ note })} />
      </div>

      <p className="rounded-lg bg-secondary p-2 text-sm" role="status">{statusLine(f)}</p>

      {btns.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {btns.map((b) => (
            <Button key={b.label} disabled={busy} variant={b.primary ? "default" : "outline"}
              className="btn-tap min-w-[8rem] flex-1" onClick={() => update({ resolution: b.res, note })}>
              {b.label}
            </Button>
          ))}
        </div>
      )}
      {error && <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>}
    </Card>
  );
}