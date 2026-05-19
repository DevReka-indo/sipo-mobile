import { useTheme } from "@/context/ThemeContext";
import { apiFetch } from "@/utils/api";
import { formatTanggalID } from "@/utils/date";
import { FontAwesome6 } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Theme ────────────────────────────────────────────────────────────────────

const LIGHT = {
  bg: "#F0F4FA",
  surface: "#FFFFFF",
  surface2: "#F5F8FD",
  surface3: "#EBF0F8",
  border: "rgba(100,140,200,0.13)",
  borderStrong: "rgba(80,120,190,0.2)",
  accent: "#1A6FD4",
  accent2: "#2A88F5",
  accentBg: "rgba(26,111,212,0.07)",
  accentBorder: "rgba(26,111,212,0.18)",
  textPrimary: "#0D1829",
  textSecondary: "#3A5070",
  textTertiary: "#7A99BE",
  textMuted: "#A8C0D8",
  danger: "#D63050",
  online: "#1A9E5A",
  orb1: "rgba(26,111,212,0.06)",
  orb2: "rgba(42,136,245,0.04)",
  blue: "#1A6FD4",
  blueBg: "rgba(26,111,212,0.09)",
  blueBd: "rgba(26,111,212,0.2)",
  purple: "#6B3FA8",
  purpleBg: "rgba(107,63,168,0.09)",
  purpleBd: "rgba(107,63,168,0.2)",
  green: "#1A8A4A",
  greenBg: "rgba(26,138,74,0.09)",
  greenBd: "rgba(26,138,74,0.2)",
  amber: "#C07010",
  amberBg: "rgba(192,112,16,0.09)",
  amberBd: "rgba(192,112,16,0.2)",
  unreadBg: "#F4F8FF",
  unreadBd: "rgba(26,111,212,0.25)",
  shadowSm: {
    shadowColor: "#1A3C8C",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  shadowMd: {
    shadowColor: "#1A3C8C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 4,
  },
};

const DARK = {
  bg: "#060B18",
  surface: "#0C1220",
  surface2: "#0F1828",
  surface3: "#141E30",
  border: "rgba(255,255,255,0.055)",
  borderStrong: "rgba(255,255,255,0.1)",
  accent: "#00D4FF",
  accent2: "#00AACC",
  accentBg: "rgba(0,212,255,0.08)",
  accentBorder: "rgba(0,212,255,0.18)",
  textPrimary: "rgba(255,255,255,0.90)",
  textSecondary: "rgba(255,255,255,0.50)",
  textTertiary: "rgba(255,255,255,0.28)",
  textMuted: "rgba(255,255,255,0.15)",
  danger: "#FF4D6D",
  online: "#00FF94",
  orb1: "rgba(0,132,255,0.10)",
  orb2: "rgba(0,255,198,0.06)",
  blue: "#4AB0FF",
  blueBg: "rgba(0,132,255,0.13)",
  blueBd: "rgba(0,132,255,0.25)",
  purple: "#BB88FF",
  purpleBg: "rgba(120,80,255,0.13)",
  purpleBd: "rgba(120,80,255,0.25)",
  green: "#00CC80",
  greenBg: "rgba(0,200,120,0.13)",
  greenBd: "rgba(0,200,120,0.25)",
  amber: "#FFCC44",
  amberBg: "rgba(255,170,0,0.13)",
  amberBd: "rgba(255,170,0,0.25)",
  unreadBg: "#0D1628",
  unreadBd: "rgba(0,212,255,0.25)",
  shadowSm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  shadowMd: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
};

type ThemeColors = typeof LIGHT;

// ─── Types ────────────────────────────────────────────────────────────────────

type DocumentType = "memo" | "undangan" | "risalah" | "disposisi";

interface ApiNotificationItem {
  id_notifikasi: number;
  judul: string;
  judul_document: string | null;
  label: string | null;
  tipe_document: string | null;
  id_document: number | string | null;
  dibaca: boolean;
  id_user: number | string | null;
  updated_at: string | null;
}

interface NotificationItem {
  notif_id: string;
  id: string;
  title: string;
  documentTitle: string;
  label: string;
  time: string;
  type: string;
  dibaca: boolean;
}

interface NotificationApiResponse {
  status: boolean;
  message: string;
  data?: {
    unread_count: number;
    read_count: number;
    unread: ApiNotificationItem[];
    read: ApiNotificationItem[];
  };
}

const documentRoutes: Record<DocumentType, string> = {
  memo: "/memo/memo-detail",
  undangan: "/undangan/undangan-detail",
  risalah: "/risalah/risalah-detail",
  disposisi: "/disposisi/disposisi-detail",
};

function normalizeType(type?: string | null): DocumentType {
  if (
    type === "memo" ||
    type === "undangan" ||
    type === "risalah" ||
    type === "disposisi"
  )
    return type;
  return "memo";
}

function mapNotification(item: ApiNotificationItem): NotificationItem {
  return {
    notif_id: String(item.id_notifikasi ?? ""),
    id: String(item.id_document ?? ""),
    title: item.judul ?? "-",
    documentTitle: item.judul_document ?? "Dokumen tidak ditemukan",
    label: item.label ?? "-",
    time: item.updated_at ? formatTanggalID(item.updated_at) : "-",
    type: item.tipe_document ?? "memo",
    dibaca: Boolean(item.dibaca),
  };
}

function getTypeMeta(type: DocumentType, C: ThemeColors) {
  switch (type) {
    case "memo":
      return {
        icon: "envelope" as const,
        c: C.blue,
        bg: C.blueBg,
        bd: C.blueBd,
        label: "Memo",
      };
    case "undangan":
      return {
        icon: "calendar-check" as const,
        c: C.purple,
        bg: C.purpleBg,
        bd: C.purpleBd,
        label: "Undangan",
      };
    case "risalah":
      return {
        icon: "file-lines" as const,
        c: C.green,
        bg: C.greenBg,
        bd: C.greenBd,
        label: "Risalah",
      };
    case "disposisi":
      return {
        icon: "paper-plane" as const,
        c: C.amber,
        bg: C.amberBg,
        bd: C.amberBd,
        label: "Disposisi",
      };
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionDivider({ label, C }: { label: string; C: ThemeColors }) {
  return (
    <View style={div.wrap}>
      <View style={[div.line, { backgroundColor: C.borderStrong }]} />
      <Text style={[div.text, { color: C.textMuted }]}>{label}</Text>
      <View style={[div.line, { backgroundColor: C.borderStrong }]} />
    </View>
  );
}

function NotificationCard({
  item,
  unread,
  C,
  onPress,
}: {
  item: NotificationItem;
  unread: boolean;
  C: ThemeColors;
  onPress: () => void;
}) {
  const meta = getTypeMeta(normalizeType(item.type), C);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        card.wrap,
        {
          backgroundColor: unread ? C.unreadBg : C.surface,
          borderColor: unread ? C.unreadBd : C.borderStrong,
        },
        C.shadowSm,
        pressed && { opacity: 0.82 },
      ]}
    >
      {unread && (
        <View style={[card.accentLine, { backgroundColor: C.accent }]} />
      )}

      <View
        style={[
          card.iconWrap,
          { backgroundColor: meta.bg, borderColor: meta.bd },
        ]}
      >
        <FontAwesome6 name={meta.icon} size={17} color={meta.c} />
      </View>

      <View style={card.content}>
        <View style={card.topRow}>
          <View
            style={[
              card.typePill,
              { backgroundColor: meta.bg, borderColor: meta.bd },
            ]}
          >
            <Text style={[card.typePillText, { color: meta.c }]}>
              {meta.label.toUpperCase()}
            </Text>
          </View>
          <View
            style={[
              card.labelPill,
              { backgroundColor: C.surface3, borderColor: C.borderStrong },
            ]}
          >
            <Text
              style={[card.labelPillText, { color: C.textTertiary }]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </View>
          {unread && (
            <View style={[card.unreadDot, { backgroundColor: C.accent }]} />
          )}
        </View>

        <Text style={[card.title, { color: C.textPrimary }]} numberOfLines={2}>
          {item.title}
        </Text>

        <Text
          style={[card.subtitle, { color: C.textTertiary }]}
          numberOfLines={2}
        >
          {item.documentTitle}
        </Text>

        <View style={card.footer}>
          <View style={card.footerLeft}>
            <FontAwesome6 name="clock" size={10} color={C.textMuted} />
            <Text style={[card.footerTime, { color: C.textMuted }]}>
              {item.time}
            </Text>
          </View>
          <View
            style={[
              card.statusPill,
              {
                backgroundColor: unread ? C.accentBg : C.surface3,
                borderColor: unread ? C.accentBorder : C.borderStrong,
              },
            ]}
          >
            <Text
              style={[
                card.statusText,
                { color: unread ? C.accent : C.textTertiary },
              ]}
            >
              {unread ? "Belum dibaca" : "Terbaca"}
            </Text>
          </View>
        </View>
      </View>

      <FontAwesome6
        name="chevron-right"
        size={10}
        color={C.textMuted}
        style={{ flexShrink: 0 }}
      />
    </Pressable>
  );
}

function EmptySection({
  icon,
  text,
  C,
}: {
  icon: string;
  text: string;
  C: ThemeColors;
}) {
  return (
    <View
      style={[
        es.wrap,
        { backgroundColor: C.surface2, borderColor: C.borderStrong },
      ]}
    >
      <FontAwesome6 name={icon as any} size={15} color={C.textMuted} />
      <Text style={[es.text, { color: C.textTertiary }]}>{text}</Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NotifikasiScreen() {
  const router = useRouter();

  // ✅ Ganti local state dengan context — dark mode kini sinkron global
  const { isDark, toggleDark } = useTheme();
  const C: ThemeColors = isDark ? DARK : LIGHT;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState(false);
  const [unread, setUnread] = useState<NotificationItem[]>([]);
  const [read, setRead] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [readCount, setReadCount] = useState(0);

  const totalCount = useMemo(
    () => unreadCount + readCount,
    [unreadCount, readCount],
  );

  const fetchNotifData = useCallback(async () => {
    try {
      const json = (await apiFetch("/notifikasi")) as NotificationApiResponse;
      if (!json?.data) {
        setUnread([]);
        setRead([]);
        setUnreadCount(0);
        setReadCount(0);
        return;
      }

      const u = Array.isArray(json.data.unread)
        ? json.data.unread.map(mapNotification)
        : [];
      const r = Array.isArray(json.data.read)
        ? json.data.read.map(mapNotification)
        : [];
      setUnread(u);
      setRead(r);
      setUnreadCount(Number(json.data.unread_count ?? u.length));
      setReadCount(Number(json.data.read_count ?? r.length));
    } catch {
      Alert.alert("Error", "Gagal memuat notifikasi. Silakan coba lagi.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleMarkAllAsRead = async () => {
    if (unread.length === 0) {
      Alert.alert("Info", "Tidak ada notifikasi yang perlu ditandai.");
      return;
    }
    setMarkingAsRead(true);
    try {
      await apiFetch("/notifikasi/read-all", { method: "POST" });
      await fetchNotifData();
    } catch {
      Alert.alert("Error", "Gagal menandai notifikasi sebagai terbaca.");
    } finally {
      setMarkingAsRead(false);
    }
  };

  const navigateTo = async (item: NotificationItem) => {
    const pathname = documentRoutes[normalizeType(item.type)];

    if (!item.dibaca && item.notif_id) {
      try {
        await apiFetch(`/notifikasi/${item.notif_id}/read`, {
          method: "POST",
        });

        setUnread((prev) => prev.filter((n) => n.notif_id !== item.notif_id));
        setRead((prev) => [{ ...item, dibaca: true }, ...prev]);
        setUnreadCount((prev) => Math.max(prev - 1, 0));
        setReadCount((prev) => prev + 1);
      } catch (error) {
        console.log("Gagal menandai notifikasi sebagai dibaca:", error);
      }
    }

    router.push({
      pathname: pathname as any,
      params: {
        id: item.id,
        notif_id: item.notif_id,
        label: item.label,
      },
    });
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifData();
  }, [fetchNotifData]);

  useEffect(() => {
    fetchNotifData();
  }, [fetchNotifData]);

  const hasUnread = unread.length > 0;
  const hasRead = read.length > 0;
  const isEmpty = !hasUnread && !hasRead;

  if (loading) {
    return (
      <SafeAreaView
        style={[s.centerWrap, { backgroundColor: C.bg }]}
        edges={["top"]}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={C.bg}
        />
        <View
          style={[
            s.loadingIconWrap,
            { backgroundColor: C.accentBg, borderColor: C.accentBorder },
          ]}
        >
          <ActivityIndicator size="large" color={C.accent} />
        </View>
        <Text style={[s.loadingText, { color: C.textTertiary }]}>
          Memuat notifikasi...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={C.bg}
      />

      <View
        style={[s.orb1, { backgroundColor: C.orb1 }]}
        pointerEvents="none"
      />
      <View
        style={[s.orb2, { backgroundColor: C.orb2 }]}
        pointerEvents="none"
      />

      {/* ── HEADER ── */}
      <View style={[s.header, { borderBottomColor: C.border }]}>
        <View style={s.headerLeft}>
          <TouchableOpacity
            style={[
              s.hbtn,
              { backgroundColor: C.surface, borderColor: C.borderStrong },
              C.shadowSm,
            ]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <FontAwesome6
              name="chevron-left"
              size={13}
              color={C.textSecondary}
            />
          </TouchableOpacity>

          <View
            style={[
              s.headerIconWrap,
              { backgroundColor: C.accentBg, borderColor: C.accentBorder },
            ]}
          >
            <FontAwesome6 name="bell" size={15} color={C.accent} />
            {unreadCount > 0 && (
              <View style={[s.headerBadge, { backgroundColor: C.danger }]}>
                <Text style={s.headerBadgeText}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            )}
          </View>

          <View>
            <Text style={[s.headerTitle, { color: C.textPrimary }]}>
              Notifikasi
            </Text>
            <Text style={[s.headerSub, { color: C.textTertiary }]}>
              Memo, undangan & risalah terbaru
            </Text>
          </View>
        </View>

        {/* ✅ Gunakan toggleDark dari context */}
        <TouchableOpacity
          style={[
            s.hbtn,
            { backgroundColor: C.surface, borderColor: C.borderStrong },
            C.shadowSm,
          ]}
          onPress={toggleDark}
          activeOpacity={0.7}
        >
          <FontAwesome6
            name={isDark ? "moon" : "sun"}
            size={13}
            color={C.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[s.scrollContent, isEmpty && s.scrollCentered]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[C.accent]}
            tintColor={C.accent}
          />
        }
      >
        {isEmpty ? (
          <View style={s.emptyWrap}>
            <View style={[s.emptyOrb, { backgroundColor: C.accentBg }]} />
            <View
              style={[
                s.emptyRing,
                { backgroundColor: C.accentBg, borderColor: C.accentBorder },
              ]}
            >
              <View style={[s.emptyInner, { backgroundColor: C.accentBg }]}>
                <FontAwesome6 name="bell-slash" size={32} color={C.accent} />
              </View>
            </View>
            <Text style={[s.emptyTitle, { color: C.textPrimary }]}>
              Belum Ada Notifikasi
            </Text>
            <Text style={[s.emptyDesc, { color: C.textTertiary }]}>
              Anda akan menerima notifikasi{"\n"}terkait memo, undangan, dan
              risalah di sini.
            </Text>
          </View>
        ) : (
          <>
            {/* ── SUMMARY CARD ── */}
            <View
              style={[
                s.summaryCard,
                { backgroundColor: C.surface, borderColor: C.borderStrong },
                C.shadowMd,
              ]}
            >
              <View
                style={[s.summaryTopLine, { backgroundColor: C.accentBorder }]}
              />

              <View style={s.summaryTop}>
                <View
                  style={[
                    s.summaryIconWrap,
                    {
                      backgroundColor: C.accentBg,
                      borderColor: C.accentBorder,
                    },
                  ]}
                >
                  <FontAwesome6 name="bell" size={18} color={C.accent} />
                </View>
                <View style={s.summaryTexts}>
                  <Text style={[s.summaryLabel, { color: C.textTertiary }]}>
                    Total Notifikasi
                  </Text>
                  <Text style={[s.summaryTotal, { color: C.textPrimary }]}>
                    {totalCount}
                  </Text>
                </View>
              </View>

              <View
                style={[s.summaryDivider, { backgroundColor: C.borderStrong }]}
              />

              <View style={s.summaryStats}>
                <View style={s.summaryStatItem}>
                  <View
                    style={[
                      s.summaryStatDot,
                      {
                        backgroundColor: C.accentBg,
                        borderColor: C.accentBorder,
                      },
                    ]}
                  >
                    <View
                      style={[
                        s.summaryStatDotInner,
                        { backgroundColor: C.accent },
                      ]}
                    />
                  </View>
                  <View>
                    <Text style={[s.summaryStatNum, { color: C.textPrimary }]}>
                      {unreadCount}
                    </Text>
                    <Text
                      style={[s.summaryStatLabel, { color: C.textTertiary }]}
                    >
                      Belum terbaca
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    s.summaryVertDiv,
                    { backgroundColor: C.borderStrong },
                  ]}
                />

                <View style={s.summaryStatItem}>
                  <View
                    style={[
                      s.summaryStatDot,
                      {
                        backgroundColor: C.surface3,
                        borderColor: C.borderStrong,
                      },
                    ]}
                  >
                    <View
                      style={[
                        s.summaryStatDotInner,
                        { backgroundColor: C.textMuted },
                      ]}
                    />
                  </View>
                  <View>
                    <Text style={[s.summaryStatNum, { color: C.textPrimary }]}>
                      {readCount}
                    </Text>
                    <Text
                      style={[s.summaryStatLabel, { color: C.textTertiary }]}
                    >
                      Sudah terbaca
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ── BELUM TERBACA ── */}
            <SectionDivider label="BELUM TERBACA" C={C} />

            <View style={s.sectionHeader}>
              <Text style={[s.sectionSub, { color: C.textTertiary }]}>
                {unreadCount} notifikasi membutuhkan perhatian
              </Text>
              {hasUnread && (
                <TouchableOpacity
                  style={[
                    s.markBtn,
                    {
                      backgroundColor: C.accentBg,
                      borderColor: C.accentBorder,
                    },
                    markingAsRead && { opacity: 0.6 },
                  ]}
                  onPress={handleMarkAllAsRead}
                  disabled={markingAsRead}
                  activeOpacity={0.7}
                >
                  {markingAsRead ? (
                    <ActivityIndicator size="small" color={C.accent} />
                  ) : (
                    <>
                      <FontAwesome6
                        name="check-double"
                        size={11}
                        color={C.accent}
                      />
                      <Text style={[s.markBtnText, { color: C.accent }]}>
                        Tandai semua
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {hasUnread ? (
              <View style={s.cardList}>
                {unread.map((item, i) => (
                  <NotificationCard
                    key={`u-${item.notif_id || i}`}
                    item={item}
                    unread
                    C={C}
                    onPress={() => navigateTo(item)}
                  />
                ))}
              </View>
            ) : (
              <EmptySection
                icon="circle-check"
                text="Semua notifikasi telah dibaca."
                C={C}
              />
            )}

            {/* ── SUDAH TERBACA ── */}
            <SectionDivider label="SUDAH TERBACA" C={C} />
            <Text
              style={[
                s.sectionSub,
                { color: C.textTertiary, marginBottom: 12 },
              ]}
            >
              Riwayat notifikasi yang sudah dibuka
            </Text>

            {hasRead ? (
              <View style={s.cardList}>
                {read.map((item, i) => (
                  <NotificationCard
                    key={`r-${item.notif_id || i}`}
                    item={item}
                    unread={false}
                    C={C}
                    onPress={() => navigateTo(item)}
                  />
                ))}
              </View>
            ) : (
              <EmptySection
                icon="inbox"
                text="Belum ada notifikasi terbaca."
                C={C}
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1 },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
  },
  loadingIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { fontSize: 13, fontWeight: "600", letterSpacing: 0.2 },
  orb1: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -90,
    right: -80,
    zIndex: 0,
  },
  orb2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    top: 260,
    left: -70,
    zIndex: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    zIndex: 1,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  hbtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  headerBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  headerBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.2,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  headerSub: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
    letterSpacing: 0.1,
  },
  scrollContent: { padding: 16, paddingBottom: 110, zIndex: 1 },
  scrollCentered: { flexGrow: 1, justifyContent: "center" },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 32,
    gap: 12,
    position: "relative",
  },
  emptyOrb: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    top: 0,
    alignSelf: "center",
  },
  emptyRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  emptyDesc: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },
  summaryCard: {
    borderRadius: 18,
    borderWidth: 0.5,
    padding: 16,
    marginBottom: 4,
    overflow: "hidden",
    position: "relative",
  },
  summaryTopLine: {
    position: "absolute",
    top: 0,
    left: 36,
    right: 36,
    height: 1,
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  summaryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTexts: { gap: 2 },
  summaryLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.2 },
  summaryTotal: { fontSize: 28, fontWeight: "900", letterSpacing: -1 },
  summaryDivider: { height: 0.5, marginBottom: 14 },
  summaryStats: { flexDirection: "row", alignItems: "center" },
  summaryStatItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  summaryStatDot: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryStatDotInner: { width: 10, height: 10, borderRadius: 5 },
  summaryStatNum: { fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
  summaryStatLabel: { fontSize: 11, fontWeight: "500", marginTop: 1 },
  summaryVertDiv: { width: 0.5, height: 36, marginHorizontal: 16 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 10,
  },
  sectionSub: { fontSize: 11, fontWeight: "500", letterSpacing: 0.1, flex: 1 },
  markBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 0.5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  markBtnText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.2 },
  cardList: { gap: 10 },
});

const card = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 0.5,
    padding: 13,
    gap: 11,
    overflow: "hidden",
    position: "relative",
  },
  accentLine: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  content: { flex: 1, minWidth: 0, gap: 3 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 3,
  },
  typePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 0.5,
  },
  typePillText: { fontSize: 8.5, fontWeight: "700", letterSpacing: 0.6 },
  labelPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 0.5,
    flexShrink: 1,
  },
  labelPillText: { fontSize: 8.5, fontWeight: "600", letterSpacing: 0.2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: "auto" },
  title: {
    fontSize: 12.5,
    fontWeight: "700",
    letterSpacing: -0.2,
    lineHeight: 17,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 16,
    letterSpacing: 0.1,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 5,
  },
  footerLeft: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  footerTime: { fontSize: 10, fontWeight: "500" },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 0.5,
  },
  statusText: { fontSize: 9.5, fontWeight: "700", letterSpacing: 0.2 },
});

const div = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 16,
  },
  line: { flex: 1, height: 0.5 },
  text: { fontSize: 9, fontWeight: "700", letterSpacing: 2 },
});

const es = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 13,
    borderWidth: 0.5,
  },
  text: { fontSize: 12, fontWeight: "500", fontStyle: "italic" },
});
