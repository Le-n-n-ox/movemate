import { Link } from "react-router-dom";
import { AlertTriangle, ChevronLeft, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";
<main id="main" className="page"></main>

export function Shell({ title, back, backLabel = "Back", right, children }: {
  title: string; back?: string; backLabel?: string; right?: ReactNode; children: ReactNode;
}) {
  return (
    <main className="page">
      <header className="no-print flex items-center justify-between gap-2">
        {back ? (
          <Link to={back} className="inline-flex min-h-12 items-center gap-1 text-sm font-medium text-primary">
            <ChevronLeft className="size-5" aria-hidden /> {backLabel}
          </Link>
        ) : <span />}
        {right}
      </header>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {children}
    </main>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
      <div className="flex-1 space-y-2">
        <p>{message}</p>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="size-4" /> Try again
          </Button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
      {icon && <div className="mb-2 flex justify-center">{icon}</div>}
      <p className="font-medium text-foreground">{title}</p>
      {hint && <p className="mt-1 text-sm">{hint}</p>}
    </div>
  );
}

const TONES = {
  neutral: "bg-muted text-muted-foreground",
  brand: "bg-accent text-accent-foreground",
  danger: "bg-danger/15 text-danger",
  warn: "bg-warn/20 text-amber-800 dark:text-amber-300",
  info: "bg-info/15 text-info",
  ok: "bg-ok/15 text-ok",
} as const;

/** Always pass text: colour is never the only signal. */
export function Pill({ tone = "neutral", children, className }: {
  tone?: keyof typeof TONES; children: ReactNode; className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", TONES[tone], className)}>
      {children}
    </span>
  );
}

export function RoleBar({ role, actor, onActor }: { role: Role; actor: string; onActor: (v: string) => void }) {
  return (
    <div className="no-print flex items-center gap-2 rounded-lg bg-secondary p-2">
      <Pill tone={role === "host" ? "brand" : "neutral"}>Viewing as {role}</Pill>
      <Input
        aria-label="Your name"
        placeholder="Your name"
        value={actor}
        onChange={(e) => onActor(e.target.value)}
        className="h-10 flex-1 bg-card"
      />
    </div>
  );
}