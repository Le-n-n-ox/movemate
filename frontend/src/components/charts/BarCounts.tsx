import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "motion/react";
import { axisTick, tooltipStyle, type Slice } from "./chartStyle";

export function BarCounts({ data, height = 190 }: { data: Slice[]; height?: number }) {
  const reduce = useReducedMotion();
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="name" tick={axisTick} interval={0} />
          <YAxis allowDecimals={false} tick={axisTick} />
          <Tooltip cursor={{ fill: "var(--accent)" }} contentStyle={tooltipStyle} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={!reduce}>
            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}