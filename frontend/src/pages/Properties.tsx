import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, ChevronRight, FlaskConical, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { Shell, ErrorNote, EmptyState, Pill } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AppearanceCard } from "@/components/AppearanceCard";
import { useRole } from "@/hooks/useRole";

export default function Properties() {
  const nav = useNavigate();
  const { role, withRole } = useRole();
  const list = useAsync(api.listProperties);
  const health = useAsync(api.health);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: "", address: "", property_type: "", capacity: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) return toast.error("Please give the property a name.");
    setBusy(true);
    try {
      const p = await api.createProperty({
        name: f.name.trim(),
        address: f.address.trim() || undefined,
        property_type: f.property_type.trim() || undefined,
        capacity: f.capacity ? Number(f.capacity) : undefined,
      });
      toast.success("Property created");
      nav(withRole(`/properties/${p.id}`));
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }

  async function seed() {
    setBusy(true);
    try {
      const r = await api.seed();
      toast.success("Demo data loaded");
      nav(withRole(`/properties/${r.property_id}`));
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <Shell
      title="MoveMate"
      right={health.data?.mock_models ? <Pill tone="warn">Demo mode</Pill> : undefined}
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="max-w-prose text-lg text-muted-foreground">
            Know what should be there, check it, and see clearly if your home is ready for the next guest.
          </p>
          <p className="role-chip">
            <span className="size-2 rounded-full bg-primary" aria-hidden />
            Viewing as <strong>{role}</strong>
            <Link to="/" className="font-semibold text-primary underline underline-offset-4">Switch role</Link>
          </p>
        </div>

        <section aria-label="Your properties" className="space-y-3">
          <h2 className="card-title">
            <span className="icon-badge"><Building2 className="size-5" aria-hidden /></span>
            Your properties
            {list.data && list.data.length > 0 && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-sm font-semibold text-accent-foreground">{list.data.length}</span>
            )}
          </h2>
          {list.loading && [0, 1].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          {list.error && <ErrorNote message={list.error} onRetry={() => list.refresh()} />}
          {!list.loading && !list.error && list.data?.length === 0 && (
            <EmptyState icon={<Building2 className="size-8" />} title="No properties yet" hint="Add your first home below." />
          )}
          <div className="stagger space-y-3">
            {list.data?.map((p) => (
              <Link key={p.id} to={withRole(`/properties/${p.id}`)} className="row-link p-4">
                <span className="icon-badge icon-badge-lg tile" aria-hidden>{p.name.charAt(0).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-lg font-bold">{p.name}</span>
                  <span className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                    {p.property_type && <span>{p.property_type}</span>}
                    {p.capacity && <span className="inline-flex items-center gap-1"><Users className="size-4" aria-hidden />{p.capacity} guests</span>}
                    {p.address && <span className="truncate">{p.address}</span>}
                  </span>
                </span>
                <ChevronRight className="row-chevron size-5 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            ))}
          </div>
        </section>

        <Card className="card-lift p-4">
          <form onSubmit={create} className="space-y-3">
            <h2 className="card-title"><span className="icon-badge"><Plus className="size-5" aria-hidden /></span> Add a property</h2>
            <div className="space-y-1.5"><Label htmlFor="name">Name</Label>
              <Input id="name" value={f.name} onChange={set("name")} placeholder="Beach flat" className="h-12" required /></div>
            <div className="space-y-1.5"><Label htmlFor="address">Address</Label>
              <Input id="address" value={f.address} onChange={set("address")} className="h-12" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label htmlFor="type">Type</Label>
                <Input id="type" value={f.property_type} onChange={set("property_type")} placeholder="Apartment" className="h-12" /></div>
              <div className="space-y-1.5"><Label htmlFor="cap">Guests</Label>
                <Input id="cap" type="number" inputMode="numeric" min={1} value={f.capacity} onChange={set("capacity")} className="h-12" /></div>
            </div>
            <Button type="submit" disabled={busy} className="btn-tap w-full"><Plus className="size-5" /> Create property</Button>
          </form>
        </Card>

        {health.data && (
          <Button variant="outline" onClick={seed} disabled={busy} className="btn-tap w-full">
            <FlaskConical className="size-5" /> Load demo data (dev)
          </Button>
        )}

        <AppearanceCard />
      </div>
    </Shell>
  );
}