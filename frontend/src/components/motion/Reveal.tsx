import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();

  // With reduced motion we render the content statically. Relying on
  // `whileInView` alone would leave anything below the fold at opacity 0 for
  // users who never scroll it into view (and in print / full-page captures).
  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
