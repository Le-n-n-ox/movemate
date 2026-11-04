import type { ReadinessReport } from "@/lib/types";
import { ChartCard } from "@/components/charts/ChartCard";
import { BarCounts } from "@/components/charts/BarCounts";

export function IssuesChart({ rooms }: { rooms: ReadinessReport["rooms"] }) {
  const data = rooms.map((r) => ({ name: r.room_name, value: r.issues.length, color: "var(--warn)" }));
  if (!data.some((d) => d.value > 0)) return null;
  return (
    <div className="no-print">
      <ChartCard title="Issues per room" summary={data.map((d) => `${d.name}: ${d.value}`).join(", ")}>
        <BarCounts data={data} />
      </ChartCard>
    </div>
  );
}