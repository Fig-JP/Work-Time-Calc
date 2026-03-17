import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarHeight } from "@/lib/useTabBarHeight";
import { useWebPad } from "@/lib/useWebPad";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth";
import { getAttendanceSummary } from "@/lib/api";
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

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [refreshing, setRefreshing] = useState(false);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["summary", selectedMonth],
    queryFn: () => getAttendanceSummary(selectedMonth),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["summary", selectedMonth] });
    setRefreshing(false);
  }, [selectedMonth, queryClient]);

  const handleNewRecord = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/record/new");
  };

  const { topExtra, bottomExtra } = useWebPad();
  const topPad = insets.top + topExtra;
  const bottomPad = tabBarHeight + bottomExtra;

  const displayName = user?.firstName || user?.email?.split("@")[0] || "ユーザー";

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header - fixed outside ScrollView */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>こんにちは</Text>
          <Text style={styles.userName}>{displayName}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.addButton, { opacity: pressed ? 0.85 : 1 }]}
          onPress={handleNewRecord}
        >
          <Feather name="plus" size={22} color="#fff" />
        </Pressable>
      </View>

      {/* Month Selector - fixed outside ScrollView */}
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.tint}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={C.tint} />
          </View>
        ) : (
          <>
            {/* Summary Cards */}
            <View style={styles.summaryGrid}>
              <SummaryCard
                icon="clock"
                label="総勤務時間"
                value={formatMinutes(summary?.totalWorkMinutes ?? 0)}
                color={C.tint}
                muted={C.tintMuted}
              />
              <SummaryCard
                icon="calendar"
                label="勤務日数"
                value={`${summary?.totalWorkDays ?? 0}日`}
                color={C.success}
                muted={C.successMuted}
              />
            </View>
            <View style={styles.salaryCard}>
              <View style={styles.salaryIconWrap}>
                <Feather name="dollar-sign" size={24} color={C.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.salaryLabel}>今月の給料目安</Text>
                <Text style={styles.salaryValue}>
                  {formatCurrency(summary?.totalSalaryEstimate ?? 0)}
                </Text>
              </View>
            </View>

            {/* Recent Records */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>打刻履歴</Text>
              {(summary?.records?.length ?? 0) > 3 && (
                <Pressable onPress={() => router.push("/(tabs)/history")}>
                  <Text style={styles.seeAll}>すべて見る</Text>
                </Pressable>
              )}
            </View>

            {!summary?.records || summary.records.length === 0 ? (
              <EmptyState onAdd={handleNewRecord} />
            ) : (
              summary.records.slice(0, 5).map((record) => (
                <AttendanceItem
                  key={record.id}
                  record={record}
                  onPress={() => router.push({ pathname: "/record/[id]", params: { id: record.id } })}
                />
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
  muted,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
  muted: string;
}) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: C.backgroundSecondary }]}>
      <View style={[styles.summaryIconWrap, { backgroundColor: muted }]}>
        <Feather name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
    </View>
  );
}

function AttendanceItem({
  record,
  onPress,
}: {
  record: any;
  onPress: () => void;
}) {
  const weekend = isWeekend(record.date);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.recordItem,
        { opacity: pressed ? 0.8 : 1 },
      ]}
      onPress={onPress}
    >
      <View style={[styles.recordDateBox, weekend ? styles.recordDateBoxWeekend : null]}>
        <Text style={[styles.recordDate, weekend ? styles.recordDateWeekend : null]}>
          {formatDate(record.date)}
        </Text>
      </View>
      <View style={styles.recordTimes}>
        <View style={styles.recordTimeRow}>
          <Feather name="log-in" size={13} color={C.success} />
          <Text style={styles.recordTimeText}>{record.clockIn}</Text>
        </View>
        {record.clockOut ? (
          <View style={styles.recordTimeRow}>
            <Feather name="log-out" size={13} color={C.danger} />
            <Text style={styles.recordTimeText}>{record.clockOut}</Text>
          </View>
        ) : (
          <View style={styles.recordTimeRow}>
            <Feather name="loader" size={13} color={C.warning} />
            <Text style={[styles.recordTimeText, { color: C.warning }]}>勤務中</Text>
          </View>
        )}
      </View>
      <View style={styles.recordSalary}>
        <Text style={styles.recordWorkTime}>{formatMinutes(record.workMinutes)}</Text>
        <Text style={styles.recordSalaryText}>{formatCurrency(record.salaryEstimate)}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={C.textMuted} />
    </Pressable>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Feather name="calendar" size={36} color={C.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>打刻記録がありません</Text>
      <Text style={styles.emptyText}>「+」ボタンから出退勤を記録しましょう</Text>
      <Pressable
        style={({ pressed }) => [styles.emptyButton, { opacity: pressed ? 0.85 : 1 }]}
        onPress={onAdd}
      >
        <Feather name="plus" size={16} color={C.tint} />
        <Text style={styles.emptyButtonText}>記録を追加</Text>
      </Pressable>
    </View>
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
  greeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
  },
  userName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: C.text,
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.tint,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginBottom: 12,
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
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    shadowColor: C.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  salaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: C.tint,
    borderRadius: 16,
    padding: 20,
    shadowColor: C.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  salaryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  salaryLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
  },
  salaryValue: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  seeAll: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: C.tint,
  },
  recordItem: {
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
    shadowRadius: 4,
    elevation: 1,
    gap: 10,
  },
  recordDateBox: {
    flex: 1,
  },
  recordDateBoxWeekend: {},
  recordDate: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: C.text,
  },
  recordDateWeekend: {
    color: C.danger,
  },
  recordTimes: {
    gap: 4,
    minWidth: 80,
    alignItems: "flex-start",
  },
  recordTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  recordTimeText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: C.textSecondary,
  },
  recordSalary: {
    alignItems: "flex-end",
    minWidth: 72,
  },
  recordWorkTime: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
  recordSalaryText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.tint,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: C.backgroundTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
    textAlign: "center",
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.tint,
  },
  emptyButtonText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: C.tint,
  },
});
