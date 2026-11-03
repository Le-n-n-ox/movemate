import { createContext, useContext } from "react";

export type Mode = "light" | "dark" | "system";

export interface ThemeState {
  mode: Mode;
  resolved: "light" | "dark";
  setMode: (m: Mode) => void;
}

export const ThemeCtx = createContext<ThemeState | null>(null);

export function useTheme() {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error("useTheme must be used inside ThemeProvider");
  return v;
}