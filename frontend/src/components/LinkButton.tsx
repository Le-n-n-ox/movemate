import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const base =
  "inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-base font-medium shadow-sm transition-all hover:shadow-md active:scale-95";
const variants = {
  default: "bg-primary text-primary-foreground hover:brightness-95",
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

/** Plain button styled like the others. */
export function ActionButton({ onClick, variant = "default", className, children }: Common & { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn(base, variants[variant], className)}>
      {children}
    </button>
  );
}