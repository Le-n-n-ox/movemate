import { Toaster } from "sonner";
import { useTheme } from "@/hooks/useTheme";

export function ThemedToaster() {
  const { resolved } = useTheme();
  return <Toaster theme={resolved} position="top-center" richColors closeButton />;
}