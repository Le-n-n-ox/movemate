import {
  ArrowRight, Brush, Camera, ClipboardCheck, FileCheck2, FolderOpen, KeyRound, ScanSearch, ShieldCheck, Sparkles, Users,
  type LucideIcon,
} from "lucide-react";
import { AppearanceCard } from "@/components/AppearanceCard";
import { LinkButton } from "@/components/LinkButton";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { Reveal } from "@/components/motion/Reveal";
import { Card } from "@/components/ui/card";

const FACTS: [number, string][] = [
  [3, "roles: host, cleaner, guest"], [4, "workflows in one loop"],
  [6, "condition states tracked"], [5, "ways a case can end"],
];

export function Facts() {
  return (
    <section className="border-y bg-secondary/50" aria-label="At a glance">
      <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4">
        {FACTS.map(([n, label]) => (
          <div key={label} className="flex flex-col-reverse text-center">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-4xl font-extrabold text-primary"><AnimatedNumber value={n} /></dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Camera, title: "Scan once", text: "Photograph important items. We suggest names and places. You confirm." },
  { icon: Sparkles, title: "Guest guide from a photo", text: "Guests snap an appliance and get short steps. No login." },
  { icon: ScanSearch, title: "AI video check", text: "Film a room and get hints about what looks missing or moved. Suggestions only." },
  { icon: ClipboardCheck, title: "Human inspection", text: "A checklist per room, with photo proof for high-value items." },
  { icon: FolderOpen, title: "Cases, not blame", text: "Anything off becomes a factual record with a trail nobody can edit." },
  { icon: FileCheck2, title: "A clear verdict", text: "Ready, ready with exceptions, or not ready. Printable." },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
      <Reveal><h2 className="text-3xl font-bold tracking-tight">Everything the loop needs</h2></Reveal>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text }, i) => (
          <Reveal key={title} delay={i * 0.06}>
            <Card className="card-lift h-full gap-2 p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{text}</p>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const STEPS: [string, string][] = [
  ["Scan the home", "Photos and short sweeps record what should be there."],
  ["Film a room (optional)", "The AI check gives hints. A person decides."],
  ["Walk the checklist", "The cleaner marks every item and cleaning step."],
  ["See if it is ready", "One report for the next guest."],
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 bg-secondary/50 py-16">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal><h2 className="text-3xl font-bold tracking-tight">How it works</h2></Reveal>
        <ol className="mt-8 grid gap-4 md:grid-cols-4">
          {STEPS.map(([title, text], i) => (
            <li key={title}>
              <Reveal delay={i * 0.1}>
                <Card className="h-full gap-2 p-5">
                  <span className="grid size-10 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground" aria-hidden>
                    {i + 1}
                  </span>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </Card>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const ROLES: { icon: LucideIcon; name: string; points: string[] }[] = [
  { icon: KeyRound, name: "Host", points: ["Records the home", "Reviews problems", "Decides what is real and what is ready"] },
  { icon: Brush, name: "Cleaner", points: ["Walks the checklist", "Films rooms for hints", "Marks items found"] },
  { icon: Users, name: "Guest", points: ["Scans a link", "Photographs an appliance", "Reads short steps"] },
];

export function Roles() {
  return (
    <section id="roles" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
      <Reveal><h2 className="text-3xl font-bold tracking-tight">Made for three people</h2></Reveal>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {ROLES.map(({ icon: Icon, name, points }, i) => (
          <Reveal key={name} delay={i * 0.08}>
            <Card className="card-lift h-full gap-3 p-5">
              <Icon className="size-7 text-primary" aria-hidden />
              <h3 className="text-xl font-semibold">{name}</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {points.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function Boundary() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16">
      <Reveal>
        <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-accent p-6 text-accent-foreground sm:flex-row sm:items-center">
          <ShieldCheck className="size-10 shrink-0 text-primary" aria-hidden />
          <div>
            <h2 className="text-xl font-bold">The AI only suggests. People decide.</h2>
            <p className="text-sm">It never records a loss. Only the host confirms one, so nobody is blamed by a guess.</p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="mx-auto max-w-3xl space-y-4 px-4 pb-16 text-center">
      <Reveal>
        <h2 className="text-3xl font-bold tracking-tight">Try it with demo data</h2>
        <p className="mt-2 text-muted-foreground">Demo mode uses sample answers, so you can explore every screen.</p>
        <div className="mx-auto mt-6 max-w-xs">
          <LinkButton to="/properties">Open the app <ArrowRight className="size-5" /></LinkButton>
        </div>
      </Reveal>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t bg-secondary/50">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-2 md:items-start">
        <div>
          <p className="font-bold">MoveMate Host Edition</p>
          <p className="text-sm text-muted-foreground">Know what should be there, check it, record what is wrong, say if the home is ready.</p>
        </div>
        <AppearanceCard />
      </div>
    </footer>
  );
}