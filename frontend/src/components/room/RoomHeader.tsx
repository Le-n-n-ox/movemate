import { useState } from "react";
import { Camera, ImagePlus, Printer } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { RoomOut } from "@/lib/types";
import { FilePicker } from "@/components/FilePicker";
import { AnchorButton } from "@/components/LinkButton";
import { Card } from "@/components/ui/card";

export function RoomHeader({ room, onChanged }: { room: RoomOut; onChanged: () => void }) {
    const [busy, setBusy] = useState(false);

    async function upload(f: File) {
        setBusy(true);
        try { await api.uploadRoomPhoto(room.id, f); toast.success("Room photo saved"); onChanged(); }
        catch (e) { toast.error((e as Error).message); }
        finally { setBusy(false); }
    }

    return (
        <Card className="gap-3 overflow-hidden p-0">
            {room.reference_photo_url ? (
                <div className="relative">
                    <img src={room.reference_photo_url} alt={`${room.name} reference`} className="aspect-[16/10] w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-12">
                        <p className="font-display text-xl font-extrabold text-white">{room.name}</p>
                    </div>
                </div>
            ) : (
                <div className="m-4 mb-0 grid place-items-center gap-2 rounded-xl border-2 border-dashed bg-muted/60 p-6 text-center">
                    <span className="icon-badge icon-badge-lg"><ImagePlus className="size-6" aria-hidden /></span>
                    <p className="max-w-xs text-sm text-muted-foreground">
                        No room photo yet. One wide photo helps your cleaner see how it should look.
                    </p>
                </div>
            )}
            <div className="grid grid-cols-2 gap-3 p-4 pt-1">
                <FilePicker
                    kind="image" busy={busy} icon={<Camera className="size-5" />}
                    label={room.reference_photo_url ? "Replace photo" : "Add room photo"} onFile={upload}
                />
                <AnchorButton variant="outline" href={api.roomSheetUrl(room.id)}>
                    <Printer className="size-5" /> Print sheet
                </AnchorButton>
            </div>
        </Card>
    );
}