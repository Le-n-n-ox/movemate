import { NavLink, useLocation, useSearchParams } from "react-router-dom";
import { ClipboardCheck, FolderOpen, Home, KeyRound, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { cn } from "@/lib/utils";

/**
 * Bottom navigation for the host flow on phones.
 *
 * Only rendered for hosts - the cleaner and guest flows are single-purpose and
 * do not need a tab bar. Inside a property the bar switches to that property's
 * sections, so the common jumps are one tap away without scrolling.
 */
type Item = { to: string; label: string; icon: LucideIcon; active: boolean };

function propertyId(pathname: string): string | null {
  const m = pathname.match(/^\/properties\/([^/?#]+)/);
  return m ? m[1] : null;
}

export function MobileNav() {
  const { role, withRole } = useRole();
  const { pathname } = useLocation();
  const [params] = useSearchParams();

  if (role !== "host") return null;

  const pid = propertyId(pathname);
  const tab = params.get("tab") ?? "rooms";
  const onProperty = pathname === `/properties/${pid}`;

  const items: Item[] = pid
    ? [
        { to: withRole(`/properties/${pid}?tab=rooms`), label: "Rooms", icon: Home, active: onProperty && tab === "rooms" },
        { to: withRole(`/properties/${pid}?tab=inspections`), label: "Checks", icon: ClipboardCheck, active: onProperty && tab === "inspections" },
        { to: withRole(`/properties/${pid}/cases`), label: "Cases", icon: FolderOpen, active: pathname.startsWith(`/properties/${pid}/cases`) },
        { to: withRole(`/properties/${pid}?tab=guests`), label: "Guests", icon: Users, active: onProperty && tab === "guests" },
      ]
    : [
        { to: withRole("/properties"), label: "Homes", icon: Home, active: pathname === "/properties" && tab === "rooms" },
        { to: withRole("/properties?tab=inspections"), label: "Checks", icon: KeyRound, active: pathname === "/properties" && tab === "inspections" },
        { to: withRole("/start"), label: "Switch", icon: Users, active: pathname === "/start" },
      ];

  return (
    <nav
      aria-label="Main"
      className="no-print fixed inset-x-0 bottom-0 z-sticky border-t bg-card/95 backdrop-blur-md md:hidden"
      data-allow-overlap
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="mx-auto flex max-w-2xl items-stretch justify-around">
        {items.map(({ to, label, icon: Icon, active }) => (
          <li key={label} className="min-w-0 flex-1">
            <NavLink
              to={to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-0 min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 text-xs font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" aria-hidden />
              <span className="break-words text-center">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
