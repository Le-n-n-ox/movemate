import { useCallback, useEffect, useRef, useState } from "react";

export function useAsync<R>(fn: () => Promise<R>, deps: unknown[] = []) {
  const [data, setData] = useState<R | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stillLoading, setStillLoading] = useState(false);
  const fnRef = useRef(fn); fnRef.current = fn;

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const t = setTimeout(() => setStillLoading(true), 10000);
    try { setData(await fnRef.current()); setError(null); setStillLoading(false); }
    catch (e) { setError((e as Error).message); }
    finally { clearTimeout(t); setLoading(false); }
  }, deps);

  useEffect(() => { void refresh(); }, [refresh]);
  return { data, setData, error, loading, stillLoading, refresh };
}
