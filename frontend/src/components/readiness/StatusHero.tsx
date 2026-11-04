import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { Readiness } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAP = {
  ready: { label: "Ready", Icon: CheckCircle2, cls: "bg-ok/15 text-ok border-ok/30" },
  ready_with_exceptions: { label: "Ready with exceptions", Icon: AlertTriangle, cls: "bg-accent text-accent-foreground border-primary/25" },
  not_ready: { label: "Not ready", Icon: XCircle, cls: "bg-muted text-foreground border-border" },
} as const;

/** Only `ready` gets a tick. A completed inspection alone never does. */
export function StatusHero({ status, summary }: { status: Readiness; summary: string }) {
  const { label, Icon, cls } = MAP[status];
  return (
    <div className={cn("space-y-2 rounded-2xl border p-5 text-center", cls)} role="status">
      <Icon className="mx-auto size-10" aria-hidden />
      <p className="text-3xl font-extrabold tracking-tight">{label}</p>
      <p className="text-base text-foreground">{summary}</p>
    </div>
  );
}