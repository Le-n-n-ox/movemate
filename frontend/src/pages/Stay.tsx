import { useRef, useState } from "react";
import { useParams } from "react-router-dom";
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

export default function Stay() {
  const { token = "" } = useParams();
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
      <main className="page text-lg">
        <h1 className="text-3xl font-bold">Checkout recorded</h1>
        <Card className="gap-2 p-4">
          <p>Reference: {receipt.reference}</p>
          <p>Rooms recorded: {receipt.rooms_recorded}</p>
          <p>Status: {receipt.status}</p>
        </Card>
        {notes.length > 0 && (
          <Card className="gap-2 p-4">
            <h2 className="text-lg font-semibold">Notes</h2>
            <ul className="space-y-2">{notes.map((n, i) => <li key={i} className="text-sm">{n.text}</li>)}</ul>
          </Card>
        )}
        <Card className="gap-2 p-4">
          <h2 className="text-lg font-semibold">Add a late note</h2>
          <Input value={lateText} onChange={(e) => setLateText(e.target.value)} placeholder="Anything else?" className="h-12" />
          <Button className="btn-tap w-full" disabled={busy || !lateText.trim()} onClick={addLateNote}>Add note</Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="page text-lg">
      <header className="space-y-1"><h1 className="text-3xl font-bold tracking-tight">{d.property_name}</h1></header>
      {d.house_rules && <section className="rounded-xl bg-secondary p-4"><p className="whitespace-pre-wrap text-base">{d.house_rules}</p></section>}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Help with an item</h2>
        <p className="text-sm text-muted-foreground">Snap a photo to get step-by-step instructions.</p>
        <FilePicker kind="image" label="Snap a photo" busy={helpBusy} busyLabel="Looking..." onFile={askHelp} />
        {helpErr && <p className="text-sm text-danger">{helpErr}</p>}
        {helpAnswer?.matched && helpAnswer.guide && <GuideCards guide={helpAnswer.guide} />}
        {helpAnswer && !(helpAnswer.matched && helpAnswer.guide) && <p className="text-base">We could not tell what that is. Try another angle.</p>}
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Record your checkout</h2>
        {d.rooms.map((r) => (
          <Card key={r.id} className="gap-2 p-4">
            <p className="font-semibold">{r.name}</p>
            <input ref={(el) => { fileRefs.current[r.id] = el; }} type="file" accept="video/*" capture="environment" className="w-full" />
            <Button variant="outline" className="btn-tap w-full" disabled={busy} onClick={() => uploadRoom(r.id)}>Upload video</Button>
          </Card>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Anything to report?</h2>
        <Card className="gap-2 p-4">
          <Input value={reportText} onChange={(e) => setReportText(e.target.value)} placeholder="Something broken or noticed" className="h-12" />
          <input ref={reportFileRef} type="file" accept="image/*" className="w-full" />
          <Button variant="outline" className="btn-tap w-full" disabled={busy || !reportText.trim()} onClick={submitReport}>Report</Button>
        </Card>
      </section>
      {err && <p className="text-sm text-danger">{err}</p>}
      <Button className="btn-tap w-full" disabled={busy} onClick={submit}>Submit checkout record</Button>
    </main>
  );
}
