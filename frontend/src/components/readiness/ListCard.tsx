import { Card } from "@/components/ui/card";

export function ListCard({ title, hint, items }: {
  title: string; hint?: string; items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <Card className="gap-2 p-4">
      <h2 className="text-lg font-semibold">{title} ({items.length})</h2>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {items.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
    </Card>
  );
}