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
import { useTheme, type ThemePreference } from "@/lib/theme";
import { getUserSettings, updateUserSettings, getProfile, updateProfile, getAttendanceSummary } from "@/lib/api";
import type { WageRange } from "@/lib/api";
import { formatCurrency, getCurrentMonth } from "@/lib/utils";
import { HOUR_BADGES, DAY_BADGES, getEarnedBadges, type Badge } from "@/lib/badges";

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
  { value: "light", label: "ライト", icon: "sun" },
  { value: "dark", label: "ダーク", icon: "moon" },
  { value: "system", label: "端末と同期", icon: "smartphone" },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const { preference: themePref, setPreference: setThemePref, C } = useTheme();

  const [hourlyWage, setHourlyWage] = useState("");
  const [weekendHourlyWage, setWeekendHourlyWage] = useState("");
  const [nightHourlyWage, setNightHourlyWage] = useState("");
  const [holidayHourlyWage, setHolidayHourlyWage] = useState("");
  const [wageRanges, setWageRanges] = useState<WageRange[]>([]);
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
      setNightHourlyWage(settings.nightHourlyWage != null ? String(settings.nightHourlyWage) : "");
      setHolidayHourlyWage(settings.holidayHourlyWage != null ? String(settings.holidayHourlyWage) : "");
      setWageRanges(settings.wageRanges ?? []);
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

  function parseOptionalWage(val: string): number | null {
    if (val.trim() === "") return null;
    const n = parseInt(val);
    return isNaN(n) || n <= 0 ? null : n;
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
    const weekendWage = parseOptionalWage(weekendHourlyWage);
    const nightWage = parseOptionalWage(nightHourlyWage);
    const holidayWage = parseOptionalWage(holidayHourlyWage);

    for (const r of wageRanges) {
      if (!r.start.match(/^\d{2}:\d{2}$/) || !r.end.match(/^\d{2}:\d{2}$/)) {
        Alert.alert("入力エラー", `時間帯「${r.label}」の時刻形式が正しくありません。`);
        return;
      }
      if (!r.wage || r.wage <= 0) {
        Alert.alert("入力エラー", `時間帯「${r.label}」の時給を入力してください。`);
        return;
      }
    }

    saveMutation.mutate({
      hourlyWage: wage,
      weekendHourlyWage: weekendWage,
      nightHourlyWage: nightWage,
      holidayHourlyWage: holidayWage,
      wageRanges: wageRanges,
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
        { text: "ログアウト", style: "destructive", onPress: logout },
      ]
    );
  };

  function addWageRange() {
    setWageRanges((prev) => [
      ...prev,
      { id: genId(), label: "新しい時間帯", start: "22:00", end: "05:00", wage: 0 },
    ]);
    setEdited(true);
  }

  function removeWageRange(id: string) {
    setWageRanges((prev) => prev.filter((r) => r.id !== id));
    setEdited(true);
  }

  function updateWageRange(id: string, field: keyof WageRange, value: string | number) {
    setWageRanges((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
    setEdited(true);
  }

  const { topExtra, bottomExtra } = useWebPad();
  const topPad = insets.top + topExtra;
  const bottomPad = tabBarHeight + bottomExtra;

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
    : user?.email || "ユーザー";

  const s = makeStyles(C);

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 24 }}
      >
        <Text style={s.title}>設定</Text>

        {/* Profile */}
        <View style={s.section}>
          <View style={s.card}>
            <View style={s.profileCard}>
              <View style={s.avatar}>
                <Feather name="user" size={28} color={C.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.profileName}>{displayName}</Text>
                {user?.email && (
                  <Text style={s.profileEmail}>{user.email}</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Theme */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>アプリテーマ</Text>
          <View style={s.themeRow}>
            {THEME_OPTIONS.map((opt) => {
              const active = themePref === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={({ pressed }) => [
                    s.themeBtn,
                    active && s.themeBtnActive,
                    { opacity: pressed ? 0.75 : 1 },
                  ]}
                  onPress={() => {
                    setThemePref(opt.value);
                    Haptics.selectionAsync();
                  }}
                >
                  <Feather
                    name={opt.icon as any}
                    size={18}
                    color={active ? C.tint : C.textMuted}
                  />
                  <Text style={[s.themeBtnText, active && s.themeBtnTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Wage Settings */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>時給設定</Text>
          <View style={s.card}>
            <SettingRow label="平日" icon="dollar-sign" C={C}>
              <WageInput value={hourlyWage} onChange={(v) => { setHourlyWage(v); setEdited(true); }} placeholder="1000" C={C} />
            </SettingRow>
            <View style={s.divider} />
            <SettingRow label="休日" icon="sun" C={C}>
              <WageInput value={weekendHourlyWage} onChange={(v) => { setWeekendHourlyWage(v); setEdited(true); }} placeholder="未設定" C={C} />
            </SettingRow>
            <View style={s.divider} />
            <SettingRow label="夜間" icon="moon" C={C}>
              <WageInput value={nightHourlyWage} onChange={(v) => { setNightHourlyWage(v); setEdited(true); }} placeholder="未設定" C={C} />
            </SettingRow>
            <View style={s.divider} />
            <SettingRow label="祝日" icon="star" C={C}>
              <WageInput value={holidayHourlyWage} onChange={(v) => { setHolidayHourlyWage(v); setEdited(true); }} placeholder="未設定" C={C} />
            </SettingRow>
          </View>
          <Text style={s.hint}>打刻時に日種別を選択すると自動適用されます</Text>
        </View>

        {/* Time-Range Wages */}
        <View style={s.section}>
          <View style={s.sectionLabelRow}>
            <Text style={s.sectionLabel}>時間帯別時給</Text>
            <Pressable
              style={({ pressed }) => [s.addRangeBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={addWageRange}
            >
              <Feather name="plus" size={14} color={C.tint} />
              <Text style={s.addRangeBtnText}>追加</Text>
            </Pressable>
          </View>

          {wageRanges.length === 0 ? (
            <View style={[s.card, s.emptyRangeCard]}>
              <Feather name="clock" size={20} color={C.textMuted} />
              <Text style={s.emptyRangeText}>
                時間帯ごとに異なる時給を設定できます{"\n"}例：22:00〜05:00 → ¥1,250
              </Text>
            </View>
          ) : (
            <View style={s.rangesContainer}>
              {wageRanges.map((range) => (
                <View key={range.id} style={s.rangeCard}>
                  <View style={s.rangeHeader}>
                    <TextInput
                      style={s.rangeLabelInput}
                      value={range.label}
                      onChangeText={(v) => updateWageRange(range.id, "label", v)}
                      placeholder="ラベル（例：深夜帯）"
                      placeholderTextColor={C.textMuted}
                    />
                    <Pressable
                      style={({ pressed }) => [s.removeRangeBtn, { opacity: pressed ? 0.7 : 1 }]}
                      onPress={() => removeWageRange(range.id)}
                    >
                      <Feather name="trash-2" size={15} color={C.danger} />
                    </Pressable>
                  </View>
                  <View style={s.rangeBody}>
                    <View style={s.rangeTimeRow}>
                      <TextInput
                        style={s.rangeTimeInput}
                        value={range.start}
                        onChangeText={(v) => updateWageRange(range.id, "start", v)}
                        placeholder="00:00"
                        placeholderTextColor={C.textMuted}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                      />
                      <Text style={s.rangeTimeSep}>〜</Text>
                      <TextInput
                        style={s.rangeTimeInput}
                        value={range.end}
                        onChangeText={(v) => updateWageRange(range.id, "end", v)}
                        placeholder="00:00"
                        placeholderTextColor={C.textMuted}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                      />
                    </View>
                    <View style={s.rangeWageRow}>
                      <Text style={s.currencyPrefix}>¥</Text>
                      <TextInput
                        style={s.rangeWageInput}
                        value={range.wage > 0 ? String(range.wage) : ""}
                        onChangeText={(v) => {
                          const n = parseInt(v);
                          updateWageRange(range.id, "wage", isNaN(n) ? 0 : n);
                        }}
                        placeholder="時給"
                        placeholderTextColor={C.textMuted}
                        keyboardType="number-pad"
                      />
                      <Text style={s.unitSuffix}>/時</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
          <Text style={s.hint}>時間帯と重なる部分は自動で分割計算されます（深夜は例：22:00〜05:00）</Text>
        </View>

        {/* Work Settings */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>勤務設定</Text>
          <View style={s.card}>
            <SettingRow label="デフォルト休憩時間" icon="coffee" C={C}>
              <View style={s.inputRow}>
                <TextInput
                  style={s.input}
                  value={breakMinutes}
                  onChangeText={(v) => { setBreakMinutes(v); setEdited(true); }}
                  keyboardType="number-pad"
                  placeholder="60"
                  placeholderTextColor={C.textMuted}
                />
                <Text style={s.unitSuffix}>分</Text>
              </View>
            </SettingRow>
            <View style={s.divider} />
            <SettingRow label="職場名（任意）" icon="briefcase" C={C}>
              <TextInput
                style={[s.input, { flex: 1, textAlign: "right" }]}
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
                s.saveButton,
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
                  <Text style={s.saveButtonText}>設定を保存</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* Social Settings */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>ソーシャル設定</Text>
          <View style={s.card}>
            <SettingRow label="ニックネーム" icon="award" C={C}>
              <TextInput
                style={[s.input, { flex: 1, textAlign: "right" }]}
                value={nickname}
                onChangeText={(v) => { setNickname(v); setProfileEdited(true); }}
                placeholder="未設定"
                placeholderTextColor={C.textMuted}
                maxLength={32}
                returnKeyType="done"
              />
            </SettingRow>
          </View>
          <Text style={s.hint}>フレンドに表示される名前です</Text>
        </View>

        {/* Pinned Badges */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>表示バッジ（最大6個）</Text>
          <View style={s.card}>
            {earnedHourBadges.length === 0 && earnedDayBadges.length === 0 ? (
              <View style={s.noBadgeWrap}>
                <Text style={s.noBadgeText}>今月はまだバッジを獲得していません</Text>
              </View>
            ) : (
              <>
                {earnedHourBadges.length > 0 && (
                  <>
                    <Text style={s.badgePickerLabel}>時間バッジ</Text>
                    <BadgePicker
                      badges={earnedHourBadges}
                      selected={pinnedBadgeIds}
                      color={C.tint}
                      muted={C.tintMuted}
                      onToggle={toggleBadge}
                      C={C}
                    />
                  </>
                )}
                {earnedHourBadges.length > 0 && earnedDayBadges.length > 0 && (
                  <View style={s.divider} />
                )}
                {earnedDayBadges.length > 0 && (
                  <>
                    <Text style={s.badgePickerLabel}>日数バッジ</Text>
                    <BadgePicker
                      badges={earnedDayBadges}
                      selected={pinnedBadgeIds}
                      color={C.success}
                      muted={C.successMuted}
                      onToggle={toggleBadge}
                      C={C}
                    />
                  </>
                )}
              </>
            )}
          </View>
          <Text style={s.hint}>選んだバッジがフレンドの画面に表示されます</Text>
        </View>

        {profileEdited && (
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <Pressable
              style={({ pressed }) => [
                s.saveButton,
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
                  <Text style={s.saveButtonText}>プロフィールを保存</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* Logout */}
        <View style={s.section}>
          <View style={s.card}>
            <Pressable
              style={({ pressed }) => [s.logoutRow, { opacity: pressed ? 0.7 : 1 }]}
              onPress={handleLogout}
            >
              <Feather name="log-out" size={18} color={C.danger} />
              <Text style={s.logoutText}>ログアウト</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

type C = typeof Colors.light;

function WageInput({ value, onChange, placeholder, C }: { value: string; onChange: (v: string) => void; placeholder: string; C: C }) {
  const s = makeStyles(C);
  return (
    <View style={s.inputRow}>
      <Text style={s.currencyPrefix}>¥</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        selectTextOnFocus
      />
      <Text style={s.unitSuffix}>/時</Text>
    </View>
  );
}

function SettingRow({ label, icon, children, C }: { label: string; icon: string; children: React.ReactNode; C: C }) {
  const s = makeStyles(C);
  return (
    <View style={s.settingRow}>
      <View style={s.settingLeft}>
        <Feather name={icon as any} size={16} color={C.textSecondary} />
        <Text style={s.settingLabel}>{label}</Text>
      </View>
      <View style={s.settingRight}>{children}</View>
    </View>
  );
}

function BadgePicker({ badges, selected, color, muted, onToggle, C }: {
  badges: Badge[];
  selected: string[];
  color: string;
  muted: string;
  onToggle: (id: string) => void;
  C: C;
}) {
  const s = makeStyles(C);
  return (
    <View style={s.badgePickerGrid}>
      {badges.map((b) => {
        const isSelected = selected.includes(b.id);
        const disabled = !isSelected && selected.length >= 6;
        return (
          <Pressable
            key={b.id}
            style={({ pressed }) => [
              s.badgePickerItem,
              isSelected
                ? { backgroundColor: muted, borderColor: color }
                : { backgroundColor: C.backgroundTertiary, borderColor: C.border },
              { opacity: pressed || disabled ? 0.5 : 1 },
            ]}
            onPress={() => onToggle(b.id)}
            disabled={disabled}
          >
            <Text style={[s.badgePickerText, { color: isSelected ? color : C.textMuted }]}>
              {b.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(C: C) {
  return StyleSheet.create({
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
    sectionLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    themeRow: {
      flexDirection: "row",
      gap: 10,
    },
    themeBtn: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: C.backgroundSecondary,
      borderWidth: 1.5,
      borderColor: C.border,
    },
    themeBtnActive: {
      borderColor: C.tint,
      backgroundColor: C.tintMuted,
    },
    themeBtnText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: C.textMuted,
    },
    themeBtnTextActive: {
      color: C.tint,
      fontFamily: "Inter_600SemiBold",
    },
    addRangeBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
      backgroundColor: C.tintMuted,
      borderWidth: 1,
      borderColor: C.border,
    },
    addRangeBtnText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: C.tint,
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
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: C.tintMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    profileName: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
    },
    profileEmail: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: C.textMuted,
      marginTop: 2,
    },
    emptyRangeCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    emptyRangeText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: C.textMuted,
      lineHeight: 20,
    },
    rangesContainer: {
      gap: 10,
    },
    rangeCard: {
      backgroundColor: C.backgroundSecondary,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: C.border,
    },
    rangeHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
      gap: 8,
    },
    rangeLabelInput: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
      padding: 0,
    },
    removeRangeBtn: {
      padding: 4,
    },
    rangeBody: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    rangeTimeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    rangeTimeInput: {
      backgroundColor: C.backgroundTertiary,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: C.text,
      width: 62,
      textAlign: "center",
    },
    rangeTimeSep: {
      fontSize: 14,
      color: C.textMuted,
    },
    rangeWageRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: C.backgroundTertiary,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    rangeWageInput: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: C.text,
      padding: 0,
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
    },
    settingLabel: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: C.text,
    },
    settingRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    input: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: C.text,
      minWidth: 60,
      textAlign: "right",
      padding: 0,
    },
    currencyPrefix: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: C.textSecondary,
    },
    unitSuffix: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: C.textMuted,
    },
    divider: {
      height: 1,
      backgroundColor: C.border,
      marginHorizontal: 16,
    },
    hint: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: C.textMuted,
      marginTop: 6,
      marginLeft: 4,
      lineHeight: 18,
    },
    saveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: C.tint,
      borderRadius: 14,
      paddingVertical: 15,
    },
    saveButtonText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: "#fff",
    },
    logoutRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    logoutText: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: C.danger,
    },
    noBadgeWrap: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    noBadgeText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: C.textMuted,
    },
    badgePickerLabel: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: C.textMuted,
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 8,
    },
    badgePickerGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    badgePickerItem: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1.5,
    },
    badgePickerText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
    },
  });
}
