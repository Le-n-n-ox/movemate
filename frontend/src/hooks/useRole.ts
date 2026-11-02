import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Role } from "@/lib/types";

const KEY = "movemate_actor";

export function useRole() {
  const [params] = useSearchParams();
  const role: Role = params.get("role") === "host" ? "host" : "cleaner";
  const [actor, setActorState] = useState(() => {
    try { return localStorage.getItem(KEY) ?? ""; } catch { return ""; }
  });
  const setActor = useCallback((v: string) => {
    setActorState(v);
    try { localStorage.setItem(KEY, v); } catch { /* ignore */ }
  }, []);
  const linkFor = (r: Role) => {
    const u = new URL(window.location.href);
    u.searchParams.set("role", r);
    return u.toString();
  };
  return { role, isHost: role === "host", actor, setActor, linkFor };
}