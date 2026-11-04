import { useState } from "react";
import { Building2, Home, MapPin, Pencil, ScrollText, Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { PropertyOut } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function DetailsCard({ property: p, onSaved }: { property: PropertyOut; onSaved: () => void }) {
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    address: p.address ?? "", property_type: p.property_type ?? "", capacity: p.capacity?.toString() ?? "",
    details: p.details ?? "", rules: p.rules ?? "",
  });
  const on = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function save() {
    setBusy(true);
    try {
      await api.patchProperty(p.id, {
        address: f.address, property_type: f.property_type, details: f.details, rules: f.rules,
        capacity: f.capacity ? Number(f.capacity) : undefined,
      });
      toast.success("Saved");
      setEdit(false);
      onSaved();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  if (!edit) {
    const facts = [
      { Icon: Building2, label: "Type", value: p.property_type, wide: false },
      { Icon: Users, label: "Guests", value: p.capacity, wide: false },
      { Icon: MapPin, label: "Address", value: p.address, wide: true },
    ];
    return (
      <Card className="gap-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="card-title">
            <span className="icon-badge"><Home className="size-5" aria-hidden /></span> Details and house rules
          </h2>
          <Button variant="ghost" onClick={() => setEdit(true)} className="btn-tap"><Pencil className="size-4" /> Edit</Button>
        </div>
        <dl className="stagger grid grid-cols-2 gap-2 text-sm">
          {facts.map(({ Icon, label, value, wide }) => (
            <div key={label} className={`flex items-start gap-3 rounded-xl border bg-card p-3 ${wide ? "col-span-2" : ""}`}>
              <span className="icon-badge size-8"><Icon className="size-4" aria-hidden /></span>
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="break-words font-medium">
                  {value || <span className="font-normal text-muted-foreground">Not set</span>}
                </dd>
              </div>
            </div>
          ))}
        </dl>
        {p.details && <p className="text-sm">{p.details}</p>}
        <div className="rounded-lg border-l-4 border-primary bg-secondary p-3 text-sm">
          <p className="mb-1 flex items-center gap-2 font-semibold">
            <ScrollText className="size-4 text-primary" aria-hidden /> House rules
            <span className="text-xs font-normal text-muted-foreground">(guests see this)</span>
          </p>
          <p className="whitespace-pre-wrap">{p.rules || "No rules yet. Tap Edit to add them."}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="card-info gap-3 p-4">
      <h2 className="card-title">
        <span className="icon-badge"><Pencil className="size-5" aria-hidden /></span> Edit details
      </h2>
      <div className="space-y-1.5"><Label htmlFor="d-addr">Address</Label><Input id="d-addr" className="h-12" value={f.address} onChange={on("address")} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label htmlFor="d-type">Type</Label><Input id="d-type" className="h-12" value={f.property_type} onChange={on("property_type")} /></div>
        <div className="space-y-1.5"><Label htmlFor="d-cap">Guests</Label><Input id="d-cap" type="number" inputMode="numeric" min={1} className="h-12" value={f.capacity} onChange={on("capacity")} /></div>
      </div>
      <div className="space-y-1.5"><Label htmlFor="d-det">Details</Label><Textarea id="d-det" rows={3} value={f.details} onChange={on("details")} /></div>
      <div className="space-y-1.5"><Label htmlFor="d-rules">House rules</Label><Textarea id="d-rules" rows={5} value={f.rules} onChange={on("rules")} placeholder="Quiet hours after 10pm. No parties." /></div>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="btn-tap" onClick={() => setEdit(false)} disabled={busy}>Cancel</Button>
        <Button className="btn-tap" onClick={save} disabled={busy}>{busy ? "Saving..." : "Save"}</Button>
      </div>
    </Card>
  );
}