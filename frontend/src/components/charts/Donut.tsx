import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useReducedMotion } from "motion/react";
import { tooltipStyle, type Slice } from "./chartStyle";

export function Donut({ data, centerLabel }: { data: Slice[]; centerLabel?: string }) {
  const reduce = useReducedMotion();
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="grid items-center gap-4 sm:grid-cols-2">
      <div className="relative h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="90%"
              paddingAngle={2} stroke="var(--card)" isAnimationActive={!reduce}
            >
              {data.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-2xl font-bold">{total}</p>
            {centerLabel && <p className="text-xs text-muted-foreground">{centerLabel}</p>}
          </div>
        </div>
      </div>
      <ul className="space-y-1.5 text-sm">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="size-3 rounded-sm" style={{ background: d.color }} aria-hidden />
            <span className="flex-1">{d.name}</span>
            <strong>{d.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}