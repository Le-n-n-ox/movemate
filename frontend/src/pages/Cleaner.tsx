import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, ClipboardCheck, Link2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { useRole } from "@/hooks/useRole";
import { kindLabel } from "@/lib/labels";
import type { InspectionOut } from "@/lib/types";
import { EmptyState, ErrorNote, Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

type Row = { propertyName: string; inspection: InspectionOut };

async function loadRows(): Promise<{ rows: Row[]; failed: number }> {
  const props = await api.listProperties();
  const results = await Promise.allSettled(props.map((p) => api.listInspections(p.id)));
  const rows: Row[] = [];
  let failed = 0;
  results.forEach((r, i) => {
    if (r.status === "rejected") { failed++; return; }
    for (const inspection of r.value) {
      if (inspection.status === "in_progress") rows.push({ propertyName: props[i].name, inspection });
    }
  });
  rows.sort((a, b) => b.inspection.created_at.localeCompare(a.inspection.created_at));
  return { rows, failed };
}

/** Accepts a full link or a path. Returns an in-app path, or null. */
function targetFrom(input: string): string | null {
  let path = input.trim();
  try { path = new URL(path, window.location.origin).pathname; } catch { /* keep as typed */ }
  path = path.replace(/\/+$/, "");
  if (/^\/(inspection|audit|cases|properties)\/[^/]+/.test(path)) return path;
  if (/^\/g\/[^/]+$/.test(path)) return path;
  return null;
}

export default function Cleaner() {
  const nav = useNavigate();
  const { withRole } = useRole();
  const q = useAsync(loadRows);
  const [link, setLink] = useState("");
  const [linkErr, setLinkErr] = useState<string | null>(null);

  function openLink(e: React.FormEvent) {
    e.preventDefault();
    if (!link.trim()) return setLinkErr("Please paste a link.");
    const path = targetFrom(link);
    if (!path) return setLinkErr("We could not open that link. Ask your host for a link to an inspection or a video check.");
    setLinkErr(null);
    nav(path.startsWith("/g/") ? path : withRole(path));
  }

  const rows = q.data?.rows ?? [];
  const failed = q.data?.failed ?? 0;

  return (
    <Shell title="Today's checklist">
      <p className="text-muted-foreground">In-progress inspections across all properties.</p>

      <Card className="gap-3 p-4">
        <form onSubmit={openLink} noValidate className="space-y-3">
          <Label htmlFor="cleaner-link" className="flex items-center gap-2">
            <Link2 className="size-4 text-primary" aria-hidden /> Have a link from your host?
          </Label>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Input
              id="cleaner-link" className="h-12" inputMode="url" autoCapitalize="none" autoCorrect="off"
              placeholder="Paste the link here" value={link}
              aria-invalid={!!linkErr} aria-describedby={linkErr ? "link-err" : undefined}
              onChange={(e) => setLink(e.target.value)}
            />
            <Button type="submit" className="btn-tap">Open</Button>
          </div>
          {linkErr && <p id="link-err" role="alert" className="text-sm text-danger">{linkErr}</p>}
        </form>
      </Card>

      {q.loading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      {q.error && <ErrorNote message={q.error} onRetry={() => q.refresh()} />}
      {failed > 0 && (
        <p role="status" className="warn-box">
          {failed} {failed === 1 ? "property" : "properties"} could not be loaded, so the list may be incomplete.
        </p>
      )}

      {!q.loading && !q.error && rows.length === 0 && (
        <EmptyState
          icon={<ClipboardCheck className="size-6" />}
          title="No inspections waiting"
          hint="Paste the link your host sent you above."
        />
      )}

      {rows.length > 0 && (
        <ul className="stagger space-y-3">
          {rows.map(({ propertyName, inspection: i }) => (
            <li key={i.id}>
              <Link to={withRole(`/inspection/${i.id}`)} className="row-link">
                <span className="icon-badge"><ClipboardCheck className="size-5" aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{propertyName}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {kindLabel(i.kind)} · {i.inspector}{i.reservation_ref ? ` · ${i.reservation_ref}` : ""} · {new Date(i.created_at).toLocaleDateString()}
                  </span>
                </span>
                <ChevronRight className="row-chevron size-5 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}