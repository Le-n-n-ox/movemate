import { MotionConfig, motion } from "motion/react";
import { AlertTriangle, Check } from "lucide-react";
import { ActionButton, HashButton } from "@/components/LinkButton";
import { ThemeToggle } from "@/components/ThemeToggle";



const NAV = [
  { href: "#why", label: "Why" },
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#compare", label: "Compared" },
  { href: "#roles", label: "Who it’s for" },
];

export function LandingHeader({ onOpenApp }: { onOpenApp: () => void }) {
  return (
    <header className="glass" data-allow-overlap style={{ top: "env(safe-area-inset-top, 0px)" }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2">
        <a href="#top" className="flex min-h-12 items-center gap-2 font-display text-lg font-bold tracking-tight">
          <img src="/icon.svg" alt="" className="size-8 rounded-lg" /> MoveMate
        </a>
        <nav className="hidden items-center gap-5 text-sm font-medium lg:flex" aria-label="Sections">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="flex min-h-12 items-center text-muted-foreground underline-offset-8 transition-colors hover:text-foreground hover:underline decoration-primary decoration-2"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <ActionButton onClick={onOpenApp} className="w-auto">Open app</ActionButton>
        </div>
      </div>
    </header>
  );
}

const ROWS = [
  { room: "Living room", note: "Everything is in place", Icon: Check, tone: "bg-ok/15 text-ok" },
  { room: "Kitchen", note: "Wine glass missing. Reported by cleaner", Icon: AlertTriangle, tone: "bg-danger/15 text-danger" },
  { room: "Bathroom", note: "Toilet paper below minimum", Icon: AlertTriangle, tone: "bg-warn/20 text-warn" },
];

function PhoneMock() {
  return (
    <div className="pointer-events-none min-w-0 w-full" aria-hidden="true">
      <div className="mx-auto w-full max-w-[19rem] rounded-[2.5rem] border-2 border-border bg-background p-4 shadow-lg">
        <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-muted" />
        <div className="space-y-3">
          <div className="rounded-2xl bg-accent p-4 text-center">
            <p className="text-xs text-muted-foreground">Next guest arrives Friday</p>
            <p className="font-display text-xl font-extrabold">Ready with exceptions</p>
          </div>
          {ROWS.map(({ room, note, Icon, tone }, i) => (
            <motion.div
              key={room}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + i * 0.15, duration: 0.4 }}
              className="flex items-center gap-3 rounded-xl border bg-card p-3"
            >
              <span className={`grid size-8 shrink-0 place-items-center rounded-full ${tone}`}>
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 text-sm">
                <span className="block font-semibold">{room}</span>
                <span className="block text-xs text-muted-foreground">{note}</span>
              </span>
            </motion.div>
          ))}
          <div className="grid place-items-center pt-1">
            <span className="grid size-10 animate-pulse-ring place-items-center rounded-full bg-primary text-primary-foreground">
              <Check className="size-5" />
            </span>
          </div>
        </div>
      </div>
      <div className="pointer-events-none mt-4 flex flex-wrap justify-center gap-2">
        <span className="rounded-xl border bg-card px-3 py-2 text-xs font-medium shadow-md">
          Cleaner reported this
        </span>
        <span className="rounded-xl border bg-card px-3 py-2 text-xs font-medium shadow-md">
          Waiting for your review
        </span>
      </div>
    </div>
  );
}

const ROLES = [
  ["Hosts", "scan each room and set what belongs there."],
  ["Cleaners", "walk the checklist on their phone after every stay."],
  ["Guests", "see what is in the home through a private link."],
];

export function Hero({ onOpenApp }: { onOpenApp: () => void }) {
  return (
    <MotionConfig reducedMotion="user">
      <section id="top">
        <div className="mx-auto grid max-w-6xl min-w-0 grid-cols-1 items-center gap-12 px-4 pt-16 pb-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] lg:pt-24 lg:pb-24">
          <div className="min-w-0 space-y-7">
            <motion.h1
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="font-display text-[clamp(2.5rem,5vw,4rem)] font-extrabold leading-[1.05] tracking-tight text-balance"
            >
              Is your home ready for the next guest? Know before they arrive.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="max-w-[56ch] text-[1.125rem] leading-relaxed text-muted-foreground"
            >
              Scan each room once. After every stay, a cleaner checks it against your list, and you see what is missing,
              what is damaged and whether the home is ready.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="flex max-w-md flex-wrap gap-3"
            >
              <ActionButton onClick={onOpenApp} className="w-auto shrink-0">Open the app</ActionButton>
              <HashButton href="#how" variant="outline" className="w-auto shrink-0">See how it works</HashButton>
            </motion.div>
            <motion.ul
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
              className="max-w-md space-y-2 border-l-2 border-primary/40 pl-4 text-sm text-muted-foreground"
            >
              {ROLES.map(([who, what]) => (
                <li key={who}><span className="font-semibold text-foreground">{who}</span> {what}</li>
              ))}
            </motion.ul>
          </div>
          <div className="min-w-0"><PhoneMock /></div>
        </div>
      </section>
    </MotionConfig>
  );
}