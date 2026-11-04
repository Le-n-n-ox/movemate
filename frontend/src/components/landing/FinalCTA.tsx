import { motion } from "motion/react";
import { CheckCircle2, ArrowRight, Home } from "lucide-react";
import { ActionButton } from "@/components/LinkButton";

export function FinalCTA() {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      <div className="mx-auto max-w-4xl text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-primary rounded-[3rem] p-12 md:p-20 text-primary-foreground relative overflow-hidden shadow-2xl"
        >
          {/* Abstract Background Decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10 space-y-8">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-display font-extrabold tracking-tight"
            >
              Ready to automate <br /> your turnovers?
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-primary-foreground/80 text-lg max-w-xl mx-auto leading-relaxed"
            >
              Join professional hosts who save hours every week and ensure every guest arrives to a perfect home.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap justify-center gap-4"
            >
              <ActionButton
                onClick={() => window.location.href = '/start'}
                className="bg-white text-primary hover:bg-primary-foreground w-auto px-8 py-6 text-lg"
              >
                Get Started Now
              </ActionButton>
              <div className="flex items-center gap-2 text-sm font-medium text-primary-foreground/60">
                <CheckCircle2 className="size-4" />
                No credit card required
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
