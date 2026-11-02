import { useState } from "react";
import { Camera, Printer } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { RoomOut } from "@/lib/types";
import { FilePicker } from "@/components/FilePicker";
import { Button } from "@/components/ui/button";
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
    <Card className="gap-3 p-4">
      {room.reference_photo_url ? (
        <img src={room.reference_photo_url} alt={`${room.name} reference`} className="w-full rounded-lg" />
      ) : (
        <p className="rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">
          No room photo yet. One wide photo helps your cleaner see how it should look.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <FilePicker
          kind="image" busy={busy} icon={<Camera className="size-5" />}
          label={room.reference_photo_url ? "Replace photo" : "Add room photo"} onFile={upload}
        />
        <Button variant="outline" className="btn-tap" asChild>
          <a href={api.roomSheetUrl(room.id)} target="_blank" rel="noreferrer">
            <Printer className="size-5" /> Print sheet
          </a>
        </Button>
      </div>
    </Card>
  );
}