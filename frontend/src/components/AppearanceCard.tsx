import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTheme, type Mode } from "@/hooks/useTheme";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const MODES: [Mode, string, LucideIcon][] = [
  ["light", "Light", Sun], ["dark", "Dark", Moon], ["system", "System", Monitor],
];
export function AppearanceCard() {
  const { mode, setMode } = useTheme();
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
    </Card>
  );
}