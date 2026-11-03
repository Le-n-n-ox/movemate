import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FolderOpen, ScanSearch, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { useRole } from "@/hooks/useRole";
import { ErrorNote, Pill, Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DetailsCard } from "@/components/property/DetailsCard";
import { RoomsCard } from "@/components/property/RoomsCard";
import { InspectionCard } from "@/components/property/InspectionCard";
import { GuestLinkCard } from "@/components/property/GuestLinkCard";
import { LinkButton } from "@/components/LinkButton";
import { InsightsCard } from "@/components/property/InsightsCard";

export default function Property() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const { role, actor, setActor, withRole, linkFor } = useRole();
  const p = useAsync(() => api.getProperty(id), [id]);
  const insp = useAsync(() => api.listInspections(id), [id]);
  const [busy, setBusy] = useState(false);

  async function startAudit() {
    setBusy(true);
    try {
      const a = await api.createAudit(id);
      nav(withRole(`/audit/${a.id}`));
    } catch (e) { toast.error((e as Error).message); setBusy(false); }
  }

  const d = p.data;
  return (
    <Shell title={d?.name ?? "Property"} back={withRole("/properties")} backLabel="Properties">
      {p.loading && <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>}
      {p.error && <ErrorNote message={p.error} onRetry={() => p.refresh()} />}
      {d && (
        <>
          <DetailsCard key={d.id + (d.rules ?? "")} property={d} onSaved={() => p.refresh(true)} />
          <RoomsCard pid={id} rooms={d.rooms} onChanged={() => p.refresh(true)} />
          <InsightsCard rooms={d.rooms} />
          <InspectionCard
            pid={id} recent={insp.data ?? []} role={role} actor={actor} setActor={setActor} hasRooms={d.rooms.length > 0}
          />

          <Link to={withRole(`/properties/${id}/cases`)} className="block">
            <Card className="row-link">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-semibold">
                  <FolderOpen className="size-5 text-primary" aria-hidden /> Cases
                </div>
                <Pill tone={d.open_discrepancies > 0 ? "danger" : "neutral"}>{d.open_discrepancies} open</Pill>
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            </Card>
          </Link>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">AI video check</h2>
            <p className="text-sm text-muted-foreground">
              Film each room and get suggestions. It only suggests. A person decides.
            </p>
            <Card className="gap-2 p-4">
              <Button className="btn-tap w-full" onClick={startAudit} disabled={busy || d.rooms.length === 0}>
                {busy ? "Starting…" : "Start AI video check"}
              </Button>
              {d.rooms.length === 0 && <p className="text-sm text-muted-foreground">Add a room first.</p>}
              {d.latest_audit_id && (
                <LinkButton variant="outline" to={withRole(`/audit/${d.latest_audit_id}`)} className="w-full">
                  Open latest check
                </LinkButton>
              )}
              <Button
                variant="outline"
                className="btn-tap w-full mt-3"
                onClick={() => { navigator.clipboard?.writeText(linkFor("cleaner")); toast.success("Cleaner link copied"); }}
              >
                <ScanSearch className="size-4" aria-hidden /> Copy link for cleaner
              </Button>
            </Card>
          </section>

          <GuestLinkCard token={d.guest_token} />
        </>
      )}
    </Shell>
  );
}
