import { Platform } from "react-native";
import { useMemo } from "react";

function isPWAStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if ((window.navigator as any).standalone === true) return true;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  if (window.matchMedia?.("(display-mode: fullscreen)").matches) return true;
  return false;
}

export function useWebPad() {
  return useMemo(() => {
    if (Platform.OS !== "web") {
      return { topExtra: 0, bottomExtra: 0 };
    }
    const standalone = isPWAStandalone();
    return {
      topExtra: standalone ? 0 : 67,
      bottomExtra: standalone ? 0 : 34,
    };
  }, []);
}
