import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[560px] px-4 py-6 sm:py-10">
        <header className="mb-6 flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-accent text-accent-foreground font-bold">M</span>
          <span className="text-lg font-semibold">MoveMate</span>
        </header>

        {continueLabel && last && (
          <button
            type="button"
            onClick={() => choose(last)}
            className="mb-4 flex min-h-12 w-full items-center justify-between rounded-xl border bg-card px-4 py-3 text-left shadow-sm transition hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="font-medium">{continueLabel}</span>
            <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
          </button>
        )}

        <h1 className="text-2xl font-bold tracking-tight">Welcome to MoveMate</h1>
        <p className="mt-1 text-muted-foreground">Choose how you'll use it today.</p>

        <div className="mt-6 space-y-3">
          {CARDS.map(({ id, icon: Icon, title, line, color }) => (
            <div key={id}>
              <button
                type="button"
                onClick={() => choose(id)}
                aria-expanded={id === "guest" ? expanded === "guest" : undefined}
                className="flex min-h-[88px] w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${color}`}>
                  <Icon className="size-6" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold">{title}</span>
                  <span className="block text-sm text-muted-foreground">{line}</span>
                </span>
                <ArrowRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              </button>

              {id === "guest" && expanded === "guest" && (
                <form onSubmit={goGuest} className="mt-3 space-y-3 rounded-2xl border bg-card p-4">
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
                  {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
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
            </div>
          ))}
        </div>

        <footer className="mt-8 space-y-3 text-center text-sm text-muted-foreground">
          <a href="/" className="underline-offset-4 hover:underline">Back to home</a>
          <p className="text-xs">Sign-in is coming soon. For now, choose your role.</p>
        </footer>
      </div>
    </div>
  );
}
