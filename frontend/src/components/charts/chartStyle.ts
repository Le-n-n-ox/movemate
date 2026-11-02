export const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--popover-foreground)",
  fontSize: 13,
} as const;

export const axisTick = { fontSize: 12, fill: "var(--muted-foreground)" } as const;

export interface Slice { name: string; value: number; color: string }