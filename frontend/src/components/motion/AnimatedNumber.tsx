import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";
import { countTransition } from "@/lib/motion";

export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return;
    const c = animate(0, value, { ...countTransition, onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [inView, value, reduce]);

  // Safety net: if the element never enters the viewport (no IntersectionObserver
  // support, a print/full-page capture that never scrolls, or a user who lands
  // mid-page) the counter would sit on 0 forever, which reads as "none exist".
  // Reveal the real value after a short delay so the number is never a lie.
  useEffect(() => {
    if (reduce || inView) return;
    const t = setTimeout(() => setN(value), 1200);
    return () => clearTimeout(t);
  }, [inView, value, reduce]);

  return (
    <span ref={ref} className={className} aria-label={String(value)}>
      {reduce ? value : n}
    </span>
  );
}
