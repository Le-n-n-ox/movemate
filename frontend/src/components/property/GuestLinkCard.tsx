import { Copy, ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { copyText } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AnchorButton } from "@/components/LinkButton";

export function GuestLinkCard({ token }: { token: string }) {
    const link = `${window.location.origin}/g/${token}`;
    return (
        <Card className="gap-3 p-4">
            <h2 className="text-lg font-semibold">Guest link</h2>
            <p className="text-sm text-muted-foreground">Guests scan this to get help with an appliance. No login needed.</p>
            <div className="flex justify-center rounded-lg bg-white p-4">
                <QRCodeSVG value={link} size={160} title="QR code for the guest link" />
            </div>
            <p className="break-all rounded-md bg-muted p-2 text-xs">{link}</p>
            <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="btn-tap" onClick={() => copyText(link)}><Copy className="size-4" /> Copy link</Button>
                <AnchorButton variant="outline" href={link}>
                    <ExternalLink className="size-4" /> Open
                </AnchorButton>
            </div>
            <Button variant="ghost" className="no-print btn-tap" onClick={() => window.print()}>Print QR code</Button>
        </Card>
    );
}