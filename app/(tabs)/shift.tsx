import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
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
import { getAttendanceSummary } from "@/lib/api";
import type { AttendanceRecord } from "@/lib/api";
import { formatCurrency, formatMinutes, formatMonth, getCurrentMonth, getCurrentDateStr } from "@/lib/utils";

const C = Colors.light;

const DOW_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function getPrevMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

function getNextMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDow(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

function padDate(n: number): string {
  return String(n).padStart(2, "0");
}

export default function ShiftScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
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

  const recordMap = useMemo(() => {
    const map: Record<string, AttendanceRecord> = {};
    for (const r of summary?.records ?? []) {
      map[r.date] = r;
    }
    return map;
  }, [summary]);

  const [year, month] = selectedMonth.split("-").map(Number);
  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDow(year, month);
  const todayStr = getCurrentDateStr();

  const calendarCells = useMemo(() => {
    const cells: Array<{ day: number | null; dateStr: string | null }> = [];
    for (let i = 0; i < firstDow; i++) {
      cells.push({ day: null, dateStr: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        dateStr: `${selectedMonth}-${padDate(d)}`,
      });
    }
    const remainder = cells.length % 7;
    if (remainder !== 0) {
      for (let i = 0; i < 7 - remainder; i++) {
        cells.push({ day: null, dateStr: null });
      }
    }
    return cells;
  }, [selectedMonth, firstDow, daysInMonth]);

  const weeks = useMemo(() => {
    const w: typeof calendarCells[] = [];
    for (let i = 0; i < calendarCells.length; i += 7) {
      w.push(calendarCells.slice(i, i + 7));
    }
    return w;
  }, [calendarCells]);

  const totalSalary = summary?.totalSalaryEstimate ?? 0;
  const totalWorkDays = summary?.totalWorkDays ?? 0;
  const totalWorkMinutes = summary?.totalWorkMinutes ?? 0;

  const { topExtra, bottomExtra } = useWebPad();
  const topPad = insets.top + topExtra;
  const bottomPad = tabBarHeight + bottomExtra;

  function handleDayPress(dateStr: string) {
    const record = recordMap[dateStr];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (record) {
      router.push({ pathname: "/record/[id]", params: { id: record.id } });
    } else {
      router.push({ pathname: "/record/new", params: { date: dateStr } });
    }
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.monthArrow, { opacity: pressed ? 0.6 : 1 }]}
          onPress={() => setSelectedMonth(getPrevMonth(selectedMonth))}
        >
          <Feather name="chevron-left" size={22} color={C.tint} />
        </Pressable>
        <Text style={styles.monthTitle}>{formatMonth(selectedMonth)}</Text>
        <Pressable
          style={({ pressed }) => [styles.monthArrow, { opacity: pressed ? 0.6 : 1 }]}
          onPress={() => setSelectedMonth(getNextMonth(selectedMonth))}
        >
          <Feather name="chevron-right" size={22} color={C.tint} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.tint} />
        }
      >
        {/* Salary Estimate Card */}
        <View style={styles.salaryCard}>
          <View style={styles.salaryMain}>
            <Text style={styles.salaryLabel}>今月の給与予想</Text>
            {isLoading ? (
              <ActivityIndicator color={C.tint} style={{ marginTop: 4 }} />
            ) : (
              <Text style={styles.salaryAmount}>{formatCurrency(totalSalary)}</Text>
            )}
          </View>
          <View style={styles.salaryStats}>
            <View style={styles.statItem}>
              <Feather name="calendar" size={13} color={C.textSecondary} />
              <Text style={styles.statValue}>{totalWorkDays}<Text style={styles.statUnit}>日</Text></Text>
              <Text style={styles.statLabel}>勤務日数</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Feather name="clock" size={13} color={C.textSecondary} />
              <Text style={styles.statValue}>{formatMinutes(totalWorkMinutes)}</Text>
              <Text style={styles.statLabel}>合計時間</Text>
            </View>
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.calendarCard}>
          {/* Day of week headers */}
          <View style={styles.dowRow}>
            {DOW_LABELS.map((label, i) => (
              <Text
                key={label}
                style={[
                  styles.dowLabel,
                  i === 0 && { color: "#ef4444" },
                  i === 6 && { color: C.tint },
                ]}
              >
                {label}
              </Text>
            ))}
          </View>

          {/* Calendar rows */}
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((cell, ci) => {
                if (!cell.day || !cell.dateStr) {
                  return <View key={ci} style={styles.emptyCell} />;
                }
                const record = recordMap[cell.dateStr];
                const isToday = cell.dateStr === todayStr;
                const dow = (firstDow + cell.day - 1) % 7;
                const isSunday = dow === 0;
                const isSaturday = dow === 6;
                const isPast = cell.dateStr < todayStr;
                const isFuture = cell.dateStr > todayStr;

                return (
                  <Pressable
                    key={ci}
                    style={({ pressed }) => [
                      styles.dayCell,
                      record && styles.dayCellFilled,
                      isToday && styles.dayCellToday,
                      { opacity: pressed ? 0.75 : 1 },
                    ]}
                    onPress={() => handleDayPress(cell.dateStr!)}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        isSunday && styles.dayNumberSun,
                        isSaturday && styles.dayNumberSat,
                        isToday && styles.dayNumberToday,
                        record && styles.dayNumberFilled,
                      ]}
                    >
                      {cell.day}
                    </Text>

                    {record ? (
                      <View style={styles.shiftInfo}>
                        <Text style={styles.shiftTime} numberOfLines={1}>
                          {record.clockIn}
                          {record.clockOut ? `〜${record.clockOut}` : "〜"}
                        </Text>
                        <Text style={styles.shiftSalary} numberOfLines={1}>
                          {formatCurrency(Math.round(record.salaryEstimate))}
                        </Text>
                      </View>
                    ) : isFuture ? (
                      <View style={styles.addHint}>
                        <Feather name="plus" size={10} color={C.textMuted} />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: C.tint }]} />
            <Text style={styles.legendText}>記録あり</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: C.backgroundTertiary, borderWidth: 1.5, borderColor: C.tint }]} />
            <Text style={styles.legendText}>今日</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={[styles.legendText, { color: "#ef4444" }]}>日</Text>
            <Text style={styles.legendText}>= 日曜</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={[styles.legendText, { color: C.tint }]}>土</Text>
            <Text style={styles.legendText}>= 土曜</Text>
          </View>
        </View>
      </ScrollView>

      {/* Floating Add Button */}
      <Pressable
        style={({ pressed }) => [styles.fab, { opacity: pressed ? 0.85 : 1 }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push("/record/new");
        }}
      >
        <Feather name="plus" size={26} color="#fff" />
      </Pressable>
    </View>
  );
}

const CELL_ASPECT = 1.15;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 20,
  },
  monthTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: C.text,
    minWidth: 140,
    textAlign: "center",
  },
  monthArrow: {
    padding: 6,
  },

  // Salary card
  salaryCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    backgroundColor: C.tint,
    padding: 20,
    shadowColor: C.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  salaryMain: {
    marginBottom: 16,
  },
  salaryLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.75)",
    marginBottom: 4,
  },
  salaryAmount: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -1,
  },
  salaryStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  statValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  statUnit: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginHorizontal: 12,
  },

  // Calendar
  calendarCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: C.backgroundSecondary,
    borderRadius: 20,
    padding: 12,
    shadowColor: C.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  dowRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  dowLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: C.textSecondary,
    paddingVertical: 4,
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  emptyCell: {
    flex: 1,
    aspectRatio: 1 / CELL_ASPECT,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1 / CELL_ASPECT,
    borderRadius: 10,
    backgroundColor: C.backgroundTertiary,
    padding: 4,
    margin: 1.5,
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayCellFilled: {
    backgroundColor: C.tintMuted,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.2)",
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: C.tint,
    backgroundColor: C.backgroundTertiary,
  },
  dayNumber: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
    alignSelf: "flex-start",
  },
  dayNumberSun: {
    color: "#ef4444",
  },
  dayNumberSat: {
    color: C.tint,
  },
  dayNumberToday: {
    color: C.tint,
  },
  dayNumberFilled: {
    color: C.tint,
  },
  shiftInfo: {
    width: "100%",
    alignItems: "center",
  },
  shiftTime: {
    fontSize: 8,
    fontFamily: "Inter_500Medium",
    color: C.tint,
    textAlign: "center",
  },
  shiftSalary: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    color: C.success,
    textAlign: "center",
  },
  addHint: {
    opacity: 0.4,
  },

  // Legend
  legend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },

  // FAB
  fab: {
    position: "absolute",
    right: 20,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.tint,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
