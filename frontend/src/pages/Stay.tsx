import { useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Camera, CheckCircle2, DoorOpen, Flag, Home, Send, Sparkles, StickyNote, Video } from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { ErrorNote } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FilePicker } from "@/components/FilePicker";
import { GuideCards } from "@/components/guest/GuideCards";
import { Skeleton } from "@/components/ui/skeleton";

type Room = { id: string; name: string; room_type: string };
type Info = { property_name: string; house_rules?: string; stay_token: string; status: string; guest_token: string; item_labels: string[]; rooms: Room[] };

const FILE_INPUT =
  "w-full cursor-pointer rounded-xl border-2 border-dashed bg-card/60 p-3 text-sm transition-colors hover:border-primary/50 focus-visible:border-primary " +
  "file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground";

function ErrorBox({ text }: { text: string }) {
  return <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{text}</p>;
}

export default function Stay() {
  const { stayToken: token = "" } = useParams();
  const info = useAsync(() => api.stayHome(token), [token]);
  const [receipt, setReceipt] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [reportText, setReportText] = useState("");
  const [lateText, setLateText] = useState("");
  const [notes, setNotes] = useState<any[]>([]);
  const [helpAnswer, setHelpAnswer] = useState<any>(null);
  const [helpBusy, setHelpBusy] = useState(false);
  const [helpErr, setHelpErr] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const reportFileRef = useRef<HTMLInputElement | null>(null);

  if (info.loading) return <main className="page"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-40 w-full rounded-xl" /></main>;
  if (info.error || !info.data) return <main className="page"><ErrorNote message={info.error ?? "We could not open this page."} onRetry={() => info.refresh()} /></main>;
  const d = info.data as Info;

  async function askHelp(file: File) {
    setHelpBusy(true); setHelpErr(null); setHelpAnswer(null);
    try { setHelpAnswer(await api.guestAsk(d.guest_token, file)); } catch (e) { setHelpErr((e as Error).message); }
    finally { setHelpBusy(false); }
  }

  async function uploadRoom(roomId: string) {
    const input = fileRefs.current[roomId];
    const file = input?.files?.[0];
    if (!file) return;
    setBusy(true); setErr(null);
    try { await api.stayUploadVideo(token, roomId, file); } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function submitReport() {
    if (!reportText.trim()) return;
    setBusy(true); setErr(null);
    try {
      const file = reportFileRef.current?.files?.[0];
      const r = await api.stayReport(token, reportText.trim(), file);
      setNotes((n) => [...n, r]);
      setReportText("");
      if (reportFileRef.current) reportFileRef.current.value = "";
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function submit() {
    setBusy(true); setErr(null);
    try {
      const r = await api.staySubmit(token);
      const rec = await api.stayReceipt(token);
      setReceipt({ ...r, notes: rec.notes });
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function addLateNote() {
    if (!lateText.trim()) return;
    setBusy(true); setErr(null);
    try {
      const r = await api.stayLateNote(token, lateText.trim());
      setNotes((n) => [...n, r]);
      setLateText("");
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  if (receipt) {
    return (
      <main className="page hero-glow text-lg">
        <div className="space-y-3 pt-4 text-center">
          <span className="pop icon-badge icon-badge-lg mx-auto size-20 rounded-full bg-ok/15 text-ok">
            <CheckCircle2 className="size-10" aria-hidden />
          </span>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">Checkout recorded</h1>
          <p className="text-base text-muted-foreground">Thank you. Your host has what they need.</p>
        </div>

        <Card className="card-ok card-lift gap-3 p-5">
          <dl className="grid grid-cols-3 gap-3 text-center">
            <div className="col-span-3 rounded-xl bg-secondary p-3">
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reference</dt>
              <dd className="mt-1 break-all font-mono text-base font-semibold">{receipt.reference}</dd>
            </div>
            <div className="col-span-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-secondary p-3">
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rooms recorded</dt>
                <dd className="font-display text-3xl font-extrabold">{receipt.rooms_recorded}</dd>
              </div>
              <div className="rounded-xl bg-secondary p-3">
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</dt>
                <dd className="mt-1 text-base font-semibold capitalize">{String(receipt.status).replace(/_/g, " ")}</dd>
              </div>
            </div>
          </dl>
        </Card>

        {notes.length > 0 && (
          <Card className="gap-3 p-5">
            <h2 className="card-title"><span className="icon-badge"><StickyNote className="size-5" aria-hidden /></span> Notes</h2>
            <ul className="stagger space-y-2">
              {notes.map((n, i) => (
                <li key={i} className="rounded-lg border-l-4 border-primary bg-secondary p-3 text-sm">{n.text}</li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="gap-3 p-5">
          <h2 className="card-title"><span className="icon-badge"><Send className="size-5" aria-hidden /></span> Add a late note</h2>
          <Input value={lateText} onChange={(e) => setLateText(e.target.value)} placeholder="Anything else?" className="h-12" />
          <Button className="btn-tap w-full" disabled={busy || !lateText.trim()} onClick={addLateNote}>
            {busy ? "Sending..." : "Add note"}
          </Button>
          {err && <ErrorBox text={err} />}
        </Card>
      </main>
    );
  }

  return (
    <main className="page text-lg">
      <header className="space-y-2 pt-2">
        <span className="icon-badge tile size-11"><Home className="size-5" aria-hidden /></span>
        <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight">{d.property_name}</h1>
        <p className="text-base text-muted-foreground">Welcome. Everything you need for your stay is here.</p>
      </header>

      {d.house_rules && (
        <section className="rounded-xl border-l-4 border-primary bg-secondary p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">House rules</p>
          <p className="whitespace-pre-wrap text-base">{d.house_rules}</p>
        </section>
      )}

      <Card className="card-info card-lift gap-3 p-5">
        <h2 className="card-title">
          <span className="icon-badge bg-info/15 text-info"><Sparkles className="size-5" aria-hidden /></span> Help with an item
        </h2>
        <p className="text-sm text-muted-foreground">Snap a photo to get step-by-step instructions.</p>
        <FilePicker kind="image" icon={<Camera className="size-5" />} label="Snap a photo" busy={helpBusy} busyLabel="Looking..." onFile={askHelp} />
        {helpErr && <ErrorBox text={helpErr} />}
        {helpAnswer?.matched && helpAnswer.guide && <div className="pop"><GuideCards guide={helpAnswer.guide} /></div>}
        {helpAnswer && !(helpAnswer.matched && helpAnswer.guide) && (
          <p className="warn-box text-base">We could not tell what that is. Try another angle.</p>
        )}
      </Card>

      <section className="space-y-3" aria-label="Record your checkout">
        <h2 className="card-title text-xl">
          <span className="icon-badge"><Video className="size-5" aria-hidden /></span> Record your checkout
        </h2>
        <div className="stagger space-y-3">
          {d.rooms.map((r) => (
            <Card key={r.id} className="card-lift gap-3 p-4">
              <p className="flex items-center gap-2 font-display text-lg font-bold">
                <DoorOpen className="size-5 text-primary" aria-hidden /> {r.name}
              </p>
              <input
                ref={(el) => { fileRefs.current[r.id] = el; }}
                type="file" accept="video/*" capture="environment"
                aria-label={`Video of ${r.name}`}
                className={FILE_INPUT}
              />
              <Button variant="outline" className="btn-tap w-full" disabled={busy} onClick={() => uploadRoom(r.id)}>
                <Video className="size-5" /> Upload video
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <Card className="gap-3 p-5">
        <h2 className="card-title">
          <span className="icon-badge bg-warn/20 text-warn"><Flag className="size-5" aria-hidden /></span> Anything to report?
        </h2>
        <Input value={reportText} onChange={(e) => setReportText(e.target.value)} placeholder="Something broken or noticed" className="h-12" />
        <input ref={reportFileRef} type="file" accept="image/*" aria-label="Photo to attach" className={FILE_INPUT} />
        <Button variant="outline" className="btn-tap w-full" disabled={busy || !reportText.trim()} onClick={submitReport}>
          <Flag className="size-5" /> Report
        </Button>
        {notes.length > 0 && (
          <ul className="stagger space-y-2 border-t pt-3">
            {notes.map((n, i) => (
              <li key={i} className="rounded-lg border-l-4 border-warn bg-secondary p-3 text-sm">{n.text}</li>
            ))}
          </ul>
        )}
      </Card>

      {err && <ErrorBox text={err} />}
      <Button className="btn-tap w-full py-6 text-lg" disabled={busy} onClick={submit}>
        <Send className="size-5" /> {busy ? "Submitting..." : "Submit checkout record"}
      </Button>
    </main>
  );
}