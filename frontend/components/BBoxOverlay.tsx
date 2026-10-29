import type { BBox } from "@/lib/types";

export type Box = { id: string; label: string; bbox: BBox; tone?: "ok" | "warn" | "bad" };
const tones = { ok: "border-emerald-400 bg-emerald-400/10", warn: "border-amber-400 bg-amber-400/10", bad: "border-red-500 bg-red-500/10" };

/** Draws normalized 0..1 boxes over an image. */
export function BBoxOverlay({ src, boxes, onPick }: { src: string; boxes: Box[]; onPick?: (id: string) => void }) {
  return (
    <div className="relative w-full overflow-hidden rounded-xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="block w-full" />
      {boxes.map((b) => (
        <button key={b.id} type="button" onClick={() => onPick?.(b.id)}
          className={`absolute rounded-md border-2 ${tones[b.tone ?? "ok"]}`}
          style={{ left: `${b.bbox.x * 100}%`, top: `${b.bbox.y * 100}%`, width: `${b.bbox.w * 100}%`, height: `${b.bbox.h * 100}%` }}>
          <span className="absolute -top-5 left-0 whitespace-nowrap rounded bg-stone-900/80 px-1 text-[11px] text-white">{b.label}</span>
        </button>
      ))}
    </div>
  );
}
