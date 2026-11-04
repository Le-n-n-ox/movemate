import { motion } from "motion/react";
import { BedDouble, Camera, ClipboardCheck, ShieldCheck, Sparkles, Zap } from "lucide-react";

export function Features() {
  const FEATURES = [
    {
      title: "AI-Assisted Scans",
      desc: "Scan rooms in seconds. Our AI identifies items and suggests crops, making setup effortless.",
      icon: Camera,
      tag: "Automation",
      color: "bg-primary/10 text-primary",
    },
    {
      title: "Digital Checklists",
      desc: "Cleaners follow a precise, room-by-room list. No more missed towels or forgotten trash.",
      icon: ClipboardCheck,
      tag: "Operations",
      color: "bg-accent/10 text-accent-foreground",
    },
    {
      title: "Readiness Reports",
      desc: "Get a high-level view of your property. Know exactly which rooms are ready for guests.",
      icon: ShieldCheck,
      tag: "Management",
      color: "bg-ok/10 text-ok",
    },
    {
      title: "Guest Guidance",
      desc: "Provide guests with a private link to identify appliances or find house rules instantly.",
      icon: BedDouble,
      tag: "Experience",
      color: "bg-info/10 text-info",
    },
    {
      title: "Case Tracking",
      desc: "Missing items or damages are automatically converted into cases for host review.",
      icon: Zap,
      tag: "Accountability",
      color: "bg-warn/10 text-warn",
    },
    {
      title: "Master Records",
      desc: "Maintain a digital twin of your rental. Update your inventory once, and it persists forever.",
      icon: Sparkles,
      tag: "Organization",
      color: "bg-secondary/20 text-secondary-foreground",
    },
  ];

  return (
    <section id="features" className="py-24 px-4 bg-muted/30">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16 space-y-4">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase"
          >
            Capabilities
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-display font-extrabold tracking-tight"
          >
            Everything you need for a 5-star turnover.
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ title, desc, icon: Icon, tag, color }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="group relative p-8 rounded-3xl border bg-card shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="flex flex-col h-full space-y-4">
                <div className={`grid size-12 place-items-center rounded-xl ${color} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                  <Icon className="size-6" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{tag}</span>
                  </div>
                  <h3 className="text-xl font-bold">{title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">{desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
