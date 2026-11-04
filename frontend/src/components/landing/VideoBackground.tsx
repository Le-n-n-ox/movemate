import { motion } from "motion/react";

export function VideoBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-background">
      {/*
        Replace the src with a high-quality BNB/Guest house video.
        Example: A slow panning shot of a cozy living room or a modern exterior.
      */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="h-full w-full object-cover opacity-60 scale-105 animate-slow-zoom"
        src="https://assets.mixkit.co/videos/preview/mixkit-interior-of-a-modern-living-room-with-a-sofa-and-a-coffee-table-41341-large.mp4"
      />

      {/* Cinematic Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent opacity-80" />

      {/* Subtle Animated Ambient Light */}
      <motion.div
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-[20%] -left-[10%] h-[60%] w-[60%] rounded-full bg-primary/20 blur-[120px]"
      />
    </div>
  );
}
