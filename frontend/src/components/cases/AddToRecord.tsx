import { useState } from "react";
import { Camera, Plus, Search, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Role } from "@/lib/types";
import { FilePicker } from "@/components/FilePicker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AddToRecord({ id, role, actor, onChanged }: {
  id: string; role: Role; actor: string; onChanged: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function add(kind: "note" | "search" | "evidence", file?: File) {
    if (!actor.trim()) return toast.error("Please enter your name at the top of the page.");
    if (kind !== "evidence" && !text.trim()) return toast.error("Please write something first.");
    setBusy(kind);
    try {
      await api.addCaseEvent(id, { role, actor: actor.trim(), kind, text: text.trim() || undefined, file });
      setText("");
      onChanged();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  }

  return (
    <Card className="gap-3 p-4">
      <h2 className="card-title">
        <span className="icon-badge"><Plus className="size-5" aria-hidden /></span> Add to the record
      </h2>
      <div className="space-y-1.5">
        <Label htmlFor="ev-text">What happened?</Label>
        <Textarea id="ev-text" rows={3} value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Checked the kitchen drawer and the sofa." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="btn-tap" disabled={!!busy} onClick={() => add("search")}>
          <Search className="size-5" /> {busy === "search" ? "Saving..." : "Log search"}
        </Button>
        <Button variant="outline" className="btn-tap" disabled={!!busy} onClick={() => add("note")}>
          <StickyNote className="size-5" /> {busy === "note" ? "Saving..." : "Add note"}
        </Button>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden>
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>
      <FilePicker kind="image" icon={<Camera className="size-5" />} label="Add photo evidence"
        busy={busy === "evidence"} disabled={!!busy} onFile={(f) => add("evidence", f)} />
    </Card>
  );
}