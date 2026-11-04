import type { BBox } from "@/lib/types";

export function BBoxOverlay({ src, alt, boxes, selectedId, onSelect }: {
  src: string; alt: string; boxes: { id: string; label: string; bbox: BBox | null }[];
  selectedId?: string | null; onSelect?: (id: string) => void;
}) {
  const visible = boxes.filter((b) => b.bbox);
  return (
    <div className="relative overflow-hidden rounded-xl">
      <img src={src} alt={alt} className="block w-full" />
      {visible.map(({ id, label, bbox }, idx) => (
        <div
          key={id}
          className={`absolute rounded-sm border-2 ${selectedId === id ? "border-amber-400 ring-4 ring-amber-300/60" : "border-primary"}`}
          style={{ left: `${bbox!.x * 100}%`, top: `${bbox!.y * 100}%`, width: `${bbox!.w * 100}%`, height: `${bbox!.h * 100}%` }}
        >
          <button
            type="button"
            title={label}
            aria-label={`Item ${idx + 1}: ${label}`}
            onClick={() => onSelect?.(id)}
            className="absolute -top-1 left-0 flex size-7 -translate-y-full items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground shadow"
          >
            {idx + 1}
          </button>
        </div>
      ))}
    </div>
  );
}