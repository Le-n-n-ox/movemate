import { useEffect, useRef } from "react";

/** Calls `tick` every `ms` (min 2000) while `active` is true. */
export function usePolling(tick: () => void | Promise<void>, active: boolean, ms = 2000) {
  const saved = useRef(tick);
  saved.current = tick;
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => void saved.current(), Math.max(ms, 2000));
    return () => clearInterval(id);
  }, [active, ms]);
}