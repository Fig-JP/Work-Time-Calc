import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  TextInput,
  Pressable,
  Modal,
  Share,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarHeight } from "@/lib/useTabBarHeight";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import {
  getProfile,
  getFriends,
  addFriendByCode,
  acceptFriendRequest,
  removeFriend,
  type FriendData,
  type PendingRequest,
} from "@/lib/api";
import { formatMonth, getCurrentMonth } from "@/lib/utils";
import {
  HOUR_BADGES,
  DAY_BADGES,
  getEarnedBadges,
  type Badge,
} from "@/lib/badges";

const C = Colors.light;

function getPrevMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, "0")}`;
}
function getNextMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
}

function copyToClipboard(text: string) {
  if (Platform.OS === "web") {
    navigator.clipboard?.writeText(text).catch(() => {});
  } else {
    Share.share({ message: `フレンドコード: ${text}` });
  }
}

export default function SocialScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [addError, setAddError] = useState("");

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
  });

  const { data: friendsData, isLoading: friendsLoading } = useQuery({
    queryKey: ["friends", selectedMonth],
    queryFn: () => getFriends(selectedMonth),
  });

  const addFriendMutation = useMutation({
    mutationFn: addFriendByCode,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      setAddModalVisible(false);
      setCodeInput("");
      setAddError("");
      if (Platform.OS === "web") {
        window.alert(`${data.targetNickname} さんにフレンド申請を送りました！`);
      } else {
        Alert.alert("申請完了", `${data.targetNickname} さんにフレンド申請を送りました！`);
      }
    },
    onError: (err: Error) => {
      setAddError(err.message);
    },
  });

  const acceptMutation = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friends"] }),
  });

  const removeMutation = useMutation({
    mutationFn: removeFriend,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friends"] }),
  });

  function handleRemove(friendshipId: string, nickname: string) {
    if (Platform.OS === "web") {
      if (window.confirm(`${nickname} さんをフレンドから削除しますか？`)) {
        removeMutation.mutate(friendshipId);
      }
    } else {
      Alert.alert("フレンド削除", `${nickname} さんをフレンドから削除しますか？`, [
        { text: "キャンセル", style: "cancel" },
        { text: "削除", style: "destructive", onPress: () => removeMutation.mutate(friendshipId) },
      ]);
    }
  }

  const isLoading = profileLoading || friendsLoading;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>ソーシャル</Text>
        <Pressable
          style={({ pressed }) => [styles.addButton, { opacity: pressed ? 0.8 : 1 }]}
          onPress={() => { setAddModalVisible(true); setAddError(""); setCodeInput(""); }}
        >
          <Feather name="user-plus" size={18} color="#fff" />
          <Text style={styles.addButtonText}>追加</Text>
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

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.tint} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: tabBarHeight + 20, paddingHorizontal: 16 }}
        >
          {/* My Card */}
          {profile && (
            <View style={styles.myCard}>
              <View style={styles.myCardLeft}>
                <View style={[styles.avatarCircle, { backgroundColor: C.tintMuted }]}>
                  <Text style={styles.avatarText}>
                    {(profile.nickname || "?").slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.myNickname}>{profile.nickname || "ニックネーム未設定"}</Text>
                  <Text style={styles.myCodeLabel}>フレンドコード</Text>
                  <Text style={styles.myCode}>{profile.friendCode}</Text>
                </View>
              </View>
              <Pressable
                style={({ pressed }) => [styles.copyButton, { opacity: pressed ? 0.7 : 1 }]}
                onPress={() => copyToClipboard(profile.friendCode)}
              >
                <Feather name="copy" size={16} color={C.tint} />
                <Text style={styles.copyButtonText}>コピー</Text>
              </Pressable>
            </View>
          )}

          {/* Pending requests */}
          {(friendsData?.pendingRequests ?? []).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>フレンド申請</Text>
              {friendsData!.pendingRequests.map((req) => (
                <PendingCard
                  key={req.friendshipId}
                  req={req}
                  onAccept={() => acceptMutation.mutate(req.friendshipId)}
                />
              ))}
            </View>
          )}

          {/* Friend list */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              フレンド
              {(friendsData?.friends ?? []).length > 0
                ? ` (${friendsData!.friends.length})`
                : ""}
            </Text>
            {(friendsData?.friends ?? []).length === 0 ? (
              <EmptyFriends onAdd={() => setAddModalVisible(true)} />
            ) : (
              friendsData!.friends.map((friend) => (
                <FriendCard
                  key={friend.friendshipId}
                  friend={friend}
                  onRemove={() => handleRemove(friend.friendshipId, friend.nickname)}
                />
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* Add Friend Modal */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setAddModalVisible(false)}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <Text style={styles.modalTitle}>フレンドを追加</Text>
            <Text style={styles.modalSubtitle}>相手のフレンドコードを入力してください</Text>
            <TextInput
              style={styles.codeInput}
              value={codeInput}
              onChangeText={(v) => { setCodeInput(v); setAddError(""); }}
              placeholder="例: ABC123"
              placeholderTextColor={C.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
            />
            {addError ? <Text style={styles.errorText}>{addError}</Text> : null}
            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [styles.modalCancelBtn, { opacity: pressed ? 0.7 : 1 }]}
                onPress={() => setAddModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>キャンセル</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalSendBtn,
                  { opacity: pressed || addFriendMutation.isPending ? 0.7 : 1 },
                ]}
                onPress={() => addFriendMutation.mutate(codeInput.trim())}
                disabled={addFriendMutation.isPending || codeInput.trim().length < 6}
              >
                {addFriendMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSendText}>申請する</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function FriendCard({ friend, onRemove }: { friend: FriendData; onRemove: () => void }) {
  const allBadges: Badge[] = [...HOUR_BADGES, ...DAY_BADGES];
  const pinned = allBadges.filter((b) => (friend.pinnedBadgeIds ?? []).includes(b.id));
  const earnedSet = getEarnedBadges(
    friend.totalWorkMinutes ?? 0,
    friend.totalWorkDays ?? 0
  );

  return (
    <View style={styles.friendCard}>
      <View style={styles.friendCardTop}>
        <View style={styles.friendLeft}>
          <View style={[styles.avatarCircle, { backgroundColor: C.successMuted }]}>
            <Text style={[styles.avatarText, { color: C.success }]}>
              {(friend.nickname || "?").slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.friendNickname}>{friend.nickname}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.removeBtn, { opacity: pressed ? 0.6 : 1 }]}
          onPress={onRemove}
        >
          <Feather name="user-minus" size={16} color={C.textMuted} />
        </Pressable>
      </View>

      {/* Stats row */}
      <View style={styles.friendStatsRow}>
        {friend.showDays && friend.totalWorkDays !== null && (
          <View style={styles.friendStat}>
            <Feather name="calendar" size={13} color={C.success} />
            <Text style={styles.friendStatValue}>{friend.totalWorkDays}</Text>
            <Text style={styles.friendStatLabel}>日</Text>
          </View>
        )}
        {friend.showHours && friend.totalWorkMinutes !== null && (
          <View style={styles.friendStat}>
            <Feather name="clock" size={13} color={C.tint} />
            <Text style={styles.friendStatValue}>{Math.floor(friend.totalWorkMinutes / 60)}</Text>
            <Text style={styles.friendStatLabel}>h</Text>
          </View>
        )}
      </View>

      {/* Pinned badges */}
      {pinned.length > 0 && (
        <View style={styles.pinnedBadgeRow}>
          {pinned.map((b) => {
            const isEarned = earnedSet.has(b.id);
            const isHour = b.type === "hours";
            const color = isHour ? C.tint : C.success;
            const muted = isHour ? C.tintMuted : C.successMuted;
            return (
              <View
                key={b.id}
                style={[
                  styles.pinnedBadge,
                  isEarned
                    ? { backgroundColor: muted, borderColor: color }
                    : { backgroundColor: C.backgroundTertiary, borderColor: C.border },
                ]}
              >
                <Feather
                  name={isHour ? "clock" : "calendar"}
                  size={11}
                  color={isEarned ? color : C.textMuted}
                />
                <Text style={[styles.pinnedBadgeText, { color: isEarned ? color : C.textMuted }]}>
                  {b.label}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function PendingCard({ req, onAccept }: { req: PendingRequest; onAccept: () => void }) {
  return (
    <View style={styles.pendingCard}>
      <View style={styles.friendLeft}>
        <View style={[styles.avatarCircle, { backgroundColor: C.warningMuted }]}>
          <Text style={[styles.avatarText, { color: C.warning }]}>
            {(req.nickname || "?").slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={styles.friendNickname}>{req.nickname}</Text>
          <Text style={styles.pendingLabel}>フレンド申請中</Text>
        </View>
      </View>
      <Pressable
        style={({ pressed }) => [styles.acceptBtn, { opacity: pressed ? 0.8 : 1 }]}
        onPress={onAccept}
      >
        <Text style={styles.acceptBtnText}>承認</Text>
      </Pressable>
    </View>
  );
}

function EmptyFriends({ onAdd }: { onAdd: () => void }) {
  return (
    <Pressable style={styles.emptyCard} onPress={onAdd}>
      <Feather name="users" size={32} color={C.textMuted} />
      <Text style={styles.emptyTitle}>フレンドを追加しよう</Text>
      <Text style={styles.emptySubtitle}>フレンドコードを使って仲間を追加できます</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: C.text, letterSpacing: -0.5 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.tint,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 4,
  },
  monthArrow: { padding: 8 },
  monthText: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: C.text },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },

  // My card
  myCard: {
    backgroundColor: C.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: C.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  myCardLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.tintMuted,
  },
  avatarText: { fontSize: 20, fontFamily: "Inter_700Bold", color: C.tint },
  myNickname: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: C.text, marginBottom: 2 },
  myCodeLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: C.textMuted },
  myCode: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: C.tint,
    letterSpacing: 2,
    marginTop: 1,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.tint,
  },
  copyButtonText: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.tint },

  // Sections
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    paddingLeft: 2,
  },

  // Friend card
  friendCard: {
    backgroundColor: C.backgroundSecondary,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: C.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 1,
  },
  friendCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  friendLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  friendNickname: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.text },
  removeBtn: { padding: 6 },
  friendStatsRow: { flexDirection: "row", gap: 16, marginBottom: 8 },
  friendStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  friendStatValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: C.text },
  friendStatLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textSecondary },

  // Pinned badges
  pinnedBadgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pinnedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  pinnedBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  // Pending card
  pendingCard: {
    backgroundColor: C.backgroundSecondary,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pendingLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: C.warning, marginTop: 2 },
  acceptBtn: {
    backgroundColor: C.success,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  acceptBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },

  // Empty state
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: 36,
    gap: 10,
    backgroundColor: C.backgroundSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: "dashed",
  },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.textSecondary },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    textAlign: "center",
  },

  // Add friend modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalBox: {
    backgroundColor: C.backgroundSecondary,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    gap: 12,
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: C.text },
  modalSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textSecondary },
  codeInput: {
    backgroundColor: C.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: C.text,
    textAlign: "center",
    letterSpacing: 4,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.danger, textAlign: "center" },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 4 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
  },
  modalCancelText: { fontSize: 15, fontFamily: "Inter_500Medium", color: C.textSecondary },
  modalSendBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.tint,
    alignItems: "center",
  },
  modalSendText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
