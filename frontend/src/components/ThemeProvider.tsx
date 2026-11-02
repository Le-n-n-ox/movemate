import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ThemeCtx, type Accent, type Mode } from "@/hooks/useTheme";

const MODE_KEY = "movemate_theme";
const ACCENT_KEY = "movemate_accent";
const MODES: Mode[] = ["light", "dark", "system"];
const ACCENTS: Accent[] = ["teal", "indigo", "violet", "slate"];

function load<T extends string>(key: string, allowed: T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key) as T | null;
    if (v && allowed.includes(v)) return v;
  } catch { /* storage blocked */ }
  return fallback;
}
function save(key: string, v: string) {
  try { localStorage.setItem(key, v); } catch { /* ignore */ }
}
const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>(() => load(MODE_KEY, MODES, "system"));
  const [accent, setAccentState] = useState<Accent>(() => load(ACCENT_KEY, ACCENTS, "teal"));
  const [systemDark, setSystemDark] = useState(prefersDark);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setSystemDark(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const resolved: "light" | "dark" = mode === "system" ? (systemDark ? "dark" : "light") : mode;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
    if (accent === "teal") root.removeAttribute("data-accent");
    else root.setAttribute("data-accent", accent);
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", resolved === "dark" ? "#0f1c1e" : "#0d9488");
  }, [resolved, accent]);

  const setMode = useCallback((m: Mode) => { setModeState(m); save(MODE_KEY, m); }, []);
  const setAccent = useCallback((a: Accent) => { setAccentState(a); save(ACCENT_KEY, a); }, []);
  const value = useMemo(
    () => ({ mode, resolved, accent, setMode, setAccent }),
    [mode, resolved, accent, setMode, setAccent],
  );
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}