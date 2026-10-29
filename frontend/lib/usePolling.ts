"use client";
import { useEffect, useRef, useState } from "react";

/** Calls `fn` every `ms` until `stop(result)` is true. Returns the latest result and a manual refresh. */
export function usePolling<R>(fn: () => Promise<R>, stop: (r: R) => boolean, ms = 2000, enabled = true) {
  const [data, setData] = useState<R | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const run = async () => {
    try { const r = await fnRef.current(); setData(r); setError(null); return r; }
    catch (e) { setError((e as Error).message); return null; }
  };
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    const tick = async () => {
      const r = await run();
      if (!cancelled && !(r && stop(r))) timer = setTimeout(tick, ms);
    };
    tick();
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ms]);
  return { data, error, refresh: run };
}
