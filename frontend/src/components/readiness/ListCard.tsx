import { Card } from "@/components/ui/card";

export function ListCard({ title, hint, items, tone }: {
  title: string; hint?: string; items: string[]; tone?: "danger";
}) {
  if (items.length === 0) return null;
  return (
    <Card className={`gap-2 p-4 ${tone === "danger" ? "border-danger/40" : ""}`}>
      <h2 className="text-lg font-semibold">{title} ({items.length})</h2>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {items.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
    </Card>
  );
}