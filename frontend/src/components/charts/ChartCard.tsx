import type { ReactNode } from "react";
import { BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";

export function ChartCard({ title, summary, icon, children }: {
  title: string; summary: string; icon?: ReactNode; children: ReactNode;
}) {
  return (
    <Card className="gap-3 p-4">
      <h2 className="card-title">
        <span className="icon-badge">{icon ?? <BarChart3 className="size-5" aria-hidden />}</span>
        {title}
      </h2>
      <div role="img" aria-label={`${title}. ${summary}`} className="rounded-xl bg-secondary/50 p-2">
        {children}
      </div>
      <p className="border-t pt-2 text-xs text-muted-foreground">{summary}</p>
    </Card>
  );
}