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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { getAttendanceRecords, updateAttendanceRecord, deleteAttendanceRecord, getUserSettings } from "@/lib/api";
import type { AttendanceRecord } from "@/lib/api";
import { formatDate, formatMinutes, formatCurrency } from "@/lib/utils";
import { TimeInput } from "@/components/DateTimeInputs";

const C = Colors.light;

export default function EditRecordScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  const [breakMinutes, setBreakMinutes] = useState("");
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
        setNote(found.note ?? "");
      }
    });
  }, [id]);

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
    updateMutation.mutate({
      clockIn,
      clockOut: clockOut || null,
      breakMinutes: parseInt(breakMinutes) || 0,
      note: note.trim() || null,
    });
  };

  const handleDelete = () => {
    Alert.alert("記録を削除", "この記録を削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: () => deleteMutation.mutate(),
      },
    ]);
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  function timeToMinutes(t: string): number {
    const [h, m] = t.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return 0;
    return h * 60 + m;
  }

  const workMin = (clockIn && clockOut)
    ? Math.max(0, timeToMinutes(clockOut) - timeToMinutes(clockIn) - (parseInt(breakMinutes) || 0))
    : 0;
  const salary = Math.round((workMin / 60) * (settings?.hourlyWage || 1000));

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
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
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
    width: 56,
    height: 36,
    backgroundColor: C.backgroundTertiary,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: C.border,
    padding: 0,
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
