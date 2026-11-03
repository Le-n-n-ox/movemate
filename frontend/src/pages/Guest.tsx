import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Camera, ChevronDown, Home, ScrollText } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import type { GuestAnswer } from "@/lib/types";
import { ErrorNote } from "@/components/Shell";
import { FilePicker } from "@/components/FilePicker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GuideCards } from "@/components/guest/GuideCards";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Flip to true only after the checkout endpoint is in the shared contract
// (schemas.py, types.ts and docs/API_CONTRACT.md, one PR, both approve).
const CHECKOUT_ENABLED = false;

// Hide a label only when EVERY word is junk ("patterned fabric"), never on a partial match.
const JUNK = new Set(["fabric", "textile", "surface", "patterned", "pattern", "striped", "generic", "material"]);
const isJunk = (label: string) => {
  const words = label.toLowerCase().split(/[\s,-]+/).filter(Boolean);
  return words.length > 0 && words.every((w) => JUNK.has(w));
};

export default function Guest() {
  const { token = "" } = useParams();
  const info = useAsync(() => api.guest(token), [token]);
  const [preview, setPreview] = useState<string | null>(null);
  const [answer, setAnswer] = useState<GuestAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(true);
  const [rulesOpen, setRulesOpen] = useState<boolean>(() => {
    try { return localStorage.getItem("guest_rules_open") !== "false"; } catch { return true; }
  });
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState("");
  const last = useRef<File | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const labels = useMemo(() => (info.data?.item_labels ?? []).filter((l) => !isJunk(l)), [info.data]);

  function toggleRules() {
    const next = !rulesOpen;
    setRulesOpen(next);
    try { localStorage.setItem("guest_rules_open", String(next)); } catch { /* ignore */ }
  }

  async function ask(file: File) {
    last.current = file;
    setPreview(URL.createObjectURL(file));
    setAnswer(null); setError(null); setRetryable(true); setBusy(true);
    try { setAnswer(await api.guestAsk(token, file)); }
    catch (e) {
      setError((e as Error).message);
      setRetryable(!(e instanceof ApiError && e.status === 429)); // rate limited: retrying will not help
    } finally { setBusy(false); }
  }

  if (info.loading) {
    return <main id="main" className="page max-w-md"><Skeleton className="h-12 w-2/3" /><Skeleton className="h-48 w-full rounded-xl" /></main>;
  }
  if (info.error || !info.data) {
    return (
      <main id="main" className="page max-w-md">
        <ErrorNote message={info.error ?? "We could not open this page. Please check the link."} onRetry={() => info.refresh()} />
      </main>
    );
  }
  const g = info.data;

  const q = search.trim().toLowerCase();
  const shown = q ? labels.filter((l) => l.toLowerCase().includes(q)) : showAll ? labels : labels.slice(0, 8);

  return (
    <main id="main" className="page max-w-md text-lg">
      <div className="no-print flex justify-end"><ThemeToggle /></div>

      <header className="space-y-1">
        <p className="flex items-center gap-2 text-sm font-semibold text-primary"><Home className="size-4" aria-hidden /> Welcome</p>
        <h1 className="text-4xl font-extrabold">{g.property_name}</h1>
        <p className="text-base text-muted-foreground">We are glad you are here.</p>
      </header>

      <section className="space-y-3" aria-label="Get help with an appliance">
        <h2 className="text-2xl">Need help with something?</h2>
        <p className="text-base text-muted-foreground">Take a photo of it. We will show you how it works.</p>
        <FilePicker
          kind="image" label="Snap a photo" icon={<Camera className="size-6" />}
          busy={busy} busyLabel="Looking..." onFile={ask} buttonClassName="min-h-16 text-xl"
        />
        {preview && <img src={preview} alt="Your photo" className="max-h-72 w-full rounded-xl object-cover" />}
        {busy && <p role="status" className="text-center text-base text-muted-foreground">Looking at your photo. This takes a few seconds.</p>}
        {error && <ErrorNote message={error} onRetry={retryable ? () => last.current && ask(last.current) : undefined} />}
        {answer?.matched && answer.guide && <GuideCards guide={answer.guide} />}
        {answer && !(answer.matched && answer.guide) && (
          <div role="status" className="space-y-2 rounded-xl border bg-card p-5 shadow-[var(--shadow-rest)]">
            <p className="text-2xl font-bold">We could not tell what that is.</p>
            <p className="text-base">{answer.message}</p>
            <p className="text-sm text-muted-foreground">Try again with a closer photo, another angle or more light.</p>
          </div>
        )}
      </section>

      {g.house_rules && (
        <section className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-rest)]" aria-label="House rules">
          <button
            type="button" onClick={toggleRules} aria-expanded={rulesOpen} aria-controls="rules-body"
            className="flex w-full items-center justify-between p-4 text-left"
          >
            <span className="flex items-center gap-2 font-semibold"><ScrollText className="size-5 text-primary" aria-hidden /> Good to know</span>
            <ChevronDown className={cn("size-5 transition-transform", rulesOpen && "rotate-180")} aria-hidden />
          </button>
          {rulesOpen && <p id="rules-body" className="whitespace-pre-wrap px-4 pb-4 text-base">{g.house_rules}</p>}
        </section>
      )}

      {labels.length > 0 && !answer && (
        <section className="space-y-2" aria-label="What we can help with">
          <h2 className="text-lg">What we can help with</h2>
          {labels.length > 8 && (
            <Input type="search" aria-label="Search appliances" placeholder="Search" className="h-12"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          )}
          <ul className="flex flex-wrap gap-2">
            {shown.map((l) => <li key={l} className="rounded-full border bg-card px-3 py-1 text-sm">{l}</li>)}
          </ul>
          {shown.length === 0 && <p className="text-sm text-muted-foreground">Nothing matches that.</p>}
          {!q && labels.length > 8 && !showAll && (
            <button type="button" onClick={() => setShowAll(true)} className="text-sm font-semibold text-primary underline">See all</button>
          )}
        </section>
      )}

      {CHECKOUT_ENABLED && <CheckoutCard token={token} />}

      <footer className="space-y-1 text-center text-xs text-muted-foreground">
        <p>Something not working? Contact your host.</p>
        <p>Your photo is used to answer your question.</p>
      </footer>
    </main>
  );
}