import {
  AlertTriangle, Camera, CheckCircle2, RefreshCw, Search, StickyNote, UserCheck, type LucideIcon,
} from "lucide-react";
import type { DiscrepancyEventOut } from "@/lib/types";
import { Pill } from "@/components/Shell";
import { Card } from "@/components/ui/card";

type Kind = DiscrepancyEventOut["kind"];

const KIND: Record<Kind, string> = {
  detected: "Detected", note: "Note", search: "Search", evidence: "Photo evidence",
  assigned: "Assigned", status: "Status", resolved: "Resolved",
};

const LOOK: Record<Kind, { Icon: LucideIcon; tone: string }> = {
  detected: { Icon: AlertTriangle, tone: "bg-danger/10 text-danger" },
  note: { Icon: StickyNote, tone: "bg-accent text-accent-foreground" },
  search: { Icon: Search, tone: "bg-info/15 text-info" },
  evidence: { Icon: Camera, tone: "bg-accent text-accent-foreground" },
  assigned: { Icon: UserCheck, tone: "bg-warn/20 text-warn" },
  status: { Icon: RefreshCw, tone: "bg-muted text-muted-foreground" },
  resolved: { Icon: CheckCircle2, tone: "bg-ok/15 text-ok" },
};

/** Append-only: entries are never edited or deleted. */
export function Trail({ events }: { events: DiscrepancyEventOut[] }) {
  return (
    <Card className="gap-3 p-4">
      <h2 className="card-title">History</h2>
      <ol className="stagger relative space-y-5 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-0.5 before:bg-border">
        {events.map((e) => {
          const { Icon, tone } = LOOK[e.kind];
          return (
            <li key={e.id} className="relative space-y-1.5 pl-11">
              <span className={`absolute left-0 top-0 grid size-8 place-items-center rounded-full ring-4 ring-card ${tone}`} aria-hidden>
                <Icon className="size-4" />
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="brand">{KIND[e.kind]}</Pill>
                <span className="text-xs text-muted-foreground">
                  {e.actor}{e.role ? ` (${e.role})` : ""} · {new Date(e.created_at).toLocaleString()}
                </span>
              </div>
              {e.text && <p className="whitespace-pre-wrap text-sm">{e.text}</p>}
              {e.photo_url && <img src={e.photo_url} alt="Evidence" className="max-h-52 rounded-lg border" />}
            </li>
          );
        })}
        {events.length === 0 && <li className="pl-1 text-sm text-muted-foreground">Nothing recorded yet.</li>}
      </ol>
    </Card>
  );
}