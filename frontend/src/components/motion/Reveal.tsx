import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

type Direction = "up" | "left" | "right" | "none";

export function Reveal({ children, delay = 0, className, direction = "up", distance = 24 }: {
  children: ReactNode; delay?: number; className?: string; direction?: Direction; distance?: number;
}) {
  const reduce = useReducedMotion();
  const d = reduce ? 0 : distance;
  const from = {
    up: { y: d }, left: { x: -d }, right: { x: d }, none: {},
  }[direction];

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...from }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}