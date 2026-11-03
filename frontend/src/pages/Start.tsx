import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Brush, KeyRound, Link2, Loader2, RotateCcw, Users, type LucideIcon } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Choice = "host" | "cleaner" | "guest";

const LAST_KEY = "movemate_last_role";
const EASE = [0.2, 0.7, 0.2, 1] as const;

const CARDS: { id: Choice; icon: LucideIcon; title: string; line: string; note?: string }[] = [
  { id: "host", icon: KeyRound, title: "Host", line: "Manage your property, review issues, and see if it's ready." },
  { id: "cleaner", icon: Brush, title: "Cleaner", line: "Open today's checklist and record rooms." },
  { id: "guest", icon: Users, title: "Guest", line: "Need help with an appliance or checking out?", note: "Needs your stay link" },
];

const ICONS: Record<Choice, LucideIcon> = { host: KeyRound, cleaner: Brush, guest: Users };

const LIST = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } } };
const ITEM = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } };

function readLast(): Choice | null {
  try {
    const v = localStorage.getItem(LAST_KEY);
    return v === "host" || v === "cleaner" || v === "guest" ? v : null;
  } catch {
    return null;
  }
}

function writeLast(c: Choice) {
  try { localStorage.setItem(LAST_KEY, c); } catch { /* ignore */ }
}

function extractToken(raw: string): string | null {
  const m = raw.match(/\/g\/([^/?#\s]+)/);
  if (m) return m[1].trim();
  const t = raw.trim();
  return t ? t : null;
}

export default function Start() {
  const nav = useNavigate();
  const [expanded, setExpanded] = useState<Choice | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<Choice | null>(null);

  useEffect(() => { setLast(readLast()); }, []);

  function choose(id: Choice) {
    if (id === "guest") {
      setExpanded((e) => (e === "guest" ? null : "guest"));
      setError(null);
      return;
    }
    writeLast(id);
    setLast(id);
    if (id === "host") nav("/properties?role=host");
    else nav("/cleaner?role=cleaner");
  }

  async function goGuest(e: React.FormEvent) {
    e.preventDefault();
    const token = extractToken(value);
    if (!token) { setError("Please enter your stay link or code."); return; }
    setBusy(true); setError(null);
    try {
      await api.guest(token);
      writeLast("guest");
      nav(`/g/${token}`);
    } catch (err) {
      setError((err as Error).message || "That link doesn't look right. Please check and try again.");
    } finally {
      setBusy(false);
    }
  }

  const LastIcon = last ? ICONS[last] : null;
  const lastName = last ? last.charAt(0).toUpperCase() + last.slice(1) : "";

  return (
    <MotionConfig reducedMotion="user">
      <div className="hero-glow relative isolate min-h-dvh overflow-hidden bg-background text-foreground">
        <div className="bg-grid absolute inset-0 -z-10" aria-hidden />
        <div className="mx-auto w-full max-w-[560px] px-4 py-6 sm:py-10">
          <motion.header
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}
            className="mb-8 flex items-center gap-2.5"
          >
            <span className="icon-badge tile size-10 text-lg font-extrabold">M</span>
            <span className="font-display text-xl font-bold tracking-tight">MoveMate</span>
          </motion.header>

          <AnimatePresence>
            {last && LastIcon && (
              <motion.button
                type="button"
                onClick={() => choose(last)}
                initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="row-link group mb-5 w-full text-left focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="icon-badge bg-primary text-primary-foreground transition-transform duration-300 group-hover:-rotate-90">
                  <RotateCcw className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last time</span>
                  <span className="flex items-center gap-1.5 font-display text-lg font-bold">
                    Continue as {lastName} <LastIcon className="size-4 text-primary" aria-hidden />
                  </span>
                </span>
                <ArrowRight className="row-chevron size-5 shrink-0 text-muted-foreground" aria-hidden />
              </motion.button>
            )}
          </AnimatePresence>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05, ease: EASE }}>
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">Welcome to MoveMate</h1>
            <p className="mt-2 text-lg text-muted-foreground">Choose how you'll use it today.</p>
          </motion.div>

          <motion.div className="mt-8 space-y-3" variants={LIST} initial="hidden" animate="show">
            {CARDS.map(({ id, icon: Icon, title, line, note }) => {
              const open = id === "guest" && expanded === "guest";
              return (
                <motion.div key={id} variants={ITEM}>
                  <button
                    type="button"
                    onClick={() => choose(id)}
                    aria-expanded={id === "guest" ? open : undefined}
                    className={`row-link group min-h-[92px] w-full rounded-2xl p-4 text-left focus-visible:ring-2 focus-visible:ring-primary ${open ? "border-primary/60" : ""}`}
                  >
                    <span className="icon-badge icon-badge-lg tile size-14 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                      <Icon className="size-6" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-xl font-bold">{title}</span>
                        {note && (
                          <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">{note}</span>
                        )}
                      </span>
                      <span className="block text-sm text-muted-foreground">{line}</span>
                    </span>
                    <ArrowRight
                      className={`row-chevron size-5 shrink-0 text-muted-foreground ${open ? "rotate-90 text-primary" : ""}`}
                      aria-hidden
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        key="guest-form"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: EASE }}
                        className="overflow-hidden"
                      >
                        <form onSubmit={goGuest} className="card-info relative mt-3 space-y-3 overflow-hidden rounded-2xl border bg-card p-4" style={{ boxShadow: "var(--shadow-rest)" }}>
                          <div className="space-y-1.5">
                            <Label htmlFor="stay-link">Enter your stay link or code</Label>
                            <div className="relative">
                              <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                              <Input
                                id="stay-link"
                                className="h-12 pl-9"
                                autoFocus
                                autoCapitalize="none"
                                autoCorrect="off"
                                placeholder="https://.../g/abc123 or just the code"
                                aria-invalid={!!error}
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                              />
                            </div>
                          </div>
                          <AnimatePresence>
                            {error && (
                              <motion.p
                                role="alert"
                                initial={{ opacity: 0, x: 0 }}
                                animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.4 }}
                                className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
                              >
                                {error}
                              </motion.p>
                            )}
                          </AnimatePresence>
                          <p className="text-xs text-muted-foreground">Your host sent it in your booking message.</p>
                          <div className="flex gap-3">
                            <Button type="button" variant="outline" className="btn-tap flex-1" onClick={() => { setExpanded(null); setError(null); setValue(""); }}>
                              <ArrowLeft className="size-4" /> Back
                            </Button>
                            <Button type="submit" className="btn-tap flex-1" disabled={busy}>
                              {busy ? <><Loader2 className="size-4 animate-spin" /> Checking...</> : <>Continue <ArrowRight className="size-4" /></>}
                            </Button>
                          </div>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.footer
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="mt-10 space-y-3 text-center text-sm text-muted-foreground"
          >
            <a href="/" className="font-medium underline-offset-4 transition-colors hover:text-primary hover:underline">Back to home</a>
            <p className="text-xs">Sign-in is coming soon. For now, choose your role.</p>
          </motion.footer>
        </div>
      </div>
    </MotionConfig>
  );
}