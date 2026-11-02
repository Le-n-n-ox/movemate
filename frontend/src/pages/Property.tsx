import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FolderOpen, ScanSearch } from "lucide-react";
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
    const { actor, setActor } = useRole();
    const p = useAsync(() => api.getProperty(id), [id]);
    const insp = useAsync(() => api.listInspections(id), [id]);
    const [busy, setBusy] = useState(false);

    async function startAudit() {
        setBusy(true);
        try {
            const a = await api.createAudit(id);
            nav(`/audit/${a.id}?role=host`);
        } catch (e) { toast.error((e as Error).message); setBusy(false); }
    }

    const d = p.data;
    return (
        <Shell title={d?.name ?? "Property"} back="/properties" backLabel="Properties">
            {p.loading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
            {p.error && <ErrorNote message={p.error} onRetry={() => p.refresh()} />}
            {d && (
                <>
                    <DetailsCard key={d.id + (d.rules ?? "")} property={d} onSaved={() => p.refresh(true)} />
                    <RoomsCard pid={id} rooms={d.rooms} onChanged={() => p.refresh(true)} />
                    <InsightsCard rooms={d.rooms} />
                    <InspectionCard
                        pid={id} recent={insp.data ?? []} actor={actor} setActor={setActor} hasRooms={d.rooms.length > 0}
                    />
                    <Link to={`/properties/${id}/cases?role=host`} className="block">
                        <Card className="flex-row items-center justify-between p-4 active:bg-accent">
                            <span className="flex items-center gap-2 font-semibold"><FolderOpen className="size-5 text-primary" aria-hidden /> Cases</span>
                            <Pill tone={d.open_discrepancies > 0 ? "danger" : "neutral"}>{d.open_discrepancies} open</Pill>
                        </Card>
                    </Link>
                    <Card className="gap-3 p-4">
                        <h2 className="flex items-center gap-2 text-lg font-semibold"><ScanSearch className="size-5 text-primary" aria-hidden /> AI video check</h2>
                        <p className="text-sm text-muted-foreground">Film each room and get suggestions. It only suggests. A person decides.</p>
                        <Button className="btn-tap" onClick={startAudit} disabled={busy || d.rooms.length === 0}>
                            {busy ? "Starting..." : "Start AI video check"}
                        </Button>
                        {d.latest_audit_id && (
                            <LinkButton variant="outline" to={`/audit/${d.latest_audit_id}?role=host`}>
                                Open latest check
                            </LinkButton>
                        )}
                    </Card>
                    <GuestLinkCard token={d.guest_token} />
                </>
            )}
        </Shell>
    );
}