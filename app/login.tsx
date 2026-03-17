import React, { useEffect, useState } from "react";
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
import { useWebPad } from "@/lib/useWebPad";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth";
import Colors from "@/constants/colors";

const C = Colors.light;

function isPWAStandalone(): boolean {
  if (Platform.OS !== "web") return true;
  if (typeof window === "undefined") return false;
  if ((window.navigator as any).standalone === true) return true;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  if (window.matchMedia?.("(display-mode: fullscreen)").matches) return true;
  return false;
}

export default function LoginScreen() {
  const { login, isLoading, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const { topExtra, bottomExtra } = useWebPad();
  const [standalone] = useState(() => isPWAStandalone());

  useEffect(() => {
    if (!isLoading && isAuthenticated && standalone) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, standalone]);

  if (!isLoading && isAuthenticated && !standalone) {
    return <ReturnToAppScreen insets={insets} />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + topExtra, paddingBottom: insets.bottom + bottomExtra }]}>
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
          disabled={isLoading}
        >
          {isLoading ? (
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

function ReturnToAppScreen({ insets }: { insets: { top: number; bottom: number } }) {
  return (
    <View style={[returnStyles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <View style={returnStyles.iconWrap}>
        <Feather name="check-circle" size={56} color={C.tint} />
      </View>
      <Text style={returnStyles.title}>ログイン完了</Text>
      <Text style={returnStyles.body}>
        ホーム画面のアプリアイコンをタップして{"\n"}アプリに戻ってください
      </Text>
      <View style={returnStyles.stepWrap}>
        <StepItem number="1" text="このタブを閉じる" />
        <StepItem number="2" text="ホーム画面を開く" />
        <StepItem number="3" text="「勤怠管理」アイコンをタップ" />
      </View>
      <Text style={returnStyles.note}>
        ※ ログイン情報は保存されています
      </Text>
    </View>
  );
}

function StepItem({ number, text }: { number: string; text: string }) {
  return (
    <View style={returnStyles.stepItem}>
      <View style={returnStyles.stepBadge}>
        <Text style={returnStyles.stepNumber}>{number}</Text>
      </View>
      <Text style={returnStyles.stepText}>{text}</Text>
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

const returnStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.backgroundSecondary,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: C.tintMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: C.text,
    letterSpacing: -0.5,
  },
  body: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  stepWrap: {
    width: "100%",
    gap: 12,
    marginTop: 8,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: C.background,
    borderRadius: 12,
    padding: 14,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumber: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  stepText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: C.text,
  },
  note: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    textAlign: "center",
    marginTop: 4,
  },
});
