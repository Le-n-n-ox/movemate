import { createElement } from "react";
import {
  Armchair,
  Bath,
  BedDouble,
  BookOpen,
  Camera,
  Clock,
  Coffee,
  Flower2,
  KeyRound,
  Lamp,
  Microwave,
  Package,
  Plug,
  Radio,
  Refrigerator,
  Sparkles,
  Speaker,
  Table,
  TreePine,
  Tv,
  UtensilsCrossed,
  WashingMachine,
  Wine,
  type LucideIcon,
} from "lucide-react";
import { mediaUrl } from "@/lib/api";
import type { ItemOut } from "@/lib/types";
import { cn } from "@/lib/utils";

const LABEL_ICONS: { match: RegExp; Icon: LucideIcon }[] = [
  { match: /remote|controller/, Icon: Radio },
  { match: /speaker|soundbar|audio|alexa|echo/, Icon: Speaker },
  { match: /tv|television|monitor|screen|projector/, Icon: Tv },
  { match: /lamp|light|bulb|sconce/, Icon: Lamp },
  { match: /sofa|couch|armchair|recliner|chair|stool/, Icon: Armchair },
  { match: /table|desk|counter|nightstand/, Icon: Table },
  { match: /bed|mattress|pillow/, Icon: BedDouble },
  { match: /towel|linen|sheet|blanket|robe/, Icon: Bath },
  { match: /coffee|espresso|kettle|teapot/, Icon: Coffee },
  { match: /wine|glass|cup|mug|bottle|pitcher/, Icon: Wine },
  { match: /plate|bowl|dish|cutlery|utensil|pan|pot|kitchenware/, Icon: UtensilsCrossed },
  { match: /fridge|refrigerator|freezer/, Icon: Refrigerator },
  { match: /oven|stove|microwave|cooker|toaster/, Icon: Microwave },
  { match: /washer|washing|dryer|laundry/, Icon: WashingMachine },
  { match: /plant|flower|vase|leaf/, Icon: Flower2 },
  { match: /key|lock/, Icon: KeyRound },
  { match: /book|magazine|guide/, Icon: BookOpen },
  { match: /camera/, Icon: Camera },
  { match: /clock|alarm|timer/, Icon: Clock },
];

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  furniture: Armchair,
  appliance: Plug,
  electronics: Tv,
  kitchen: UtensilsCrossed,
  kitchenware: UtensilsCrossed,
  decor: Flower2,
  linen: Bath,
  textile: Bath,
  bathroom: Bath,
  lighting: Lamp,
  outdoor: TreePine,
};

function iconFor(item: ItemOut): LucideIcon {
  const text = `${item.label} ${item.category ?? ""}`.toLowerCase();
  return (
    LABEL_ICONS.find((rule) => rule.match.test(text))?.Icon ??
    CATEGORY_ICONS[(item.category ?? "").toLowerCase()] ??
    Package
  );
}

export function ItemThumb({ item, className }: { item: ItemOut; className?: string }) {
  const Icon = iconFor(item);
  const src = mediaUrl(item.crop_url);
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted",
        className,
      )}
    >
      {src ? (
        <img src={src} alt={item.label} className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-accent to-muted text-accent-foreground/70">
          {createElement(Icon, { className: "size-5", "aria-hidden": true })}
        </div>
      )}
      <span
        className="absolute bottom-0.5 right-0.5 grid size-4 place-items-center rounded-full bg-card/90 text-primary shadow-sm ring-1 ring-foreground/10"
        title={src ? "AI photo crop" : "AI-detected item"}
      >
        <Sparkles className="size-2.5" aria-hidden />
      </span>
    </div>
  );
}
