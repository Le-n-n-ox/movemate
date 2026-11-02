import type { DiscrepancyEventOut } from "@/lib/types";
import { Pill } from "@/components/Shell";
import { Card } from "@/components/ui/card";

const KIND: Record<DiscrepancyEventOut["kind"], string> = {
  detected: "Detected", note: "Note", search: "Search", evidence: "Photo evidence",
  assigned: "Assigned", status: "Status", resolved: "Resolved",
};

/** Append-only: entries are never edited or deleted. */
export function Trail({ events }: { events: DiscrepancyEventOut[] }) {
  return (
    <Card className="gap-3 p-4">
      <h2 className="text-lg font-semibold">History</h2>
      <ol className="space-y-3">
        {events.map((e) => (
          <li key={e.id} className="space-y-1 border-l-2 border-primary/40 pl-3">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="brand">{KIND[e.kind]}</Pill>
              <span className="text-xs text-muted-foreground">
                {e.actor}{e.role ? ` (${e.role})` : ""} · {new Date(e.created_at).toLocaleString()}
              </span>
            </div>
            {e.text && <p className="whitespace-pre-wrap text-sm">{e.text}</p>}
            {e.photo_url && <img src={e.photo_url} alt="Evidence" className="max-h-52 rounded-lg" />}
          </li>
        ))}
        {events.length === 0 && <li className="text-sm text-muted-foreground">Nothing recorded yet.</li>}
      </ol>
    </Card>
  );
}