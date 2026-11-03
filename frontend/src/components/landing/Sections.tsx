import {
  Brush, Camera, Check, ClipboardCheck, Clock, EyeOff, FileCheck2, FolderOpen, KeyRound, Minus, Scale, ScanSearch,
  ShieldCheck, Sparkles, UserCheck, Users,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { AppearanceCard } from "@/components/AppearanceCard";
import { ActionButton } from "@/components/LinkButton";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { Reveal } from "@/components/motion/Reveal";
import { Card } from "@/components/ui/card";

const H2 = "font-display text-3xl font-extrabold tracking-tight sm:text-4xl";
const EASE = [0.2, 0.7, 0.2, 1] as const;

/* ---------- scroll progress (add once in Landing.tsx) ---------- */

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.3 });
  return (
    <motion.div
      aria-hidden
      className="no-print fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-primary"
      style={{ scaleX }}
    />
  );
}

/* ---------- facts ---------- */

const FACTS: [number, string][] = [
  [3, "roles: host, cleaner, guest"], [4, "workflows in one loop"],
  [6, "condition states tracked"], [5, "ways a case can end"],
];

export function Facts() {
  return (
    <section className="border-y bg-secondary/50" aria-label="At a glance">
      <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-y-8 px-4 py-10 md:grid-cols-4 md:divide-x">
        {FACTS.map(([n, label], i) => (
          <div key={label} className="flex flex-col-reverse px-4 text-center">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="font-display text-5xl font-extrabold text-primary">
              <AnimatedNumber value={n} />
              <motion.span
                aria-hidden
                className="mx-auto mt-2 block h-1 w-10 origin-left rounded-full bg-primary/40"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 + i * 0.1, ease: EASE }}
              />
            </dd>
          </div>
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
  const reduce = useReducedMotion();
  return (
    <Card className="card-warn gap-5 p-6">
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
                initial={{ strokeDasharray: reduce ? `${Math.max(a.len - 2, 0)} ${C}` : `0 ${C}` }}
                whileInView={{ strokeDasharray: `${Math.max(a.len - 2, 0)} ${C}` }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.9, delay: 0.15 * i, ease: "easeOut" }}
              />
            ))}
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <p className="font-display text-3xl font-extrabold leading-none">
              <AnimatedNumber value={SEGMENTS[0].value} />
              <span className="text-lg text-muted-foreground">/{TOTAL}</span>
              <span className="mt-1 block text-xs font-medium text-muted-foreground">in place</span>
            </p>
          </div>
        </div>
        <ul className="w-full space-y-2 text-sm">
          {ARCS.map((a, i) => (
            <motion.li
              key={a.label}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: 12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 + i * 0.12, duration: 0.4, ease: EASE }}
            >
              <span className="relative flex size-3">
                {a.label === "Missing" && (
                  <span className="absolute inline-flex size-full animate-ping rounded-full opacity-60" style={{ background: a.color }} />
                )}
                <span className="relative inline-flex size-3 rounded-full" style={{ background: a.color }} aria-hidden />
              </span>
              <span className="flex-1">{a.label}</span>
              <span className="font-display font-bold">{a.value}</span>
            </motion.li>
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
    <section id="why" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
      <Reveal>
        <h2 className={H2}>Why a quick look is not enough</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          A cleaner cannot spot what is missing from a home nobody has listed. MoveMate starts by recording the home, then checks it after every stay.
        </p>
      </Reveal>
      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          {WHY.map(({ icon: Icon, problem, answer }, i) => (
            <Reveal key={problem} delay={i * 0.1} direction="left">
              <Card className="card-lift flex-row gap-4 p-5">
                <motion.span
                  className="grid size-11 shrink-0 place-items-center rounded-xl bg-danger/10 text-danger"
                  whileHover={{ rotate: [0, -10, 10, -4, 0], transition: { duration: 0.5 } }}
                >
                  <Icon className="size-5" aria-hidden />
                </motion.span>
                <div>
                  <h3 className="font-display text-lg font-bold">{problem}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{answer}</p>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.2} direction="right"><ReadinessRing /></Reveal>
      </div>
    </section>
  );
}

/* ---------- feature artwork ---------- */

type ArtKind = "scan" | "guide" | "video" | "inspect" | "cases" | "verdict";

const CENTER = { transformBox: "fill-box", transformOrigin: "center" } as const;
const LEFT = { transformBox: "fill-box", transformOrigin: "left center" } as const;

const draw = (delay = 0, duration = 0.6) => ({
  initial: { pathLength: 0 },
  whileInView: { pathLength: 1 },
  viewport: { once: true },
  transition: { duration, delay, ease: "easeOut" as const },
});
const pop = (delay = 0) => ({
  initial: { scale: 0, opacity: 0 },
  whileInView: { scale: 1, opacity: 1 },
  viewport: { once: true },
  transition: { type: "spring" as const, stiffness: 320, damping: 16, delay },
});
const grow = (delay = 0) => ({
  initial: { scaleX: 0 },
  whileInView: { scaleX: 1 },
  viewport: { once: true },
  transition: { duration: 0.5, delay, ease: EASE },
});

const LOOP = { duration: 2.6, repeat: Infinity, ease: "easeInOut" as const };

function FeatureArt({ kind }: { kind: ArtKind }) {
  const reduce = useReducedMotion();
  return (
    <div className="grid h-24 place-items-center overflow-hidden rounded-xl bg-secondary/70" aria-hidden>
      <svg viewBox="0 0 160 80" className="h-full w-full" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {kind === "scan" && (
          <>
            <rect x="68" y="28" width="24" height="24" rx="6" fill="var(--accent)" stroke="var(--primary)" strokeWidth="2" />
            <motion.path d="M50 26v-10h10M110 16h10v10M120 54v10h-10M60 64H50V54" stroke="var(--primary)" strokeWidth="3" {...draw()} />
            <motion.rect
              x="46" y="0" width="68" height="2" rx="1" fill="var(--info)"
              initial={{ y: 18 }}
              animate={reduce ? { y: 40 } : { y: [18, 62, 18] }}
              transition={LOOP}
            />
          </>
        )}

        {kind === "guide" && [0, 1, 2].map((i) => (
          <motion.g
            key={i}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.2, duration: 0.4, ease: EASE }}
          >
            <circle cx="44" cy={20 + i * 20} r="8" fill="var(--primary)" />
            <text x="44" y={23.5 + i * 20} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--primary-foreground)" stroke="none">{i + 1}</text>
            <rect x="60" y={16 + i * 20} width={74 - i * 16} height="8" rx="4" fill="var(--muted-foreground)" opacity=".3" />
          </motion.g>
        ))}

        {kind === "video" && (
          <>
            <rect x="36" y="10" width="88" height="60" rx="8" fill="var(--card)" stroke="var(--border)" strokeWidth="2" />
            <rect x="50" y="46" width="22" height="14" rx="3" fill="var(--muted-foreground)" opacity=".25" />
            <rect x="88" y="40" width="22" height="20" rx="3" fill="var(--muted-foreground)" opacity=".25" />
            <motion.rect
              x="48" y="24" width="26" height="38" rx="5" stroke="var(--info)" strokeWidth="2.5" strokeDasharray="5 4"
              animate={reduce ? undefined : { x: [0, 38, 0] }}
              transition={LOOP}
            />
            <circle cx="113" cy="20" r="3.5" fill="var(--danger)" className="animate-pulse" />
          </>
        )}

        {kind === "inspect" && [0, 1, 2].map((i) => (
          <g key={i}>
            <rect x="46" y={14 + i * 22} width="16" height="16" rx="4" stroke="var(--primary)" strokeWidth="2" />
            <motion.path d={`M50 ${22 + i * 22}l4 4 7-9`} stroke="var(--ok)" strokeWidth="3" {...draw(0.2 + i * 0.35, 0.35)} />
            <motion.rect x="70" y={19 + i * 22} width={48 - i * 8} height="6" rx="3" fill="var(--muted-foreground)" opacity=".3" style={LEFT} {...grow(0.1 + i * 0.35)} />
          </g>
        ))}

        {kind === "cases" && (
          <>
            <motion.path d="M58 16V64" stroke="var(--border)" strokeWidth="3" {...draw(0, 0.8)} />
            {([["var(--danger)", 16], ["var(--warn)", 40], ["var(--ok)", 64]] as const).map(([c, y], i) => (
              <g key={y}>
                <motion.circle cx="58" cy={y} r="6" fill={c} style={CENTER} {...pop(0.2 + i * 0.25)} />
                <motion.rect x="74" y={y - 4} width={[58, 46, 38][i]} height="8" rx="4" fill="var(--muted-foreground)" opacity=".3" style={LEFT} {...grow(0.3 + i * 0.25)} />
              </g>
            ))}
          </>
        )}

        {kind === "verdict" && (
          <>
            <rect x="12" y="34" width="32" height="12" rx="6" fill="var(--warn)" opacity=".35" />
            <rect x="116" y="34" width="32" height="12" rx="6" fill="var(--danger)" opacity=".3" />
            <motion.circle cx="80" cy="40" r="24" stroke="var(--ok)" strokeWidth="4" {...draw(0, 0.8)} />
            <motion.path d="M69 41l8 8 15-17" stroke="var(--ok)" strokeWidth="5" {...draw(0.6, 0.4)} />
          </>
        )}
      </svg>
    </div>
  );
}

/* ---------- features ---------- */

type Tag = "ai" | "human";
const TAGS: Record<Tag, { label: string; cls: string }> = {
  ai: { label: "AI suggests", cls: "bg-info/10 text-info" },
  human: { label: "You decide", cls: "bg-ok/15 text-ok" },
};

const FEATURES: { icon: LucideIcon; title: string; text: string; tag?: Tag; art: ArtKind }[] = [
  { icon: Camera, title: "Scan once", text: "Photograph important items. We suggest names and places. You confirm.", tag: "ai", art: "scan" },
  { icon: Sparkles, title: "Guest guide from a photo", text: "Guests snap an appliance and get short steps. No login.", tag: "ai", art: "guide" },
  { icon: ScanSearch, title: "AI video check", text: "Film a room and get hints about what looks missing or moved. Suggestions only.", tag: "ai", art: "video" },
  { icon: ClipboardCheck, title: "Human inspection", text: "A checklist per room, with photo proof for high-value items.", tag: "human", art: "inspect" },
  { icon: FolderOpen, title: "Cases, not blame", text: "Anything off becomes a factual record with a trail nobody can edit.", tag: "human", art: "cases" },
  { icon: FileCheck2, title: "A clear verdict", text: "Ready, ready with exceptions, or not ready. Printable.", art: "verdict" },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
      <Reveal><h2 className={H2}>Everything the loop needs</h2></Reveal>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text, tag, art }, i) => (
          <Reveal key={title} delay={i * 0.06} className="h-full">
            <Card className="card-lift h-full gap-3 p-5">
              <FeatureArt kind={art} />
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="icon-badge tile"><Icon className="size-5" aria-hidden /></span>
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
                    <motion.span
                      className="icon-badge icon-badge-lg tile rounded-full"
                      aria-hidden
                      initial={{ scale: 0.5, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.2 + i * 0.45 }}
                    >
                      {i + 1}
                    </motion.span>
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
    <section id="compare" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
      <Reveal>
        <h2 className={H2}>Not just another checklist</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          A plain checklist tells a cleaner what to tick. It cannot tell anyone what is missing. Here is where MoveMate goes further.
        </p>
      </Reveal>
      <div className="mt-10 space-y-3">
        <div className="hidden grid-cols-[1fr_1fr_1.2fr] px-4 text-sm font-semibold text-muted-foreground md:grid" aria-hidden>
          <span />
          <span>A plain checklist</span>
          <span className="text-primary">MoveMate</span>
        </div>
        {COMPARE.map(([what, plain, mm], i) => (
          <Reveal key={what} delay={i * 0.05} direction="left" distance={16}>
            <Card className="gap-0 overflow-hidden p-0 md:grid md:grid-cols-[1fr_1fr_1.2fr]">
              <p className="p-4 font-display font-bold">{what}</p>
              <p className="flex items-start gap-2 p-4 pt-0 text-sm text-muted-foreground md:pt-4">
                <Minus className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span><span className="font-semibold text-foreground md:hidden">Plain checklist: </span>{plain}</span>
              </p>
              <p className="flex items-start gap-2 bg-accent/70 p-4 text-sm font-medium text-accent-foreground">
                <motion.span
                  className="mt-0.5 shrink-0"
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 380, damping: 14, delay: 0.3 + i * 0.05 }}
                >
                  <Check className="size-4 text-primary" aria-hidden />
                </motion.span>
                <span><span className="font-semibold md:hidden">MoveMate: </span>{mm}</span>
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

const LIST = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.25 } } };
const ITEM = { hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: EASE } } };

export function Roles() {
  return (
    <section id="roles" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
      <Reveal><h2 className={H2}>Made for three people</h2></Reveal>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {ROLES.map(({ icon: Icon, name, points }, i) => (
          <Reveal key={name} delay={i * 0.08} className="h-full">
            <Card className="card-lift h-full gap-4 p-6">
              <motion.span
                className="icon-badge icon-badge-lg tile"
                whileHover={{ rotate: -8, scale: 1.08 }}
                transition={{ type: "spring", stiffness: 300, damping: 14 }}
              >
                <Icon className="size-6" aria-hidden />
              </motion.span>
              <h3 className="font-display text-2xl font-bold">{name}</h3>
              <motion.ul
                className="space-y-2 text-sm"
                variants={LIST}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
              >
                {points.map((p) => (
                  <motion.li key={p} variants={ITEM} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <span className="text-muted-foreground">{p}</span>
                  </motion.li>
                ))}
              </motion.ul>
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
  const reduce = useReducedMotion();
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16">
      <Reveal>
        <div className="grid items-center gap-6 rounded-2xl border border-primary/30 bg-accent p-6 text-accent-foreground md:grid-cols-[1.2fr_1fr]">
          <div className="flex gap-4">
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 260, damping: 14 }}
              className="shrink-0"
            >
              <ShieldCheck className="size-10 text-primary" aria-hidden />
            </motion.span>
            <div>
              <h2 className="font-display text-2xl font-extrabold">The AI only suggests. People decide.</h2>
              <p className="mt-1 text-sm">It never records a loss. Only the host confirms one, so nobody is blamed by a guess.</p>
            </div>
          </div>
          <ol className="relative flex items-center justify-between gap-1" aria-label="How a suggestion becomes a record">
            {!reduce && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute top-6 size-2.5 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]"
                initial={{ left: "8%", opacity: 0 }}
                animate={{ left: ["8%", "92%"], opacity: [0, 1, 1, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 2.2, delay: 1.8, ease: "easeInOut" }}
              />
            )}
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

const CHIPS: { icon: LucideIcon; cls: string; pos: string; anim: string }[] = [
  { icon: Check, cls: "bg-ok/15 text-ok", pos: "left-[6%] top-8", anim: "animate-float" },
  { icon: Camera, cls: "bg-info/15 text-info", pos: "right-[8%] top-16", anim: "animate-float-slow" },
  { icon: ShieldCheck, cls: "bg-accent text-primary", pos: "left-[14%] bottom-10", anim: "animate-float-slow" },
  { icon: FileCheck2, cls: "bg-warn/20 text-amber-800 dark:text-amber-300", pos: "right-[12%] bottom-6", anim: "animate-float" },
];

export function FinalCta({ onOpenApp }: { onOpenApp: () => void }) {
  return (
    <section className="hero-glow relative mx-auto max-w-4xl px-4 pb-24 pt-8 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 hidden md:block">
        {CHIPS.map(({ icon: Icon, cls, pos, anim }, i) => (
          <motion.span
            key={i}
            className={`absolute ${pos}`}
            initial={{ opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + i * 0.12, type: "spring", stiffness: 240, damping: 16 }}
          >
            <span className={`grid size-12 place-items-center rounded-2xl border bg-card shadow-lg ${anim}`}>
              <span className={`grid size-8 place-items-center rounded-xl ${cls}`}><Icon className="size-4" /></span>
            </span>
          </motion.span>
        ))}
      </div>
      <Reveal>
        <h2 className={H2}>Try it with demo data</h2>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">Demo mode uses sample answers, so you can explore every screen.</p>
        <div className="mx-auto mt-6 max-w-xs rounded-lg animate-pulse-ring">
          <ActionButton onClick={onOpenApp}>Open the app</ActionButton>
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
          <p className="font-display text-lg font-bold">MoveMate Host Edition</p>
          <p className="text-sm text-muted-foreground">Know what should be there, check it, record what is wrong, say if the home is ready.</p>
        </div>
        <AppearanceCard />
      </div>
    </footer>
  );
}