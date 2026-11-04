import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Brush, KeyRound, Users, type LucideIcon } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Choice = "host" | "cleaner" | "guest";

const OPTIONS: { id: Choice; icon: LucideIcon; name: string; text: string }[] = [
  { id: "host", icon: KeyRound, name: "Host", text: "Set up the home, review problems, decide if it is ready." },
  { id: "cleaner", icon: Brush, name: "Cleaner", text: "Walk the checklist and film rooms." },
  { id: "guest", icon: Users, name: "Guest", text: "Get help with an appliance. You need your guest link." },
];

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
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border bg-card p-0 text-card-foreground shadow-2xl open:animate-in open:fade-in-0 open:zoom-in-95"
    >
      <div className="space-y-4 p-5">
        {step === "pick" ? (
          <>
            <div>
              <h2 id="role-title" className="text-xl font-bold">Who are you?</h2>
              <p className="text-sm text-muted-foreground">This only changes what you see. It is not a login.</p>
            </div>
            <div className="space-y-2">
              {OPTIONS.map(({ id, icon: Icon, name, text }) => (
                <button
                  key={id} type="button" onClick={() => choose(id)}
                  className="grid min-h-16 w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-accent active:scale-[0.99] sm:grid-cols-[auto_minmax(0,1fr)_auto]"
                >
                  <span className="col-start-1 row-start-1 grid size-11 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="col-span-2 row-start-2 min-w-0 break-words sm:col-span-1 sm:col-start-2 sm:row-start-1">
                    <span className="block font-semibold">{name}</span>
                    <span className="block text-sm text-muted-foreground">{text}</span>
                  </span>
                  <ArrowRight className="col-start-2 row-start-1 mt-1 size-5 shrink-0 justify-self-end text-muted-foreground sm:col-start-3" aria-hidden />
                </button>
              ))}
            </div>
            <Button variant="ghost" className="btn-tap w-full" onClick={() => ref.current?.close()}>Cancel</Button>
          </>
        ) : (
          <form onSubmit={goGuest} className="space-y-4">
            <div>
              <h2 id="role-title" className="text-xl font-bold">Your guest link</h2>
              <p className="text-sm text-muted-foreground">Your host sent you a link. Paste it here, or enter the code at the end of it.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="guest-token">Guest link or code</Label>
              <Input id="guest-token" className="h-12" autoFocus autoCapitalize="none" autoCorrect="off"
                value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
            {error && <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="outline" className="btn-tap" onClick={() => { setStep("pick"); setError(null); }}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button type="submit" className="btn-tap" disabled={busy}>{busy ? "Checking..." : "Continue"}</Button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}