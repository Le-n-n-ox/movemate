import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";

export function AnimatedNumber({ value, className, duration = 1.2, format = String }: {
  value: number; className?: string; duration?: number; format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const shown = useRef(0);
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return;
    const first = shown.current === 0;
    const c = animate(shown.current, value, {
      duration: first ? duration : 0.6,
      ease: [0.2, 0.7, 0.2, 1],
      onUpdate: (v) => { shown.current = v; setN(Math.round(v)); },
    });
    return () => c.stop();
  }, [inView, value, reduce, duration]);

  return (
    <span ref={ref} className={`tabular-nums ${className ?? ""}`}>
      <span aria-hidden>{format(reduce ? value : n)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}