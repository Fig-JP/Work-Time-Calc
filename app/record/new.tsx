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
import { useWebPad } from "@/lib/useWebPad";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { createAttendanceRecord, getUserSettings } from "@/lib/api";
import type { DayType, WageRange } from "@/lib/api";
import { getCurrentDateStr, getCurrentTimeStr } from "@/lib/utils";
import { DateInput, TimeInput } from "@/components/DateTimeInputs";

const C = Colors.light;

type DayTypeOption = {
  key: DayType;
  label: string;
  icon: string;
  color: string;
};

const ALL_DAY_TYPES: DayTypeOption[] = [
  { key: "weekday", label: "平日", icon: "briefcase", color: C.tint },
  { key: "weekend", label: "休日", icon: "sun", color: C.warning },
  { key: "holiday", label: "祝日", icon: "star", color: "#ef4444" },
  { key: "night", label: "夜間", icon: "moon", color: "#6366f1" },
  { key: "custom", label: "その他", icon: "edit-2", color: C.textSecondary },
];

function inferDayType(dateStr: string): DayType {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  return day === 0 || day === 6 ? "weekend" : "weekday";
}

function getWageLabel(dayType: DayType, settings: any): string {
  switch (dayType) {
    case "weekday": return `¥${(settings?.hourlyWage ?? 1000).toLocaleString("ja-JP")}/時`;
    case "weekend": return settings?.weekendHourlyWage != null ? `¥${Number(settings.weekendHourlyWage).toLocaleString("ja-JP")}/時` : "未設定";
    case "holiday": return settings?.holidayHourlyWage != null ? `¥${Number(settings.holidayHourlyWage).toLocaleString("ja-JP")}/時` : "未設定";
    case "night": return settings?.nightHourlyWage != null ? `¥${Number(settings.nightHourlyWage).toLocaleString("ja-JP")}/時` : "未設定";
    case "custom": return "手動入力";
    default: return "";
  }
}

function getAvailableDayTypes(settings: any): DayTypeOption[] {
  return ALL_DAY_TYPES.filter((opt) => {
    if (opt.key === "weekday") return true;
    if (opt.key === "weekend") return true;
    if (opt.key === "holiday") return settings?.holidayHourlyWage != null;
    if (opt.key === "night") return settings?.nightHourlyWage != null;
    if (opt.key === "custom") return true;
    return false;
  });
}

function calcWage(
  dayType: DayType,
  customWage: number | null,
  settings: any
): number {
  switch (dayType) {
    case "custom": return customWage ?? 0;
    case "holiday": return settings?.holidayHourlyWage != null ? Number(settings.holidayHourlyWage) : Number(settings?.hourlyWage ?? 1000);
    case "night": return settings?.nightHourlyWage != null ? Number(settings.nightHourlyWage) : Number(settings?.hourlyWage ?? 1000);
    case "weekend": return settings?.weekendHourlyWage != null ? Number(settings.weekendHourlyWage) : Number(settings?.hourlyWage ?? 1000);
    default: return Number(settings?.hourlyWage ?? 1000);
  }
}

export default function NewRecordScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const today = getCurrentDateStr();
  const now = getCurrentTimeStr();

  const [date, setDate] = useState(today);
  const [clockIn, setClockIn] = useState(now);
  const [clockOut, setClockOut] = useState("");
  const [breakMinutes, setBreakMinutes] = useState("");
  const [dayType, setDayType] = useState<DayType>(inferDayType(today));
  const [customWage, setCustomWage] = useState("");
  const [shiftMemo, setShiftMemo] = useState("");
  const [note, setNote] = useState("");

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: getUserSettings,
  });

  const availableTypes = getAvailableDayTypes(settings);

  useEffect(() => {
    if (settings) {
      setBreakMinutes(String(settings.breakMinutes));
    }
  }, [settings]);

  useEffect(() => {
    setDayType(inferDayType(date));
  }, [date]);

  const mutation = useMutation({
    mutationFn: createAttendanceRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
    onError: (err: any) => {
      Alert.alert("エラー", err.message || "記録の保存に失敗しました。");
    },
  });

  const handleSave = () => {
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert("入力エラー", "日付を正しく入力してください。");
      return;
    }
    if (!clockIn.match(/^\d{2}:\d{2}$/)) {
      Alert.alert("入力エラー", "出勤時間を正しく入力してください。");
      return;
    }
    if (clockOut && !clockOut.match(/^\d{2}:\d{2}$/)) {
      Alert.alert("入力エラー", "退勤時間を正しく入力してください。");
      return;
    }
    if (dayType === "custom") {
      const w = parseInt(customWage);
      if (isNaN(w) || w <= 0) {
        Alert.alert("入力エラー", "その他の時給を入力してください。");
        return;
      }
    }
    mutation.mutate({
      date,
      clockIn,
      clockOut: clockOut || null,
      breakMinutes: parseInt(breakMinutes) || 0,
      dayType,
      customHourlyWage: dayType === "custom" ? (parseInt(customWage) || null) : null,
      shiftMemo: shiftMemo.trim() || null,
      note: note.trim() || null,
    });
  };

  const { topExtra, bottomExtra } = useWebPad();
  const topPad = insets.top + topExtra;
  const bottomPad = insets.bottom + bottomExtra;

  const effectiveWage = calcWage(dayType, parseInt(customWage) || null, settings);
  const wageRanges: WageRange[] = settings?.wageRanges ?? [];

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.handle} />

      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.6 : 1 }]}
          onPress={() => router.back()}
        >
          <Feather name="x" size={22} color={C.textSecondary} />
        </Pressable>
        <Text style={styles.headerTitle}>打刻を追加</Text>
        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            { opacity: pressed || mutation.isPending ? 0.8 : 1 },
          ]}
          onPress={handleSave}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>保存</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Quick Fill */}
        <View style={styles.quickRow}>
          <QuickButton
            label="今日・今"
            icon="zap"
            onPress={() => {
              const d = getCurrentDateStr();
              setDate(d);
              setClockIn(getCurrentTimeStr());
              setDayType(inferDayType(d));
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          />
          <QuickButton
            label="退勤をクリア"
            icon="log-in"
            onPress={() => {
              setClockOut("");
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          />
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>日付</Text>
          <View style={styles.card}>
            <FormRow label="日付" icon="calendar">
              <DateInput value={date} onChange={setDate} />
            </FormRow>
          </View>
        </View>

        {/* Day Type */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>日種別</Text>
          <View style={styles.dayTypeGrid}>
            {availableTypes.map((opt) => {
              const selected = dayType === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={({ pressed }) => [
                    styles.dayTypeChip,
                    selected && { backgroundColor: opt.color + "20", borderColor: opt.color },
                    { opacity: pressed ? 0.75 : 1 },
                  ]}
                  onPress={() => {
                    setDayType(opt.key);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Feather name={opt.icon as any} size={13} color={selected ? opt.color : C.textMuted} />
                  <Text style={[styles.dayTypeChipText, { color: selected ? opt.color : C.textMuted }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {dayType === "custom" ? (
            <View style={[styles.card, { marginTop: 8 }]}>
              <FormRow label="時給" icon="dollar-sign">
                <View style={styles.inputWithUnit}>
                  <Text style={styles.currencyPrefix}>¥</Text>
                  <TextInput
                    style={styles.input}
                    value={customWage}
                    onChangeText={setCustomWage}
                    placeholder="1000"
                    placeholderTextColor={C.textMuted}
                    keyboardType="number-pad"
                    selectTextOnFocus
                  />
                  <Text style={styles.unit}>/時</Text>
                </View>
              </FormRow>
            </View>
          ) : (
            <View style={styles.wageHintRow}>
              <Feather name="info" size={11} color={C.textMuted} />
              <Text style={styles.wageHint}>
                適用時給：{getWageLabel(dayType, settings)}
                {wageRanges.length > 0 ? "（時間帯別設定あり）" : ""}
              </Text>
            </View>
          )}
        </View>

        {/* Time */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>時間</Text>
          <View style={styles.card}>
            <FormRow label="出勤" icon="log-in" iconColor={C.success}>
              <TimeInput value={clockIn} onChange={setClockIn} />
            </FormRow>
            <View style={styles.divider} />
            <FormRow label="退勤" icon="log-out" iconColor={C.danger}>
              <TimeInput
                value={clockOut}
                onChange={setClockOut}
                placeholder="未入力（勤務中）"
                allowEmpty
              />
            </FormRow>
            <View style={styles.divider} />
            <FormRow label="休憩" icon="coffee" iconColor={C.warning}>
              <View style={styles.inputWithUnit}>
                <TextInput
                  style={styles.input}
                  value={breakMinutes}
                  onChangeText={setBreakMinutes}
                  placeholder="60"
                  placeholderTextColor={C.textMuted}
                  keyboardType="number-pad"
                  maxLength={3}
                  selectTextOnFocus
                />
                <Text style={styles.unit}>分</Text>
              </View>
            </FormRow>
          </View>
        </View>

        {/* Shift Memo */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>シフトメモ（任意）</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.noteInput}
              value={shiftMemo}
              onChangeText={setShiftMemo}
              placeholder={`例：${date.slice(5).replace("-", "/")} は ${clockIn || "09:00"}〜${clockOut || "18:00"} まで`}
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={2}
              returnKeyType="default"
            />
          </View>
          <Text style={styles.hintText}>シフト表の控えなどを入力できます</Text>
        </View>

        {/* Note */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>メモ（任意）</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="メモを入力..."
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={3}
              returnKeyType="default"
            />
          </View>
        </View>

        {clockIn && clockOut && (
          <WorkPreview
            clockIn={clockIn}
            clockOut={clockOut}
            breakMinutes={parseInt(breakMinutes) || 0}
            baseWage={effectiveWage}
            wageRanges={wageRanges}
          />
        )}
      </ScrollView>
    </View>
  );
}

function WorkPreview({
  clockIn,
  clockOut,
  breakMinutes,
  baseWage,
  wageRanges,
}: {
  clockIn: string;
  clockOut: string;
  breakMinutes: number;
  baseWage: number;
  wageRanges: WageRange[];
}) {
  function timeToMinutes(t: string): number {
    const [h, m] = t.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return 0;
    return h * 60 + m;
  }

  function minuteInRange(m: number, s: number, e: number): boolean {
    if (s <= e) return m >= s && m < e;
    return m >= s || m < e;
  }

  const startMin = timeToMinutes(clockIn);
  let endMin = timeToMinutes(clockOut);
  if (endMin <= startMin) endMin += 24 * 60;
  const totalMin = endMin - startMin;
  const workMin = Math.max(0, totalMin - breakMinutes);

  if (workMin <= 0) return null;

  const h = Math.floor(workMin / 60);
  const m = workMin % 60;
  const workStr = h > 0 ? (m > 0 ? `${h}時間${m}分` : `${h}時間`) : `${m}分`;

  let salary: number;
  if (wageRanges.length === 0) {
    salary = Math.round((workMin / 60) * baseWage);
  } else {
    const parsed = wageRanges.map((r) => ({
      startMin: timeToMinutes(r.start),
      endMin: timeToMinutes(r.end),
      wage: r.wage,
    }));
    let totalPay = 0;
    for (let min = startMin; min < endMin; min++) {
      const normalizedM = min % (24 * 60);
      const rangeWage = parsed.find((r) => minuteInRange(normalizedM, r.startMin, r.endMin));
      totalPay += (rangeWage ? rangeWage.wage : baseWage) / 60;
    }
    if (totalMin > 0 && workMin < totalMin) totalPay *= workMin / totalMin;
    salary = Math.round(totalPay);
  }

  return (
    <View style={styles.previewCard}>
      <View style={styles.previewRow}>
        <Feather name="clock" size={16} color={C.tint} />
        <Text style={styles.previewLabel}>勤務時間</Text>
        <Text style={styles.previewValue}>{workStr}</Text>
      </View>
      <View style={styles.previewDivider} />
      <View style={styles.previewRow}>
        <Feather name="dollar-sign" size={16} color={C.success} />
        <Text style={styles.previewLabel}>給料目安</Text>
        <Text style={[styles.previewValue, { color: C.success }]}>
          ¥{salary.toLocaleString("ja-JP")}
        </Text>
      </View>
    </View>
  );
}

function QuickButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.quickBtn, { opacity: pressed ? 0.75 : 1 }]}
      onPress={onPress}
    >
      <Feather name={icon as any} size={14} color={C.tint} />
      <Text style={styles.quickBtnText}>{label}</Text>
    </Pressable>
  );
}

function FormRow({
  label,
  icon,
  iconColor,
  children,
}: {
  label: string;
  icon: string;
  iconColor?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.formRow}>
      <View style={styles.formLeft}>
        <Feather name={icon as any} size={16} color={iconColor ?? C.textSecondary} />
        <Text style={styles.formLabel}>{label}</Text>
      </View>
      <View style={styles.formRight}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.backgroundTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  saveBtn: {
    backgroundColor: C.tint,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 56,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  quickRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  quickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.tintMuted,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.15)",
  },
  quickBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: C.tint,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 16,
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
  dayTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayTypeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.backgroundSecondary,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  dayTypeChipText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  wageHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    marginLeft: 4,
  },
  wageHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  hintText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    marginTop: 6,
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
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 16,
  },
  formRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 52,
  },
  formLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: 80,
  },
  formLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: C.text,
  },
  formRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  input: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: C.text,
    textAlign: "center",
    width: 66,
    height: 36,
    backgroundColor: C.backgroundTertiary,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: C.border,
    padding: 0,
  },
  inputWithUnit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  currencyPrefix: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: C.textSecondary,
  },
  unit: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
  },
  noteInput: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: C.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 70,
    textAlignVertical: "top",
  },
  previewCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: C.backgroundSecondary,
    borderRadius: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  previewLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: C.textSecondary,
  },
  previewValue: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  previewDivider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 16,
  },
});
