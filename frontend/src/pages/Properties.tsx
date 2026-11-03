import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Building2, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { useRole } from "@/hooks/useRole";
import { Shell, ErrorNote, EmptyState } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function Properties() {
  const nav = useNavigate();
  const { role, withRole } = useRole();
  if (role === "cleaner") return <Navigate to="/cleaner?role=cleaner" replace />;
  const list = useAsync(api.listProperties);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", address: "", property_type: "", capacity: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) return toast.error("Please give the property a name.");
    setBusy(true);
    try {
      const p = await api.createProperty({ name: f.name.trim(), address: f.address.trim() || undefined, property_type: f.property_type.trim() || undefined, capacity: f.capacity ? Number(f.capacity) : undefined });
      toast.success("Property created");
      setOpen(false);
      setF({ name: "", address: "", property_type: "", capacity: "" });
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

  const props = list.data ?? [];
  const needsAttention = props.filter((p: any) => p.open_discrepancies > 0).length;
  const total = props.length;

  return (
    <Shell title="Properties">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Properties</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} {total === 1 ? "property" : "properties"}
            {needsAttention > 0 && <>, <span className="font-medium text-info">{needsAttention} need{needsAttention === 1 ? "s" : ""} attention</span></>}
          </p>
        </div>
        {role === "host" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger><Button className="btn-tap"><Plus className="size-4" /> Add property</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add a property</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-3">
                <div className="space-y-1.5"><Label htmlFor="name">Name</Label><Input id="name" value={f.name} onChange={set("name")} placeholder="Beach flat" className="h-12" required /></div>
                <div className="space-y-1.5"><Label htmlFor="address">Address</Label><Input id="address" value={f.address} onChange={set("address")} className="h-12" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label htmlFor="type">Type</Label><Input id="type" value={f.property_type} onChange={set("property_type")} placeholder="Apartment" className="h-12" /></div>
                  <div className="space-y-1.5"><Label htmlFor="cap">Guests</Label><Input id="cap" type="number" inputMode="numeric" min={1} value={f.capacity} onChange={set("capacity")} className="h-12" /></div>
                </div>
                <Button type="submit" disabled={busy} className="btn-tap w-full">Create property</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {list.loading && (
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0,1,2].map(i => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
        </div>
      )}
      {list.error && <ErrorNote message={list.error} onRetry={() => list.refresh()} />}
      {!list.loading && !list.error && props.length === 0 && (
        <EmptyState icon={<Building2 className="size-8" />} title="No properties yet" hint="Add your first home to get started." />
      )}
      {!list.loading && !list.error && props.length > 0 && (
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3 auto-rows-[220px]">
          {props.map((p: any, i: number) => {
            const feature = i === 0 && (p.open_discrepancies > 0);
            return (
              <Link key={p.id} to={withRole(`/properties/${p.id}`)} className={`group block ${feature ? "md:col-span-2" : ""}`}>
                <div className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md">
                  <div className={`relative bg-muted ${feature ? "h-40" : "h-28"}`}>
                    {p.cover_photo ? (
                      <img src={p.cover_photo} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground"><Building2 className="size-8" /></div>
                    )}
                    {p.open_discrepancies > 0 && (
                      <span className="absolute left-3 top-3 rounded-full bg-card/95 px-3 py-1 text-xs font-semibold text-foreground shadow-sm">
                        {p.open_discrepancies} open cases
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <p className="font-display text-lg font-semibold">{p.name}</p>
                      {p.address && <p className="text-sm text-muted-foreground truncate">{p.address}</p>}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {p.property_type && <span className="rounded-full bg-secondary px-2 py-0.5">{p.property_type}</span>}
                      {p.capacity && <span className="rounded-full bg-secondary px-2 py-0.5">{p.capacity} guests</span>}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {role === "host" && props.length === 0 && (
        <div className="mt-6 flex justify-center">
          <button type="button" onClick={seed} disabled={busy} className="text-sm text-muted-foreground hover:text-foreground underline">
            Load demo data (dev)
          </button>
        </div>
      )}
    </Shell>
  );
}
