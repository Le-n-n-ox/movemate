import { useCallback, useEffect, useState } from "react";

export function useAsync<R>(fn: () => Promise<R>, deps: unknown[] = []) {
  const [data, setData] = useState<R | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try { setData(await fn()); setError(null); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { void refresh(); }, [refresh]);
  return { data, setData, error, loading, refresh };
}