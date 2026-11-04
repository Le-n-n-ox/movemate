import { useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
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
import { MobileNav } from "@/components/MobileNav";
import { QRCodeSVG } from "qrcode.react";

export default function Property() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const { role, actor, setActor, withRole } = useRole();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "rooms";
  const p = useAsync(() => api.getProperty(id), [id]);
  const insp = useAsync(() => api.listInspections(id), [id]);
  const [busy, setBusy] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  // Role can change via the `?role=` query param, so this redirect must come
  // after every hook call to keep hook order stable across renders.
  if (role === "cleaner") return <Navigate to="/cleaner?role=cleaner" replace />;

  async function startAudit() {
    setBusy(true);
    try {
      const a = await api.createAudit(id);
      nav(withRole(`/audit/${a.id}`));
    } catch (e) { toast.error((e as Error).message); setBusy(false); }
  }

  const d = p.data;
  const refreshAll = () => { void p.refresh(true); void insp.refresh(true); };
  return (
    <div id="main" className="mx-auto w-full max-w-[1200px] px-4 pb-28 md:px-6">
      <div className="mb-4"><Link to={withRole("/properties")} className="inline-flex min-h-12 items-center text-sm text-primary hover:underline">← Properties</Link></div>
        {p.loading && <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>}
        {p.error && <ErrorNote message={p.error} onRetry={() => p.refresh()} />}
        {d && (
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-8">
              <header>
                <h1 className="min-w-0 break-words font-display text-4xl font-bold tracking-tight">{d.name}</h1>
                {d.address && <p className="mt-1 text-muted-foreground">{d.address}</p>}
              </header>

              <section className="rounded-2xl border bg-card p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Readiness</p>
                    <p className="mt-1 font-display text-[clamp(2rem,4vw,3.25rem)] font-bold text-primary leading-none">
                      {d.latest_inspection_id ? "See report" : "No inspection yet"}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {d.open_discrepancies > 0 ? `${d.open_discrepancies} open case${d.open_discrepancies === 1 ? "" : "s"}` : "Nothing needs you right now."}
                    </p>
                  </div>
                  <div className="flex flex-wrap shrink-0 gap-2">
                    <Button className="btn-tap shrink-0" onClick={startAudit} disabled={busy || d.rooms.length === 0}>
                      {busy ? "Starting…" : "Start AI video check"}
                    </Button>
                    {d.latest_audit_id && (
                      <LinkButton variant="outline" to={withRole(`/audit/${d.latest_audit_id}`)} className="btn-tap">
                        View report
                      </LinkButton>
                    )}
                  </div>
                </div>
              </section>

              <Tabs className="w-full min-w-0" value={tab} onValueChange={(v) => {
                const next = new URLSearchParams(params);
                if (v === "rooms") next.delete("tab");
                else next.set("tab", v);
                setParams(next, { replace: true });
              }}>
                <TabsList className="flex h-auto min-w-0 w-full justify-start gap-1 overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden">
                  <TabsTrigger value="rooms">Rooms</TabsTrigger>
                  <TabsTrigger value="inspections">Inspections</TabsTrigger>
                  <TabsTrigger value="cases">Cases</TabsTrigger>
                  <TabsTrigger value="guests">Guests</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                </TabsList>
                <TabsContent value="rooms" className="pt-6">
                  <div className="min-w-0">
                    <RoomsCard pid={id} rooms={d.rooms} onChanged={refreshAll} />
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
                    <DetailsCard key={d.id + (d.rules ?? "")} property={d} onSaved={refreshAll} />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <aside className="w-full min-w-0 space-y-4 self-start">
              <div className="rounded-2xl border bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Needs you</p>
                {d.open_discrepancies > 0 ? (
                  <p className="mt-2 text-sm">
                    <span className="font-semibold text-danger">
                      {d.open_discrepancies} open case{d.open_discrepancies === 1 ? "" : "s"}.
                    </span>{" "}
                    Review {d.open_discrepancies === 1 ? "it" : "them"} before the next guest.
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">Nothing needs you right now. Nice.</p>
                )}
                {d.open_discrepancies > 0 && (
                  <Link to={withRole(`/properties/${id}/cases`)} className="mt-3 inline-flex min-h-12 items-center gap-1 text-sm font-semibold text-primary hover:underline">
                    Open cases
                  </Link>
                )}
              </div>
              <div className="rounded-2xl border bg-card p-4 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Quick actions</p>
                <Button className="btn-tap w-full" onClick={startAudit} disabled={busy || d.rooms.length === 0}>
                  {busy ? "Starting…" : "Start AI video check"}
                </Button>
                <Button variant="outline" className="btn-tap w-full" onClick={() => setSendOpen(true)}>
                  <ScanSearch className="size-4" aria-hidden /> Send to cleaner
                </Button>
                <Button variant="outline" className="btn-tap w-full" onClick={() => copyText(`${window.location.origin}/g/${d.guest_token}`, "Guest link copied")}>
                  Guest link
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
      <MobileNav />
    </div>
  );
}
