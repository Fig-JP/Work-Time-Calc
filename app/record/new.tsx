import React, { useState } from "react";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { createAttendanceRecord, getUserSettings } from "@/lib/api";
import { getCurrentDateStr, getCurrentTimeStr } from "@/lib/utils";

const C = Colors.light;

export default function NewRecordScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const today = getCurrentDateStr();
  const now = getCurrentTimeStr();

  const [date, setDate] = useState(today);
  const [clockIn, setClockIn] = useState(now);
  const [clockOut, setClockOut] = useState("");
  const [breakMinutes, setBreakMinutes] = useState("");
  const [note, setNote] = useState("");

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: getUserSettings,
  });

  React.useEffect(() => {
    if (settings) {
      setBreakMinutes(String(settings.breakMinutes));
    }
  }, [settings]);

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
      Alert.alert("入力エラー", "日付を正しく入力してください（YYYY-MM-DD）。");
      return;
    }
    if (!clockIn.match(/^\d{2}:\d{2}$/)) {
      Alert.alert("入力エラー", "出勤時間を正しく入力してください（HH:MM）。");
      return;
    }
    if (clockOut && !clockOut.match(/^\d{2}:\d{2}$/)) {
      Alert.alert("入力エラー", "退勤時間を正しく入力してください（HH:MM）。");
      return;
    }
    mutation.mutate({
      date,
      clockIn,
      clockOut: clockOut || null,
      breakMinutes: parseInt(breakMinutes) || 0,
      note: note.trim() || null,
    });
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Modal Handle */}
      <View style={styles.handle} />

      {/* Header */}
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
              setDate(getCurrentDateStr());
              setClockIn(getCurrentTimeStr());
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          />
          <QuickButton
            label="出勤のみ"
            icon="log-in"
            onPress={() => {
              setClockOut("");
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>基本情報</Text>
          <View style={styles.card}>
            <FormRow label="日付" icon="calendar">
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={C.textMuted}
                keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
              />
            </FormRow>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>時間</Text>
          <View style={styles.card}>
            <FormRow label="出勤" icon="log-in" iconColor={C.success}>
              <TextInput
                style={styles.input}
                value={clockIn}
                onChangeText={setClockIn}
                placeholder="HH:MM"
                placeholderTextColor={C.textMuted}
                keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
              />
            </FormRow>
            <View style={styles.divider} />
            <FormRow label="退勤" icon="log-out" iconColor={C.danger}>
              <TextInput
                style={styles.input}
                value={clockOut}
                onChangeText={setClockOut}
                placeholder="未入力（勤務中）"
                placeholderTextColor={C.textMuted}
                keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
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
                />
                <Text style={styles.unit}>分</Text>
              </View>
            </FormRow>
          </View>
        </View>

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

        {/* Work time preview */}
        {clockIn && clockOut && (
          <WorkPreview
            clockIn={clockIn}
            clockOut={clockOut}
            breakMinutes={parseInt(breakMinutes) || 0}
            hourlyWage={settings?.hourlyWage || 1000}
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
  hourlyWage,
}: {
  clockIn: string;
  clockOut: string;
  breakMinutes: number;
  hourlyWage: number;
}) {
  function timeToMinutes(t: string): number {
    const [h, m] = t.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return 0;
    return h * 60 + m;
  }

  const totalMin = timeToMinutes(clockOut) - timeToMinutes(clockIn);
  const workMin = Math.max(0, totalMin - breakMinutes);
  const salary = Math.round((workMin / 60) * hourlyWage);

  if (workMin <= 0) return null;

  const h = Math.floor(workMin / 60);
  const m = workMin % 60;
  const workStr = h > 0 ? (m > 0 ? `${h}時間${m}分` : `${h}時間`) : `${m}分`;

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
    paddingVertical: 14,
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
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
    textAlign: "right",
    minWidth: 80,
  },
  inputWithUnit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
    minHeight: 80,
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
