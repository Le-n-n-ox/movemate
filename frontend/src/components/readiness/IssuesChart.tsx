import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ReadinessReport } from "@/lib/types";
import { Card } from "@/components/ui/card";

export function IssuesChart({ rooms }: { rooms: ReadinessReport["rooms"] }) {
  const data = rooms.map((r) => ({ name: r.room_name, issues: r.issues.length }));
  if (!data.some((d) => d.issues > 0)) return null;
  const summary = data.map((d) => `${d.name}: ${d.issues}`).join(", ");

  return (
    <Card className="no-print gap-2 p-4">
      <h2 className="text-lg font-semibold">Issues per room</h2>
      <div role="img" aria-label={`Issues per room. ${summary}`} className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} interval={0} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
            <Tooltip cursor={{ fill: "var(--accent)" }} contentStyle={{ borderRadius: 8, borderColor: "var(--border)" }} />
            <Bar dataKey="issues" name="Issues" fill="var(--warn)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground">{summary}</p>
    </Card>
  );
}