import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarHeight } from "@/lib/useTabBarHeight";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth";
import { getUserSettings, updateUserSettings } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const C = Colors.light;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();

  const [hourlyWage, setHourlyWage] = useState("");
  const [weekendHourlyWage, setWeekendHourlyWage] = useState("");
  const [breakMinutes, setBreakMinutes] = useState("");
  const [workplaceName, setWorkplaceName] = useState("");
  const [edited, setEdited] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: getUserSettings,
  });

  useEffect(() => {
    if (settings) {
      setHourlyWage(String(settings.hourlyWage));
      setWeekendHourlyWage(settings.weekendHourlyWage != null ? String(settings.weekendHourlyWage) : "");
      setBreakMinutes(String(settings.breakMinutes));
      setWorkplaceName(settings.workplaceName ?? "");
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: updateUserSettings,
    onSuccess: (updated) => {
      queryClient.setQueryData(["settings"], updated);
      setEdited(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => {
      Alert.alert("エラー", "設定の保存に失敗しました。");
    },
  });

  const handleSave = () => {
    const wage = parseInt(hourlyWage);
    const breakMin = parseInt(breakMinutes);
    if (isNaN(wage) || wage <= 0) {
      Alert.alert("入力エラー", "正しい時給を入力してください。");
      return;
    }
    if (isNaN(breakMin) || breakMin < 0) {
      Alert.alert("入力エラー", "正しい休憩時間を入力してください。");
      return;
    }
    const weekendWage = weekendHourlyWage.trim() !== "" ? parseInt(weekendHourlyWage) : null;
    if (weekendWage !== null && (isNaN(weekendWage) || weekendWage <= 0)) {
      Alert.alert("入力エラー", "正しい休日時給を入力してください。");
      return;
    }
    saveMutation.mutate({
      hourlyWage: wage,
      weekendHourlyWage: weekendWage,
      breakMinutes: breakMin,
      workplaceName: workplaceName.trim() || null,
    });
  };

  const handleLogout = () => {
    if (Platform.OS === "web") {
      if (window.confirm("ログアウトしますか？")) {
        logout();
      }
      return;
    }
    Alert.alert(
      "ログアウト",
      "ログアウトしますか？",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "ログアウト",
          style: "destructive",
          onPress: logout,
        },
      ]
    );
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = tabBarHeight + (Platform.OS === "web" ? 34 : 0);

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
    : user?.email || "ユーザー";

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 24 }}
      >
        <Text style={styles.title}>設定</Text>

        {/* Profile */}
        <View style={styles.section}>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Feather name="user" size={28} color={C.tint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{displayName}</Text>
              {user?.email && (
                <Text style={styles.profileEmail}>{user.email}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Wage Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>給与設定</Text>
          <View style={styles.card}>
            <SettingRow label="平日時給" icon="dollar-sign">
              <View style={styles.inputRow}>
                <Text style={styles.currencyPrefix}>¥</Text>
                <TextInput
                  style={styles.input}
                  value={hourlyWage}
                  onChangeText={(v) => { setHourlyWage(v); setEdited(true); }}
                  keyboardType="number-pad"
                  placeholder="1000"
                  placeholderTextColor={C.textMuted}
                />
                <Text style={styles.unitSuffix}>/時</Text>
              </View>
            </SettingRow>
            <View style={styles.divider} />
            <SettingRow label="休日時給" icon="sun">
              <View style={styles.inputRow}>
                <Text style={styles.currencyPrefix}>¥</Text>
                <TextInput
                  style={styles.input}
                  value={weekendHourlyWage}
                  onChangeText={(v) => { setWeekendHourlyWage(v); setEdited(true); }}
                  keyboardType="number-pad"
                  placeholder="未設定"
                  placeholderTextColor={C.textMuted}
                />
                <Text style={styles.unitSuffix}>/時</Text>
              </View>
            </SettingRow>
            {settings && (
              <Text style={styles.hint}>
                休日時給を設定すると土日の勤務に自動適用されます
              </Text>
            )}
          </View>
        </View>

        {/* Work Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>勤務設定</Text>
          <View style={styles.card}>
            <SettingRow label="デフォルト休憩時間" icon="coffee">
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={breakMinutes}
                  onChangeText={(v) => { setBreakMinutes(v); setEdited(true); }}
                  keyboardType="number-pad"
                  placeholder="60"
                  placeholderTextColor={C.textMuted}
                />
                <Text style={styles.unitSuffix}>分</Text>
              </View>
            </SettingRow>
            <View style={styles.divider} />
            <SettingRow label="職場名（任意）" icon="briefcase">
              <TextInput
                style={[styles.input, { flex: 1, textAlign: "right" }]}
                value={workplaceName}
                onChangeText={(v) => { setWorkplaceName(v); setEdited(true); }}
                placeholder="未設定"
                placeholderTextColor={C.textMuted}
                returnKeyType="done"
              />
            </SettingRow>
          </View>
        </View>

        {/* Save Button */}
        {edited && (
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                { opacity: pressed || saveMutation.isPending ? 0.85 : 1 },
              ]}
              onPress={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="check" size={18} color="#fff" />
                  <Text style={styles.saveButtonText}>設定を保存</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* Logout */}
        <View style={styles.section}>
          <View style={styles.card}>
            <Pressable
              style={({ pressed }) => [styles.logoutRow, { opacity: pressed ? 0.7 : 1 }]}
              onPress={handleLogout}
            >
              <Feather name="log-out" size={18} color={C.danger} />
              <Text style={styles.logoutText}>ログアウト</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function SettingRow({
  label,
  icon,
  children,
}: {
  label: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <Feather name={icon as any} size={16} color={C.textSecondary} />
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <View style={styles.settingRight}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: C.text,
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: C.backgroundSecondary,
    borderRadius: 16,
    paddingVertical: 4,
    shadowColor: C.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: C.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    shadowColor: C.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: C.tintMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  profileEmail: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
    marginTop: 2,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: C.text,
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    justifyContent: "flex-end",
  },
  currencyPrefix: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: C.textSecondary,
  },
  input: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
    textAlign: "right",
    minWidth: 60,
    maxWidth: 120,
  },
  unitSuffix: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
  },
  hint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 16,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.tint,
    paddingVertical: 15,
    borderRadius: 14,
    shadowColor: C.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  logoutText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: C.danger,
  },
});
