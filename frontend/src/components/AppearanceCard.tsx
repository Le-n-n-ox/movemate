import { Check, Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTheme, type Accent, type Mode } from "@/hooks/useTheme";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const MODES: [Mode, string, LucideIcon][] = [
  ["light", "Light", Sun], ["dark", "Dark", Moon], ["system", "System", Monitor],
];
const ACCENTS: [Accent, string, string][] = [
  ["teal", "Teal", "oklch(0.6 0.118 184.7)"], ["indigo", "Indigo", "oklch(0.55 0.2 275)"],
  ["violet", "Violet", "oklch(0.56 0.23 305)"], ["slate", "Slate", "oklch(0.4 0.04 250)"],
];

export function AppearanceCard() {
  const { mode, accent, setMode, setAccent } = useTheme();
  return (
    <Card className="no-print gap-3 p-4">
      <h2 className="text-lg font-semibold">Appearance</h2>
      <div role="group" aria-label="Colour mode" className="grid grid-cols-3 gap-2">
        {MODES.map(([v, label, Icon]) => (
          <button
            key={v} type="button" aria-pressed={mode === v} onClick={() => setMode(v)}
            className={cn(
              "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border text-sm font-medium",
              mode === v ? "border-primary bg-accent text-accent-foreground" : "bg-card hover:bg-accent/60",
            )}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Accent colour" className="flex flex-wrap gap-3">
        {ACCENTS.map(([v, label, color]) => (
          <button
            key={v} type="button" aria-pressed={accent === v} aria-label={`${label} accent`} title={label}
            onClick={() => setAccent(v)} style={{ background: color }}
            className={cn("grid size-12 place-items-center rounded-full text-white ring-offset-2 ring-offset-card", accent === v && "ring-2 ring-foreground")}
          >
            {accent === v && <Check className="size-5" aria-hidden />}
          </button>
        ))}
      </div>
    </Card>
  );
}