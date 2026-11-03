import { useState } from "react";
import type { BBox } from "@/lib/types";
import { cn } from "@/lib/utils";

type Box = { id: string; label: string; bbox: BBox | null };

export function BBoxOverlay({ src, alt, boxes }: { src: string; alt: string; boxes: Box[] }) {
  const shown = boxes.filter((b): b is Box & { bbox: BBox } => b.bbox !== null);
  const [loaded, setLoaded] = useState(false);

  return (
    <figure key={src} className="space-y-2">
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border shadow-[var(--shadow-rest)]",
          !loaded && "min-h-40 bg-muted",
        )}
      >
        <img src={src} alt={alt} className="block w-full" onLoad={() => setLoaded(true)} />
        {loaded && shown.map(({ id, label, bbox }, i) => {
          // Near the top edge: put the label inside the box so it is not clipped.
          const inside = bbox.y < 0.14;
          // Right half of the image: anchor the label to the right so it stays visible.
          const right = bbox.x + bbox.w / 2 > 0.55;
          return (
            <div
              key={id}
              className="absolute animate-in fade-in zoom-in-95 fill-mode-both rounded-md border-2 border-primary bg-primary/10 shadow-[0_0_0_1px_rgba(0,0,0,0.25)]"
              style={{
                left: `${bbox.x * 100}%`, top: `${bbox.y * 100}%`,
                width: `${bbox.w * 100}%`, height: `${bbox.h * 100}%`,
                animationDelay: `${150 + i * 90}ms`, animationDuration: "350ms",
              }}
            >
              <span
                className={cn(
                  "absolute max-w-[10rem] truncate bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground",
                  right ? "right-0" : "left-0",
                  inside
                    ? cn("top-0", right ? "rounded-bl" : "rounded-br")
                    : "-top-0.5 -translate-y-full rounded-t",
                )}
              >
                {label}
              </span>
              <span className="pointer-events-none absolute -left-1 -top-1 size-2.5 rounded-full border-2 border-primary bg-background" aria-hidden />
              <span className="pointer-events-none absolute -bottom-1 -right-1 size-2.5 rounded-full border-2 border-primary bg-background" aria-hidden />
            </div>
          );
        })}
      </div>
      {shown.length > 0 && (
        <figcaption className="text-xs text-muted-foreground">
          {shown.length} {shown.length === 1 ? "item" : "items"} marked. Check each name before you confirm.
          <span className="sr-only">: {shown.map((b) => b.label).join(", ")}</span>
        </figcaption>
      )}
    </figure>
  );
}