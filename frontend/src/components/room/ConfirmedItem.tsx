import { useState } from "react";
import { ChevronDown, Package } from "lucide-react";
import { conditionTone } from "@/lib/labels";
import type { ItemOut, RoomOut } from "@/lib/types";
import { Pill } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ItemDetails } from "./ItemDetails";

const NEEDS_ATTENTION = ["damaged", "missing", "under_repair"];

export function ConfirmedItem({ item, places, actor, onChanged }: {
  item: ItemOut; places: RoomOut[]; actor: string; onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card className={cn("gap-0 p-3", NEEDS_ATTENTION.includes(item.condition) && "card-warn", open && "shadow-md")}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex min-h-14 w-full items-center gap-3 text-left">
        {item.crop_url
          ? <img src={item.crop_url} alt={item.label} className="size-14 shrink-0 rounded-xl border object-cover" />
          : <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground" aria-hidden><Package className="size-6" /></div>}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold">
            {item.label} <span className="font-sans font-medium text-muted-foreground">×{item.quantity}</span>
          </p>
          <p className="truncate text-xs text-muted-foreground">{item.location_path ?? "Anywhere in the room"}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <Pill tone={conditionTone[item.condition]}>{item.condition.replace("_", " ")}</Pill>
            {item.kind !== "movable" && <Pill>{item.kind}</Pill>}
            {item.high_value && <Pill tone="info">High value</Pill>}
            {item.availability === "staff_only" && <Pill tone="info">Staff only</Pill>}
          </div>
        </div>
        <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180 text-primary")} aria-hidden />
      </button>
      {open && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <ItemDetails item={item} places={places} actor={actor} onChanged={onChanged} />
        </div>
      )}
    </Card>
  );
}