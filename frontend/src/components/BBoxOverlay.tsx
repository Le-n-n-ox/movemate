import type { BBox } from "@/lib/types";

export function BBoxOverlay({ src, alt, boxes }: {
  src: string; alt: string; boxes: { id: string; label: string; bbox: BBox | null }[];
}) {
  const shown = boxes.filter((b) => b.bbox);
  return (
    <figure className="space-y-2">
      <div className="relative overflow-hidden rounded-xl border" style={{ boxShadow: "var(--shadow-rest)" }}>
        <img src={src} alt={alt} className="block w-full" />
        {shown.map(({ id, label, bbox }, i) => {
          // If the box is near the top edge, put the label inside it so it is not clipped.
          const inside = bbox!.y < 0.08;
          return (
            <div
              key={id}
              className="group absolute animate-in fade-in zoom-in-95 rounded-md border-2 border-primary bg-primary/10 shadow-[0_0_0_1px_rgba(0,0,0,0.25)] transition-colors duration-200 fill-mode-both hover:bg-primary/25"
              style={{
                left: `${bbox!.x * 100}%`, top: `${bbox!.y * 100}%`,
                width: `${bbox!.w * 100}%`, height: `${bbox!.h * 100}%`,
                animationDelay: `${150 + i * 90}ms`, animationDuration: "350ms",
              }}
            >
              <span
                className={
                  "absolute left-0 max-w-full truncate bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground " +
                  (inside ? "top-0 rounded-br" : "-top-0.5 -translate-y-full rounded-t")
                }
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
        </figcaption>
      )}
    </figure>
  );
}