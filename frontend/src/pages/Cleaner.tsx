import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Suspense } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Row = { propertyId: string; propertyName: string; inspection: any };

function CleanerInner() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [link, setLink] = useState("");
  const [linkErr, setLinkErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const props = await api.listProperties();
        const all: Row[] = [];
        for (const p of props) {
          try {
            const insps = await api.listInspections(p.id);
            for (const ins of insps) {
              if (ins.status === "in_progress") {
                all.push({ propertyId: p.id, propertyName: p.name, inspection: ins });
              }
            }
          } catch { /* skip */ }
        }
        if (!cancelled) setRows(all);
      } catch (e) {
        if (!cancelled) setError((e as Error).message || "Could not load inspections.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const role = params.get("role") || "cleaner";

  function openLink(e: React.FormEvent) {
    e.preventDefault();
    const v = link.trim();
    if (!v) { setLinkErr("Please paste a link."); return; }
    setLinkErr(null);
    // parse full URL, path, or bare id
    let path = v;
    try {
      const u = new URL(v, window.location.origin);
      path = u.pathname;
    } catch { /* keep as-is */ }
    path = path.trim().replace(/\/+$/, "");
    const m = path.match(/^\/?(inspection|audit|cases)\/([^/]+)$/);
    if (m) {
      nav(`/${m[1]}/${m[2]}?role=cleaner`);
      return;
    }
    if (path === "/cleaner" || path === "cleaner" || path === "") {
      setLinkErr("That link opens this page. Ask the host to send a link to a specific inspection.");
      return;
    }
    // try bare id against known? fallback
    setLinkErr("That link opens this page. Ask the host to send a link to a specific inspection.");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[480px] px-4 py-6">
        <h1 className="text-2xl font-bold tracking-tight">Today's checklist</h1>
        <p className="mt-1 text-muted-foreground">In-progress inspections across your properties.</p>

        <form onSubmit={openLink} className="mt-4 space-y-2 rounded-2xl border bg-card p-4">
          <Label htmlFor="cleaner-link">Have a link from your host? Paste it here</Label>
          <div className="flex gap-2">
            <Input id="cleaner-link" className="h-12 flex-1" placeholder="https://.../properties/... or /inspection/..." value={link} onChange={(e) => setLink(e.target.value)} />
            <Button type="submit" className="btn-tap">Open</Button>
          </div>
          {linkErr && <p role="alert" className="text-sm text-red-700">{linkErr}</p>}
        </form>

        {loading && <div className="mt-6 space-y-3">{[0,1,2].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}</div>}

        {error && (
          <div className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700 space-y-2">
            <p role="alert">We can't reach the server.</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
            {import.meta.env.DEV && (
              <p className="text-xs">API URL: {import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}</p>
            )}
            {(window.location.origin !== "http://localhost:3000" && (import.meta.env.VITE_API_URL || "").includes("localhost")) && (
              <p className="text-xs">The app is calling localhost for the API. Set NEXT_PUBLIC_API_URL to your computer's address and rebuild.</p>
            )}
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="mt-6 rounded-2xl border bg-card p-6 text-center">
            <p className="text-muted-foreground">No inspections waiting. Open the link your host sent, or start one below.</p>
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <ul className="mt-6 space-y-3">
            {rows.map((r) => (
              <li key={r.inspection.id} className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-4">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{r.propertyName}</p>
                  <p className="text-sm text-muted-foreground">{r.inspection.kind} · {r.inspection.reservation_ref || "no ref"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => nav(`/inspection/${r.inspection.id}?role=${role}`)}
                  className="shrink-0 rounded-xl bg-accent px-4 py-2 font-medium text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Continue
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function Cleaner() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <CleanerInner />
    </Suspense>
  );
}
