import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function ChartCard({ title, summary, children }: { title: string; summary: string; children: ReactNode }) {
  return (
    <Card className="gap-2 p-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div role="img" aria-label={`${title}. ${summary}`}>{children}</div>
      <p className="text-xs text-muted-foreground">{summary}</p>
    </Card>
  );
}