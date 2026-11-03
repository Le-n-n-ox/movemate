import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { copyText } from "@/lib/labels";
import { buildCleanerLink } from "@/lib/links";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { InspectionOut } from "@/lib/types";

export function SendToCleanerSheet({ open, onOpenChange, propertyId, auditId }: { open: boolean; onOpenChange: (v: boolean) => void; propertyId: string; auditId?: string | null }) {
  const [insps, setInsps] = useState<InspectionOut[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setInsps(null); setErr(null);
    api.listInspections(propertyId)
      .then((d) => setInsps(d.filter((i) => i.status !== "completed")))
      .catch((e) => setErr(e?.message ?? "Failed"));
  }, [open, propertyId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader><DialogTitle>Send to cleaner</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-4">
          {insps === null && !err && <p className="text-sm text-muted-foreground">Loading…</p>}
          {err && <p className="text-sm text-destructive">{err}</p>}
          {insps && insps.length === 0 && !auditId && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Start an AI video check or inspection first, then send its link to the cleaner.</p>
            </div>
          )}
          {auditId && (
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div className="min-w-0">
                <p className="font-medium text-sm">AI video check</p>
                <p className="text-xs text-muted-foreground">Latest check</p>
              </div>
              <Button size="sm" className="btn-tap" onClick={() => copyText(buildCleanerLink("audit", auditId), "Cleaner link copied")}>
                Copy link
              </Button>
            </div>
          )}
          {insps && insps.map((i) => (
            <div key={i.id} className="flex items-center justify-between rounded-xl border p-3">
              <div className="min-w-0">
                <p className="font-medium text-sm">{i.kind === "after_checkout" ? "After checkout" : i.kind === "after_cleaning" ? "After cleaning" : "Before check-in"}</p>
                <p className="text-xs text-muted-foreground">{i.reservation_ref ?? ""}</p>
              </div>
              <Button size="sm" className="btn-tap" onClick={() => copyText(buildCleanerLink("inspection", i.id), "Cleaner link copied")}>
                Copy link
              </Button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground text-center">Ask the host to start an inspection first if none are listed.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
