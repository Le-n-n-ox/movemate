import { useParams } from "react-router-dom";
import { Copy, Printer } from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { useRole } from "@/hooks/useRole";
import { copyText, kindLabel, partLabel, partTone } from "@/lib/labels";
import type { PartStatus, ReadinessReport } from "@/lib/types";
import { ErrorNote, Pill, Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusHero } from "@/components/readiness/StatusHero";
import { ListCard } from "@/components/readiness/ListCard";
import { IssuesChart } from "@/components/readiness/IssuesChart";

const part = (s: string) => partLabel[s as PartStatus] ?? s.replace("_", " ");
const tone = (s: string) => partTone[s as PartStatus] ?? "neutral";

function plainText(r: ReadinessReport) {
  const lines = [
    `${r.property_name}: ${r.status.replace(/_/g, " ").toUpperCase()}`,
    r.summary,
    `${kindLabel(r.kind)} by ${r.inspector}${r.reservation_ref ? `, ref ${r.reservation_ref}` : ""}`,
  ];
  const add = (t: string, a: string[]) => a.length && lines.push("", `${t}:`, ...a.map((x) => `- ${x}`));
  add("Blocking", r.blocking); add("Open cases", r.open_cases);
  add("Known gaps", r.known_gaps); add("Low stock", r.low_stock);
  if (r.exception_note) lines.push("", `Exception (${r.exception_by}): ${r.exception_note}`);
  return lines.join("\n");
}

export default function Readiness() {
  const { id = "" } = useParams();
  const { role } = useRole();
  const q = useAsync(() => api.readiness(id), [id]);
  const r = q.data;

  return (
    <Shell title="Readiness report" back={`/inspection/${id}?role=${role}`} backLabel="Inspection">
      {q.loading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
      {q.error && <ErrorNote message={q.error} onRetry={() => q.refresh()} />}
      {r && (
        <>
          <p className="text-lg font-semibold">{r.property_name}</p>
          <StatusHero status={r.status} summary={r.summary} />

          <Card className="gap-2 p-4 text-sm">
            <p>{kindLabel(r.kind)} by <strong>{r.inspector}</strong>{r.reservation_ref && <> · Ref {r.reservation_ref}</>}</p>
            <p className="text-muted-foreground">Generated {new Date(r.generated_at).toLocaleString()}</p>
            <div className="flex flex-wrap gap-2">
              <Pill tone={tone(r.cleaning_status)}>Cleaning: {part(r.cleaning_status)}</Pill>
              <Pill tone={tone(r.inventory_status)}>Items: {part(r.inventory_status)}</Pill>
            </div>
            <p className="text-xs text-muted-foreground">Completed is not the same as ready.</p>
          </Card>

          {r.exception_note && (
            <div className="warn-box space-y-1 !p-4">
              <p className="font-semibold">Completed with an exception</p>
              <p>{r.exception_note}</p>
              {r.exception_by && <p className="text-xs">Approved by {r.exception_by}</p>}
            </div>
          )}

          <ListCard title="Blocking" tone="danger" hint="These must be resolved before the home is ready." items={r.blocking} />
          <ListCard title="Open cases" items={r.open_cases} />
          <ListCard title="Known gaps" hint="Recorded as missing. Nobody is asked to find these again." items={r.known_gaps} />
          <ListCard title="Low stock" items={r.low_stock} />

          <IssuesChart rooms={r.rooms} />

          <section className="space-y-3" aria-label="Rooms">
            <h2 className="text-lg font-semibold">Rooms</h2>
            {r.rooms.map((room) => (
              <Card key={room.room_name} className="gap-2 p-4">
                <p className="font-semibold">{room.room_name}</p>
                <div className="flex flex-wrap gap-2">
                  <Pill tone={tone(room.cleaning_status)}>Cleaning: {part(room.cleaning_status)}</Pill>
                  <Pill tone={tone(room.inventory_status)}>Items: {part(room.inventory_status)}</Pill>
                </div>
                {room.issues.length > 0
                  ? <ul className="list-disc space-y-1 pl-5 text-sm">{room.issues.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  : <p className="text-sm text-muted-foreground">No issues recorded.</p>}
              </Card>
            ))}
          </section>

          <div className="no-print grid grid-cols-2 gap-3">
            <Button variant="outline" className="btn-tap" onClick={() => copyText(plainText(r), "Summary copied")}>
              <Copy className="size-5" /> Copy summary
            </Button>
            <Button className="btn-tap" onClick={() => window.print()}><Printer className="size-5" /> Print</Button>
          </div>
        </>
      )}
    </Shell>
  );
}