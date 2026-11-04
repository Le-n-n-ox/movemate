import type { BBox } from "@/lib/types";

export function BBoxOverlay({ src, alt, boxes }: {
  src: string; alt: string; boxes: { id: string; label: string; bbox: BBox | null }[];
}) {
  return (
    <div className="relative overflow-hidden rounded-xl">
      <img src={src} alt={alt} className="block w-full" />
      {boxes.filter((b) => b.bbox).map(({ id, label, bbox }) => (
        <div
          key={id}
          className="absolute rounded-sm border-2 border-primary"
          style={{ left: `${bbox!.x * 100}%`, top: `${bbox!.y * 100}%`, width: `${bbox!.w * 100}%`, height: `${bbox!.h * 100}%` }}
        >
          <span title={label} className="absolute -top-0.5 left-0 max-w-full -translate-y-full truncate rounded-t bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}