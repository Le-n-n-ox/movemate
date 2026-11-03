import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, ChevronRight, ClipboardCheck, FolderOpen, MapPin, QrCode, ScanSearch, Send, Users,
} from "lucide-react";

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

const LABEL = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";
const TRIGGER =
  "rounded-lg px-4 font-semibold transition-all duration-200 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm data-active:bg-card data-active:text-primary data-active:shadow-sm";
const PANEL = "pt-6 animate-in fade-in slide-in-from-bottom-2 duration-300";

export default function Property() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const { role, actor, setActor, withRole } = useRole();
  const p = useAsync(() => api.getProperty(id), [id]);
  const insp = useAsync(() => api.listInspections(id), [id]);
  const [busy, setBusy] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  // Redirect cleaners after all hooks so the call order stays stable.
  if (role === "cleaner") return <Navigate to="/cleaner?role=cleaner" replace />;

  async function startAudit() {
    setBusy(true);
    try {
      const a = await api.createAudit(id);
      nav(withRole(`/audit/${a.id}`));
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  }

  const d = p.data;
  const openCount = d?.open_discrepancies ?? 0;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-24 pt-5 sm:px-6">
      <div className="mb-5">
        <Link
          to={withRole("/properties")}
          className="group inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm font-medium text-primary transition-all hover:border-primary/50 hover:shadow-sm"
        >
          <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden />
          Properties
        </Link>
      </div>

      {p.loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      )}
      {p.error && <ErrorNote message={p.error} onRetry={() => p.refresh()} />}

      {d && (
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="stagger min-w-0 space-y-8">
            <header className="space-y-2">
              <h1 className="font-display text-4xl font-extrabold tracking-tight">{d.name}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {d.address && (
                  <span className="inline-flex items-center gap-1"><MapPin className="size-4" aria-hidden /> {d.address}</span>
                )}
                {d.property_type && <span className="rounded-full bg-secondary px-2.5 py-0.5 font-medium text-foreground">{d.property_type}</span>}
                {d.capacity && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 font-medium text-foreground">
                    <Users className="size-3.5" aria-hidden /> {d.capacity} guests
                  </span>
                )}
              </div>
            </header>

            <section
              className={`relative isolate overflow-hidden rounded-2xl border bg-card p-6 transition-shadow duration-300 hover:[box-shadow:var(--shadow-lift)] ${
                openCount > 0 ? "card-warn" : d.latest_inspection_id ? "card-ok" : ""
              }`}
              style={{ boxShadow: "var(--shadow-rest)" }}
            >
              <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 -z-10 size-52 rounded-full bg-primary/10 blur-3xl" />
              <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0 space-y-2">
                  <p className={LABEL}>Readiness</p>
                  {d.latest_inspection_id ? (
                    <Link
                      to={withRole(`/inspection/${d.latest_inspection_id}/readiness`)}
                      className="group inline-flex items-center gap-2 font-display text-[clamp(2rem,4vw,3.25rem)] font-extrabold leading-none text-primary"
                    >
                      See report
                      <ArrowRight className="size-[0.7em] transition-transform duration-200 group-hover:translate-x-1.5" aria-hidden />
                    </Link>
                  ) : (
                    <p className="font-display text-[clamp(2rem,4vw,3.25rem)] font-extrabold leading-none text-muted-foreground">
                      No inspection yet
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {openCount > 0
                      ? `${openCount} open case${openCount === 1 ? "" : "s"}`
                      : "Nothing needs you right now."}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
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
              <TabsList className="inline-flex h-auto w-full justify-start gap-1 overflow-x-auto whitespace-nowrap rounded-xl bg-secondary p-1">
                <TabsTrigger className={TRIGGER} value="rooms">Rooms</TabsTrigger>
                <TabsTrigger className={TRIGGER} value="inspections">Inspections</TabsTrigger>
                <TabsTrigger className={TRIGGER} value="cases">
                  Cases
                  {openCount > 0 && (
                    <span className="ml-1.5 rounded-full bg-warn/30 px-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">{openCount}</span>
                  )}
                </TabsTrigger>
                <TabsTrigger className={TRIGGER} value="guests">Guests</TabsTrigger>
                <TabsTrigger className={TRIGGER} value="details">Details</TabsTrigger>
              </TabsList>

              <TabsContent value="rooms" className={PANEL}>
                <div className="min-w-0">
                  <RoomsCard pid={id} rooms={d.rooms} onChanged={() => p.refresh(true)} />
                </div>
              </TabsContent>

              <TabsContent value="inspections" className={PANEL}>
                <div className="min-w-0">
                  <InspectionCard
                    pid={id}
                    recent={insp.data ?? []}
                    role={role}
                    actor={actor}
                    setActor={setActor}
                    hasRooms={d.rooms.length > 0}
                  />
                </div>
              </TabsContent>

              <TabsContent value="cases" className={PANEL}>
                <div className="min-w-0">
                  <Link to={withRole(`/properties/${id}/cases`)} className="block">
                    <Card className={`card-lift flex-row items-center gap-3 p-4 ${openCount > 0 ? "card-warn" : ""}`}>
                      <span className="icon-badge"><FolderOpen className="size-5" aria-hidden /></span>
                      <span className="flex-1 font-display text-lg font-bold">Cases</span>
                      <Pill tone={openCount > 0 ? "danger" : "neutral"}>{openCount} open</Pill>
                      <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                    </Card>
                  </Link>
                </div>
              </TabsContent>

              <TabsContent value="guests" className={`${PANEL} space-y-4`}>
                <div className="min-w-0">
                  <GuestLinkCard token={d.guest_token} />
                </div>
              </TabsContent>

              <TabsContent value="details" className={PANEL}>
                <div className="min-w-0">
                  <DetailsCard
                    key={d.id + (d.rules ?? "")}
                    property={d}
                    onSaved={() => p.refresh(true)}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <aside className="stagger w-full space-y-4 self-start lg:sticky lg:top-6">
            <Card className={`gap-2 p-4 ${openCount > 0 ? "card-warn" : "card-ok"}`}>
              <p className={LABEL}>Needs you</p>
              {openCount > 0 ? (
                <Link
                  to={withRole(`/properties/${id}/cases`)}
                  className="group flex items-center justify-between gap-2 text-sm font-semibold"
                >
                  {openCount} open case{openCount === 1 ? "" : "s"} to look at
                  <ArrowRight className="size-4 text-primary transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">Nothing needs you right now. Nice.</p>
              )}
            </Card>

            <Card className="gap-2 p-4">
              <p className={`${LABEL} mb-1`}>Quick actions</p>
              <Button className="btn-tap w-full" onClick={startAudit} disabled={busy || d.rooms.length === 0}>
                <ClipboardCheck className="size-4" aria-hidden /> {busy ? "Starting…" : "Start inspection"}
              </Button>
              <Button variant="outline" className="btn-tap w-full justify-start" onClick={() => setSendOpen(true)}>
                <Send className="size-4" aria-hidden /> Send to cleaner
              </Button>
              <Button
                variant="outline"
                className="btn-tap w-full justify-start"
                onClick={() => copyText(`${window.location.origin}/g/${d.guest_token}`, "Guest link copied")}
              >
                <QrCode className="size-4" aria-hidden /> Guest link
              </Button>
              <Button
                variant="outline"
                className="btn-tap w-full justify-start"
                onClick={startAudit}
                disabled={busy || d.rooms.length === 0}
              >
                <ScanSearch className="size-4 text-info" aria-hidden /> Start AI video check
              </Button>
            </Card>

            <Card className="gap-3 p-4">
              <p className={LABEL}>Guest QR</p>
              <div className="flex justify-center">
                <div className="grid size-[148px] place-items-center rounded-xl bg-white p-3 shadow-sm transition-transform duration-300 hover:scale-105">
                  {d?.guest_token ? (
                    <QRCodeSVG value={`${window.location.origin}/g/${d.guest_token}`} size={120} />
                  ) : (
                    <Skeleton className="h-[120px] w-[120px]" />
                  )}
                </div>
              </div>
            </Card>
          </aside>
        </div>
      )}

      <SendToCleanerSheet
        open={sendOpen}
        onOpenChange={setSendOpen}
        propertyId={id}
        auditId={d?.latest_audit_id}
      />
    </div>
  );
}