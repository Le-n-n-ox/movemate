import { AlertTriangle, HelpCircle } from "lucide-react";
import type { GuestGuide } from "@/lib/types";
import { Card } from "@/components/ui/card";

export function GuideCards({ guide }: { guide: GuestGuide }) {
  return (
    <section className="space-y-5" aria-label={guide.title}>
      <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight">{guide.title}</h2>

      {guide.warnings.length > 0 && (
        <div role="note" className="warn-box pop flex items-start gap-3 !p-4 text-base">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-warn/20 text-warn">
            <AlertTriangle className="size-5" aria-hidden />
          </span>
          <div className="space-y-1.5">
            <p className="font-display text-lg font-bold">Be careful</p>
            <ul className="list-disc space-y-1 pl-5">
              {guide.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        </div>
      )}

      <ol className="stagger space-y-3">
        {guide.steps.map((s, i) => (
          <li key={i}>
            <Card className="card-lift flex-row items-start gap-4 p-4">
              <span
                className="icon-badge tile size-11 rounded-full text-xl font-extrabold"
                aria-hidden
              >
                {i + 1}
              </span>
              <p className="pt-1.5 text-lg leading-snug">
                <span className="sr-only">Step {i + 1}: </span>{s}
              </p>
            </Card>
          </li>
        ))}
      </ol>

      {guide.unsure.length > 0 && (
        <div className="hint-box flex items-start gap-3 !p-4 text-base">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-info/15 text-info">
            <HelpCircle className="size-5" aria-hidden />
          </span>
          <div className="space-y-1.5">
            <p className="font-display text-lg font-bold">Not sure about</p>
            <ul className="list-disc space-y-1 pl-5">
              {guide.unsure.map((u, i) => <li key={i}>{u}</li>)}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}