import { useState } from "react";
import { LinkButton } from "@/components/LinkButton";
import { Camera, ChevronRight, FolderOpen, Package, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { resultLabel, resultTone } from "@/lib/labels";
import type { InspectionItemOut, ItemResult, Role } from "@/lib/types";
import { useRole } from "@/hooks/useRole";
import { FilePicker } from "@/components/FilePicker";
import { Pill } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const RESULTS: ItemResult[] = ["ok", "not_seen", "misplaced", "missing", "damaged"];

// Same colour meaning as the rest of the app: green ok, amber needs a look, red missing, orange damaged.
const DOT: Record<ItemResult, string> = {
    ok: "var(--ok)", not_seen: "var(--muted-foreground)", misplaced: "var(--warn)",
    missing: "var(--danger)", damaged: "var(--chart-6)",
} as Record<ItemResult, string>;

export function InspectionItemCard({ item, role, actor, readOnly, onChanged }: {
    item: InspectionItemOut; role: Role; actor: string; readOnly: boolean; onChanged: () => void;
}) {
    const { withRole } = useRole();
    const [busy, setBusy] = useState(false);
    const [photoBusy, setPhotoBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [count, setCount] = useState(String(item.observed_quantity ?? item.expected_quantity));
    const consumable = item.kind === "consumable";
    const counted = consumable || item.expected_quantity > 1;
    const off = readOnly || busy;

    async function run(fn: () => Promise<unknown>, setB: (b: boolean) => void = setBusy) {
        if (!actor.trim()) return toast.error("Please enter your name at the top of the page.");
        setB(true); setError(null);
        try { await fn(); onChanged(); }
        catch (e) { setError((e as Error).message); }
        finally { setB(false); }
    }

    const base = () => ({ role, actor: actor.trim() });
    const setResult = (result: ItemResult) =>
        run(() => api.patchInspectionItem(item.id, {
            ...base(), result, ...(result === "ok" && counted ? { observed_quantity: Number(count) } : {}),
        }));
    const saveCount = () => {
        const n = Number(count);
        if (!Number.isInteger(n) || n < 0) return toast.error("Enter a whole number.");
        return run(() => api.patchInspectionItem(item.id, { ...base(), observed_quantity: n }));
    };
    const addPhoto = (f: File) => run(() => api.inspectionItemPhoto(item.id, f, actor.trim(), role), setPhotoBusy);

    const edge = item.result === "ok" ? "card-ok" : ["misplaced", "missing", "damaged"].includes(item.result) ? "card-warn" : "";

    return (
        <Card className={`gap-3 p-4 ${edge}`}>
            <div className="flex gap-3">
                {item.reference_crop_url
                    ? <img src={item.reference_crop_url} alt={`Reference for ${item.label}`} className="size-20 shrink-0 rounded-xl border object-cover" />
                    : <div className="grid size-20 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground" aria-hidden><Package className="size-7" /></div>}
                <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-display text-lg font-bold leading-tight">{item.label}</p>
                    <p className="text-sm text-muted-foreground">Expected: <span className="font-semibold text-foreground">{item.expected_quantity}</span>{item.min_quantity != null && ` (min ${item.min_quantity})`}</p>
                    {item.location_path && <p className="text-xs text-muted-foreground">Usually: {item.location_path}</p>}
                    {item.alternate_locations.length > 0 && (
                        <p className="text-xs text-muted-foreground">Also OK: {item.alternate_locations.join(", ")}</p>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
                <Pill tone={resultTone[item.result]}>{resultLabel[item.result]}</Pill>
                {consumable && <Pill>Consumable</Pill>}
                {item.high_value && !item.photo_url && <Pill tone="warn">Photo required</Pill>}
                {item.checked_by && <Pill>Checked by {item.checked_by}</Pill>}
            </div>

            {item.ai_suggestion && (
                <div className="hint-box space-y-2">
                    <p className="flex items-center gap-1.5 font-semibold">
                        <Sparkles className="size-4 text-info" aria-hidden /> AI hint (not a result)
                    </p>
                    <p className="capitalize">
                        {item.ai_suggestion.type.replace("_", " ")}
                        {item.ai_suggestion.observed ? `: ${item.ai_suggestion.observed}` : ""}
                    </p>
                    {item.ai_suggestion.evidence_frame_url && (
                        <img src={item.ai_suggestion.evidence_frame_url} alt="Video frame for this hint" className="max-h-40 rounded-lg border" />
                    )}
                    {item.ai_suggestion.confidence != null && (
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Model confidence {Math.round(item.ai_suggestion.confidence * 100)}%</p>
                            <div className="h-1 overflow-hidden rounded-full bg-info/15" aria-hidden>
                                <div className="h-full rounded-full bg-info" style={{ width: `${Math.round(item.ai_suggestion.confidence * 100)}%` }} />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {consumable ? (
                <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                        <label htmlFor={`c-${item.id}`} className="text-sm font-semibold">Counted</label>
                        <Input id={`c-${item.id}`} type="number" inputMode="numeric" min={0} className="h-12" disabled={off}
                            value={count} onChange={(e) => setCount(e.target.value)} />
                    </div>
                    <Button className="btn-tap" disabled={off} onClick={saveCount}>Save count</Button>
                </div>
            ) : (
                <>
                    {counted && (
                        <div className="flex items-center gap-2">
                            <label htmlFor={`c-${item.id}`} className="text-sm font-semibold">Counted</label>
                            <Input id={`c-${item.id}`} type="number" inputMode="numeric" min={0} className="h-12 w-24" disabled={off}
                                value={count} onChange={(e) => setCount(e.target.value)} />
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label={`Result for ${item.label}`}>
                        {RESULTS.map((r) => {
                            const on = item.result === r;
                            return (
                                <Button key={r} disabled={off} aria-pressed={on} variant="outline"
                                    className="btn-tap justify-start gap-2 border-2"
                                    style={on ? { borderColor: DOT[r], background: `color-mix(in oklab, ${DOT[r]} 14%, transparent)` } : undefined}
                                    onClick={() => setResult(r)}>
                                    <span className="size-3 shrink-0 rounded-full" style={{ background: DOT[r] }} aria-hidden />
                                    {resultLabel[r]}
                                </Button>
                            );
                        })}
                    </div>
                </>
            )}

            {item.photo_url && <img src={item.photo_url} alt={`Photo of ${item.label}`} className="max-h-48 rounded-xl border" />}
            <FilePicker kind="image" icon={<Camera className="size-5" />} busy={photoBusy} disabled={off}
                label={item.photo_url ? "Replace photo" : "Add photo"} onFile={addPhoto} />

            {item.discrepancy_id && (
                <LinkButton variant="outline" className="btn-tap" to={withRole(`/cases/${item.discrepancy_id}`)}>
                    <FolderOpen className="size-5" /> View case <ChevronRight className="ml-auto size-4" aria-hidden />
                </LinkButton>
            )}
            {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</p>}
        </Card>
    );
}