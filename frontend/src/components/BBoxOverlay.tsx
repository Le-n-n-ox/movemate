import { useState } from "react";
import type { BBox } from "@/lib/types";

export const BOX_COLORS = ["#e11d48", "#2563eb", "#059669", "#d97706", "#7c3aed", "#0891b2", "#db2777", "#65a30d"];

export function BBoxOverlay({ src, alt, boxes, selectedId, onSelect, hidden }: {
  src: string; alt: string; boxes: { id: string; label: string; bbox: BBox | null }[];
  selectedId?: string | null; onSelect?: (id: string) => void; hidden?: boolean;
}) {
  const [aspect, setAspect] = useState<number | null>(null);
  const visible = boxes.filter((b) => b.bbox);
  // Nudge badges that would overlap: offset index along top edge
  const badgeOffsets = new Map<string, number>();
  visible.forEach((b) => {
    let off = 4;
    for (const [otherId] of badgeOffsets) {
      const other = visible.find((v) => v.id === otherId);
      if (other && other.bbox && b.bbox && Math.abs(other.bbox.x - b.bbox.x) < 0.03 && Math.abs(other.bbox.y - b.bbox.y) < 0.03) off += 24;
    }
    badgeOffsets.set(b.id, off);
  });
  return (
    <div className="relative w-full overflow-hidden rounded-xl" style={aspect ? { aspectRatio: aspect } : undefined} data-testid="bbox-wrapper">
      <img src={src} alt={alt} data-testid="bbox-image" onLoad={(e) => { const im = e.currentTarget; if (im.naturalWidth) setAspect(im.naturalWidth / im.naturalHeight); }} className="absolute inset-0 block h-full w-full object-contain" />
      {!hidden && visible.map(({ id, label, bbox }, idx) => {
        const color = BOX_COLORS[idx % BOX_COLORS.length];
        const selected = selectedId === id;
        const dim = selectedId && !selected;
        return (
          <div
            key={id}
            data-testid="bbox-box"
            data-item-id={id}
            className="absolute rounded-sm"
            style={{
              left: `${bbox!.x * 100}%`, top: `${bbox!.y * 100}%`, width: `${bbox!.w * 100}%`, height: `${bbox!.h * 100}%`,
              borderColor: color, borderWidth: selected ? 3 : 1.5, borderStyle: "solid",
              opacity: dim ? 0.25 : 1,
              boxShadow: selected ? `0 0 0 3px ${color}55` : undefined,
            }}
          >
            <button
              type="button"
              title={label}
              aria-label={`Item ${idx + 1}: ${label}`}
              onClick={() => onSelect?.(id)}
              className="absolute flex items-center justify-center rounded-full p-0 text-[12px] font-bold text-white shadow"
              style={{ width: 22, height: 22, minWidth: 22, minHeight: 22, left: badgeOffsets.get(id), top: 4, backgroundColor: color }}
            >
              {idx + 1}
            </button>
          </div>
        );
      })}
    </div>
  );
}
