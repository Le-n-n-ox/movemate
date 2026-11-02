import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useReducedMotion } from "motion/react";
import { chartMotion, donutProps, tooltipStyle, type Slice } from "./chartStyle";

export function Donut({ data, centerLabel }: { data: Slice[]; centerLabel?: string }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0);

  return (
    <div className="grid items-center gap-4 sm:grid-cols-2">
      <div className="relative h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              {...donutProps}
              {...chartMotion}
              isAnimationActive={!reduce}
              onMouseEnter={(_, i) => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              {data.map((d, i) => (
                <Cell
                  key={d.name}
                  fill={d.color}
                  fillOpacity={active === null || active === i ? 1 : 0.35}
                  style={{ transition: "fill-opacity 0.2s ease", outline: "none" }}
                />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="font-display text-3xl font-extrabold leading-none">
              {active === null ? total : data[active].value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {active === null ? centerLabel : data[active].name}
            </p>
          </div>
        </div>
      </div>

      <ul className="space-y-2 text-sm">
        {data.map((d, i) => (
          <li
            key={d.name}
            className="space-y-1 rounded-lg px-2 py-1 transition-opacity"
            style={{ opacity: active === null || active === i ? 1 : 0.45 }}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          >
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full" style={{ background: d.color }} aria-hidden />
              <span className="flex-1">{d.name}</span>
              <strong className="font-display">{d.value}</strong>
              <span className="w-9 text-right text-xs text-muted-foreground">{pct(d.value)}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{ width: `${pct(d.value)}%`, background: d.color }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}