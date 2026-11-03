import { useEffect, useState } from "react";
import { Check, ClipboardCheck, Copy, ScanSearch, Send, type LucideIcon } from "lucide-react";
import { api } from "@/lib/api";
import { copyText } from "@/lib/labels";
import { buildCleanerLink } from "@/lib/links";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { InspectionOut } from "@/lib/types";

const kindName = (k: InspectionOut["kind"]) =>
  k === "after_checkout" ? "After checkout" : k === "after_cleaning" ? "After cleaning" : "Before check-in";

function LinkRow({ icon: Icon, tone, title, sub, copied, onCopy }: {
  icon: LucideIcon; tone: string; title: string; sub?: string; copied: boolean; onCopy: () => void;
}) {
  return (
    <div className="row-link justify-between">
      <span className={`icon-badge ${tone}`}><Icon className="size-5" aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display font-bold">{title}</p>
        {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
      </div>
      <Button
        size="sm"
        variant={copied ? "outline" : "default"}
        className={`btn-tap min-w-[7rem] ${copied ? "border-ok/50 text-ok" : ""}`}
        onClick={onCopy}
        aria-live="polite"
      >
        {copied ? <><Check className="pop size-4" aria-hidden /> Copied</> : <><Copy className="size-4" aria-hidden /> Copy link</>}
      </Button>
    </div>
  );
}

export function SendToCleanerSheet({ open, onOpenChange, propertyId, auditId }: { open: boolean; onOpenChange: (v: boolean) => void; propertyId: string; auditId?: string | null }) {
  const [insps, setInsps] = useState<InspectionOut[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setInsps(null); setErr(null); setCopied(null);
    api.listInspections(propertyId)
      .then((d) => setInsps(d.filter((i) => i.status !== "completed")))
      .catch((e) => setErr(e?.message ?? "Failed"));
  }, [open, propertyId]);

  function copy(key: string, kind: "audit" | "inspection", id: string) {
    copyText(buildCleanerLink(kind, id), "Cleaner link copied");
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
  }

  const empty = insps !== null && insps.length === 0 && !auditId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="card-title">
            <span className="icon-badge tile"><Send className="size-5" aria-hidden /></span> Send to cleaner
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Copy a link and send it to your cleaner. They open it on their phone.</p>

        <div className="mt-2 space-y-3">
          {insps === null && !err && (
            <div className="space-y-2" role="status" aria-label="Loading">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          )}
          {err && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{err}</p>}

          {empty && (
            <div className="hint-box">
              Start an AI video check or inspection first, then send its link to the cleaner.
            </div>
          )}

          <div className="stagger space-y-3">
            {auditId && (
              <LinkRow
                icon={ScanSearch} tone="bg-info/15 text-info"
                title="AI video check" sub="Latest check"
                copied={copied === "audit"} onCopy={() => copy("audit", "audit", auditId)}
              />
            )}
            {insps && insps.map((i) => (
              <LinkRow
                key={i.id}
                icon={ClipboardCheck} tone=""
                title={kindName(i.kind)} sub={i.reservation_ref ?? undefined}
                copied={copied === i.id} onCopy={() => copy(i.id, "inspection", i.id)}
              />
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground">Ask the host to start an inspection first if none are listed.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}