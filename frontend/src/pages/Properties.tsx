import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, FlaskConical, Plus, Users, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { useRole } from "@/hooks/useRole";
import { Shell, ErrorNote, EmptyState, Pill } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AppearanceCard } from "@/components/AppearanceCard";

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
      {role === "cleaner" && (
        <div className="flex min-h-12 items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm font-medium">
          <Building2 className="size-5 text-primary shrink-0" aria-hidden />
          <span>Viewing as cleaner. Open a task link from your host to start.</span>
        </div>
      )}
      <p className="text-muted-foreground">
        Know what should be there, check it, and see clearly if your home is ready for the next guest.
      </p>
      <p className="text-sm text-muted-foreground">
        Viewing as <strong>{role}</strong>.{" "}
        <Link to="/" className="text-primary underline font-medium">Switch role</Link>
      </p>

      <section aria-label="Your properties" className="space-y-4">
        {list.loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        )}
        {list.error && <ErrorNote message={list.error} onRetry={() => list.refresh()} />}
        {!list.loading && !list.error && list.data?.length === 0 && (
          <EmptyState icon={<Building2 className="size-8" />} title="No properties yet" hint="Add your first home below." />
        )}
        {!list.loading && !list.error && list.data?.map((p) => (
          <Link key={p.id} to={withRole(`/properties/${p.id}`)} className="block">
            <Card className="row-link">
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-xl bg-accent text-accent-foreground shrink-0">
                  <Building2 className="size-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold truncate">{p.name}</p>
                  <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                    {p.property_type && <span>{p.property_type}</span>}
                    {p.capacity && <span className="inline-flex items-center gap-1"><Users className="size-4" aria-hidden />{p.capacity} guests</span>}
                    {p.address && <span>{p.address}</span>}
                  </p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              </div>
            </Card>
          </Link>
        ))}
      </section>

      {role === "host" && (
        <section className="space-y-4">
          <Card className="p-4">
            <form onSubmit={create} className="space-y-3">
              <h2 className="text-lg font-semibold">Add a property</h2>
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
        </section>
      )}

      <AppearanceCard />
    </Shell>
  );
}
