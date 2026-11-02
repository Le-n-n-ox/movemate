import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const base =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg px-4 text-base font-medium shadow-xs transition-colors active:scale-[0.98]";
const variants = {
  default: "bg-primary text-primary-foreground hover:opacity-90",
  outline: "border border-input bg-card text-foreground hover:bg-accent",
};

type Common = { variant?: keyof typeof variants; className?: string; children: ReactNode };

/** In-app link styled as a button. */
export function LinkButton({ to, variant = "default", className, children }: Common & { to: string }) {
  return <Link to={to} className={cn(base, variants[variant], className)}>{children}</Link>;
}

/** External link (new tab) styled as a button. */
export function AnchorButton({ href, variant = "default", className, children }: Common & { href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={cn(base, variants[variant], className)}>
      {children}
    </a>
  );
}

/** Same-page anchor (#section) styled as a button. */
export function HashButton({ href, variant = "default", className, children }: Common & { href: string }) {
  return <a href={href} className={cn(base, variants[variant], className)}>{children}</a>;
}