import { useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock, Copy, DoorOpen, Printer, User } from "lucide-react";
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
  const { withRole } = useRole();
  const q = useAsync(() => api.readiness(id), [id]);
  const r = q.data;

  return (
    <Shell title="Readiness report" back={withRole(`/inspection/${id}`)} backLabel="Inspection">
      {q.loading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
      {q.error && <ErrorNote message={q.error} onRetry={() => q.refresh()} />}
      {r && (
        <div className="space-y-5">
          <p className="font-display text-2xl font-extrabold tracking-tight">{r.property_name}</p>
          <StatusHero status={r.status} summary={r.summary} />

          <Card className="card-lift gap-3 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <p className="inline-flex items-center gap-1.5">
                <User className="size-4 text-primary" aria-hidden />
                {kindLabel(r.kind)} by <strong>{r.inspector}</strong>{r.reservation_ref && <> · Ref {r.reservation_ref}</>}
              </p>
              <p className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Clock className="size-4" aria-hidden /> Generated {new Date(r.generated_at).toLocaleString()}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 border-t pt-3">
              <Pill tone={tone(r.cleaning_status)}>Cleaning: {part(r.cleaning_status)}</Pill>
              <Pill tone={tone(r.inventory_status)}>Items: {part(r.inventory_status)}</Pill>
            </div>
            <p className="text-xs text-muted-foreground">Completed is not the same as ready.</p>
          </Card>

          {r.exception_note && (
            <div className="warn-box space-y-1 !p-4">
              <p className="font-display font-bold">Completed with an exception</p>
              <p>{r.exception_note}</p>
              {r.exception_by && <p className="text-xs">Approved by {r.exception_by}</p>}
            </div>
          )}

          <div className="stagger space-y-4">
            <ListCard title="Blocking" tone="danger" hint="These must be resolved before the home is ready." items={r.blocking} />
            <ListCard title="Open cases" items={r.open_cases} />
            <ListCard title="Known gaps" hint="Recorded as missing. Nobody is asked to find these again." items={r.known_gaps} />
            <ListCard title="Low stock" items={r.low_stock} />
          </div>

          <IssuesChart rooms={r.rooms} />

          <section className="space-y-3" aria-label="Rooms">
            <h2 className="card-title">
              <span className="icon-badge"><DoorOpen className="size-5" aria-hidden /></span>
              Rooms
              <span className="rounded-full bg-accent px-2 py-0.5 text-sm font-semibold text-accent-foreground">{r.rooms.length}</span>
            </h2>
            <div className="stagger grid gap-3 sm:grid-cols-2">
              {r.rooms.map((room) => {
                const clear = room.issues.length === 0;
                return (
                  <Card key={room.room_name} className={`card-lift gap-3 p-4 ${clear ? "card-ok" : "card-warn"}`}>
                    <p className="flex items-center gap-2 font-display text-lg font-bold">
                      {clear
                        ? <CheckCircle2 className="size-5 text-ok" aria-hidden />
                        : <AlertTriangle className="size-5 text-warn" aria-hidden />}
                      {room.room_name}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Pill tone={tone(room.cleaning_status)}>Cleaning: {part(room.cleaning_status)}</Pill>
                      <Pill tone={tone(room.inventory_status)}>Items: {part(room.inventory_status)}</Pill>
                    </div>
                    {clear
                      ? <p className="text-sm text-muted-foreground">No issues recorded.</p>
                      : <ul className="list-disc space-y-1 pl-5 text-sm marker:text-warn">{room.issues.map((s, i) => <li key={i}>{s}</li>)}</ul>}
                  </Card>
                );
              })}
            </div>
          </section>

          <div className="no-print grid grid-cols-2 gap-3 pt-2">
            <Button variant="outline" className="btn-tap" onClick={() => copyText(plainText(r), "Summary copied")}>
              <Copy className="size-5" /> Copy summary
            </Button>
            <Button className="btn-tap" onClick={() => window.print()}><Printer className="size-5" /> Print</Button>
          </div>
        </div>
      )}
    </Shell>
  );
}