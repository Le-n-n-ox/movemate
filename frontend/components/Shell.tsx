import Link from "next/link";
import type { Role } from "@/lib/types";

export function Shell({ title, back, children }: { title: string; back?: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      {back && <Link href={back.href} className="text-sm text-stone-500">&larr; {back.label}</Link>}
      <h1 className="mb-4 mt-1 text-2xl font-semibold">{title}</h1>
      <div className="space-y-4">{children}</div>
    </main>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  return message ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p> : null;
}


/** Shows who is using the page and lets them set their name for audit trails. */
export function RoleBar({ role, actor, setActor }: { role: Role; actor: string; setActor: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 text-sm text-stone-600">
      <span>Viewing as <b>{role}</b></span>
      <input className="input !min-h-[36px] !w-40" placeholder="Your name" value={actor} onChange={(e) => setActor(e.target.value)} />
    </div>
  );
}

export function Pill({ children, tone = "stone" }: { children: React.ReactNode; tone?: "stone" | "red" | "amber" | "green" | "blue" }) {
  const t = { stone: "bg-stone-200 text-stone-700", red: "bg-red-100 text-red-700", amber: "bg-amber-100 text-amber-800",
              green: "bg-emerald-100 text-emerald-800", blue: "bg-sky-100 text-sky-800" }[tone];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${t}`}>{children}</span>;
}
