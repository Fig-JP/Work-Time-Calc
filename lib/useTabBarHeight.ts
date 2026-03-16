import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  if (Platform.OS === "web") return 84;
  if (Platform.OS === "ios") return 49 + insets.bottom;
  return 56 + insets.bottom;
}
