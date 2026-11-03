import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Brush, KeyRound, Link2, Loader2, Users, type LucideIcon } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Choice = "host" | "cleaner" | "guest";

const OPTIONS: { id: Choice; icon: LucideIcon; name: string; text: string; note?: string }[] = [
  { id: "host", icon: KeyRound, name: "Host", text: "Set up the home, review problems, decide if it is ready." },
  { id: "cleaner", icon: Brush, name: "Cleaner", text: "Walk the checklist and film rooms." },
  { id: "guest", icon: Users, name: "Guest", text: "Get help with an appliance.", note: "Needs your guest link" },
];

const EASE: [number, number, number, number] = [0.2, 0.7, 0.2, 1];
const LIST = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } };
const ITEM = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } } };

/* decorative: three overlapping role badges */
function RoleBadges() {
  return (
    <div className="flex items-center justify-center" aria-hidden>
      {[KeyRound, Brush, Users].map((Icon, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, scale: 0.5, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.1 + i * 0.08 }}
          className={`tile grid size-12 place-items-center rounded-full ring-4 ring-card ${i > 0 ? "-ml-3" : ""}`}
          style={{ zIndex: 3 - i }}
        >
          <Icon className="size-5" />
        </motion.span>
      ))}
    </div>
  );
}

function Steps({ step }: { step: "pick" | "guest" }) {
  return (
    <div className="flex items-center justify-center gap-1.5" aria-hidden>
      {(["pick", "guest"] as const).map((s) => (
        <span
          key={s}
          className={`h-1.5 rounded-full transition-all duration-300 ${step === s ? "w-6 bg-primary" : "w-1.5 bg-border"}`}
        />
      ))}
    </div>
  );
}

export function RolePicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const nav = useNavigate();
  const [step, setStep] = useState<"pick" | "guest">("pick");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  function closed() {
    setStep("pick"); setValue(""); setError(null);
    onClose();
  }

  function choose(id: Choice) {
    if (id === "guest") { setStep("guest"); return; }
    nav(`/properties?role=${id}`);
    ref.current?.close();
  }

  async function goGuest(e: React.FormEvent) {
    e.preventDefault();
    const m = value.match(/\/g\/([^/?#\s]+)/); // accept a pasted full link or a bare code
    const token = (m ? m[1] : value).trim();
    if (!token) return setError("Please enter your guest link or code.");
    setBusy(true); setError(null);
    try {
      await api.guest(token);
      nav(`/g/${token}`);
      ref.current?.close();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <dialog
      ref={ref}
      onClose={closed}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      aria-labelledby="role-title"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto overflow-x-hidden rounded-2xl border bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm open:animate-in open:fade-in-0 open:zoom-in-95"
    >
      {/* Mounted only while open, so the entrance animations play every time it opens. */}
      {open && (
        <div className="hero-glow relative">
          <div className="space-y-5 p-6">
            <RoleBadges />
            <AnimatePresence mode="wait" initial={false}>
              {step === "pick" ? (
                <motion.div
                  key="pick"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.22, ease: EASE }}
                  className="space-y-5"
                >
                  <div className="space-y-1 text-center">
                    <h2 id="role-title" className="font-display text-2xl font-extrabold tracking-tight">Who are you?</h2>
                    <p className="mx-auto max-w-xs text-sm text-muted-foreground">
                      Pick what fits. This only changes what you see. It is not a login.
                    </p>
                  </div>
                  <motion.div className="space-y-2.5" variants={LIST} initial="hidden" animate="show">
                    {OPTIONS.map(({ id, icon: Icon, name, text, note }) => (
                      <motion.div key={id} variants={ITEM}>
                        {/* wrapper animates the entrance; the button keeps its CSS hover and press */}
                        <button type="button" onClick={() => choose(id)} className="group row-link w-full text-left">
                          <span className="icon-badge icon-badge-lg tile transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110">
                            <Icon className="size-5" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="font-display text-lg font-bold">{name}</span>
                              {note && (
                                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">{note}</span>
                              )}
                            </span>
                            <span className="block text-sm text-muted-foreground">{text}</span>
                          </span>
                          <ArrowRight className="row-chevron size-5 shrink-0 text-muted-foreground" aria-hidden />
                        </button>
                      </motion.div>
                    ))}
                  </motion.div>
                  <Button variant="ghost" className="btn-tap w-full" onClick={() => ref.current?.close()}>Cancel</Button>
                </motion.div>
              ) : (
                <motion.form
                  key="guest"
                  onSubmit={goGuest}
                  noValidate
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.22, ease: EASE }}
                  className="space-y-4"
                >
                  <div className="space-y-1 text-center">
                    <h2 id="role-title" className="font-display text-2xl font-extrabold tracking-tight">Your guest link</h2>
                    <p className="mx-auto max-w-xs text-sm text-muted-foreground">
                      Your host sent you a link. Paste it here, or enter the code at the end of it.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="guest-token">Guest link or code</Label>
                    <div className="relative">
                      <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                      <Input
                        id="guest-token" className="h-12 pl-9" autoFocus autoCapitalize="none" autoCorrect="off"
                        aria-invalid={!!error} aria-describedby={error ? "guest-error" : "guest-hint"}
                        value={value} onChange={(e) => setValue(e.target.value)}
                      />
                    </div>
                    <p id="guest-hint" className="text-xs text-muted-foreground">The code is the part after /g/ in the link.</p>
                  </div>
                  <AnimatePresence>
                    {error && (
                      <motion.p
                        key={error}
                        id="guest-error"
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
                  <div className="grid grid-cols-2 gap-3">
                    <Button type="button" variant="outline" className="btn-tap" onClick={() => { setStep("pick"); setError(null); }}>
                      <ArrowLeft className="size-4" /> Back
                    </Button>
                    <Button type="submit" className="btn-tap" disabled={busy}>
                      {busy ? <><Loader2 className="size-4 animate-spin" /> Checking...</> : <>Continue <ArrowRight className="size-4" /></>}
                    </Button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
            <Steps step={step} />
          </div>
        </div>
      )}
    </dialog>
  );
}