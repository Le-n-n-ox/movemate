import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { pageTransition } from "@/lib/motion";

export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}