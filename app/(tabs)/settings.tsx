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
import { useWebPad } from "@/lib/useWebPad";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth";
import { getUserSettings, updateUserSettings, getProfile, updateProfile, getAttendanceSummary } from "@/lib/api";
import { formatCurrency, getCurrentMonth } from "@/lib/utils";
import { HOUR_BADGES, DAY_BADGES, getEarnedBadges, type Badge } from "@/lib/badges";

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

  const [nickname, setNickname] = useState("");
  const [pinnedBadgeIds, setPinnedBadgeIds] = useState<string[]>([]);
  const [profileEdited, setProfileEdited] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: getUserSettings,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
  });

  const { data: currentSummary } = useQuery({
    queryKey: ["summary", getCurrentMonth()],
    queryFn: () => getAttendanceSummary(getCurrentMonth()),
  });

  const earnedBadgeSet = getEarnedBadges(
    currentSummary?.totalWorkMinutes ?? 0,
    currentSummary?.totalWorkDays ?? 0
  );
  const earnedHourBadges = HOUR_BADGES.filter((b) => earnedBadgeSet.has(b.id));
  const earnedDayBadges = DAY_BADGES.filter((b) => earnedBadgeSet.has(b.id));

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname ?? "");
      setPinnedBadgeIds(profile.pinnedBadgeIds ?? []);
    }
  }, [profile]);

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

  const profileSaveMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updated) => {
      queryClient.setQueryData(["profile"], updated);
      setProfileEdited(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => {
      Alert.alert("エラー", "プロフィールの保存に失敗しました。");
    },
  });

  const handleProfileSave = () => {
    profileSaveMutation.mutate({ nickname: nickname.trim(), pinnedBadgeIds });
  };

  function toggleBadge(badgeId: string) {
    setPinnedBadgeIds((prev) => {
      if (prev.includes(badgeId)) return prev.filter((id) => id !== badgeId);
      if (prev.length >= 6) return prev;
      return [...prev, badgeId];
    });
    setProfileEdited(true);
  }

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

  const { topExtra, bottomExtra } = useWebPad();
  const topPad = insets.top + topExtra;
  const bottomPad = tabBarHeight + bottomExtra;

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

        {/* Social Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ソーシャル設定</Text>
          <View style={styles.card}>
            <SettingRow label="ニックネーム" icon="award">
              <TextInput
                style={[styles.input, { flex: 1, textAlign: "right" }]}
                value={nickname}
                onChangeText={(v) => { setNickname(v); setProfileEdited(true); }}
                placeholder="未設定"
                placeholderTextColor={C.textMuted}
                maxLength={32}
                returnKeyType="done"
              />
            </SettingRow>
          </View>
          <Text style={styles.hint}>フレンドに表示される名前です</Text>
        </View>

        {/* Pinned Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>表示バッジ（最大6個）</Text>
          <View style={styles.card}>
            {earnedHourBadges.length === 0 && earnedDayBadges.length === 0 ? (
              <View style={styles.noBadgeWrap}>
                <Text style={styles.noBadgeText}>今月はまだバッジを獲得していません</Text>
              </View>
            ) : (
              <>
                {earnedHourBadges.length > 0 && (
                  <>
                    <Text style={styles.badgePickerLabel}>時間バッジ</Text>
                    <BadgePicker
                      badges={earnedHourBadges}
                      selected={pinnedBadgeIds}
                      color={C.tint}
                      muted={C.tintMuted}
                      onToggle={toggleBadge}
                    />
                  </>
                )}
                {earnedHourBadges.length > 0 && earnedDayBadges.length > 0 && (
                  <View style={styles.divider} />
                )}
                {earnedDayBadges.length > 0 && (
                  <>
                    <Text style={styles.badgePickerLabel}>日数バッジ</Text>
                    <BadgePicker
                      badges={earnedDayBadges}
                      selected={pinnedBadgeIds}
                      color={C.success}
                      muted={C.successMuted}
                      onToggle={toggleBadge}
                    />
                  </>
                )}
              </>
            )}
          </View>
          <Text style={styles.hint}>選んだバッジがフレンドの画面に表示されます</Text>
        </View>

        {profileEdited && (
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                { opacity: pressed || profileSaveMutation.isPending ? 0.85 : 1 },
              ]}
              onPress={handleProfileSave}
              disabled={profileSaveMutation.isPending}
            >
              {profileSaveMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="check" size={18} color="#fff" />
                  <Text style={styles.saveButtonText}>プロフィールを保存</Text>
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

function BadgePicker({
  badges,
  selected,
  color,
  muted,
  onToggle,
}: {
  badges: Badge[];
  selected: string[];
  color: string;
  muted: string;
  onToggle: (id: string) => void;
}) {
  return (
    <View style={styles.badgePickerGrid}>
      {badges.map((b) => {
        const isSelected = selected.includes(b.id);
        const disabled = !isSelected && selected.length >= 6;
        return (
          <Pressable
            key={b.id}
            style={({ pressed }) => [
              styles.badgePickerItem,
              isSelected
                ? { backgroundColor: muted, borderColor: color }
                : { backgroundColor: C.backgroundTertiary, borderColor: C.border },
              { opacity: pressed || disabled ? 0.5 : 1 },
            ]}
            onPress={() => onToggle(b.id)}
            disabled={disabled}
          >
            <Text style={[styles.badgePickerText, { color: isSelected ? color : C.textMuted }]}>
              {b.label}
            </Text>
          </Pressable>
        );
      })}
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
  hint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    marginTop: 6,
    marginLeft: 4,
  },
  badgePickerLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: C.textSecondary,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  badgePickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  badgePickerItem: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  badgePickerText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  noBadgeWrap: {
    paddingVertical: 20,
    alignItems: "center",
  },
  noBadgeText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
});
