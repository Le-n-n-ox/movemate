import { useEffect, useRef, useState } from "react";
import { Check, Copy, Share2, Smartphone, TriangleAlert } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildCleanerLink, isLocalhostOrigin } from "@/lib/links";

const KIND_LABEL = { inspection: "Inspection", audit: "AI video check", case: "Case" } as const;
const CORNER = "absolute size-6 border-primary";

export function ShareLinkSheet({
  open,
  onOpenChange,
  kind,
  id,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: "inspection" | "audit" | "case";
  id: string;
}) {
  const url = buildCleanerLink(kind, id);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const local = isLocalhostOrigin(appOriginSafe());

  // clear the "Copied" timer if the sheet unmounts
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function flash() {
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  }

  function copy() {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(flash).catch(() => window.prompt("Copy this link:", url));
    } else {
      window.prompt("Copy this link:", url);
    }
  }

  async function share() {
    if (navigator.share) {
      try { await navigator.share({ url, title: "MoveMate cleaner link" }); } catch { /* user cancelled */ }
    } else {
      copy();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="card-title">
            <span className="icon-badge tile"><Share2 className="size-5" aria-hidden /></span>
            <span>
              Send to cleaner
              <span className="block text-sm font-normal text-muted-foreground">{KIND_LABEL[kind]} link</span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          {local && (
            <div className="warn-box flex items-start gap-2.5">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
              <p>
                This link only works on this computer. To open it on a phone, run the app with your computer's network address (see README).
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="share-url" className="text-sm font-semibold">Link</label>
            <Input
              id="share-url" readOnly value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="h-12 bg-secondary font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              className={`btn-tap transition-colors ${copied ? "bg-ok text-white hover:bg-ok" : ""}`}
              onClick={copy} aria-live="polite"
            >
              {copied
                ? <><Check className="pop mr-2 size-4" aria-hidden /> Copied</>
                : <><Copy className="mr-2 size-4" aria-hidden /> Copy</>}
            </Button>
            <Button variant="outline" className="btn-tap" onClick={share}>
              <Share2 className="mr-2 size-4" aria-hidden /> Share
            </Button>
          </div>

          <div className="space-y-2 border-t pt-4">
            <div className="pop relative mx-auto w-fit rounded-2xl bg-white p-5" style={{ boxShadow: "var(--shadow-lift)" }}>
              <span className={`${CORNER} left-1.5 top-1.5 rounded-tl-lg border-l-4 border-t-4`} aria-hidden />
              <span className={`${CORNER} right-1.5 top-1.5 rounded-tr-lg border-r-4 border-t-4`} aria-hidden />
              <span className={`${CORNER} bottom-1.5 left-1.5 rounded-bl-lg border-b-4 border-l-4`} aria-hidden />
              <span className={`${CORNER} bottom-1.5 right-1.5 rounded-br-lg border-b-4 border-r-4`} aria-hidden />
              <QRCodeSVG value={url} size={140} title="QR code for the cleaner link" />
            </div>
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <Smartphone className="size-3.5" aria-hidden /> The cleaner can scan this QR code from your screen.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function appOriginSafe() {
  try { return (import.meta as any).env?.VITE_APP_URL || (import.meta as any).env?.NEXT_PUBLIC_APP_URL || window.location.origin; } catch { return window.location.origin; }
}