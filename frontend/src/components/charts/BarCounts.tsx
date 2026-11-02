import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "motion/react";
import { axisTick, barRadius, chartMotion, cursorStyle, gridStroke, tooltipStyle, type Slice } from "./chartStyle";

const short = (s: string) => (s.length > 10 ? `${s.slice(0, 9)}…` : s);

export function BarCounts({ data, height = 190 }: { data: Slice[]; height?: number }) {
  const reduce = useReducedMotion();
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 4" stroke={gridStroke} vertical={false} />
          <XAxis dataKey="name" tick={axisTick} interval={0} tickFormatter={short} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
          <Tooltip cursor={cursorStyle} contentStyle={tooltipStyle} />
          <Bar
            dataKey="value"
            radius={barRadius}
            maxBarSize={44}
            {...chartMotion}
            isAnimationActive={!reduce}
          >
            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
            <LabelList
              dataKey="value"
              position="top"
              style={{ fontSize: 12, fontWeight: 700, fill: "var(--foreground)" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}