import { useState } from "react";
import { Pencil } from "lucide-react";
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
    return (
      <Card className="gap-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Details and house rules</h2>
          <Button variant="ghost" onClick={() => setEdit(true)} className="btn-tap"><Pencil className="size-4" /> Edit</Button>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div><dt className="text-muted-foreground">Type</dt><dd>{p.property_type || "Not set"}</dd></div>
          <div><dt className="text-muted-foreground">Guests</dt><dd>{p.capacity ?? "Not set"}</dd></div>
          <div className="col-span-2"><dt className="text-muted-foreground">Address</dt><dd>{p.address || "Not set"}</dd></div>
        </dl>
        {p.details && <p className="text-sm">{p.details}</p>}
        <div className="rounded-lg bg-secondary p-3 text-sm">
          <p className="mb-1 font-medium">House rules (guests see this)</p>
          <p className="whitespace-pre-wrap">{p.rules || "No rules yet. Tap Edit to add them."}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="gap-3 p-4">
      <h2 className="text-lg font-semibold">Edit details</h2>
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