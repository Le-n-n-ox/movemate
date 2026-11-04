import type { Transition } from "motion/react";

/** Shared easing so every entrance and transition feels the same. */
export const EASE_STANDARD: [number, number, number, number] = [0.2, 0.7, 0.2, 1];
export const EASE_EMPHASIS: [number, number, number, number] = [0.3, 1.4, 0.5, 1];

/** Shared durations in seconds (Motion uses seconds, CSS uses ms). */
export const DURATION = {
  fast: 0.2,
  base: 0.32,
  slow: 0.5,
} as const;

export const revealTransition = (delay = 0): Transition => ({
  duration: DURATION.slow,
  delay,
  ease: EASE_STANDARD,
});

export const pageTransition: Transition = {
  duration: DURATION.base,
  ease: EASE_STANDARD,
};

export const countTransition: Transition = {
  duration: 1.2,
  ease: "easeOut",
};
