import { Check, Monitor, Moon, Palette, Sun, type LucideIcon } from "lucide-react";
import { useTheme, type Accent, type Mode } from "@/hooks/useTheme";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const MODES: [Mode, string, LucideIcon][] = [
  ["light", "Light", Sun], ["dark", "Dark", Moon], ["system", "System", Monitor],
];
// Match the accent themes in index.css so the swatch is the colour you get.
const ACCENTS: [Accent, string, string][] = [
  ["teal", "Teal", "oklch(0.52 0.12 190)"], ["indigo", "Indigo", "oklch(0.52 0.2 275)"],
  ["violet", "Violet", "oklch(0.54 0.23 305)"], ["slate", "Slate", "oklch(0.4 0.04 250)"],
];

export function AppearanceCard() {
  const { mode, accent, setMode, setAccent } = useTheme();
  const accentName = ACCENTS.find(([v]) => v === accent)?.[1];
  return (
    <Card className="card-lift no-print gap-4 p-4">
      <h2 className="card-title">
        <span className="icon-badge"><Palette className="size-5" aria-hidden /></span> Appearance
      </h2>

      <div className="space-y-2">
        <p className="text-sm font-semibold">Mode</p>
        <div role="group" aria-label="Colour mode" className="grid grid-cols-3 gap-1 rounded-xl border bg-secondary p-1">
          {MODES.map(([v, label, Icon]) => (
            <button
              key={v} type="button" aria-pressed={mode === v} onClick={() => setMode(v)}
              className={cn(
                "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all duration-200",
                mode === v
                  ? "bg-card text-primary shadow-sm ring-1 ring-primary/30"
                  : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="flex items-baseline justify-between text-sm font-semibold">
          Accent <span className="font-normal text-muted-foreground">{accentName}</span>
        </p>
        <div role="group" aria-label="Accent colour" className="flex flex-wrap gap-3">
          {ACCENTS.map(([v, label, color]) => {
            const on = accent === v;
            return (
              <button
                key={v} type="button" aria-pressed={on} aria-label={`${label} accent`} title={label}
                onClick={() => setAccent(v)} style={{ background: color }}
                className={cn(
                  "grid size-12 place-items-center rounded-full text-white shadow-sm ring-offset-2 ring-offset-card transition-transform duration-200 hover:scale-110 active:scale-95",
                  on && "ring-2 ring-foreground",
                )}
              >
                {on && <Check className="pop size-5" aria-hidden />}
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}