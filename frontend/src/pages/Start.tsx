import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, Brush, KeyRound, Users } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Choice = "host" | "cleaner" | "guest";

const LAST_KEY = "movemate_last_role";

const CARDS: { id: Choice; icon: typeof KeyRound; title: string; line: string; color: string }[] = [
  { id: "host", icon: KeyRound, title: "Host", line: "Manage your property, review issues, and see if it's ready.", color: "bg-accent text-primary" },
  { id: "cleaner", icon: Brush, title: "Cleaner", line: "Open today's checklist and record rooms.", color: "bg-secondary text-secondary-foreground" },
  { id: "guest", icon: Users, title: "Guest", line: "Need help with an appliance or checking out? Use your stay link.", color: "bg-accent text-primary" },
];

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

  const continueLabel = last ? `Continue as ${last.charAt(0).toUpperCase() + last.slice(1)}` : null;

  return (
    <div className="min-h-screen text-foreground">
      <div className="mx-auto w-full max-w-[560px] px-4 py-6 sm:py-10">
        <header className="mb-6 flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground transition-transform hover:scale-110">
            <KeyRound className="size-5" />
          </div>
          <span className="text-lg font-semibold font-display tracking-tight">MoveMate</span>
        </header>

        {continueLabel && last && (
          <button
            type="button"
            onClick={() => choose(last)}
            className="selection-card mb-4 flex min-h-12 w-full items-center justify-between px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="font-medium">{continueLabel}</span>
            <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
          </button>
        )}

        <h1 className="text-2xl font-bold tracking-tight">Welcome to MoveMate</h1>
        <p className="mt-1 text-muted-foreground">Choose how you'll use it today.</p>

        <div className="mt-6 space-y-3">
          {CARDS.map(({ id, icon: Icon, title, line, color }, i) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i }}
            >
              <button
                type="button"
                onClick={() => choose(id)}
                aria-expanded={id === "guest" ? expanded === "guest" : undefined}
                className="selection-card grid min-h-[88px] w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-4 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[auto_minmax(0,1fr)_auto]"
              >
                <span className={`col-start-1 row-start-1 grid size-12 shrink-0 place-items-center rounded-xl ${color}`}>
                  <Icon className="size-6" aria-hidden />
                </span>
                <span className="col-span-2 row-start-2 min-w-0 break-words sm:col-span-1 sm:col-start-2 sm:row-start-1">
                  <span className="block text-base font-semibold">{title}</span>
                  <span className="block text-sm text-muted-foreground">{line}</span>
                </span>
                <ArrowRight className="col-start-2 row-start-1 mt-1 size-5 shrink-0 justify-self-end text-muted-foreground sm:col-start-3" aria-hidden />
              </button>

              {id === "guest" && expanded === "guest" && (
                <form onSubmit={goGuest} className="panel mt-3 space-y-3 p-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="stay-link">Enter your stay link or code</Label>
                    <Input
                      id="stay-link"
                      className="h-12"
                      autoFocus
                      autoCapitalize="none"
                      autoCorrect="off"
                      placeholder="https://.../g/abc123 or just the code"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                    />
                  </div>
                  {error && <p role="alert" className="notice-danger">{error}</p>}
                  <p className="text-xs text-muted-foreground">Your host sent it in your booking message.</p>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="btn-tap flex-1" onClick={() => { setExpanded(null); setError(null); setValue(""); }}>
                      Back
                    </Button>
                    <Button type="submit" className="btn-tap flex-1" disabled={busy}>
                      {busy ? "Checking..." : "Continue"}
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          ))}
        </div>

        <footer className="mt-8 space-y-3 text-center text-sm text-muted-foreground">
          <a href="/" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">Back to home</a>
          <p className="text-xs">Sign-in is coming soon. For now, choose your role.</p>
        </footer>
      </div>
    </div>
  );
}
