import { Copy, ExternalLink, Printer, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { copyText } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AnchorButton } from "@/components/LinkButton";

const CORNER = "absolute size-6 border-primary";

export function GuestLinkCard({ token }: { token: string }) {
    const link = `${window.location.origin}/g/${token}`;
    return (
        <Card className="gap-4 p-4">
            <h2 className="card-title">
                <span className="icon-badge"><QrCode className="size-5" aria-hidden /></span> Guest link
            </h2>
            <p className="text-sm text-muted-foreground">Guests scan this to get help with an appliance. No login needed.</p>
            <div className="pop relative mx-auto rounded-2xl bg-white p-6" style={{ boxShadow: "var(--shadow-lift)" }}>
                <span className={`${CORNER} left-2 top-2 rounded-tl-lg border-l-4 border-t-4`} aria-hidden />
                <span className={`${CORNER} right-2 top-2 rounded-tr-lg border-r-4 border-t-4`} aria-hidden />
                <span className={`${CORNER} bottom-2 left-2 rounded-bl-lg border-b-4 border-l-4`} aria-hidden />
                <span className={`${CORNER} bottom-2 right-2 rounded-br-lg border-b-4 border-r-4`} aria-hidden />
                <QRCodeSVG value={link} size={120} title="QR code for the guest link" />
            </div>
            <p className="break-all rounded-lg border bg-muted p-2.5 text-center font-mono text-xs">{link}</p>
            <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="btn-tap" onClick={() => copyText(link)}><Copy className="size-4" /> Copy link</Button>
                <AnchorButton variant="outline" href={link}>
                    <ExternalLink className="size-4" /> Open
                </AnchorButton>
            </div>
            <Button variant="ghost" className="no-print btn-tap" onClick={() => window.print()}>
                <Printer className="size-4" /> Print QR code
            </Button>
        </Card>
    );
}