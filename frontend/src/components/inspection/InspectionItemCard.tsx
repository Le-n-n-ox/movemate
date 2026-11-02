import { useState } from "react";
import { LinkButton } from "@/components/LinkButton";
import { Camera, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { resultLabel, resultTone } from "@/lib/labels";
import type { InspectionItemOut, ItemResult, Role } from "@/lib/types";
import { FilePicker } from "@/components/FilePicker";
import { Pill } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const RESULTS: ItemResult[] = ["ok", "not_seen", "misplaced", "missing", "damaged"];

export function InspectionItemCard({ item, role, actor, readOnly, onChanged }: {
    item: InspectionItemOut; role: Role; actor: string; readOnly: boolean; onChanged: () => void;
}) {
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

    return (
        <Card className="gap-3 p-4">
            <div className="flex gap-3">
                {item.reference_crop_url
                    ? <img src={item.reference_crop_url} alt={`Reference for ${item.label}`} className="size-20 shrink-0 rounded-lg object-cover" />
                    : <div className="size-20 shrink-0 rounded-lg bg-muted" aria-hidden />}
                <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-semibold leading-tight">{item.label}</p>
                    <p className="text-sm text-muted-foreground">Expected: {item.expected_quantity}{item.min_quantity != null && ` (min ${item.min_quantity})`}</p>
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
                    <p className="font-semibold">AI hint (not a result)</p>
                    <p>
                        {item.ai_suggestion.type.replace("_", " ")}
                        {item.ai_suggestion.observed ? `: ${item.ai_suggestion.observed}` : ""}
                    </p>
                    {item.ai_suggestion.evidence_frame_url && (
                        <img src={item.ai_suggestion.evidence_frame_url} alt="Video frame for this hint" className="max-h-40 rounded-md" />
                    )}
                    {item.ai_suggestion.confidence != null && (
                        <p className="text-xs text-muted-foreground">Model confidence {Math.round(item.ai_suggestion.confidence * 100)}%</p>
                    )}
                </div>
            )}

            {consumable ? (
                <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                        <label htmlFor={`c-${item.id}`} className="text-sm font-medium">Counted</label>
                        <Input id={`c-${item.id}`} type="number" inputMode="numeric" min={0} className="h-12" disabled={off}
                            value={count} onChange={(e) => setCount(e.target.value)} />
                    </div>
                    <Button className="btn-tap" disabled={off} onClick={saveCount}>Save count</Button>
                </div>
            ) : (
                <>
                    {counted && (
                        <div className="flex items-center gap-2">
                            <label htmlFor={`c-${item.id}`} className="text-sm font-medium">Counted</label>
                            <Input id={`c-${item.id}`} type="number" inputMode="numeric" min={0} className="h-12 w-24" disabled={off}
                                value={count} onChange={(e) => setCount(e.target.value)} />
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                        {RESULTS.map((r) => (
                            <Button key={r} disabled={off} aria-pressed={item.result === r}
                                variant={item.result === r ? "default" : "outline"}
                                className="btn-tap min-w-[6.5rem] flex-1" onClick={() => setResult(r)}>
                                {resultLabel[r]}
                            </Button>
                        ))}
                    </div>
                </>
            )}

            {item.photo_url && <img src={item.photo_url} alt={`Photo of ${item.label}`} className="max-h-48 rounded-lg" />}
            <FilePicker kind="image" icon={<Camera className="size-5" />} busy={photoBusy} disabled={off}
                label={item.photo_url ? "Replace photo" : "Add photo"} onFile={addPhoto} />

            {item.discrepancy_id && (
                <LinkButton variant="outline" className="btn-tap" to={`/cases/${item.discrepancy_id}?role=${role}`}>
                    <FolderOpen className="size-5" /> View case
                </LinkButton>
            )}
            {error && <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>}
        </Card>
    );
}