import { motion } from "motion/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, Check, Sparkles } from "lucide-react";
import { HashButton } from "@/components/LinkButton";
import { ThemeToggle } from "@/components/ThemeToggle";

export function LandingHeader() {
  const [openRolePicker, setOpenRolePicker] = useState(false);
  const [guestToken, setGuestToken] = useState("");
  const navigate = useNavigate();
  const pick = (role: "host" | "cleaner" | "guest") => {
    setOpenRolePicker(false);
    if (role === "guest") {
      if (guestToken.trim()) navigate(`/g/${guestToken.trim()}`);
      return;
    }
    navigate(`/properties?role=${role}`);
  };
  return (
    <header className="glass sticky z-40" style={{ top: "env(safe-area-inset-top, 0px)" }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2">
        <a href="#top" className="flex min-h-12 items-center gap-2 font-bold">
          <img src="/icon.svg" alt="" className="size-8 rounded-lg" /> MoveMate
        </a>
        <nav className="hidden items-center gap-6 text-sm font-medium sm:flex" aria-label="Sections">
          <a href="#features" className="hover:text-primary">Features</a>
          <a href="#how" className="hover:text-primary">How it works</a>
          <a href="#roles" className="hover:text-primary">Who it is for</a>
        </nav>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button onClick={() => setOpenRolePicker(true)} className="inline-flex min-h-12 w-auto items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground shadow-xs transition-colors hover:opacity-90 active:scale-[0.98]">Open app</button>
        </div>
      </div>
      {openRolePicker && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setOpenRolePicker(false)}>
          <div className="w-full max-w-sm space-y-3 rounded-2xl border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Sign in as</h2>
            <p className="text-sm text-muted-foreground">Choose your role to continue.</p>
            <button onClick={() => pick("host")} className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground">Host</button>
            <button onClick={() => pick("cleaner")} className="w-full rounded-lg border px-4 py-3 font-medium">Cleaner</button>
            <input value={guestToken} onChange={(e) => setGuestToken(e.target.value)} placeholder="Guest link token" className="w-full rounded-lg border px-4 py-3" />
            <button onClick={() => pick("guest")} className="w-full rounded-lg border px-4 py-3 font-medium">Guest</button>
            <button onClick={() => setOpenRolePicker(false)} className="w-full text-sm text-muted-foreground">Cancel</button>
          </div>
        </div>
      )}
    </header>
  );
}

const ROWS = [
  { room: "Living room", note: "All items checked", Icon: Check, tone: "bg-ok/15 text-ok" },
  { room: "Kitchen", note: "1 case, cleaner found it", Icon: AlertTriangle, tone: "bg-warn/20 text-amber-800 dark:text-amber-300" },
  { room: "Bathroom", note: "Low stock: toilet paper", Icon: AlertTriangle, tone: "bg-warn/20 text-amber-800 dark:text-amber-300" },
];

function PhoneMock() {
  return (
    <div className="relative mx-auto w-full max-w-[19rem]" aria-hidden>
      <div className="animate-float rounded-[2.5rem] border-[10px] border-foreground/90 bg-background p-4 shadow-2xl dark:border-foreground/30">
        <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-muted" />
        <div className="space-y-3">
          <div className="rounded-2xl bg-warn/20 p-4 text-center">
            <p className="text-xs text-muted-foreground">Readiness</p>
            <p className="text-xl font-extrabold">Ready with exceptions</p>
          </div>
          {ROWS.map(({ room, note, Icon, tone }, i) => (
            <motion.div
              key={room}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.15, duration: 0.4 }}
              className="flex items-center gap-3 rounded-xl border bg-card p-3"
            >
              <span className={`grid size-8 shrink-0 place-items-center rounded-full ${tone}`}>
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 text-sm">
                <span className="block font-semibold">{room}</span>
                <span className="block truncate text-xs text-muted-foreground">{note}</span>
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
      <div className="animate-float-slow absolute -left-6 top-24 hidden rounded-xl border bg-card px-3 py-2 text-xs font-medium shadow-lg sm:block">
        Cleaner says it was found
      </div>
      <div className="animate-float absolute -right-6 bottom-20 hidden rounded-xl border bg-card px-3 py-2 text-xs font-medium shadow-lg sm:block">
        Host to review
      </div>
    </div>
  );
}

export function Hero() {
  const [openRolePicker, setOpenRolePicker] = useState(false);
  const [guestToken, setGuestToken] = useState("");
  const navigate = useNavigate();
  const pick = (role: "host" | "cleaner" | "guest") => {
    setOpenRolePicker(false);
    if (role === "guest") {
      if (guestToken.trim()) navigate(`/g/${guestToken.trim()}`);
      return;
    }
    navigate(`/properties?role=${role}`);
  };
  return (
    <section id="top" className="relative isolate overflow-hidden">
      <div className="bg-grid absolute inset-0 -z-10" aria-hidden />
      <div className="animate-float-slow absolute left-1/2 top-0 -z-10 size-[28rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" aria-hidden />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 lg:grid-cols-2 lg:py-24">
        <div className="space-y-6">
          <motion.p
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm font-medium"
          >
            <Sparkles className="size-4 text-primary" aria-hidden /> Built for short-term rental hosts
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
            className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl"
          >
            Know your home is <span className="text-gradient animate-gradient">ready</span> before the next guest arrives.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
            className="max-w-xl text-lg text-muted-foreground"
          >
            Scan your home once. Check it after every stay. See clearly what is wrong and whether it is ready.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}
            className="flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <button onClick={() => setOpenRolePicker(true)} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground shadow-xs transition-colors hover:opacity-90 active:scale-[0.98] sm:w-auto">Open the app <ArrowRight className="size-5" /></button>
            <HashButton href="#how" variant="outline">See how it works</HashButton>
          </motion.div>
        </div>
        <PhoneMock />
      </div>
      {openRolePicker && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setOpenRolePicker(false)}>
          <div className="w-full max-w-sm space-y-3 rounded-2xl border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Sign in as</h2>
            <p className="text-sm text-muted-foreground">Choose your role to continue.</p>
            <button onClick={() => pick("host")} className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground">Host</button>
            <button onClick={() => pick("cleaner")} className="w-full rounded-lg border px-4 py-3 font-medium">Cleaner</button>
            <input value={guestToken} onChange={(e) => setGuestToken(e.target.value)} placeholder="Guest link token" className="w-full rounded-lg border px-4 py-3" />
            <button onClick={() => pick("guest")} className="w-full rounded-lg border px-4 py-3 font-medium">Guest</button>
            <button onClick={() => setOpenRolePicker(false)} className="w-full text-sm text-muted-foreground">Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}