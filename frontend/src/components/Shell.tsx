import { Link } from "react-router-dom";
import { AlertTriangle, Brush, ChevronLeft, KeyRound, RefreshCw, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

export function Shell({ title, back, backLabel = "Back", right, children }: {
  title: string; back?: string; backLabel?: string; right?: ReactNode; children: ReactNode;
}) {
  return (
    <main id="main" className="page">
      <header
        className="glass no-print -mx-4 flex items-center justify-between gap-2 px-4"
        style={{ top: "env(safe-area-inset-top, 0px)" }}
      >
        {back ? (
          <Link
            to={back}
            className="inline-flex min-h-12 min-w-0 items-center gap-1 rounded-lg pr-2 text-sm font-semibold text-primary hover:underline"
          >
            <ChevronLeft className="size-5 shrink-0" aria-hidden />
            <span className="truncate">{backLabel}</span>
          </Link>
        ) : <span />}
        <div className="flex shrink-0 items-center gap-1">
          {right}
          <Link
            to="/start"
            aria-label="Switch role"
            className="inline-flex min-h-12 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-primary hover:underline"
          >
            <Users className="size-5" aria-hidden />
            <span className="hidden sm:inline">Switch role</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
      {children}
    </main>
  );
}

export function ErrorNote({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div
      role="alert"
      className={cn("flex items-start gap-3 rounded-lg border border-danger/30 border-l-4 border-l-danger bg-danger/10 p-3 text-sm", className)}
    >
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
    <div className="rounded-xl border border-dashed bg-card/50 p-8 text-center text-muted-foreground">
      {icon && <span className="icon-badge icon-badge-lg mx-auto mb-3">{icon}</span>}
      <p className="font-semibold text-foreground">{title}</p>
      {hint && <p className="mt-1 text-sm">{hint}</p>}
    </div>
  );
}

const TONES = {
  neutral: "bg-muted text-muted-foreground",
  brand: "bg-accent text-accent-foreground",
  danger: "bg-danger/15 text-danger",
  warn: "bg-warn/20 text-warn",
  info: "bg-info/15 text-info",
  ok: "bg-ok/15 text-ok",
} as const;

/** Always pass text: colour is never the only signal. */
export function Pill({ tone = "neutral", children, className }: {
  tone?: keyof typeof TONES; children: ReactNode; className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", TONES[tone], className)}>
      {children}
    </span>
  );
}

export function RoleBar({ role, actor, onActor }: { role: Role; actor: string; onActor: (v: string) => void }) {
  const Icon = role === "host" ? KeyRound : Brush;
  return (
    <div className="no-print flex items-center gap-2 rounded-xl border bg-card p-2 shadow-[var(--shadow-rest)]">
      <Pill tone={role === "host" ? "brand" : "neutral"}>
        <Icon className="size-3.5" aria-hidden /> Viewing as {role}
      </Pill>
      <Input
        aria-label="Your name"
        placeholder="Your name"
        value={actor}
        onChange={(e) => onActor(e.target.value)}
        className="h-10 flex-1"
      />
    </div>
  );
}