import Notification from "@/components/Notification";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { apiFetch } from "@/utils/api";
import { formatTanggalID } from "@/utils/date";
import { FontAwesome6 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface NotificationItem {
  notif_id?: string;
  id: string;
  title: string;
  subtitle: string;
  time: string;
  type: string;
}

export default function NotifikasiScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [markingAsRead, setMarkingAsRead] = useState<boolean>(false);
  const [unread, setUnread] = useState<NotificationItem[]>([]);
  const [read, setRead] = useState<NotificationItem[]>([]);

  const fetchNotifData = useCallback(async (): Promise<void> => {
    try {
      const res = await apiFetch("/notifikasi");
      const json = res;

      if (json.data) {
        const { unread, read } = json.data;

        const unreadNotif: NotificationItem[] = unread.map((u: any) => ({
          notif_id: u.id_notifikasi,
          title: u.judul,
          subtitle: u.judul_document ?? "-",
          time: formatTanggalID(u.updated_at) ?? "-",
          type: u.tipe_document,
          id: String(u.id_document ?? ""),
        }));

        const readNotif: NotificationItem[] = read.map((r: any) => ({
          title: r.judul,
          subtitle: r.judul_document ?? "-",
          time: formatTanggalID(r.updated_at) ?? "-",
          type: r.tipe_document,
          id: String(r.id_document ?? ""),
        }));

        setUnread(unreadNotif);
        setRead(readNotif);
      }
    } catch (err) {
      Alert.alert("Error", "Gagal memuat notifikasi. Silakan coba lagi.");
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleMarkAllAsRead = async (): Promise<void> => {
    if (unread.length === 0) {
      Alert.alert("Info", "Tidak ada notifikasi yang perlu ditandai.");
      return;
    }

    setMarkingAsRead(true);
    try {
      await apiFetch("/notifikasi/read-all", { method: "POST" });
      await fetchNotifData();
      Alert.alert(
        "Berhasil",
        "Semua notifikasi telah ditandai sebagai terbaca."
      );
    } catch (e) {
      console.error("Error marking as read:", e);
      Alert.alert("Error", "Gagal menandai notifikasi sebagai terbaca.");
    } finally {
      setMarkingAsRead(false);
    }
  };

  const navigateToNotification = (item: NotificationItem) => {
    const typeMap: Record<string, string> = {
      memo: "/memo/memo-detail",
      undangan: "/undangan/undangan-detail",
      risalah: "/risalah/risalah-detail",
    };

    const pathname = typeMap[item.type] || "/memo/memo-detail";

    router.push({
      pathname: pathname as any,
      params: { id: item.id, notif_id: item.notif_id },
    });
  };

  useEffect(() => {
    fetchNotifData();
  }, [fetchNotifData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifData();
  }, [fetchNotifData]);

  // Loading State
  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.navy} />
        <Text style={[Fonts.paragraphMediumSmall, styles.loadingText]}>
          Memuat notifikasi...
        </Text>
      </SafeAreaView>
    );
  }

  const hasUnread = unread.length > 0;
  const hasRead = read.length > 0;
  const isEmpty = !hasUnread && !hasRead;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header - Fixed at top */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.replace("/beranda/beranda")}
          hitSlop={10}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Kembali ke Beranda"
        >
          <FontAwesome6
            name="chevron-left"
            size={20}
            color={Colors.textPrimary}
          />
        </Pressable>
        <Text style={[Fonts.header3, styles.headerTitle]}>Notifikasi</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isEmpty && styles.scrollContentCentered,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.navy]}
            tintColor={Colors.navy}
          />
        }
      >
        {isEmpty ? (
          // Empty State
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyIconWrapper}>
              <Image
                source={require("@/assets/icons/notification/notification_active.png")}
                style={styles.emptyIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={[Fonts.header6, styles.emptyTitle]}>
              Belum Ada Notifikasi
            </Text>
            <Text style={[Fonts.paragraphRegularSmall, styles.emptyMessage]}>
              Anda akan menerima notifikasi{"\n"}terkait memo, undangan, dan risalah di sini
            </Text>
          </View>
        ) : (
          <>
            {/* Unread Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[Fonts.header6, styles.sectionTitle]}>
                  Belum Terbaca
                </Text>

                {hasUnread && (
                  <TouchableOpacity
                    onPress={handleMarkAllAsRead}
                    disabled={markingAsRead}
                    style={[
                      styles.markAsReadButton,
                      markingAsRead && styles.markAsReadButtonDisabled,
                    ]}
                    activeOpacity={0.7}
                  >
                    {markingAsRead ? (
                      <ActivityIndicator size="small" color={Colors.navy} />
                    ) : (
                      <>
                        <FontAwesome6
                          name="check-double"
                          size={14}
                          color={Colors.navy}
                        />
                        <Text style={[Fonts.paragraphRegularSmall, styles.markAsReadText]}>
                          Tandai sudah dibaca
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {hasUnread ? (
                unread.map((n, i) => {
                  const safeType = ["memo", "undangan", "risalah"].includes(
                    n.type
                  )
                    ? (n.type as "memo" | "undangan" | "risalah")
                    : "memo";

                  return (
                    <Notification
                      key={`unread-${n.notif_id || i}`}
                      title={n.title}
                      subtitle={n.subtitle}
                      date={n.time}
                      type={safeType}
                      unread
                      onPress={() => navigateToNotification(n)}
                    />
                  );
                })
              ) : (
                <View style={styles.emptySection}>
                  <Text style={[Fonts.paragraphRegularSmall, styles.emptySectionText]}>
                    Semua notifikasi telah dibaca
                  </Text>
                </View>
              )}
            </View>

            {/* Read Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[Fonts.header6, styles.sectionTitle]}>
                  Sudah Terbaca
                </Text>
              </View>

              {hasRead ? (
                read.map((n, i) => {
                  const safeType = ["memo", "undangan", "risalah"].includes(
                    n.type
                  )
                    ? (n.type as "memo" | "undangan" | "risalah")
                    : "memo";

                  return (
                    <Notification
                      key={`read-${i}`}
                      title={n.title}
                      subtitle={n.subtitle}
                      date={n.time}
                      type={safeType}
                      unread={false}
                      onPress={() => navigateToNotification(n)}
                    />
                  );
                })
              ) : (
                <View style={styles.emptySection}>
                  <Text style={[Fonts.paragraphRegularSmall, styles.emptySectionText]}>
                    Belum ada notifikasi terbaca
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.white,
  },
  loadingText: {
    marginTop: 12,
    color: Colors.textSecondary,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    gap: 8,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: Colors.textPrimary,
  },

  // Scroll Content
  scrollContent: {
    paddingBottom: 100,
  },
  scrollContentCentered: {
    flexGrow: 1,
    justifyContent: "center",
  },

  // Empty State
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E3EFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyIcon: {
    width: 64,
    height: 64,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyMessage: {
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },

  // Section
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  sectionTitle: {
    color: Colors.textPrimary,
  },

  // Mark as Read Button
  markAsReadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#EAF0FF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.navy + "20",
  },
  markAsReadButtonDisabled: {
    opacity: 0.6,
  },
  markAsReadText: {
    color: Colors.navy,
    fontWeight: "600",
  },

  // Empty Section
  emptySection: {
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  emptySectionText: {
    color: Colors.textSecondary,
    fontStyle: "italic",
  },
});