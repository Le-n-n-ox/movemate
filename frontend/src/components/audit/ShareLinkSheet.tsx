import { useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildCleanerLink, isLocalhostOrigin } from "@/lib/links";

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
  const local = isLocalhostOrigin(appOriginSafe());

  function copy() {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
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
          <DialogTitle>Send to cleaner</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <Input readOnly value={url} className="text-xs" />
          {local && (
            <div className="notice-warn">
              This link only works on this computer. To open it on a phone, run the app with your computer's network address (see README).
            </div>
          )}
          <div className="flex gap-2">
            <Button className="btn-tap flex-1" onClick={copy}>
              <Copy className="size-4 mr-2" /> {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="outline" className="btn-tap flex-1" onClick={share}>
              <Share2 className="size-4 mr-2" /> Share
            </Button>
          </div>
          <div className="qr-surface flex justify-center rounded-xl p-3">
            <QRCodeSVG value={url} size={140} />
          </div>
          <p className="text-xs text-muted-foreground text-center">The cleaner can scan this QR code from your screen.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function appOriginSafe() {
  try { return (import.meta as any).env?.VITE_APP_URL || (import.meta as any).env?.NEXT_PUBLIC_APP_URL || window.location.origin; } catch { return window.location.origin; }
}
