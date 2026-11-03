import { useState } from "react";

import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, ClipboardCheck, DoorOpen, FolderOpen, ScanSearch, Share2 } from "lucide-react";

import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { FolderOpen, ScanSearch } from "lucide-react";

import { toast } from "sonner";
import { copyText } from "@/lib/labels";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { useRole } from "@/hooks/useRole";
import { ErrorNote, Pill } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetailsCard } from "@/components/property/DetailsCard";
import { RoomsCard } from "@/components/property/RoomsCard";
import { InspectionCard } from "@/components/property/InspectionCard";
import { GuestLinkCard } from "@/components/property/GuestLinkCard";
import { SendToCleanerSheet } from "@/components/property/SendToCleanerSheet";
import { LinkButton } from "@/components/LinkButton";
import { QRCodeSVG } from "qrcode.react";

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
  if (role === "cleaner") return <Navigate to="/cleaner?role=cleaner" replace />;
  const p = useAsync(() => api.getProperty(id), [id]);
  const insp = useAsync(() => api.listInspections(id), [id]);
  const [busy, setBusy] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

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

  const d = p.data;
  return (
    <div className="mx-auto w-full max-w-[1200px] px-6">
      <div className="mb-4"><Link to={withRole("/properties")} className="text-sm text-primary hover:underline">← Properties</Link></div>
        {p.loading && <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>}
        {p.error && <ErrorNote message={p.error} onRetry={() => p.refresh()} />}
        {d && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
            <div className="min-w-0 space-y-8">
              <header>
                <h1 className="font-display text-4xl font-bold tracking-tight">{d.name}</h1>
                {d.address && <p className="mt-1 text-muted-foreground">{d.address}</p>}
              </header>

              <section className="rounded-2xl border bg-card p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Readiness</p>
                    <p className="font-display text-[clamp(2rem,4vw,3.25rem)] font-bold text-primary leading-none">
                      {d.latest_inspection_id ? "See report" : "No inspection yet"}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {d.open_discrepancies > 0 ? `${d.open_discrepancies} open case${d.open_discrepancies === 1 ? "" : "s"}` : "Nothing needs you right now."}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button className="btn-tap shrink-0" onClick={startAudit} disabled={busy || d.rooms.length === 0}>
                      {busy ? "Starting…" : "Start inspection"}
                    </Button>
                    {d.latest_audit_id && (
                      <LinkButton variant="outline" to={withRole(`/audit/${d.latest_audit_id}`)} className="btn-tap">
                        View report
                      </LinkButton>
                    )}
                  </div>
                </div>
              </section>

              <Tabs defaultValue="rooms">
                <TabsList className="inline-flex h-auto w-full justify-start gap-1 overflow-x-auto whitespace-nowrap">
                  <TabsTrigger value="rooms">Rooms</TabsTrigger>
                  <TabsTrigger value="inspections">Inspections</TabsTrigger>
                  <TabsTrigger value="cases">Cases</TabsTrigger>
                  <TabsTrigger value="guests">Guests</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                </TabsList>
                <TabsContent value="rooms" className="pt-6">
                  <div className="min-w-0">
                    <RoomsCard pid={id} rooms={d.rooms} onChanged={() => p.refresh(true)} />
                  </div>
                </TabsContent>
                <TabsContent value="inspections" className="pt-6">
                  <div className="min-w-0">
                    <InspectionCard pid={id} recent={insp.data ?? []} role={role} actor={actor} setActor={setActor} hasRooms={d.rooms.length > 0} />
                  </div>
                </TabsContent>
                <TabsContent value="cases" className="pt-6">
                  <div className="min-w-0">
                    <Link to={withRole(`/properties/${id}/cases`)} className="block">
                      <Card className="row-link">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-semibold">
                            <FolderOpen className="size-5 text-primary" aria-hidden /> Cases
                          </div>
                          <Pill tone={d.open_discrepancies > 0 ? "danger" : "neutral"}>{d.open_discrepancies} open</Pill>
                        </div>
                      </Card>
                    </Link>
                  </div>
                </TabsContent>
                <TabsContent value="guests" className="pt-6 space-y-4">
                  <div className="min-w-0">
                    <GuestLinkCard token={d.guest_token} />
                  </div>
                </TabsContent>
                <TabsContent value="details" className="pt-6">
                  <div className="min-w-0">
                    <DetailsCard key={d.id + (d.rules ?? "")} property={d} onSaved={() => p.refresh(true)} />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-6 self-start w-full">
              <div className="rounded-2xl border bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Needs you</p>
                <p className="mt-2 text-sm text-muted-foreground">Nothing needs you right now. Nice.</p>
              </div>
              <div className="rounded-2xl border bg-card p-4 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Quick actions</p>
                <Button className="btn-tap w-full" onClick={startAudit} disabled={busy || d.rooms.length === 0}>
                  {busy ? "Starting…" : "Start inspection"}
                </Button>
                <Button variant="outline" className="btn-tap w-full" onClick={() => setSendOpen(true)}>
                  <ScanSearch className="size-4" aria-hidden /> Send to cleaner
                </Button>
                <Button variant="outline" className="btn-tap w-full" onClick={() => copyText(`${window.location.origin}/g/${d.guest_token}`, "Guest link copied")}>
                  Guest link
                </Button>
                <Button variant="outline" className="btn-tap w-full" onClick={startAudit} disabled={busy || d.rooms.length === 0}>
                  Start AI video check
                </Button>
              </div>
              <div className="rounded-2xl border bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Guest QR</p>
                <div className="flex justify-center">
                  <div className="h-[120px] w-[120px] rounded-lg bg-white flex items-center justify-center">
                    {d?.guest_token ? (
                      <QRCodeSVG value={`${window.location.origin}/g/${d.guest_token}`} size={120} />
                    ) : (
                      <Skeleton className="h-[120px] w-[120px]" />
                    )}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      <SendToCleanerSheet open={sendOpen} onOpenChange={setSendOpen} propertyId={id} auditId={d?.latest_audit_id} />
    </div>
  );
}

