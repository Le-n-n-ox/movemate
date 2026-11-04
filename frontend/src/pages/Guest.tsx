import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Camera, ChevronDown, Home, ScrollText } from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import type { GuestAnswer } from "@/lib/types";
import { ErrorNote } from "@/components/Shell";
import { FilePicker } from "@/components/FilePicker";
import { GuideCards } from "@/components/guest/GuideCards";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const JUNK_WORDS = ["fabric", "textile", "surface", "patterned", "striped", "generic", "material"];

function isJunk(label: string): boolean {
  const l = label.toLowerCase();
  return JUNK_WORDS.some((w) => l.includes(w));
}

export default function Guest() {
  const { token = "" } = useParams();
  const info = useAsync(() => api.guest(token), [token]);
  const [preview, setPreview] = useState<string | null>(null);
  const [answer, setAnswer] = useState<GuestAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoMsg, setVideoMsg] = useState<string | null>(null);
  const [videoErr, setVideoErr] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState<boolean>(() => {
    try { return localStorage.getItem("guest_rules_open") !== "false"; } catch { return true; }
  });
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState("");
  const videoRef = useRef<HTMLInputElement | null>(null);
  const last = useRef<File | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function toggleRules() {
    const next = !rulesOpen;
    setRulesOpen(next);
    try { localStorage.setItem("guest_rules_open", String(next)); } catch { /* ignore */ }
  }

  async function uploadCheckoutVideo() {
    const file = videoRef.current?.files?.[0];
    if (!file) { setVideoErr("Please choose a video first."); return; }
    setVideoBusy(true); setVideoErr(null); setVideoMsg(null);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/api/guest/${token}/checkout/video`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed. Please try again.");
      setVideoMsg("Your checkout record has been saved.");
      if (videoRef.current) videoRef.current.value = "";
    } catch (e) { setVideoErr((e as Error).message); }
    finally { setVideoBusy(false); }
  }

  async function ask(file: File) {
    last.current = file;
    setPreview(URL.createObjectURL(file));
    setAnswer(null); setError(null); setBusy(true);
    try { setAnswer(await api.guestAsk(token, file)); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  if (info.loading) return <main className="page"><Skeleton className="h-12 w-2/3" /><Skeleton className="h-48 w-full rounded-xl" /></main>;
  if (info.error || !info.data) {
    return <main className="page"><ErrorNote message={info.error ?? "We could not open this page. Please check the link."} onRetry={() => info.refresh()} /></main>;
  }
  const g = info.data;

  const filteredLabels = (g.item_labels ?? []).filter((l) => !isJunk(l));
  const visibleLabels = showAll ? filteredLabels : filteredLabels.slice(0, 8);
  const searched = search.trim() ? filteredLabels.filter((l) => l.toLowerCase().includes(search.toLowerCase())) : visibleLabels;

  return (
    <main className="page text-lg max-w-[480px] mx-auto">
      <header className="space-y-1 mb-6">
        <p className="flex items-center gap-2 text-sm font-medium text-primary"><Home className="size-4" aria-hidden /> Welcome</p>
        <h1 className="min-w-0 break-words text-4xl font-extrabold tracking-tight">{g.property_name}</h1>
        <p className="text-base text-muted-foreground">We are glad you are here.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <button type="button" onClick={() => document.getElementById("guest-camera")?.click()} className="rounded-2xl border bg-card p-5 text-left min-h-[120px] hover:bg-accent/40">
          <Camera className="size-6 mb-2 text-primary" aria-hidden />
          <p className="font-semibold">Ask about something</p>
          <p className="text-sm text-muted-foreground">Snap a photo of an appliance and we will show you how it works.</p>
        </button>
        <button type="button" onClick={() => document.getElementById("guest-checkout")?.scrollIntoView({ behavior: "smooth" })} className="rounded-2xl border bg-card p-5 text-left min-h-[120px] hover:bg-accent/40">
          <ScrollText className="size-6 mb-2 text-primary" aria-hidden />
          <p className="font-semibold">Leaving? Record checkout</p>
          <p className="text-sm text-muted-foreground">Leave a quick record of how you left the place. About 2 minutes.</p>
        </button>
      </div>

      {g.house_rules && (
        <section className="mb-6 rounded-xl border bg-card" aria-label="House rules">
          <button type="button" onClick={toggleRules} className="w-full flex items-center justify-between p-4 text-left">
            <span className="flex items-center gap-2 font-semibold"><ScrollText className="size-5" aria-hidden /> Good to know</span>
            <ChevronDown className={`size-5 transition-transform ${rulesOpen ? "rotate-180" : ""}`} aria-hidden />
          </button>
          {rulesOpen && <p className="break-words whitespace-pre-wrap px-4 pb-4 text-base text-foreground">{g.house_rules}</p>}
        </section>
      )}

      <section className="space-y-4 mb-6" aria-label="Get help with an appliance">
        <h2 className="text-2xl font-bold">Need help with something?</h2>
        <p className="text-base text-muted-foreground">Take a photo of it. We will show you how it works.</p>
        <input id="guest-camera" type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) ask(f); e.target.value = ""; }} />
        <FilePicker kind="image" label="Snap a photo" icon={<Camera className="size-6" />} busy={busy} busyLabel="Looking..." onFile={ask} buttonClassName="min-h-16 text-xl" />
        {preview && <img src={preview} alt="Your photo" className="max-h-72 w-full rounded-xl object-cover" />}
        {busy && <p role="status" className="text-center text-base text-muted-foreground">Looking at your photo. This takes a few seconds.</p>}
        {error && <ErrorNote message={error} onRetry={() => last.current && ask(last.current)} />}
        {answer?.matched && answer.guide && <GuideCards guide={answer.guide} />}
        {answer && !(answer.matched && answer.guide) && (
          <div className="space-y-3 rounded-xl border p-5 text-base" role="status">
            <p className="text-2xl font-bold">We could not tell what that is.</p>
            <p className="text-base">{answer.message}</p>
            <p className="text-sm text-muted-foreground">Try a closer photo or another angle.</p>
            <Button variant="outline" className="btn-tap" onClick={() => last.current && ask(last.current)}>Retry</Button>
          </div>
        )}
      </section>

      {filteredLabels.length > 0 && !answer && (
        <section className="mb-6" aria-label="What we can help with">
          <h2 className="text-lg font-semibold mb-2">What we can help with</h2>
          {filteredLabels.length > 8 && (
            <input type="search" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-2 h-12 w-full rounded-xl border px-3" />
          )}
          <div className="flex flex-wrap gap-2">
            {(search.trim() ? searched : visibleLabels).map((l) => (
              <span key={l} className="rounded-full border px-3 py-1 text-sm">{l}</span>
            ))}
          </div>
          {!search.trim() && filteredLabels.length > 8 && !showAll && (
            <button type="button" onClick={() => setShowAll(true)} className="mt-2 text-sm text-primary underline">See all</button>
          )}
        </section>
      )}

      <section id="guest-checkout" className="space-y-3 rounded-xl border p-5 mb-6" aria-label="Record your checkout">
        <h2 className="text-xl font-bold">Leaving? Record how you left the place</h2>
        <p className="text-sm text-muted-foreground">Film or photograph the rooms, not people. You choose which rooms. About 2 minutes. The host and the cleaner for this property can see it.</p>
        <input ref={videoRef} type="file" accept="image/*,video/*" capture="environment" className="sr-only" />
        <Button variant="outline" className="btn-tap w-full" onClick={() => videoRef.current?.click()}>Choose a photo or video</Button>
        <Button className="btn-tap w-full" disabled={videoBusy} onClick={uploadCheckoutVideo}>{videoBusy ? "Uploading..." : "Upload record"}</Button>
        {videoErr && <p role="alert" className="text-sm text-danger">{videoErr}</p>}
        {videoMsg && <p role="status" className="text-sm text-ok">{videoMsg}</p>}
      </section>

      <footer className="text-center text-xs text-muted-foreground space-y-1">
        <p>Something not working? Contact your host.</p>
        <p>We only use your photo to answer your question.</p>
      </footer>
    </main>
  );
}
