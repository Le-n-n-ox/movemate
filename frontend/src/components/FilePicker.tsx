import { useId, useRef } from "react";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MAX_MB = { image: 15, video: 150 };

export function FilePicker({ kind, label, icon, busy, busyLabel = "Uploading...", disabled, onFile, className, buttonClassName }: {
  kind: "image" | "video"; label: string; icon?: ReactNode; busy?: boolean; busyLabel?: string;
  disabled?: boolean; onFile: (f: File) => void; className?: string; buttonClassName?: string;
}) {

  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  const off = busy || disabled;

  return (
    <div className={className}>
      <input
        id={id} ref={ref} type="file" className="sr-only"
        accept={kind === "image" ? "image/*" : "video/*"} capture="environment" disabled={off}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          if (f.size > MAX_MB[kind] * 1024 * 1024) {
            toast.error(kind === "video" ? "Please record a shorter video." : "That photo is too big. Try again.");
            return;
          }
          onFile(f);
        }}
      />
      <label
        htmlFor={id}
        aria-disabled={off}
                className={cn(
          "inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground shadow-xs active:scale-[0.98]",
          off && "pointer-events-none opacity-60",
          buttonClassName,
        )}
      >
        {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : icon}
        {busy ? busyLabel : label}
      </label>
    </div>
  );
}