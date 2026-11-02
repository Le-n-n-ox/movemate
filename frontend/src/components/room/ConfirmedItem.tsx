import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { conditionTone } from "@/lib/labels";
import type { ItemOut, RoomOut } from "@/lib/types";
import { Pill } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ItemDetails } from "./ItemDetails";

export function ConfirmedItem({ item, places, actor, onChanged }: {
  item: ItemOut; places: RoomOut[]; actor: string; onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="gap-0 p-3">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex min-h-14 w-full items-center gap-3 text-left">
        {item.crop_url
          ? <img src={item.crop_url} alt={item.label} className="size-12 shrink-0 rounded-md object-cover" />
          : <div className="size-12 shrink-0 rounded-md bg-muted" aria-hidden />}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{item.label} <span className="text-muted-foreground">×{item.quantity}</span></p>
          <p className="truncate text-xs text-muted-foreground">{item.location_path ?? "Anywhere in the room"}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <Pill tone={conditionTone[item.condition]}>{item.condition.replace("_", " ")}</Pill>
            {item.kind !== "movable" && <Pill>{item.kind}</Pill>}
            {item.high_value && <Pill tone="warn">High value</Pill>}
            {item.availability === "staff_only" && <Pill tone="info">Staff only</Pill>}
          </div>
        </div>
        <ChevronDown className={cn("size-5 shrink-0 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && <ItemDetails item={item} places={places} actor={actor} onChanged={onChanged} />}
    </Card>
  );
}