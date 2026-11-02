import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Camera, Home, ScrollText } from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import type { GuestAnswer } from "@/lib/types";
import { ErrorNote } from "@/components/Shell";
import { FilePicker } from "@/components/FilePicker";
import { GuideCards } from "@/components/guest/GuideCards";
import { Skeleton } from "@/components/ui/skeleton";

export default function Guest() {
  const { token = "" } = useParams();
  const info = useAsync(() => api.guest(token), [token]);
  const [preview, setPreview] = useState<string | null>(null);
  const [answer, setAnswer] = useState<GuestAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const last = useRef<File | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function ask(file: File) {
    last.current = file;
    setPreview(URL.createObjectURL(file));
    setAnswer(null); setError(null); setBusy(true);
    try { setAnswer(await api.guestAsk(token, file)); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  if (info.loading) return <main className="page"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-40 w-full rounded-xl" /></main>;
  if (info.error || !info.data) {
    return (
      <main className="page">
        <ErrorNote message={info.error ?? "We could not open this page. Please check the link."} onRetry={() => info.refresh()} />
      </main>
    );
  }
  const g = info.data;

  return (
    <main className="page text-lg">
      <header className="space-y-1">
        <p className="flex items-center gap-2 text-sm font-medium text-primary"><Home className="size-4" aria-hidden /> Welcome</p>
        <h1 className="text-3xl font-bold tracking-tight">{g.property_name}</h1>
      </header>

      {g.house_rules && (
        <section className="rounded-xl bg-secondary p-4" aria-label="House rules">
          <h2 className="mb-1 flex items-center gap-2 text-base font-semibold"><ScrollText className="size-5" aria-hidden /> House rules</h2>
          <p className="whitespace-pre-wrap text-base">{g.house_rules}</p>
        </section>
      )}

      <section className="space-y-3" aria-label="Get help with an appliance">
        <h2 className="text-xl font-semibold">Need help with something?</h2>
        <p className="text-base text-muted-foreground">Take a photo of it. We will show you how it works.</p>
        <FilePicker
          kind="image" label="Snap a photo" icon={<Camera className="size-6" />}
          busy={busy} busyLabel="Looking..." onFile={ask}
          buttonClassName="min-h-16 text-xl"
        />
      </section>

      {preview && <img src={preview} alt="Your photo" className="max-h-64 w-full rounded-xl object-cover" />}
      {busy && <p role="status" className="text-center text-base text-muted-foreground">Looking at your photo. This takes a few seconds.</p>}
      {error && <ErrorNote message={error} onRetry={() => last.current && ask(last.current)} />}

      {answer?.matched && answer.guide && <GuideCards guide={answer.guide} />}
      {answer && !(answer.matched && answer.guide) && (
        <div className="space-y-2 rounded-xl border p-4" role="status">
          <p className="text-xl font-semibold">We could not tell what that is.</p>
          <p className="text-base">{answer.message}</p>
          <p className="text-base text-muted-foreground">Try again from another angle, a bit closer, with more light.</p>
        </div>
      )}

      {g.item_labels.length > 0 && !answer && (
        <p className="text-sm text-muted-foreground">We can help with: {g.item_labels.join(", ")}.</p>
      )}
    </main>
  );
}