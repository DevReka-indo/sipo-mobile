// app/disposisi/disposisi-detail.tsx
import TeruskanDisposisiModal, {
  TeruskanPayload,
} from "@/components/TeruskanDisposisiModal";
import { useTheme } from "@/context/ThemeContext";
import { apiFetch } from "@/utils/api";
import { formatTanggalID } from "@/utils/date";
import { FontAwesome6 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  accentBg: "rgba(26,111,212,0.07)",
  accentBorder: "rgba(26,111,212,0.18)",
  textPrimary: "#0D1829",
  textSecondary: "#3A5070",
  textTertiary: "#7A99BE",
  textMuted: "#A8C0D8",
  green: "#1A9E5A",
  greenBg: "rgba(26,158,90,0.09)",
  greenBd: "rgba(26,158,90,0.22)",
  danger: "#D63050",
  dangerBg: "rgba(214,48,80,0.08)",
  dangerBd: "rgba(214,48,80,0.2)",
  amber: "#C07010",
  amberBg: "rgba(192,112,16,0.09)",
  amberBd: "rgba(192,112,16,0.22)",
  purple: "#6B3FA8",
  purpleBg: "rgba(107,63,168,0.09)",
  purpleBd: "rgba(107,63,168,0.22)",
  orb1: "rgba(26,111,212,0.06)",
  orb2: "rgba(42,136,245,0.04)",
  panelTopLine: "rgba(26,111,212,0.25)",
  shadowSm: {
    shadowColor: "#1A3C8C",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  shadowMd: {
    shadowColor: "#1A3C8C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
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
  accentBg: "rgba(0,212,255,0.08)",
  accentBorder: "rgba(0,212,255,0.18)",
  textPrimary: "rgba(255,255,255,0.90)",
  textSecondary: "rgba(255,255,255,0.50)",
  textTertiary: "rgba(255,255,255,0.28)",
  textMuted: "rgba(255,255,255,0.15)",
  green: "#00FF94",
  greenBg: "rgba(0,255,148,0.08)",
  greenBd: "rgba(0,255,148,0.20)",
  danger: "#FF4D6D",
  dangerBg: "rgba(255,77,109,0.08)",
  dangerBd: "rgba(255,77,109,0.20)",
  amber: "#FFAA00",
  amberBg: "rgba(255,170,0,0.08)",
  amberBd: "rgba(255,170,0,0.20)",
  purple: "#BB88FF",
  purpleBg: "rgba(120,80,255,0.13)",
  purpleBd: "rgba(120,80,255,0.25)",
  orb1: "rgba(0,132,255,0.10)",
  orb2: "rgba(0,255,198,0.06)",
  panelTopLine: "rgba(0,212,255,0.28)",
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

type DisposisiStatus =
  | "menunggu"
  | "diterima"
  | "diteruskan"
  | "selesai"
  | string;

interface UserLite {
  id: number | string;
  nama?: string;
  name?: string;
  firstname?: string;
  lastname?: string;
}

interface DokumenInfo {
  id: number | string;
  judul: string;
  tipe: string;
}

interface KandidatPenerima {
  id: number | string;
  nama: string;
}

interface DisposisiItem {
  id: number | string;
  parent_id?: number | string | null;
  document_type?: string | null;
  document_id?: number | string | null;
  judul_dokumen?: string | null;
  judul?: string | null;
  instruksi?: string | null;
  catatan?: string | null;
  deadline?: string | null;
  status?: DisposisiStatus;
  dari_user_id?: number | string | null;
  kepada_user_id?: Array<number | string> | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  dari_user?: UserLite | null;
  dariUser?: UserLite | null;
  kepada_users?: UserLite[] | null;
  kepadaUsers?: UserLite[] | null;
  parent?: DisposisiItem | null;
  all_children?: DisposisiItem[] | null;
  allChildren?: DisposisiItem[] | null;
  children?: DisposisiItem[] | null;
  [key: string]: any;
}

interface DisposisiDetailResponse {
  status: boolean;
  message: string;
  data?: {
    disposisi: DisposisiItem;
    dokumen: DokumenInfo | null;
    kandidat_penerima: KandidatPenerima[];
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeIdList(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((i) => String(i)).filter(Boolean);
  if (typeof value === "string") {
    try {
      const p = JSON.parse(value);
      if (Array.isArray(p)) return p.map((i) => String(i)).filter(Boolean);
    } catch {}
    return value
      .replaceAll(";", ",")
      .replaceAll("[", "")
      .replaceAll("]", "")
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean);
  }
  return [String(value)];
}

function getDate(v?: string | null) {
  if (!v) return "-";
  try {
    return formatTanggalID(v);
  } catch {
    return v;
  }
}

function getUserName(user?: UserLite | null) {
  if (!user) return "-";
  if (user.nama) return user.nama;
  if (user.name) return user.name;
  return `${user.firstname ?? ""} ${user.lastname ?? ""}`.trim() || "-";
}

function getSenderName(item?: DisposisiItem | null) {
  return getUserName(item?.dari_user ?? item?.dariUser);
}

function getRecipientUsers(item?: DisposisiItem | null): UserLite[] {
  const raw = item?.kepada_users ?? item?.kepadaUsers ?? [];

  return Array.isArray(raw) ? raw : [];
}

function getRecipientNames(item?: DisposisiItem | null) {
  const users = getRecipientUsers(item);

  if (users.length === 0) return "-";

  return users
    .map((user) => getUserName(user))
    .filter((name) => name && name !== "-")
    .join(", ");
}

function getTitle(d?: DisposisiItem | null, dok?: DokumenInfo | null) {
  return (
    dok?.judul ??
    d?.judul_dokumen ??
    d?.judul ??
    d?.dokumen?.judul ??
    "Dokumen disposisi"
  );
}

function getStatusMeta(status: string | undefined, C: ThemeColors) {
  switch (
    String(status ?? "")
      .trim()
      .toLowerCase()
  ) {
    case "menunggu":
      return {
        label: "Menunggu",
        c: C.amber,
        bg: C.amberBg,
        bd: C.amberBd,
        icon: "clock" as const,
      };
    case "diterima":
      return {
        label: "Diterima",
        c: C.accent,
        bg: C.accentBg,
        bd: C.accentBorder,
        icon: "circle-check" as const,
      };
    case "diteruskan":
      return {
        label: "Diteruskan",
        c: C.purple,
        bg: C.purpleBg,
        bd: C.purpleBd,
        icon: "share" as const,
      };
    case "selesai":
      return {
        label: "Selesai",
        c: C.green,
        bg: C.greenBg,
        bd: C.greenBd,
        icon: "check-double" as const,
      };
    default:
      return {
        label: status || "-",
        c: C.textSecondary,
        bg: C.surface2,
        bd: C.borderStrong,
        icon: "circle-info" as const,
      };
  }
}

function getDocMeta(type: string | undefined | null, C: ThemeColors) {
  switch (type) {
    case "memo":
      return {
        label: "Memo",
        c: C.accent,
        bg: C.accentBg,
        bd: C.accentBorder,
        icon: "envelope" as const,
      };
    case "undangan":
      return {
        label: "Undangan",
        c: C.purple,
        bg: C.purpleBg,
        bd: C.purpleBd,
        icon: "calendar-check" as const,
      };
    default:
      return {
        label: type || "Dokumen",
        c: C.textSecondary,
        bg: C.surface2,
        bd: C.borderStrong,
        icon: "file-lines" as const,
      };
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Panel({
  children,
  C,
  style,
}: {
  children: React.ReactNode;
  C: ThemeColors;
  style?: any;
}) {
  return (
    <View
      style={[
        pan.wrap,
        { backgroundColor: C.surface, borderColor: C.borderStrong },
        C.shadowSm,
        style,
      ]}
    >
      <View style={[pan.topLine, { backgroundColor: C.panelTopLine }]} />
      {children}
    </View>
  );
}

function PanelHeader({
  icon,
  iconBg,
  iconBd,
  iconColor,
  title,
  sub,
  C,
}: {
  icon: string;
  iconBg: string;
  iconBd: string;
  iconColor: string;
  title: string;
  sub?: string;
  C: ThemeColors;
}) {
  return (
    <View style={pan.header}>
      <View
        style={[pan.icon, { backgroundColor: iconBg, borderColor: iconBd }]}
      >
        <FontAwesome6 name={icon as any} size={13} color={iconColor} />
      </View>
      <View>
        <Text style={[pan.title, { color: C.textPrimary }]}>{title}</Text>
        {sub ? (
          <Text style={[pan.sub, { color: C.textTertiary }]}>{sub}</Text>
        ) : null}
      </View>
    </View>
  );
}

function MetaRow({
  icon,
  label,
  value,
  C,
}: {
  icon: string;
  label: string;
  value: string;
  C: ThemeColors;
}) {
  return (
    <View style={met.row}>
      <View style={[met.iconWrap, { backgroundColor: C.accentBg }]}>
        <FontAwesome6 name={icon as any} size={10} color={C.accent} />
      </View>
      <Text style={[met.label, { color: C.textTertiary }]}>{label}</Text>
      <Text style={[met.value, { color: C.textPrimary }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function TimelineItem({
  item,
  isLast,
  C,
}: {
  item: DisposisiItem;
  isLast: boolean;
  C: ThemeColors;
}) {
  const sm = getStatusMeta(item.status, C);
  return (
    <View style={tl.wrap}>
      <View style={tl.left}>
        <View style={[tl.dot, { backgroundColor: sm.c, borderColor: sm.bd }]} />
        {!isLast && (
          <View style={[tl.line, { backgroundColor: C.borderStrong }]} />
        )}
      </View>
      <View style={[tl.content, isLast && { paddingBottom: 0 }]}>
        <View style={tl.top}>
          <Text style={[tl.name, { color: C.textPrimary }]} numberOfLines={1}>
            {getSenderName(item)}
          </Text>
          <View
            style={[tl.badge, { backgroundColor: sm.bg, borderColor: sm.bd }]}
          >
            <FontAwesome6 name={sm.icon} size={9} color={sm.c} />
            <Text style={[tl.badgeText, { color: sm.c }]}>{sm.label}</Text>
          </View>
        </View>
        <Text style={[tl.date, { color: C.textMuted }]}>
          {getDate(item.updated_at ?? item.created_at)}
        </Text>
        {!!item.instruksi && (
          <Text
            style={[tl.instruksi, { color: C.textSecondary }]}
            numberOfLines={3}
          >
            {item.instruksi}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DisposisiDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const disposisiId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { isDark, toggleDark } = useTheme();
  const C: ThemeColors = isDark ? DARK : LIGHT;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [disposisi, setDisposisi] = useState<DisposisiItem | null>(null);
  const [dokumen, setDokumen] = useState<DokumenInfo | null>(null);
  const [kandidat, setKandidat] = useState<KandidatPenerima[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Forward modal state
  const [forwardVisible, setForwardVisible] = useState(false);

  const statusMeta = getStatusMeta(disposisi?.status, C);
  const docMeta = getDocMeta(dokumen?.tipe ?? disposisi?.document_type, C);

  const children = useMemo(() => {
    const raw =
      disposisi?.all_children ??
      disposisi?.allChildren ??
      disposisi?.children ??
      [];
    return Array.isArray(raw) ? raw : [];
  }, [disposisi]);

  const normalizedStatus = String(disposisi?.status ?? "")
    .trim()
    .toLowerCase();
  const penerimaIds = normalizeIdList(disposisi?.kepada_user_id);
  const isSender =
    !!currentUserId &&
    String(disposisi?.dari_user_id ?? "") === String(currentUserId);
  const isRecipient =
    !!currentUserId &&
    penerimaIds.some((id) => String(id) === String(currentUserId));
  const canTerima = isRecipient && normalizedStatus === "menunggu";
  const canSelesaikan =
    isRecipient &&
    (normalizedStatus === "menunggu" || normalizedStatus === "diterima");
  const canForward =
    isRecipient &&
    kandidat.length > 0 &&
    normalizedStatus !== "selesai" &&
    normalizedStatus !== "diteruskan";

  useEffect(() => {
    async function loadUser() {
      try {
        const userId =
          (await AsyncStorage.getItem("user_id")) ??
          (await AsyncStorage.getItem("id_user")) ??
          (await AsyncStorage.getItem("id"));
        if (userId) {
          setCurrentUserId(String(userId));
          return;
        }
        const userRaw =
          (await AsyncStorage.getItem("user")) ??
          (await AsyncStorage.getItem("auth_user"));
        if (userRaw) {
          const p = JSON.parse(userRaw);
          const pid = p?.id ?? p?.id_user ?? p?.user?.id ?? p?.data?.id;
          if (pid) setCurrentUserId(String(pid));
        }
      } catch {}
    }
    loadUser();
  }, []);

  const fetchDetail = useCallback(async () => {
    if (!disposisiId) {
      Alert.alert("Error", "ID disposisi tidak ditemukan.");
      router.back();
      return;
    }
    try {
      const res = (await apiFetch(
        `/disposisi/${disposisiId}`,
      )) as DisposisiDetailResponse;
      if (!res?.status || !res?.data) {
        Alert.alert("Error", res?.message || "Gagal memuat detail disposisi.");
        return;
      }
      setDisposisi(res.data.disposisi ?? null);
      setDokumen(res.data.dokumen ?? null);
      setKandidat(
        Array.isArray(res.data.kandidat_penerima)
          ? res.data.kandidat_penerima
          : [],
      );
    } catch {
      Alert.alert("Error", "Gagal memuat detail disposisi.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [disposisiId, router]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDetail();
  }, [fetchDetail]);

  const updateStatus = async (status: "diterima" | "selesai") => {
    if (!disposisiId) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/disposisi/${disposisiId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (!res?.status) {
        Alert.alert("Error", res?.message || "Gagal mengubah status.");
        return;
      }
      Alert.alert("Berhasil", res?.message || "Status berhasil diperbarui.");
      await fetchDetail();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Gagal mengubah status disposisi.");
    } finally {
      setActionLoading(false);
    }
  };

  const openDocument = () => {
    const type = String(dokumen?.tipe ?? disposisi?.document_type ?? "")
      .trim()
      .toLowerCase();
    const docId =
      dokumen?.id ?? disposisi?.document_id ?? disposisi?.dokumen?.id;
    if (!type || !docId) {
      Alert.alert("Error", "Data dokumen sumber tidak lengkap.");
      return;
    }
    if (type === "memo") {
      router.push({
        pathname: "/memo/memo-detail" as any,
        params: { id: String(docId) },
      });
      return;
    }
    if (type === "undangan") {
      router.push({
        pathname: "/undangan/undangan-detail" as any,
        params: { id: String(docId) },
      });
      return;
    }
    Alert.alert("Tidak didukung", `Tipe dokumen "${type}" belum didukung.`);
  };

  const handleAction = (action: "terima" | "selesai" | "teruskan") => {
    if (!isRecipient) {
      Alert.alert(
        "Tidak bisa diproses",
        isSender
          ? "Anda adalah pengirim. Hanya penerima yang dapat mengambil tindakan."
          : "Hanya penerima disposisi yang bisa mengambil tindakan ini.",
      );
      return;
    }
    if (action === "terima") {
      if (!canTerima) {
        Alert.alert(
          "Tidak bisa diproses",
          `Status "${disposisi?.status ?? "-"}" tidak bisa diterima.`,
        );
        return;
      }
      updateStatus("diterima");
    } else if (action === "selesai") {
      if (!canSelesaikan) {
        Alert.alert(
          "Tidak bisa diproses",
          `Status "${disposisi?.status ?? "-"}" tidak bisa diselesaikan.`,
        );
        return;
      }
      updateStatus("selesai");
    } else {
      if (!canForward) {
        Alert.alert(
          "Tidak bisa diproses",
          kandidat.length === 0
            ? "Tidak ada kandidat penerima."
            : `Status "${disposisi?.status ?? "-"}" tidak bisa diteruskan.`,
        );
        return;
      }
      setForwardVisible(true);
    }
  };

  const handleTeruskanSubmit = async (payload: TeruskanPayload) => {
    if (!disposisiId) return;

    if (payload.selectedUsers.length === 0) {
      Alert.alert("Validasi", "Pilih minimal satu penerima.");
      return;
    }

    if (!payload.instruksi.trim()) {
      Alert.alert("Validasi", "Instruksi wajib diisi.");
      return;
    }

    setActionLoading(true);

    try {
      const body: Record<string, any> = {
        kepada_user_id: payload.selectedUsers.map((id) => Number(id)),
        instruksi: payload.instruksi.trim(),
        catatan: payload.catatan.trim() || null,
      };

      if (payload.deadline.trim()) {
        body.deadline = payload.deadline.trim();
      }

      const res = await apiFetch(`/disposisi/${disposisiId}/teruskan`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!res?.status) {
        Alert.alert("Error", res?.message || "Gagal meneruskan disposisi.");
        return;
      }

      Alert.alert("Berhasil", res?.message || "Disposisi berhasil diteruskan.");
      setForwardVisible(false);
      await fetchDetail();
    } catch {
      Alert.alert("Error", "Gagal meneruskan disposisi.");
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // ─── Action button config ─────────────────────────────────────────────────

  const actionButtons = [
    {
      key: "terima",
      label: "Terima",
      icon: "circle-check",
      c: C.accent,
      bg: C.accentBg,
      bd: C.accentBorder,
      enabled: canTerima,
    },
    {
      key: "selesai",
      label: "Selesaikan",
      icon: "check-double",
      c: C.green,
      bg: C.greenBg,
      bd: C.greenBd,
      enabled: canSelesaikan,
    },
    {
      key: "teruskan",
      label: "Teruskan",
      icon: "share",
      c: C.purple,
      bg: C.purpleBg,
      bd: C.purpleBd,
      enabled: canForward,
    },
  ];

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView
          style={[s.centerWrap, { backgroundColor: C.bg }]}
          edges={["top"]}
        >
          <StatusBar
            barStyle={isDark ? "light-content" : "dark-content"}
            backgroundColor={C.bg}
          />
          <View
            style={[
              s.loadingIcon,
              {
                backgroundColor: C.accentBg,
                borderColor: C.accentBorder,
              },
            ]}
          >
            <ActivityIndicator size="large" color={C.accent} />
          </View>
          <Text style={[s.loadingText, { color: C.textTertiary }]}>
            Memuat detail disposisi...
          </Text>
        </SafeAreaView>
      </>
    );
  }

  if (!disposisi) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView
          style={[s.centerWrap, { backgroundColor: C.bg }]}
          edges={["top"]}
        >
          <StatusBar
            barStyle={isDark ? "light-content" : "dark-content"}
            backgroundColor={C.bg}
          />
          <View
            style={[
              s.loadingIcon,
              { backgroundColor: C.amberBg, borderColor: C.amberBd },
            ]}
          >
            <FontAwesome6
              name="triangle-exclamation"
              size={24}
              color={C.amber}
            />
          </View>
          <Text style={[s.loadingText, { color: C.textTertiary }]}>
            Disposisi tidak ditemukan
          </Text>
          <TouchableOpacity
            style={[
              s.backFallbackBtn,
              {
                backgroundColor: C.accentBg,
                borderColor: C.accentBorder,
              },
            ]}
            onPress={() => router.back()}
          >
            <FontAwesome6 name="chevron-left" size={12} color={C.accent} />
            <Text style={[s.backFallbackText, { color: C.accent }]}>
              Kembali
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]} edges={["top"]}>
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={C.bg}
        />

        {/* Orbs */}
        <View
          style={[s.orb1, { backgroundColor: C.orb1 }]}
          pointerEvents="none"
        />
        <View
          style={[s.orb2, { backgroundColor: C.orb2 }]}
          pointerEvents="none"
        />

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <View style={[s.header, { borderBottomColor: C.border }]}>
          <View style={s.headerLeft}>
            <TouchableOpacity
              style={[
                s.hBtn,
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
              <FontAwesome6 name="paper-plane" size={16} color={C.accent} />
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={[s.headerTitle, { color: C.textPrimary }]}
                numberOfLines={1}
              >
                Detail Disposisi
              </Text>
              <Text style={[s.headerSub, { color: C.textTertiary }]}>
                Informasi & tindak lanjut
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              s.hBtn,
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

        {/* ── SCROLL ─────────────────────────────────────────────────────── */}
        <ScrollView
          contentContainerStyle={s.scrollContent}
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
          {/* ── IDENTITY CARD ─────────────────────────────────────────────── */}
          <View
            style={[
              s.identityCard,
              { backgroundColor: C.surface, borderColor: C.borderStrong },
              C.shadowMd,
            ]}
          >
            <View
              style={[s.cardTopLine, { backgroundColor: C.panelTopLine }]}
            />

            {/* Status strip */}
            <View
              style={[
                s.statusStrip,
                {
                  backgroundColor: statusMeta.bg,
                  borderBottomColor: statusMeta.bd,
                },
              ]}
            >
              <View
                style={[
                  s.statusIconWrap,
                  {
                    backgroundColor: statusMeta.bg,
                    borderColor: statusMeta.bd,
                  },
                ]}
              >
                <FontAwesome6
                  name={statusMeta.icon}
                  size={13}
                  color={statusMeta.c}
                />
              </View>
              <Text style={[s.statusLabel, { color: statusMeta.c }]}>
                {statusMeta.label}
              </Text>
              <View style={{ flex: 1 }} />
              <View
                style={[
                  s.docPill,
                  { backgroundColor: docMeta.bg, borderColor: docMeta.bd },
                ]}
              >
                <FontAwesome6 name={docMeta.icon} size={10} color={docMeta.c} />
                <Text style={[s.docPillText, { color: docMeta.c }]}>
                  {docMeta.label}
                </Text>
              </View>
            </View>

            <View style={s.identityBody}>
              <Text style={[s.docTitle, { color: C.textPrimary }]}>
                {getTitle(disposisi, dokumen)}
              </Text>

              {!!disposisi.instruksi && (
                <Text
                  style={[s.instruksiPreview, { color: C.textSecondary }]}
                  numberOfLines={2}
                >
                  {disposisi.instruksi}
                </Text>
              )}

              <View style={[s.divider, { backgroundColor: C.border }]} />

              <View style={s.metaGrid}>
                <MetaRow
                  icon="user"
                  label="Dari"
                  value={getSenderName(disposisi)}
                  C={C}
                />

                <MetaRow
                  icon="users"
                  label="Kepada"
                  value={getRecipientNames(disposisi)}
                  C={C}
                />

                <MetaRow
                  icon="calendar-days"
                  label="Diperbarui"
                  value={getDate(disposisi.updated_at ?? disposisi.created_at)}
                  C={C}
                />

                {!!disposisi.deadline && (
                  <MetaRow
                    icon="hourglass-half"
                    label="Deadline"
                    value={getDate(disposisi.deadline)}
                    C={C}
                  />
                )}
              </View>
            </View>
          </View>

          {/* ── PENERIMA DISPOSISI ────────────────────────────────────────── */}
          <Panel C={C}>
            <PanelHeader
              icon="users"
              iconBg={C.greenBg}
              iconBd={C.greenBd}
              iconColor={C.green}
              title="Penerima Disposisi"
              sub="Daftar user yang menerima disposisi"
              C={C}
            />

            <View style={[s.panelDivider, { backgroundColor: C.border }]} />

            {getRecipientUsers(disposisi).length > 0 ? (
              <View style={s.recipientList}>
                {getRecipientUsers(disposisi).map((user, index) => (
                  <View
                    key={`recipient-${user.id}-${index}`}
                    style={[
                      s.recipientItem,
                      {
                        backgroundColor: C.surface2,
                        borderColor: C.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        s.recipientAvatar,
                        {
                          backgroundColor: C.greenBg,
                          borderColor: C.greenBd,
                        },
                      ]}
                    >
                      <FontAwesome6 name="user" size={11} color={C.green} />
                    </View>

                    <View style={s.recipientTextWrap}>
                      <Text
                        style={[s.recipientName, { color: C.textPrimary }]}
                        numberOfLines={1}
                      >
                        {getUserName(user)}
                      </Text>
                      <Text style={[s.recipientSub, { color: C.textTertiary }]}>
                        Penerima disposisi
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[s.mutedText, { color: C.textTertiary }]}>
                Belum ada data penerima disposisi.
              </Text>
            )}
          </Panel>

          {/* ── INSTRUKSI & CATATAN ───────────────────────────────────────── */}
          <Panel C={C}>
            <PanelHeader
              icon="list-check"
              iconBg={C.accentBg}
              iconBd={C.accentBorder}
              iconColor={C.accent}
              title="Instruksi"
              sub="Detail perintah disposisi"
              C={C}
            />
            <View style={[s.panelDivider, { backgroundColor: C.border }]} />
            <Text style={[s.longText, { color: C.textSecondary }]}>
              {disposisi.instruksi || "Tidak ada instruksi."}
            </Text>
            {!!disposisi.catatan && (
              <View
                style={[
                  s.catatanBox,
                  { backgroundColor: C.amberBg, borderColor: C.amberBd },
                ]}
              >
                <View style={s.catatanHeader}>
                  <FontAwesome6 name="note-sticky" size={11} color={C.amber} />
                  <Text style={[s.catatanLabel, { color: C.amber }]}>
                    Catatan
                  </Text>
                </View>
                <Text style={[s.catatanText, { color: C.textSecondary }]}>
                  {disposisi.catatan}
                </Text>
              </View>
            )}
          </Panel>

          {/* ── DOKUMEN SUMBER ────────────────────────────────────────────── */}
          <Panel C={C}>
            <PanelHeader
              icon="file-lines"
              iconBg={C.accentBg}
              iconBd={C.accentBorder}
              iconColor={C.accent}
              title="Dokumen Sumber"
              sub="Dokumen yang didisposisikan"
              C={C}
            />
            <View style={[s.panelDivider, { backgroundColor: C.border }]} />
            {dokumen ? (
              <>
                <Text style={[s.dokumenTitle, { color: C.textPrimary }]}>
                  {dokumen.judul}
                </Text>
                <TouchableOpacity
                  style={[
                    s.lihatDokumenBtn,
                    {
                      backgroundColor: C.accentBg,
                      borderColor: C.accentBorder,
                    },
                  ]}
                  onPress={openDocument}
                  activeOpacity={0.8}
                >
                  <FontAwesome6
                    name="up-right-from-square"
                    size={12}
                    color={C.accent}
                  />
                  <Text style={[s.lihatDokumenText, { color: C.accent }]}>
                    Lihat Dokumen
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={[s.mutedText, { color: C.textTertiary }]}>
                Dokumen sumber tidak tersedia.
              </Text>
            )}
          </Panel>

          {/* ── DISPOSISI SEBELUMNYA (parent) ─────────────────────────────── */}
          {!!disposisi.parent && (
            <Panel C={C}>
              <PanelHeader
                icon="diagram-project"
                iconBg={C.purpleBg}
                iconBd={C.purpleBd}
                iconColor={C.purple}
                title="Disposisi Sebelumnya"
                sub="Rantai disposisi asal"
                C={C}
              />
              <View style={[s.panelDivider, { backgroundColor: C.border }]} />
              <TimelineItem item={disposisi.parent} isLast C={C} />
            </Panel>
          )}

          {/* ── RIWAYAT TERUSAN (children) ────────────────────────────────── */}
          {children.length > 0 && (
            <Panel C={C}>
              <PanelHeader
                icon="share-nodes"
                iconBg={C.purpleBg}
                iconBd={C.purpleBd}
                iconColor={C.purple}
                title="Riwayat Terusan"
                sub={`${children.length} disposisi diteruskan`}
                C={C}
              />
              <View style={[s.panelDivider, { backgroundColor: C.border }]} />
              {children.map((child, idx) => (
                <TimelineItem
                  key={`child-${child.id}-${idx}`}
                  item={child}
                  isLast={idx === children.length - 1}
                  C={C}
                />
              ))}
            </Panel>
          )}

          {/* ── ACTION PANEL ──────────────────────────────────────────────── */}
          <Panel C={C}>
            <PanelHeader
              icon="bolt"
              iconBg={C.accentBg}
              iconBd={C.accentBorder}
              iconColor={C.accent}
              title="Aksi Disposisi"
              sub="Pilih tindakan sesuai status Anda"
              C={C}
            />
            <View style={[s.panelDivider, { backgroundColor: C.border }]} />

            <View style={s.actionGrid}>
              {actionButtons.map((btn) => (
                <TouchableOpacity
                  key={btn.key}
                  style={[
                    s.actionBtn,
                    { backgroundColor: btn.bg, borderColor: btn.bd },
                    (!btn.enabled || actionLoading) && s.actionBtnDisabled,
                  ]}
                  onPress={() => handleAction(btn.key as any)}
                  disabled={actionLoading}
                  activeOpacity={0.8}
                >
                  <View style={[s.actionBtnIcon, { backgroundColor: btn.bg }]}>
                    <FontAwesome6
                      name={btn.icon as any}
                      size={16}
                      color={btn.c}
                    />
                  </View>
                  <Text style={[s.actionBtnText, { color: btn.c }]}>
                    {btn.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {actionLoading && (
              <View style={s.actionLoadingRow}>
                <ActivityIndicator size="small" color={C.accent} />
                <Text style={[s.actionLoadingText, { color: C.textTertiary }]}>
                  Memproses...
                </Text>
              </View>
            )}
          </Panel>
        </ScrollView>
        <TeruskanDisposisiModal
          visible={forwardVisible}
          onClose={() => setForwardVisible(false)}
          kandidat={kandidat}
          submitting={actionLoading}
          onSubmit={handleTeruskanSubmit}
          parentInfo={{
            judul: getTitle(disposisi, dokumen),
            instruksi: disposisi?.instruksi ?? null,
            pengirim: getSenderName(disposisi),
            deadline: disposisi?.deadline ? getDate(disposisi.deadline) : null,
            status: disposisi?.status ?? null,
          }}
          C={C}
        />
      </SafeAreaView>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1 },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 24,
  },
  loadingIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { fontSize: 13, fontWeight: "600" },
  backFallbackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 0.5,
    marginTop: 4,
  },
  backFallbackText: { fontSize: 13, fontWeight: "700" },

  orb1: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -90,
    right: -90,
  },
  orb2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    top: 260,
    left: -70,
  },

  // Header
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  headerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  headerSub: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  hBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  scrollContent: { padding: 16, gap: 12, paddingBottom: 110 },

  // Identity card
  identityCard: { borderRadius: 20, borderWidth: 0.5, overflow: "hidden" },
  cardTopLine: { position: "absolute", top: 0, left: 40, right: 40, height: 1 },

  statusStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  statusIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
  },
  statusLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 0.2 },
  docPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    borderWidth: 0.5,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  docPillText: { fontSize: 10, fontWeight: "800" },

  identityBody: { padding: 16, gap: 0 },
  docTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.4,
    lineHeight: 25,
    marginBottom: 6,
  },
  instruksiPreview: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
    marginBottom: 14,
  },
  divider: { height: 0.5, marginBottom: 14 },
  metaGrid: { gap: 10 },

  // Panel base
  panelDivider: { height: 0.5, marginBottom: 14 },
  longText: { fontSize: 13, lineHeight: 20, fontWeight: "500" },

  catatanBox: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 0.5,
    padding: 12,
  },
  catatanHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  catatanLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  catatanText: { fontSize: 12.5, lineHeight: 19, fontWeight: "500" },

  dokumenTitle: {
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 21,
    marginBottom: 10,
  },
  lihatDokumenBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  lihatDokumenText: { fontSize: 12, fontWeight: "700" },
  mutedText: { fontSize: 12.5, lineHeight: 19, fontWeight: "500" },

  recipientList: {
    gap: 8,
  },
  recipientItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 13,
    borderWidth: 0.5,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  recipientAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  recipientTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  recipientName: {
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: -0.1,
  },
  recipientSub: {
    fontSize: 10.5,
    fontWeight: "500",
    marginTop: 2,
  },

  // Action grid
  actionGrid: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 0.5,
  },
  actionBtnDisabled: { opacity: 0.35 },
  actionBtnIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.1 },
  actionLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  actionLoadingText: { fontSize: 12, fontWeight: "600" },
});

// Panel styles
const pan = StyleSheet.create({
  wrap: {
    borderRadius: 18,
    borderWidth: 0.5,
    padding: 14,
    overflow: "hidden",
    position: "relative",
  },
  topLine: { position: "absolute", top: 0, left: 40, right: 40, height: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 13, fontWeight: "800", letterSpacing: -0.2 },
  sub: { fontSize: 10, fontWeight: "500", marginTop: 1 },
});

// Meta row styles
const met = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  label: { fontSize: 11, fontWeight: "600", width: 72, letterSpacing: 0.1 },
  value: { flex: 1, fontSize: 11, fontWeight: "700", letterSpacing: -0.1 },
});

// Timeline styles
const tl = StyleSheet.create({
  wrap: { flexDirection: "row", gap: 10 },
  left: { width: 20, alignItems: "center", paddingTop: 3 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  line: { width: 1, flex: 1, marginTop: 4 },
  content: { flex: 1, paddingBottom: 14, gap: 3 },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: { flex: 1, fontSize: 12.5, fontWeight: "800", letterSpacing: -0.1 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    borderWidth: 0.5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 9.5, fontWeight: "800" },
  date: { fontSize: 10, fontWeight: "600" },
  instruksi: { fontSize: 11.5, lineHeight: 17, fontWeight: "500" },
});
