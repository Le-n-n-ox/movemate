import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ThemeCtx, type Mode } from "@/hooks/useTheme";

const MODE_KEY = "movemate_theme";
const MODES: Mode[] = ["light", "dark", "system"];

// Browser bar colour. Dark mode is true black; light mode follows the accent.
// Hex approximations of the --primary values in index.css.
const BAR_LIGHT: Record<Accent, string> = {
  teal: "#0e7c7b", indigo: "#4f46e5", violet: "#9333ea", slate: "#334155",
};
const BAR_DARK = "#000000";

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

function setThemeColor(color: string) {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", color);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>(() => load(MODE_KEY, MODES, "system"));
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
    setThemeColor(resolved === "dark" ? BAR_DARK : BAR_LIGHT[accent]);
  }, [resolved, accent]);

    root.removeAttribute("data-accent");
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", resolved === "dark" ? "#111827" : "#0f766e");
  }, [resolved]);


  const setMode = useCallback((m: Mode) => { setModeState(m); save(MODE_KEY, m); }, []);
  const value = useMemo(
    () => ({ mode, resolved, setMode }),
    [mode, resolved, setMode],
  );
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}