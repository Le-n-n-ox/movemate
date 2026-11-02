import { api } from "@/lib/api";
import { CONDITIONS } from "@/lib/labels";
import { useAsync } from "@/hooks/useAsync";
import type { ItemCondition, RoomOut } from "@/lib/types";
import { ErrorNote } from "@/components/Shell";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartCard } from "@/components/charts/ChartCard";
import { Donut } from "@/components/charts/Donut";
import { BarCounts } from "@/components/charts/BarCounts";

// Red is reserved for "missing"; damaged is orange.
const COLOR: Record<ItemCondition, string> = {
  new: "var(--chart-1)", good: "var(--ok)", worn: "var(--warn)",
  under_repair: "var(--info)", damaged: "var(--chart-6)", missing: "var(--danger)",
};

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

  return (
    <>
      <ChartCard
        title="Item condition"
        summary={conditions.map((d) => `${d.name}: ${d.value}`).join(", ")}
      >
        <Donut data={conditions} centerLabel="items" />
      </ChartCard>
      <ChartCard title="Items per room" summary={perRoom.map((d) => `${d.name}: ${d.value}`).join(", ")}>
        <BarCounts data={perRoom} />
      </ChartCard>
    </>
  );
}