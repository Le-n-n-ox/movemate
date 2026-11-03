export type CleanerLinkKind = "inspection" | "audit" | "case";

export function appOrigin(): string {
  const env = (import.meta as any).env ?? {};
  const fromEnv = env.VITE_APP_URL || env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return String(fromEnv).replace(/\/$/, "");
  return window.location.origin;
}

export function buildCleanerLink(kind: CleanerLinkKind, id: string): string {
  const path = kind === "inspection" ? `/inspection/${id}` : kind === "audit" ? `/audit/${id}` : `/cases/${id}`;
  return `${appOrigin()}${path}?role=cleaner`;
}

export function isLocalhostOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}
