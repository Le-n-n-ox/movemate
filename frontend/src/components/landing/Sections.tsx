import {
  Brush, Camera, Check, ClipboardCheck, Clock, EyeOff, FileCheck2, FolderOpen, KeyRound, Minus, Scale, ScanSearch,
  ShieldCheck, Sparkles, UserCheck, Users,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { AppearanceCard } from "@/components/AppearanceCard";
import { ActionButton } from "@/components/LinkButton";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { Reveal } from "@/components/motion/Reveal";
import { Card } from "@/components/ui/card";

const H2 = "font-display text-3xl font-extrabold tracking-tight sm:text-4xl";

/* ---------- facts ---------- */

const FACTS: [number, string][] = [
  [3, "roles: host, cleaner, guest"], [4, "workflows in one loop"],
  [6, "condition states tracked"], [5, "ways a case can end"],
];

export function Facts() {
  return (
    <section className="border-y bg-muted/30" aria-label="At a glance">
      <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-y-12 px-4 py-16 md:grid-cols-4 md:divide-x">
        {FACTS.map(([n, label]) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col-reverse gap-2 px-4 text-center"
          >
            <dt className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{label}</dt>
            <dd className="font-display text-6xl font-extrabold text-primary tracking-tighter">
              <AnimatedNumber value={n} />
            </dd>
          </motion.div>
        ))}
      </dl>
    </section>
  );
}

/* ---------- why ---------- */

const C = 2 * Math.PI * 52;
const SEGMENTS = [
  { label: "In place", value: 14, color: "var(--ok)" },
  { label: "To review", value: 3, color: "var(--warn)" },
  { label: "Missing", value: 1, color: "var(--danger)" },
];
const TOTAL = SEGMENTS.reduce((s, x) => s + x.value, 0);
const ARCS = SEGMENTS.reduce<{ len: number; start: number; label: string; value: number; color: string }[]>((acc, s) => {
  const start = acc.length ? acc[acc.length - 1].start + acc[acc.length - 1].len : 0;
  return [...acc, { ...s, len: (s.value / TOTAL) * C, start }];
}, []);

function ReadinessRing() {
  return (
    <Card className="gap-5 p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">Kitchen check</h3>
        <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">Example</span>
      </div>
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <div className="relative size-40 shrink-0">
          <svg
            viewBox="0 0 140 140"
            className="size-full -rotate-90"
            role="img"
            aria-label={`Example: ${ARCS.map((a) => `${a.value} ${a.label.toLowerCase()}`).join(", ")}`}
          >
            <circle cx="70" cy="70" r="52" fill="none" stroke="var(--muted)" strokeWidth="16" />
            {ARCS.map((a, i) => (
              <motion.circle
                key={a.label}
                cx="70" cy="70" r="52" fill="none" stroke={a.color} strokeWidth="16"
                strokeDashoffset={-a.start}
                initial={{ strokeDasharray: `0 ${C}` }}
                whileInView={{ strokeDasharray: `${Math.max(a.len - 2, 0)} ${C}` }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.9, delay: 0.15 * i, ease: "easeOut" }}
              />
            ))}
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <p className="font-display text-3xl font-extrabold leading-none">
              {SEGMENTS[0].value}<span className="text-lg text-muted-foreground">/{TOTAL}</span>
              <span className="mt-1 block text-xs font-medium text-muted-foreground">in place</span>
            </p>
          </div>
        </div>
        <ul className="w-full space-y-2 text-sm">
          {ARCS.map((a) => (
            <li key={a.label} className="flex items-center gap-3">
              <span className="size-3 rounded-full" style={{ background: a.color }} aria-hidden />
              <span className="flex-1">{a.label}</span>
              <span className="font-display font-bold">{a.value}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="border-t pt-3 text-sm text-muted-foreground">Verdict: ready with exceptions. The missing item is a case for the host to review.</p>
    </Card>
  );
}

const WHY: { icon: LucideIcon; problem: string; answer: string }[] = [
  { icon: EyeOff, problem: "Nobody wrote down what should be there", answer: "You scan once and confirm each item, so there is a list to check against." },
  { icon: Scale, problem: "A missing item turns into an argument", answer: "It becomes a case with the facts and a trail, not a guess about who is to blame." },
  { icon: Clock, problem: "You find out when the guest arrives", answer: "You get one verdict before check-in: ready, ready with exceptions, or not ready." },
];

export function Why() {
  return (
    <section id="why" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24">
      <Reveal>
        <h2 className={H2}>Why a quick look is not enough</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground text-lg leading-relaxed">
          A cleaner cannot spot what is missing from a home nobody has listed. MoveMate starts by recording the home, then checks it after every stay.
        </p>
      </Reveal>
      <div className="mt-16 grid items-start gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          {WHY.map(({ icon: Icon, problem, answer }, i) => (
            <Reveal key={problem} delay={i * 0.08}>
              <Card className="card-lift flex-row gap-6 p-6 transition-all duration-300 hover:border-primary/30">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-primary transition-transform group-hover:scale-110">
                  <Icon className="size-6" aria-hidden />
                </span>
                <div className="space-y-1">
                  <h3 className="font-display text-xl font-bold">{problem}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{answer}</p>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.15} className="relative">
          <div className="absolute -inset-4 bg-primary/5 blur-3xl rounded-full" />
          <ReadinessRing />
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- features ---------- */

type Tag = "ai" | "human";
const TAGS: Record<Tag, { label: string; cls: string }> = {
  ai: { label: "AI suggests", cls: "bg-info/10 text-info" },
  human: { label: "You decide", cls: "bg-ok/15 text-ok" },
};

const FEATURES: { icon: LucideIcon; title: string; text: string; tag?: Tag }[] = [
  { icon: Camera, title: "Scan once", text: "Photograph important items. We suggest names and places. You confirm.", tag: "ai" },
  { icon: Sparkles, title: "Guest guide from a photo", text: "Guests snap an appliance and get short steps. No login.", tag: "ai" },
  { icon: ScanSearch, title: "AI video check", text: "Film a room and get hints about what looks missing or moved. Suggestions only.", tag: "ai" },
  { icon: ClipboardCheck, title: "Human inspection", text: "A checklist per room, with photo proof for high-value items.", tag: "human" },
  { icon: FolderOpen, title: "Cases, not blame", text: "Anything off becomes a factual record with a trail nobody can edit.", tag: "human" },
  { icon: FileCheck2, title: "A clear verdict", text: "Ready, ready with exceptions, or not ready. Printable." },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
      <Reveal><h2 className={H2}>Everything the loop needs</h2></Reveal>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text, tag }, i) => (
          <Reveal key={title} delay={i * 0.06}>
            <Card className="card-lift h-full gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="icon-badge icon-badge-lg tile"><Icon className="size-5" aria-hidden /></span>
                {tag && (
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TAGS[tag].cls}`}>{TAGS[tag].label}</span>
                )}
              </div>
              <h3 className="font-display text-lg font-bold">{title}</h3>
              <p className="text-sm text-muted-foreground">{text}</p>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- how it works ---------- */

const STEPS: [string, string, string][] = [
  ["Scan the home", "Photos and short sweeps record what should be there.", "So there is a record of what belongs."],
  ["Film a room (optional)", "The AI check gives hints. A person decides.", "A second pair of eyes before the walk-through."],
  ["Walk the checklist", "The cleaner marks every item and cleaning step.", "So every item is checked, not skimmed."],
  ["See if it is ready", "One report for the next guest.", "So you know before the guest does."],
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 bg-secondary/50 py-16">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal><h2 className={H2}>How it works</h2></Reveal>
        <div className="relative mt-10">
          <div className="absolute inset-x-[12.5%] top-10 hidden h-0.5 bg-border md:block" aria-hidden>
            <motion.div
              className="h-full origin-left bg-primary"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 1.4, ease: "easeInOut" }}
            />
          </div>
          <ol className="relative grid gap-6 md:grid-cols-4">
            {STEPS.map(([title, text, why], i) => (
              <li key={title}>
                <Reveal delay={i * 0.1} className="h-full">
                  <Card className="h-full gap-2 p-5">
                    <span className="icon-badge icon-badge-lg tile rounded-full" aria-hidden>{i + 1}</span>
                    <h3 className="mt-1 font-display text-lg font-bold">{title}</h3>
                    <p className="text-sm text-muted-foreground">{text}</p>
                    <p className="mt-auto border-t pt-2 text-xs font-medium text-primary">{why}</p>
                  </Card>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ---------- compare ---------- */

const COMPARE: [string, string, string][] = [
  ["What the cleaner checks against", "The same list for every home", "Your home’s own items, each with a usual place"],
  ["Spotting a missing item", "Someone has to notice", "Flagged against the list, with photo proof for high-value items"],
  ["What the AI does", "Usually nothing", "Suggests only. A person decides"],
  ["When something is off", "A note in a message thread", "A case with a trail nobody can edit"],
  ["Is it ready for the next guest?", "A tick at the end", "Ready, ready with exceptions, or not ready. Printable"],
  ["Helping guests", "A printed manual", "Snap an appliance, get short steps. No login"],
];

export function Compare() {
  return (
    <section id="compare" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24">
      <Reveal>
        <h2 className={H2}>Not just another checklist</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground text-lg leading-relaxed">
          A plain checklist tells a cleaner what to tick. It cannot tell anyone what is missing. Here is where MoveMate goes further.
        </p>
      </Reveal>
      <div className="mt-16 space-y-4">
        <div className="hidden grid-cols-[1fr_1fr_1.2fr] px-6 text-sm font-bold uppercase tracking-widest text-muted-foreground md:grid">
          <span />
          <span className="pl-4">A plain checklist</span>
          <span className="pl-4 text-primary">MoveMate</span>
        </div>
        {COMPARE.map(([what, plain, mm], i) => (
          <Reveal key={what} delay={i * 0.05}>
            <Card className="gap-0 overflow-hidden p-0 md:grid md:grid-cols-[1fr_1fr_1.2fr] transition-all duration-300 hover:border-primary/30">
              <p className="p-6 font-display font-bold border-r border-border">
                {what}
              </p>
              <p className="flex items-start gap-3 p-6 pt-4 text-sm text-muted-foreground md:pt-6">
                <Minus className="mt-1 size-4 shrink-0 text-muted-foreground/40" aria-hidden />
                <span className="leading-relaxed"><span className="font-semibold text-foreground md:hidden">Plain checklist: </span>{plain}</span>
              </p>
              <p className="flex items-start gap-3 bg-accent/40 p-6 text-sm font-medium text-accent-foreground md:pt-6">
                <Check className="mt-1 size-4 shrink-0 text-primary" aria-hidden />
                <span className="leading-relaxed"><span className="font-semibold md:hidden">MoveMate: </span>{mm}</span>
              </p>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- roles ---------- */

const ROLES: { icon: LucideIcon; name: string; points: string[] }[] = [
  { icon: KeyRound, name: "Host", points: ["Records the home", "Reviews problems", "Decides what is real and what is ready"] },
  { icon: Brush, name: "Cleaner", points: ["Walks the checklist", "Films rooms for hints", "Marks items found"] },
  { icon: Users, name: "Guest", points: ["Scans a link", "Photographs an appliance", "Reads short steps"] },
];

export function Roles() {
  return (
    <section id="roles" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
      <Reveal><h2 className={H2}>Made for three people</h2></Reveal>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {ROLES.map(({ icon: Icon, name, points }, i) => (
          <Reveal key={name} delay={i * 0.08}>
            <Card className="card-lift h-full gap-4 p-6">
              <span className="icon-badge icon-badge-lg tile"><Icon className="size-6" aria-hidden /></span>
              <h3 className="font-display text-2xl font-bold">{name}</h3>
              <ul className="space-y-2 text-sm">
                {points.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <span className="text-muted-foreground">{p}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- boundary ---------- */

const FLOW: { icon: LucideIcon; label: string; tone: string }[] = [
  { icon: Sparkles, label: "AI suggests", tone: "bg-info/15 text-info" },
  { icon: UserCheck, label: "Host confirms", tone: "bg-ok/15 text-ok" },
  { icon: FileCheck2, label: "Recorded", tone: "bg-card text-primary" },
];

export function Boundary() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16">
      <Reveal>
        <div className="grid items-center gap-6 rounded-2xl border border-primary/30 bg-accent p-6 text-accent-foreground md:grid-cols-[1.2fr_1fr]">
          <div className="flex gap-4">
            <ShieldCheck className="size-10 shrink-0 text-primary" aria-hidden />
            <div>
              <h2 className="font-display text-2xl font-extrabold">The AI only suggests. People decide.</h2>
              <p className="mt-1 text-sm">It never records a loss. Only the host confirms one, so nobody is blamed by a guess.</p>
            </div>
          </div>
          <ol className="flex items-center justify-between gap-1" aria-label="How a suggestion becomes a record">
            {FLOW.map(({ icon: Icon, label, tone }, i) => (
              <li key={label} className="flex flex-1 items-center gap-1">
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.35, duration: 0.4 }}
                  className="flex flex-col items-center gap-1.5 text-center"
                >
                  <span className={`grid size-12 place-items-center rounded-full ${tone}`}><Icon className="size-5" aria-hidden /></span>
                  <span className="text-xs font-semibold">{label}</span>
                </motion.div>
                {i < FLOW.length - 1 && (
                  <motion.span
                    className="mb-5 h-0.5 flex-1 origin-left bg-primary/50"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.45 + i * 0.35, duration: 0.35 }}
                    aria-hidden
                  />
                )}
              </li>
            ))}
          </ol>
        </div>
      </Reveal>
    </section>
  );
}

/* ---------- final call and footer ---------- */

const CTA_POINTS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: ShieldCheck, title: "Nothing is lost", body: "Every check, note and decision keeps a trail you can look back on." },
  { icon: Clock, title: "One verdict", body: "Ready, ready with exceptions, or not ready - before the guest arrives." },
  { icon: Users, title: "Everyone sees the same", body: "Host, cleaner and guest work off one list, not three versions of it." },
];

export function FinalCta({ onOpenApp }: { onOpenApp: () => void }) {
  return (
    <section className="hero-glow border-t bg-card/40">
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-20 text-center">
        <Reveal>
          <h2 className={H2}>Try it with demo data</h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Demo mode uses sample answers, so you can explore every screen before
            pointing it at a real home.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <ul className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-3">
            {CTA_POINTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="rounded-2xl border bg-card p-5 text-left shadow-sm">
                <span className="icon-badge mb-3"><Icon className="size-5" aria-hidden /></span>
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.2}>
          <div className="mx-auto max-w-xs">
            <ActionButton onClick={onOpenApp} className="btn-tap">Open the app</ActionButton>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            No sign-up. Nothing to configure.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t bg-secondary/50">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-2 md:items-start">
        <div>
          <p className="font-display text-lg font-bold">MoveMate Host Edition</p>
          <p className="text-sm text-muted-foreground">Know what should be there, check it, record what is wrong, say if the home is ready.</p>
        </div>
        <AppearanceCard />
      </div>
    </footer>
  );
}