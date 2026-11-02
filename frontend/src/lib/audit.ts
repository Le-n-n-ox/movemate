import type { FindingOut, FindingType } from "./types";

const ORDER: Record<FindingType, number> = { missing: 0, count_mismatch: 1, misplaced: 2, unverified: 3, extra: 4 };

// Never accusing: say what the video showed, not what happened.
export const typeLabel: Record<FindingType, string> = {
  missing: "Not found in the video", count_mismatch: "Fewer than expected",
  misplaced: "In a different place", unverified: "Could not check", extra: "Extra item",
};
export const typeTone: Record<FindingType, "danger" | "warn" | "info"> = {
  missing: "danger", count_mismatch: "warn", misplaced: "warn", unverified: "warn", extra: "info",
};

export const isClosed = (f: FindingOut) => f.resolution === "confirmed" || f.resolution === "dismissed";

export const sortFindings = (list: FindingOut[]) =>
  [...list].sort((a, b) => Number(isClosed(a)) - Number(isClosed(b)) || ORDER[a.type] - ORDER[b.type]);

export function summaryLine(list: FindingOut[], server?: string | null) {
  if (server) return server;
  if (list.length === 0) return "No issues found.";
  const n = (t: FindingType) => list.filter((f) => f.type === t).length;
  const unv = n("unverified");
  const issues = list.length - unv;
  return [issues && `${issues} issue${issues > 1 ? "s" : ""}`, unv && `${unv} could not be verified`].filter(Boolean).join(", ");
}

export function plainSummary(list: FindingOut[], server?: string | null) {
  const lines = [`AI video check (suggestions only): ${summaryLine(list, server)}`];
  for (const f of sortFindings(list)) {
    lines.push(`- ${f.item_label}: ${typeLabel[f.type]}${f.observed ? `. ${f.observed}` : ""} [${f.resolution}]${f.note ? ` Note: ${f.note}` : ""}`);
  }
  return lines.join("\n");
}