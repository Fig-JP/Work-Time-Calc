import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarHeight } from "@/lib/useTabBarHeight";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { getAttendanceSummary } from "@/lib/api";
import { formatMonth, getCurrentMonth } from "@/lib/utils";
import {
  HOUR_BADGES,
  DAY_BADGES,
  getEarnedBadges,
  getNextBadge,
  type Badge,
} from "@/lib/badges";

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

export default function SocialScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  const { data: summary, isLoading } = useQuery({
    queryKey: ["summary", selectedMonth],
    queryFn: () => getAttendanceSummary(selectedMonth),
  });

  const totalMinutes = summary?.totalWorkMinutes ?? 0;
  const totalDays = summary?.totalWorkDays ?? 0;
  const earned = getEarnedBadges(totalMinutes, totalDays);
  const nextHour = getNextBadge(HOUR_BADGES, earned);
  const nextDay = getNextBadge(DAY_BADGES, earned);

  const topPad = insets.top;
  const bottomPad = tabBarHeight;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>ソーシャル</Text>
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

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.tint} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomPad + 20, paddingHorizontal: 16 }}
        >
          {/* Progress summary */}
          <View style={styles.progressRow}>
            <ProgressCard
              icon="clock"
              label="今月の勤務時間"
              value={`${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`}
              next={nextHour ? `次: ${nextHour.label}` : "全バッジ獲得！"}
              color={C.tint}
              muted={C.tintMuted}
            />
            <ProgressCard
              icon="calendar"
              label="今月の出勤日数"
              value={`${totalDays}日`}
              next={nextDay ? `次: ${nextDay.label}` : "全バッジ獲得！"}
              color={C.success}
              muted={C.successMuted}
            />
          </View>

          {/* Hours badges */}
          <BadgeSection
            title="勤務時間バッジ"
            icon="clock"
            badges={HOUR_BADGES}
            earned={earned}
            color={C.tint}
            muted={C.tintMuted}
          />

          {/* Days badges */}
          <BadgeSection
            title="出勤日数バッジ"
            icon="calendar"
            badges={DAY_BADGES}
            earned={earned}
            color={C.success}
            muted={C.successMuted}
          />

          {/* Coming soon */}
          <View style={styles.comingSoon}>
            <Feather name="users" size={28} color={C.textMuted} />
            <Text style={styles.comingSoonTitle}>フレンド機能</Text>
            <Text style={styles.comingSoonText}>近日公開予定</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function ProgressCard({
  icon,
  label,
  value,
  next,
  color,
  muted,
}: {
  icon: string;
  label: string;
  value: string;
  next: string;
  color: string;
  muted: string;
}) {
  return (
    <View style={[styles.progressCard, { flex: 1 }]}>
      <View style={[styles.progressIconWrap, { backgroundColor: muted }]}>
        <Feather name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.progressLabel}>{label}</Text>
      <Text style={[styles.progressValue, { color }]}>{value}</Text>
      <Text style={styles.progressNext}>{next}</Text>
    </View>
  );
}

function BadgeSection({
  title,
  icon,
  badges,
  earned,
  color,
  muted,
}: {
  title: string;
  icon: string;
  badges: Badge[];
  earned: Set<string>;
  color: string;
  muted: string;
}) {
  const earnedCount = badges.filter((b) => earned.has(b.id)).length;

  return (
    <View style={styles.badgeSection}>
      <View style={styles.badgeSectionHeader}>
        <View style={styles.badgeSectionTitleRow}>
          <Feather name={icon as any} size={16} color={color} />
          <Text style={styles.badgeSectionTitle}>{title}</Text>
        </View>
        <Text style={[styles.badgeCount, { color }]}>
          {earnedCount} / {badges.length}
        </Text>
      </View>

      <View style={styles.badgeGrid}>
        {badges.map((badge) => {
          const isEarned = earned.has(badge.id);
          return (
            <View
              key={badge.id}
              style={[
                styles.badgeItem,
                isEarned
                  ? { backgroundColor: muted, borderColor: color }
                  : { backgroundColor: C.backgroundTertiary, borderColor: C.border },
              ]}
            >
              <Feather
                name={icon as any}
                size={13}
                color={isEarned ? color : C.textMuted}
              />
              <Text
                style={[
                  styles.badgeLabel,
                  { color: isEarned ? color : C.textMuted },
                ]}
              >
                {badge.label}
              </Text>
            </View>
          );
        })}
      </View>
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
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: C.text,
    letterSpacing: -0.5,
  },
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 4,
  },
  monthArrow: {
    padding: 8,
  },
  monthText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  progressRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
    marginTop: 4,
  },
  progressCard: {
    backgroundColor: C.backgroundSecondary,
    borderRadius: 16,
    padding: 14,
    gap: 4,
    shadowColor: C.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  progressIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
  },
  progressValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  progressNext: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    marginTop: 2,
  },
  badgeSection: {
    backgroundColor: C.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: C.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  badgeSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  badgeSectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badgeSectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  badgeCount: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badgeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  comingSoon: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 8,
    backgroundColor: C.backgroundSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: "dashed",
    marginBottom: 8,
  },
  comingSoonTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: C.textSecondary,
  },
  comingSoonText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
});
