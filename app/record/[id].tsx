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
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { getAttendanceRecords, updateAttendanceRecord, deleteAttendanceRecord, getUserSettings } from "@/lib/api";
import type { AttendanceRecord, DayType, WageRange } from "@/lib/api";
import { formatDate, formatMinutes, formatCurrency } from "@/lib/utils";
import { TimeInput } from "@/components/DateTimeInputs";

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

function getAvailableDayTypes(settings: any): DayTypeOption[] {
  return ALL_DAY_TYPES.filter((opt) => {
    if (opt.key === "weekday" || opt.key === "weekend" || opt.key === "custom") return true;
    if (opt.key === "holiday") return settings?.holidayHourlyWage != null;
    if (opt.key === "night") return settings?.nightHourlyWage != null;
    return false;
  });
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

function calcBaseWage(dayType: DayType, customWageNum: number | null, settings: any): number {
  switch (dayType) {
    case "custom": return customWageNum ?? 0;
    case "holiday": return settings?.holidayHourlyWage != null ? Number(settings.holidayHourlyWage) : Number(settings?.hourlyWage ?? 1000);
    case "night": return settings?.nightHourlyWage != null ? Number(settings.nightHourlyWage) : Number(settings?.hourlyWage ?? 1000);
    case "weekend": return settings?.weekendHourlyWage != null ? Number(settings.weekendHourlyWage) : Number(settings?.hourlyWage ?? 1000);
    default: return Number(settings?.hourlyWage ?? 1000);
  }
}

function inferDayType(dateStr: string): DayType {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  return day === 0 || day === 6 ? "weekend" : "weekday";
}

export default function EditRecordScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  const [breakMinutes, setBreakMinutes] = useState("");
  const [dayType, setDayType] = useState<DayType>("weekday");
  const [customWage, setCustomWage] = useState("");
  const [shiftMemo, setShiftMemo] = useState("");
  const [note, setNote] = useState("");
  const [record, setRecord] = useState<AttendanceRecord | null>(null);

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: getUserSettings,
  });

  const { isLoading } = useQuery({
    queryKey: ["record", id],
    queryFn: async () => {
      const records = await getAttendanceRecords();
      return records.find((r) => r.id === id) ?? null;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (!id) return;
    getAttendanceRecords().then((records) => {
      const found = records.find((r) => r.id === id);
      if (found) {
        setRecord(found);
        setClockIn(found.clockIn);
        setClockOut(found.clockOut ?? "");
        setBreakMinutes(String(found.breakMinutes));
        setDayType(found.dayType ?? inferDayType(found.date));
        setCustomWage(found.customHourlyWage != null ? String(found.customHourlyWage) : "");
        setShiftMemo(found.shiftMemo ?? "");
        setNote(found.note ?? "");
      }
    });
  }, [id]);

  const availableTypes = getAvailableDayTypes(settings);

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateAttendanceRecord>[1]) =>
      updateAttendanceRecord(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
    onError: () => {
      Alert.alert("エラー", "更新に失敗しました。");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAttendanceRecord(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
    onError: () => {
      Alert.alert("エラー", "削除に失敗しました。");
    },
  });

  const handleSave = () => {
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
    updateMutation.mutate({
      clockIn,
      clockOut: clockOut || null,
      breakMinutes: parseInt(breakMinutes) || 0,
      dayType,
      customHourlyWage: dayType === "custom" ? (parseInt(customWage) || null) : null,
      shiftMemo: shiftMemo.trim() || null,
      note: note.trim() || null,
    });
  };

  const handleDelete = () => {
    if (Platform.OS === "web") {
      if (window.confirm("この記録を削除しますか？")) {
        deleteMutation.mutate();
      }
      return;
    }
    Alert.alert("記録を削除", "この記録を削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      { text: "削除", style: "destructive", onPress: () => deleteMutation.mutate() },
    ]);
  };

  const { topExtra, bottomExtra } = useWebPad();
  const topPad = insets.top + topExtra;
  const bottomPad = insets.bottom + bottomExtra;

  function timeToMinutes(t: string): number {
    const [h, m] = t.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return 0;
    return h * 60 + m;
  }

  function minuteInRange(m: number, s: number, e: number): boolean {
    if (s <= e) return m >= s && m < e;
    return m >= s || m < e;
  }

  const wageRanges: WageRange[] = settings?.wageRanges ?? [];
  const customWageNum = parseInt(customWage) || null;
  const baseWage = calcBaseWage(dayType, customWageNum, settings);

  const startMin = timeToMinutes(clockIn);
  let endMin = timeToMinutes(clockOut);
  if (endMin <= startMin && clockOut) endMin += 24 * 60;
  const totalMin = clockOut ? (endMin - startMin) : 0;
  const workMin = clockOut ? Math.max(0, totalMin - (parseInt(breakMinutes) || 0)) : 0;

  let salary = 0;
  if (workMin > 0) {
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
  }

  if (isLoading && !record) {
    return (
      <View style={[styles.container, { paddingTop: topPad, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={C.tint} />
      </View>
    );
  }

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
        <View>
          <Text style={styles.headerTitle}>打刻を編集</Text>
          {record && (
            <Text style={styles.headerDate}>{formatDate(record.date)}</Text>
          )}
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            { opacity: pressed || updateMutation.isPending ? 0.8 : 1 },
          ]}
          onPress={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? (
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
                    style={styles.breakInput}
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
                  style={styles.breakInput}
                  value={breakMinutes}
                  onChangeText={setBreakMinutes}
                  placeholder="0"
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

        {clockIn && clockOut && workMin > 0 && (
          <View style={styles.previewCard}>
            <View style={styles.previewRow}>
              <Feather name="clock" size={15} color={C.tint} />
              <Text style={styles.previewLabel}>勤務時間</Text>
              <Text style={styles.previewValue}>{formatMinutes(workMin)}</Text>
            </View>
            <View style={styles.previewDivider} />
            <View style={styles.previewRow}>
              <Feather name="dollar-sign" size={15} color={C.success} />
              <Text style={styles.previewLabel}>給料目安</Text>
              <Text style={[styles.previewValue, { color: C.success }]}>{formatCurrency(salary)}</Text>
            </View>
          </View>
        )}

        {/* Shift Memo */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>シフトメモ（任意）</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.noteInput}
              value={shiftMemo}
              onChangeText={setShiftMemo}
              placeholder={`例：${record?.date.slice(5).replace("-", "/") ?? "mm/dd"} は ${clockIn || "09:00"}〜${clockOut || "18:00"} まで`}
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={2}
            />
          </View>
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
            />
          </View>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          <Pressable
            style={({ pressed }) => [styles.deleteBtn, { opacity: pressed || deleteMutation.isPending ? 0.7 : 1 }]}
            onPress={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <ActivityIndicator color={C.danger} size="small" />
            ) : (
              <>
                <Feather name="trash-2" size={16} color={C.danger} />
                <Text style={styles.deleteBtnText}>この記録を削除</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
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
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
    textAlign: "center",
  },
  headerDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
    textAlign: "center",
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
  section: {
    paddingHorizontal: 20,
    marginBottom: 16,
    marginTop: 8,
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
  breakInput: {
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
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: C.dangerMuted,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
  deleteBtnText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: C.danger,
  },
});
