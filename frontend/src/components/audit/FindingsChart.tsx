import type { FindingOut, FindingType } from "@/lib/types";
import { ChartCard } from "@/components/charts/ChartCard";
import { BarCounts } from "@/components/charts/BarCounts";

const META: Record<FindingType, [string, string]> = {
  missing: ["Missing", "var(--danger)"],
  count_mismatch: ["Count", "var(--warn)"],
  misplaced: ["Moved", "var(--info)"],
  unverified: ["Unverified", "var(--chart-3)"],
  extra: ["Extra", "var(--chart-1)"],
};

export function FindingsChart({ findings }: { findings: FindingOut[] }) {
  const data = (Object.keys(META) as FindingType[])
    .map((t) => ({ name: META[t][0], value: findings.filter((f) => f.type === t).length, color: META[t][1] }))
    .filter((d) => d.value > 0);
  if (data.length === 0) return null;
  return (
    <ChartCard title="What the check found" summary={data.map((d) => `${d.name}: ${d.value}`).join(", ")}>
      <BarCounts data={data} height={170} />
    </ChartCard>
  );
}