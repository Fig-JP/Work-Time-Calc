import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Pressable,
  RefreshControl,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarHeight } from "@/lib/useTabBarHeight";
import { useWebPad } from "@/lib/useWebPad";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { getAttendanceSummary, deleteAttendanceRecord } from "@/lib/api";
import { formatMinutes, formatCurrency, formatDate, formatMonth, getCurrentMonth, isWeekend } from "@/lib/utils";

const C = Colors.light;

function getPrevMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, "0")}`;
}

function getNextMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (m === 12) return `${y + 1}-01`;
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [refreshing, setRefreshing] = useState(false);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["summary", selectedMonth],
    queryFn: () => getAttendanceSummary(selectedMonth),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAttendanceRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["summary", selectedMonth] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["summary", selectedMonth] });
    setRefreshing(false);
  }, [selectedMonth, queryClient]);

  const handleDelete = (id: string) => {
    if (Platform.OS === "web") {
      if (window.confirm("この記録を削除しますか？")) {
        deleteMutation.mutate(id);
      }
      return;
    }
    Alert.alert(
      "記録を削除",
      "この記録を削除しますか？",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: () => deleteMutation.mutate(id),
        },
      ]
    );
  };

  const { topExtra, bottomExtra } = useWebPad();
  const topPad = insets.top + topExtra;
  const bottomPad = tabBarHeight + bottomExtra;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>勤務履歴</Text>
        <Pressable
          style={({ pressed }) => [styles.addButton, { opacity: pressed ? 0.85 : 1 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/record/new");
          }}
        >
          <Feather name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Month Selector */}
      <View style={styles.monthSelector}>
        <Pressable
          style={({ pressed }) => [styles.monthArrow, { opacity: pressed ? 0.6 : 1 }]}
          onPress={() => setSelectedMonth(getPrevMonth(selectedMonth))}
        >
          <Feather name="chevron-left" size={22} color={C.tint} />
        </Pressable>
        <Text style={styles.monthText}>{formatMonth(selectedMonth)}</Text>
        <Pressable
          style={({ pressed }) => [styles.monthArrow, { opacity: pressed ? 0.6 : 1 }]}
          onPress={() => setSelectedMonth(getNextMonth(selectedMonth))}
          disabled={selectedMonth >= getCurrentMonth()}
        >
          <Feather
            name="chevron-right"
            size={22}
            color={selectedMonth >= getCurrentMonth() ? C.textMuted : C.tint}
          />
        </Pressable>
      </View>

      {/* Summary bar */}
      {summary && (
        <View style={styles.summaryBar}>
          <SummaryChip icon="calendar" value={`${summary.totalWorkDays}日`} label="勤務日数" />
          <View style={styles.summaryDivider} />
          <SummaryChip icon="clock" value={formatMinutes(summary.totalWorkMinutes)} label="勤務時間" />
          <View style={styles.summaryDivider} />
          <SummaryChip icon="dollar-sign" value={formatCurrency(summary.totalSalaryEstimate)} label="給料目安" color={C.tint} />
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.tint} />
        </View>
      ) : !summary?.records || summary.records.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="calendar" size={40} color={C.textMuted} />
          <Text style={styles.emptyTitle}>この月の記録はありません</Text>
        </View>
      ) : (
        <SectionList
          sections={[{ title: formatMonth(selectedMonth), data: summary.records }]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: bottomPad + 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.tint} />
          }
          renderItem={({ item }) => (
            <RecordRow
              record={item}
              onPress={() => router.push({ pathname: "/record/[id]", params: { id: item.id } })}
              onDelete={() => handleDelete(item.id)}
            />
          )}
          renderSectionHeader={() => null}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function SummaryChip({
  icon,
  value,
  label,
  color,
}: {
  icon: string;
  value: string;
  label: string;
  color?: string;
}) {
  return (
    <View style={styles.summaryChip}>
      <Feather name={icon as any} size={14} color={color ?? C.textSecondary} />
      <Text style={[styles.summaryChipValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.summaryChipLabel}>{label}</Text>
    </View>
  );
}

function RecordRow({
  record,
  onPress,
  onDelete,
}: {
  record: any;
  onPress: () => void;
  onDelete: () => void;
}) {
  const weekend = isWeekend(record.date);
  return (
    <Pressable
      style={({ pressed }) => [styles.recordRow, { opacity: pressed ? 0.85 : 1 }]}
      onPress={onPress}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        onDelete();
      }}
    >
      <View style={styles.recordLeft}>
        <Text style={[styles.recordDate, weekend ? { color: C.danger } : null]}>
          {formatDate(record.date)}
        </Text>
        <View style={styles.recordTimesRow}>
          <View style={styles.timeChip}>
            <Feather name="log-in" size={11} color={C.success} />
            <Text style={styles.timeText}>{record.clockIn}</Text>
          </View>
          {record.clockOut ? (
            <View style={styles.timeChip}>
              <Feather name="log-out" size={11} color={C.danger} />
              <Text style={styles.timeText}>{record.clockOut}</Text>
            </View>
          ) : (
            <View style={[styles.timeChip, { backgroundColor: C.warningMuted }]}>
              <Feather name="loader" size={11} color={C.warning} />
              <Text style={[styles.timeText, { color: C.warning }]}>勤務中</Text>
            </View>
          )}
        </View>
        {record.note ? (
          <Text style={styles.recordNote} numberOfLines={1}>{record.note}</Text>
        ) : null}
      </View>
      <View style={styles.recordRight}>
        <Text style={styles.workTime}>{formatMinutes(record.workMinutes)}</Text>
        <Text style={styles.salary}>{formatCurrency(record.salaryEstimate)}</Text>
      </View>
      <Feather name="chevron-right" size={15} color={C.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.tint,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.tint,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 6,
    marginHorizontal: 20,
  },
  monthArrow: {
    padding: 8,
  },
  monthText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
    minWidth: 120,
    textAlign: "center",
  },
  summaryBar: {
    flexDirection: "row",
    backgroundColor: C.backgroundSecondary,
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    shadowColor: C.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: C.border,
    marginVertical: 4,
  },
  summaryChip: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  summaryChipValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  summaryChipLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: C.textSecondary,
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.backgroundSecondary,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: C.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 1,
    gap: 10,
  },
  recordLeft: {
    flex: 1,
    gap: 6,
  },
  recordDate: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  recordTimesRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.backgroundTertiary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  timeText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: C.textSecondary,
  },
  recordNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  recordRight: {
    alignItems: "flex-end",
    gap: 2,
    minWidth: 70,
  },
  workTime: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  salary: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: C.tint,
  },
});
