import { useMemo } from "react";

export function useWebPad() {
  return useMemo(() => ({ topExtra: 0, bottomExtra: 0 }), []);
}
