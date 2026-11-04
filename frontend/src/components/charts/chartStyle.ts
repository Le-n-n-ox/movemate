export const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--popover-foreground)",
  fontSize: 13,
  fontWeight: 500,
  padding: "8px 12px",
  boxShadow: "var(--shadow-lift)",
} as const;

export const axisTick = { fontSize: 12, fill: "var(--muted-foreground)", fontWeight: 500 } as const;

export interface Slice { name: string; value: number; color: string }

/* Optional helpers. Pass these to Recharts components to match the rest of the app. */

// <CartesianGrid stroke={gridStroke} strokeDasharray="3 4" vertical={false} />
export const gridStroke = "var(--border)";

// <Tooltip cursor={cursorStyle} contentStyle={tooltipStyle} />
export const cursorStyle = { fill: "color-mix(in oklab, var(--primary) 8%, transparent)" } as const;

// <Bar radius={barRadius} {...chartMotion} />
export const barRadius: [number, number, number, number] = [8, 8, 0, 0];

// Animate once on mount, smoothly
export const chartMotion = {
  isAnimationActive: true,
  animationDuration: 900,
  animationEasing: "ease-out",
} as const;

// <Pie innerRadius="62%" outerRadius="90%" paddingAngle={2} cornerRadius={6} stroke="var(--card)" strokeWidth={2} />
export const donutProps = {
  innerRadius: "62%",
  outerRadius: "90%",
  paddingAngle: 2,
  cornerRadius: 6,
  stroke: "var(--card)",
  strokeWidth: 2,
} as const;