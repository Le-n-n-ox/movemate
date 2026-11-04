import { motion } from "motion/react";
import { Camera, ClipboardCheck, Home, Sparkles, ArrowRight, Search } from "lucide-react";

export function HowItWorks() {
  const STEPS = [
    {
      title: "Record Once",
      desc: "Create a master record of every room. Set exactly what belongs in each space.",
      icon: Home,
      color: "bg-primary/10 text-primary",
    },
    {
      title: "AI Scan",
      desc: "Quickly sweep the room with your camera. AI identifies items and flags discrepancies.",
      icon: Camera,
      color: "bg-accent/20 text-accent-foreground",
    },
    {
      title: "Inspect",
      desc: "Cleaners follow a digital checklist. Any issues are reported as cases in real-time.",
      icon: ClipboardCheck,
      color: "bg-secondary/30 text-secondary-foreground",
    },
    {
      title: "Turn Over",
      desc: "Review the readiness report. Once everything is confirmed, your home is guest-ready.",
      icon: Sparkles,
      color: "bg-ok/10 text-ok",
    },
  ];

  return (
    <section id="how" className="relative py-24 px-4 overflow-hidden">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16 space-y-4">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase"
          >
            The Workflow
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-display font-extrabold tracking-tight"
          >
            Turnovers, automated.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="max-w-2xl mx-auto text-muted-foreground text-lg"
          >
            MoveMate removes the guesswork from guest turnovers. Record your home once, and let AI and checklists handle the rest.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Connection Line for Desktop */}
          <div className="hidden lg:block absolute top-12 left-0 w-full h-0.5 bg-border/50 -z-10" />

          {STEPS.map(({ title, desc, icon: Icon, color }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative group"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`grid size-16 place-items-center rounded-2xl ${color} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm`}>
                  <Icon className="size-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-xl">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
