"use client";
import { useRef, useState } from "react";

/** Opens the phone camera/gallery. Native input = no permission code and works on iOS and Android. */
export function FilePicker({ kind, label, onFile, disabled }: {
  kind: "image" | "video"; label: string; onFile: (f: File) => Promise<unknown> | void; disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div>
      <input ref={ref} type="file" hidden accept={kind === "image" ? "image/*" : "video/*"} capture="environment"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true); setErr(null);
          try { await onFile(f); } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
        }} />
      <button className="btn w-full" disabled={busy || disabled} onClick={() => ref.current?.click()}>
        {busy ? "Working..." : label}
      </button>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </div>
  );
}
