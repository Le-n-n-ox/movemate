import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { Readiness } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAP = {
  ready: { label: "Ready", Icon: CheckCircle2, cls: "bg-ok/15 text-ok border-ok/30" },
  ready_with_exceptions: { label: "Ready with exceptions", Icon: AlertTriangle, cls: "bg-warn/20 text-amber-800 dark:text-amber-300 border-warn/40" },
  not_ready: { label: "Not ready", Icon: XCircle, cls: "bg-danger/15 text-danger border-danger/30" },
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