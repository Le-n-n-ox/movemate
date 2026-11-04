import type {
  CaseStatus, CaseType, InspectionKind, InspectionStatus, ItemCondition, ItemKind, ItemResult, Outcome, PartStatus,
} from "./types";



export const ROOM_TYPES = [
  ["living_room", "Living room"], ["kitchen", "Kitchen"], ["bedroom", "Bedroom"],
  ["bathroom", "Bathroom"], ["other", "Other"],
] as const;

export const INSPECTION_KINDS: [InspectionKind, string][] = [
  ["after_checkout", "After checkout"], ["after_cleaning", "After cleaning"], ["before_checkin", "Before check-in"],
];

export const kindLabel = (k: InspectionKind) => INSPECTION_KINDS.find(([v]) => v === k)?.[1] ?? k;

export const statusLabel: Record<InspectionStatus, string> = {
  in_progress: "In progress", completed: "Completed", completed_with_exception: "Completed with exception",
};

export async function copyText(text: string, ok = "Link copied") {
  const { toast } = await import("sonner");
  try { await navigator.clipboard.writeText(text); toast.success(ok); }
  catch { toast.message("Copy this link", { description: text, duration: 15000 }); }
}

export const resultLabel: Record<ItemResult, string> = {
  pending: "To check", ok: "OK", not_seen: "Not seen", misplaced: "Misplaced",
  missing: "Missing", damaged: "Damaged", low_stock: "Low stock",
};

export const resultTone: Record<ItemResult, "neutral" | "ok" | "warn" | "danger" | "info"> = {
  pending: "neutral", ok: "ok", not_seen: "warn", misplaced: "info",
  missing: "danger", damaged: "warn", low_stock: "warn",
};

export const partLabel: Record<PartStatus, string> = {
  pending: "To do", in_progress: "In progress", done: "Done", not_applicable: "Not needed",
};

export const partTone: Record<PartStatus, "neutral" | "ok"> = {
  pending: "neutral", in_progress: "neutral", done: "ok", not_applicable: "neutral",
};


export const KINDS: [ItemKind, string][] = [
  ["movable", "Movable (a remote)"], ["fixed", "Fixed (built-in TV)"],
  ["shared", "Shared (used in several rooms)"], ["consumable", "Consumable (counted)"],
];

export const CONDITIONS: [ItemCondition, string][] = [
  ["new", "New"], ["good", "Good"], ["worn", "Worn"],
  ["damaged", "Damaged"], ["under_repair", "Under repair"], ["missing", "Missing"],
];

export const conditionTone: Record<ItemCondition, "ok" | "neutral" | "danger"> = {
  new: "ok", good: "ok", worn: "neutral", under_repair: "neutral", damaged: "neutral", missing: "danger",
};


export const caseTypeLabel: Record<CaseType, string> = {
  missing: "Not found at the usual place", misplaced: "Found in a different place",
  damaged: "Damaged", not_seen: "Not seen",
};

export const caseStatusLabel: Record<CaseStatus, string> = {
  open: "Open", investigating: "Looking into it", resolved: "Resolved",
};

export const caseStatusTone: Record<CaseStatus, "neutral" | "info" | "ok"> = {
  open: "neutral", investigating: "info", resolved: "ok",
};

export const OUTCOMES: [Outcome, string][] = [
  ["found", "Found"], ["restored_to_place", "Put back in its place"],
  ["repaired", "Repaired"], ["replaced", "Replaced"], ["recorded_missing", "Recorded as missing"],
];
export const CLEANER_OUTCOMES: Outcome[] = ["found", "restored_to_place"];
export const outcomeLabel = (o: Outcome) => OUTCOMES.find(([v]) => v === o)?.[1] ?? o;