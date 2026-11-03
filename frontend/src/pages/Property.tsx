import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, ClipboardCheck, DoorOpen, FolderOpen, ScanSearch, Share2 } from "lucide-react";
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

const SECTIONS = [
    { id: "rooms", label: "Rooms", Icon: DoorOpen },
    { id: "inspection", label: "Inspection", Icon: ClipboardCheck },
    { id: "cases", label: "Cases", Icon: FolderOpen },
    { id: "ai-check", label: "AI check", Icon: ScanSearch },
    { id: "guest", label: "Guest link", Icon: Share2 },
];

const jump = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

export default function Property() {
    const { id = "" } = useParams();
    const nav = useNavigate();
    const { role, actor, setActor, withRole } = useRole();
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
            {p.loading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
            {p.error && <ErrorNote message={p.error} onRetry={() => p.refresh()} />}
            {d && (
                <div className="space-y-5">
                    <nav className="jump-bar no-print" aria-label="Jump to section">
                        {SECTIONS.map(({ id: sid, label, Icon }) => (
                            <button key={sid} type="button" onClick={() => jump(sid)}>
                                <Icon className="size-4" aria-hidden /> {label}
                            </button>
                        ))}
                    </nav>

                    <DetailsCard key={d.id + (d.rules ?? "")} property={d} onSaved={() => p.refresh(true)} />
                    <div id="rooms" className="jump-target">
                        <RoomsCard pid={id} rooms={d.rooms} onChanged={() => p.refresh(true)} />
                    </div>
                    <InsightsCard rooms={d.rooms} />
                    <div id="inspection" className="jump-target">
                        <InspectionCard
                            pid={id} recent={insp.data ?? []} role={role} actor={actor} setActor={setActor} hasRooms={d.rooms.length > 0}
                        />
                    </div>

                    <div id="cases" className="jump-target">
                        <Link to={withRole(`/properties/${id}/cases`)} className="block">
                            <Card className={`flex-row items-center gap-3 p-4 ${d.open_discrepancies > 0 ? "card-warn" : ""}`}>
                                <span className="icon-badge"><FolderOpen className="size-5" aria-hidden /></span>
                                <span className="flex-1 font-display text-lg font-bold">Cases</span>
                                <Pill tone={d.open_discrepancies > 0 ? "danger" : "neutral"}>{d.open_discrepancies} open</Pill>
                                <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                            </Card>
                        </Link>
                    </div>

                    <div id="ai-check" className="jump-target">
                        <Card className="card-info card-lift gap-3 p-4">
                            <h2 className="card-title">
                                <span className="icon-badge bg-info/15 text-info"><ScanSearch className="size-5" aria-hidden /></span> AI video check
                            </h2>
                            <p className="text-sm text-muted-foreground">Film each room and get suggestions. It only suggests. A person decides.</p>
                            <Button className="btn-tap" onClick={startAudit} disabled={busy || d.rooms.length === 0}>
                                {busy ? "Starting..." : "Start AI video check"}
                            </Button>
                            {d.rooms.length === 0 && <p className="text-sm text-muted-foreground">Add a room first.</p>}
                            {d.latest_audit_id && (
                                <LinkButton variant="outline" to={withRole(`/audit/${d.latest_audit_id}`)}>
                                    Open latest check
                                </LinkButton>
                            )}
                        </Card>
                    </div>

                    <div id="guest" className="jump-target">
                        <GuestLinkCard token={d.guest_token} />
                    </div>
                </div>
            )}
        </Shell>
    );
}