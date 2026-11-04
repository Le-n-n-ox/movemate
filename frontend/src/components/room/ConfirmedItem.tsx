import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { conditionTone } from "@/lib/labels";
import type { ItemOut, RoomOut } from "@/lib/types";
import { Pill } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ItemDetails } from "./ItemDetails";
import { ItemThumb } from "./ItemThumb";

export function ConfirmedItem({ item, places, actor, onChanged }: {
  item: ItemOut; places: RoomOut[]; actor: string; onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="gap-0 p-3">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="grid min-h-14 w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-3 text-left sm:grid-cols-[auto_minmax(0,1fr)_auto]">
        <ItemThumb item={item} className="col-start-1 row-start-1 size-12" />
        <div className="col-span-2 row-start-2 min-w-0 break-words sm:col-span-1 sm:col-start-2 sm:row-start-1">
          <p className="break-words font-medium" title={item.label}>{item.label} <span className="text-muted-foreground">×{item.quantity}</span></p>
          <p className="break-words text-xs text-muted-foreground">
            {item.location_path ?? "Anywhere in the room"}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            <Pill tone={conditionTone[item.condition]}>{item.condition.replace("_", " ")}</Pill>
            {item.kind !== "movable" && <Pill>{item.kind}</Pill>}
            {item.high_value && <Pill tone="info">High value</Pill>}
            {item.availability === "staff_only" && <Pill tone="info">Staff only</Pill>}
          </div>
        </div>
        <ChevronDown className={cn("col-start-2 row-start-1 mt-1 size-5 shrink-0 justify-self-end transition-transform sm:col-start-3", open && "rotate-180")} aria-hidden />
      </button>
      {open && <ItemDetails item={item} places={places} actor={actor} onChanged={onChanged} />}
    </Card>
  );
}