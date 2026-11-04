import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type Mode } from "@/hooks/useTheme";

const NEXT: Record<Mode, Mode> = { light: "dark", dark: "system", system: "light" };
const ICON = { light: Sun, dark: Moon, system: Monitor };
const LABEL = { light: "Light", dark: "Dark", system: "System" };

export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  const Icon = ICON[mode];
  return (
    <button
      type="button"
      onClick={() => setMode(NEXT[mode])}
      aria-label={`Theme: ${LABEL[mode]}. Tap to change.`}
      title={`Theme: ${LABEL[mode]}`}
      className="no-print inline-grid size-12 place-items-center rounded-xl text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}