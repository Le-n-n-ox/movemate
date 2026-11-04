import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { AlertTriangle, ChevronLeft, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileNav } from "@/components/MobileNav";
import { PageTransition } from "@/components/motion/PageTransition";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

export function Shell({ title, back, backLabel = "Back", right, children }: {
  title: string; back?: string; backLabel?: string; right?: ReactNode; children: ReactNode;
}) {
  return (
    <>
    <main id="main" className="page">
      <header className="no-print flex items-center justify-between gap-2">
        {back ? (
          <Link to={back} className="inline-flex min-h-12 items-center gap-1 text-sm font-medium text-primary">
            <ChevronLeft className="size-5" aria-hidden /> {backLabel}
          </Link>
        ) : <span />}
        <div className="flex items-center gap-1">
          <Link to="/start" className="inline-flex min-h-12 items-center text-sm font-medium text-primary hover:underline">Switch role</Link>
          {right}
          <ThemeToggle />
        </div>
      </header>
      <ConnectionBanner />
      <h1 className="min-w-0 break-words font-display text-3xl font-extrabold tracking-tight">{title}</h1>
      <PageTransition className="space-y-4">{children}</PageTransition>
      <MobileNav />
    </main>
    </>
  );
}

export function ConnectionBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const off = () => setOffline(true); const on = () => setOffline(false);
    window.addEventListener("mm-offline", off); window.addEventListener("mm-online", on);
    const iv = setInterval(() => { fetch(`${import.meta.env.VITE_API_URL || ""}/api/health`).then((r) => { if (r.ok) setOffline(false); }).catch(() => setOffline(true)); }, 5000);
    return () => { window.removeEventListener("mm-offline", off); window.removeEventListener("mm-online", on); clearInterval(iv); };
  }, []);
  if (!offline) return null;
  return <div className="sticky top-0 z-50 rounded-xl bg-danger px-3 py-2 text-sm font-medium text-danger-foreground" role="alert">Can't reach the server. Retrying... {import.meta.env.DEV ? `API: ${import.meta.env.VITE_API_URL || "same-origin"}` : ""}</div>;
}

export function ErrorNote({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={"notice-danger flex items-start gap-3 " + (className ?? "")}>
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

export function EmptyState({ icon, title, hint, action }: {
  icon?: ReactNode; title: string; hint?: string; action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
      {icon && <div className="mb-2 flex justify-center">{icon}</div>}
      <p className="font-medium text-foreground">{title}</p>
      {hint && <p className="mt-1 text-sm">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
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
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", TONES[tone], className)}>
      {children}
    </span>
  );
}

export function RoleBar({ role, actor, onActor }: { role: Role; actor: string; onActor: (v: string) => void }) {
  return (
    <div className="no-print grid min-w-0 grid-cols-1 items-center gap-2 rounded-xl bg-secondary p-2 sm:grid-cols-[auto_minmax(0,1fr)]">
      <Pill tone={role === "host" ? "brand" : "neutral"}>Viewing as {role}</Pill>
      <Input
        aria-label="Your name"
        placeholder="Your name"
        value={actor}
        onChange={(e) => onActor(e.target.value)}
        className="h-12 min-w-0 w-full bg-card"
      />
    </div>
  );
}
