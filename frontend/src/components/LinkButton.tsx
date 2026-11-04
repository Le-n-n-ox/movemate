import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const base =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold";
const variants = {
  default: "bg-primary text-primary-foreground",
  outline: "border border-input bg-card text-foreground",
};

type Variant = keyof typeof variants;
type Common = { variant?: Variant; className?: string; children: ReactNode };

const attrs = (v: Variant) => ({ "data-slot": "button", "data-variant": v }) as const;

/** In-app link styled as a button. */
export function LinkButton({ to, variant = "default", className, children }: Common & { to: string }) {
  return <Link to={to} {...attrs(variant)} className={cn(base, variants[variant], className)}>{children}</Link>;
}

/** External link (new tab) styled as a button. */
export function AnchorButton({ href, variant = "default", className, children }: Common & { href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" {...attrs(variant)} className={cn(base, variants[variant], className)}>
      {children}
    </a>
  );
}

/** Same-page anchor (#section) styled as a button. */
export function HashButton({ href, variant = "default", className, children }: Common & { href: string }) {
  return <a href={href} {...attrs(variant)} className={cn(base, variants[variant], className)}>{children}</a>;
}

/** Plain button styled like the others. */
export function ActionButton({ onClick, variant = "default", className, children }: Common & { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} {...attrs(variant)} className={cn(base, variants[variant], className)}>
      {children}
    </button>
  );
}