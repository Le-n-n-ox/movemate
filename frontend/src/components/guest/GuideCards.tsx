import { AlertTriangle, HelpCircle } from "lucide-react";
import type { GuestGuide } from "@/lib/types";
import { Card } from "@/components/ui/card";

export function GuideCards({ guide }: { guide: GuestGuide }) {
  return (
    <section className="space-y-4" aria-label={guide.title}>
      <h2 className="text-2xl font-bold">{guide.title}</h2>

      {guide.warnings.length > 0 && (
        <div role="note" className="warn-box space-y-2 !p-4 text-base">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-5" aria-hidden /> Be careful</p>
          <ul className="list-disc space-y-1 pl-5">
            {guide.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      <ol className="space-y-3">
        {guide.steps.map((s, i) => (
          <li key={i}>
            <Card className="flex-row items-start gap-4 p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground" aria-hidden>
                {i + 1}
              </span>
              <p className="pt-1 text-lg leading-snug"><span className="sr-only">Step {i + 1}: </span>{s}</p>
            </Card>
          </li>
        ))}
      </ol>

      {guide.unsure.length > 0 && (
        <div className="rounded-lg bg-muted p-4 text-base">
          <p className="mb-1 flex items-center gap-2 font-semibold"><HelpCircle className="size-5" aria-hidden /> Not sure about</p>
          <ul className="list-disc space-y-1 pl-5">
            {guide.unsure.map((u, i) => <li key={i}>{u}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}