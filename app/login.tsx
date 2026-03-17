import React, { useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth";
import Colors from "@/constants/colors";

const C = Colors.light;

export default function LoginScreen() {
  const { login, isLoading, isAuthenticated, isAuthReady } = useAuth();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.topSection}>
        <View style={styles.iconContainer}>
          <Feather name="clock" size={48} color={C.tint} />
        </View>
        <Text style={styles.appName}>勤怠管理</Text>
        <Text style={styles.tagline}>出退勤・給料をかんたん管理</Text>
      </View>

      <View style={styles.featuresSection}>
        <FeatureItem icon="check-circle" text="出退勤時間を記録" />
        <FeatureItem icon="dollar-sign" text="時給から給料を自動計算" />
        <FeatureItem icon="bar-chart-2" text="月別サマリーで収入を把握" />
        <FeatureItem icon="cloud" text="データはクラウドに安全保存" />
      </View>

      <View style={styles.bottomSection}>
        <Pressable
          style={({ pressed }) => [
            styles.loginButton,
            { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
          onPress={login}
          disabled={isLoading || (Platform.OS !== "web" && !isAuthReady)}
        >
          {isLoading || (Platform.OS !== "web" && !isAuthReady) ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Feather name="log-in" size={20} color="#fff" />
              <Text style={styles.loginButtonText}>ログイン</Text>
            </>
          )}
        </Pressable>
        <Text style={styles.privacyNote}>アカウント登録でデータがクラウドに同期されます</Text>
      </View>
    </View>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIconWrap}>
        <Feather name={icon as any} size={18} color={C.tint} />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.backgroundSecondary,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  topSection: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: C.tintMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  appName: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: C.text,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
  },
  featuresSection: {
    gap: 16,
    paddingHorizontal: 8,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.tintMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: C.text,
    flex: 1,
  },
  bottomSection: {
    paddingBottom: 24,
    gap: 12,
    alignItems: "center",
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: C.tint,
    paddingVertical: 16,
    borderRadius: 14,
    width: "100%",
    shadowColor: C.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  privacyNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    textAlign: "center",
  },
});
