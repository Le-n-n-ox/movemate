import { Toaster } from "sonner";
import { useTheme } from "@/hooks/useTheme";

export function ThemedToaster() {
  const { resolved } = useTheme();
  return (
    <div className="contents" data-allow-overlap>
      <Toaster
        theme={resolved}
        position="top-center"
        richColors
        closeButton
        style={{ zIndex: "var(--z-toast)" }}
      />
    </div>
  );
}