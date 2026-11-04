import { AlertTriangle, CheckCircle2, Package } from "lucide-react";
import { api } from "@/lib/api";
import { CONDITIONS } from "@/lib/labels";
import { useAsync } from "@/hooks/useAsync";
import type { ItemCondition, RoomOut } from "@/lib/types";
import { ErrorNote } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { ChartCard } from "@/components/charts/ChartCard";
import { Donut } from "@/components/charts/Donut";
import { BarCounts } from "@/components/charts/BarCounts";

const COLOR: Record<ItemCondition, string> = {
  new: "var(--chart-1)", good: "var(--ok)", worn: "var(--info)",
  under_repair: "var(--chart-4)", damaged: "var(--chart-6)", missing: "var(--danger)",
};

const ATTENTION: ItemCondition[] = ["damaged", "missing", "under_repair"];

export function InsightsCard({ rooms }: { rooms: RoomOut[] }) {
  const key = rooms.map((r) => r.id).join(",");
  const q = useAsync(
    async () => (await Promise.all(rooms.map((r) => api.listItems(r.id, "confirmed")))).flat(),
    [key],
  );

  if (rooms.length === 0) return null;
  if (q.loading) return <Skeleton className="h-52 w-full rounded-xl" />;
  if (q.error) return <ErrorNote message={q.error} onRetry={() => q.refresh()} />;
  const items = q.data ?? [];
  if (items.length === 0) return null;

  const conditions = CONDITIONS
    .map(([v, label]) => ({ name: label, value: items.filter((i) => i.condition === v).length, color: COLOR[v] }))
    .filter((d) => d.value > 0);
  const perRoom = rooms.map((r, i) => ({ name: r.name, value: r.confirmed_items, color: `var(--chart-${(i % 5) + 1})` }));

  const needAttention = items.filter((i) => ATTENTION.includes(i.condition)).length;
  const fine = items.length - needAttention;

  return (
    <div className="stagger space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="gap-1 p-3">
          <Package className="size-4 text-muted-foreground" aria-hidden />
          <p className="font-display text-2xl font-extrabold"><AnimatedNumber value={items.length} /></p>
          <p className="text-xs text-muted-foreground">Items</p>
        </Card>
        <Card className="card-ok gap-1 p-3">
          <CheckCircle2 className="size-4 text-ok" aria-hidden />
          <p className="font-display text-2xl font-extrabold"><AnimatedNumber value={fine} /></p>
          <p className="text-xs text-muted-foreground">No issues</p>
        </Card>
        <Card className="gap-1 p-3">
          <AlertTriangle className="size-4 text-muted-foreground" aria-hidden />
          <p className="font-display text-2xl font-extrabold"><AnimatedNumber value={needAttention} /></p>
          <p className="text-xs text-muted-foreground">Need attention</p>
        </Card>
      </div>
      <ChartCard
        title="Item condition"
        summary={conditions.map((d) => `${d.name}: ${d.value}`).join(", ")}
      >
        <Donut data={conditions} centerLabel="items" />
      </ChartCard>
      <ChartCard title="Items per room" summary={perRoom.map((d) => `${d.name}: ${d.value}`).join(", ")}>
        <BarCounts data={perRoom} />
      </ChartCard>
    </div>
  );
}