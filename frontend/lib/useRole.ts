"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Role } from "./types";

/** v1 stand-in for login: ?role=host or ?role=cleaner (default). Pages using this must sit inside <Suspense>. */
export function useRole(): Role {
  return useSearchParams().get("role") === "host" ? "host" : "cleaner";
}

/** Remember who is using the app on this device (shown in audit trails). Not authentication. */
export function useActor(): [string, (v: string) => void] {
  const [name, setName] = useState("");
  useEffect(() => { try { setName(localStorage.getItem("movemate_actor") ?? ""); } catch {} }, []);
  const set = (v: string) => { setName(v); try { localStorage.setItem("movemate_actor", v); } catch {} };
  return [name, set];
}

export const withRole = (path: string, role: Role) => `${path}${path.includes("?") ? "&" : "?"}role=${role}`;
