import ApprovalActionModal, {
  ApprovalStatus,
} from "@/components/ApprovalActionModal";
import CustomAlert from "@/components/CustomAlert";
import DisposisiModal, { DisposisiTheme } from "@/components/DisposisiModal";
import { useTheme } from "@/context/ThemeContext";
import { apiFetch } from "@/utils/api";
import { formatTanggalID } from "@/utils/date";
import { FontAwesome6 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Status = "pending" | "correction" | "approve" | "reject";
type KandidatItem = { id: number | string; nama: string };

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────

const LIGHT = {
  bg: "#F6F8FF",
  surface: "#FFFFFF",
  surface2: "#F8FAFC",
  surface3: "#EEF4FF",

  accent: "#2563EB",
  accent2: "#1D4ED8",
  accentBg: "#EEF4FF",
  accentBorder: "rgba(37,99,235,0.20)",

  border: "rgba(15,30,80,0.08)",
  borderStrong: "rgba(15,30,80,0.12)",

  textPrimary: "#0F1E50",
  textSecondary: "#475569",
  textTertiary: "#94A3B8",
  textMuted: "#64748B",

  green: "#15803D",
  greenBg: "#DCFCE7",
  greenBd: "rgba(21,128,61,0.20)",

  danger: "#DC2626",
  dangerBg: "#FEE2E2",
  dangerBd: "rgba(220,38,38,0.20)",

  amber: "#D97706",
  amberBg: "#FEF3C7",
  amberBd: "rgba(217,119,6,0.22)",

  purple: "#6B3FA8",
  purpleBg: "#F2ECFF",
  purpleBd: "rgba(107,63,168,0.20)",

  panelTopLine: "rgba(37,99,235,0.28)",
};

const DARK = {
  bg: "#060B18",
  surface: "#0C1220",
  surface2: "#0F1828",
  surface3: "#141E30",

  accent: "#00D4FF",
  accent2: "#00AACC",
  accentBg: "rgba(0,212,255,0.08)",
  accentBorder: "rgba(0,212,255,0.18)",

  border: "rgba(255,255,255,0.07)",
  borderStrong: "rgba(255,255,255,0.12)",

  textPrimary: "rgba(255,255,255,0.92)",
  textSecondary: "rgba(255,255,255,0.62)",
  textTertiary: "rgba(255,255,255,0.35)",
  textMuted: "rgba(255,255,255,0.45)",

  green: "#00CC80",
  greenBg: "rgba(0,204,128,0.12)",
  greenBd: "rgba(0,204,128,0.24)",

  danger: "#FF6B7A",
  dangerBg: "rgba(255,77,109,0.12)",
  dangerBd: "rgba(255,77,109,0.24)",

  amber: "#FFB020",
  amberBg: "rgba(255,176,32,0.13)",
  amberBd: "rgba(255,176,32,0.25)",

  purple: "#BB88FF",
  purpleBg: "rgba(120,80,255,0.13)",
  purpleBd: "rgba(120,80,255,0.25)",

  panelTopLine: "rgba(0,212,255,0.28)",
};

type ThemeColors = typeof LIGHT;

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const getStatusConfig = (
  C: ThemeColors,
): Record<
  Status,
  { label: string; icon: string; color: string; bg: string; border: string }
> => ({
  approve: {
    label: "Diterima",
    icon: "circle-check",
    color: C.green,
    bg: C.greenBg,
    border: C.greenBd,
  },
  reject: {
    label: "Ditolak",
    icon: "circle-xmark",
    color: C.danger,
    bg: C.dangerBg,
    border: C.dangerBd,
  },
  correction: {
    label: "Dikoreksi",
    icon: "pen-to-square",
    color: C.amber,
    bg: C.amberBg,
    border: C.amberBd,
  },
  pending: {
    label: "Diproses",
    icon: "clock",
    color: C.accent,
    bg: C.accentBg,
    border: C.accentBorder,
  },
});

const getDisposisiStatusConfig = (
  C: ThemeColors,
): Record<
  string,
  { label: string; color: string; bg: string; border: string }
> => ({
  menunggu: {
    label: "Menunggu",
    color: C.amber,
    bg: C.amberBg,
    border: C.amberBd,
  },
  diterima: {
    label: "Diterima",
    color: C.accent,
    bg: C.accentBg,
    border: C.accentBorder,
  },
  diteruskan: {
    label: "Diteruskan",
    color: C.purple,
    bg: C.purpleBg,
    border: C.purpleBd,
  },
  selesai: {
    label: "Selesai",
    color: C.green,
    bg: C.greenBg,
    border: C.greenBd,
  },
});

const TABBAR_HEIGHT = Platform.select({ ios: 49, android: 56, default: 56 })!;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function normalizeStatus(raw: any): Status {
  const s = String(raw ?? "")
    .toLowerCase()
    .trim();

  if (["approve", "approved", "diterima", "1"].includes(s)) return "approve";
  if (["reject", "rejected", "ditolak", "2"].includes(s)) return "reject";
  if (["correction", "dikoreksi", "3"].includes(s)) return "correction";

  return "pending";
}

function getDisposisiStatus(status: string | null | undefined, C: ThemeColors) {
  const key = String(status ?? "")
    .trim()
    .toLowerCase();

  return (
    getDisposisiStatusConfig(C)[key] ?? {
      label: status || "-",
      color: C.textSecondary,
      bg: C.surface2,
      border: C.borderStrong,
    }
  );
}

function getValue(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return "-";
}

function getUserName(user: any) {
  if (!user) return "-";
  if (typeof user === "string") return user;

  return (
    user.nama_pembuat ??
    user.firstname ??
    user.lastname ??
    user.nama ??
    user.name ??
    user.fullname ??
    user.full_name ??
    user.username ??
    "-"
  );
}

function formatDate(value: any) {
  if (!value) return "-";

  try {
    return formatTanggalID(value);
  } catch {
    return String(value);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function UndanganDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, notif_id, jenis, source, from } = useLocalSearchParams();

  const undanganId = Array.isArray(id) ? id[0] : id;
  const jenisUndangan = Array.isArray(jenis) ? jenis[0] : jenis;
  const sourceUndangan = Array.isArray(source) ? source[0] : source;
  const fromUndangan = Array.isArray(from) ? from[0] : from;

  const { isDark } = useTheme();
  const C: ThemeColors = isDark ? DARK : LIGHT;
  const s = useMemo(() => makeStyles(C, isDark), [C, isDark]);
  const STATUS_CONFIG = useMemo(() => getStatusConfig(C), [C]);
  const DISPOSISI_THEME: DisposisiTheme = useMemo(
    () => ({
      surface: C.surface,
      surface2: C.surface2,
      border: C.border,
      borderStrong: C.borderStrong,
      accent: C.accent,
      accentBg: C.accentBg,
      accentBorder: C.accentBorder,
      textPrimary: C.textPrimary,
      textSecondary: C.textSecondary,
      textTertiary: C.textTertiary,
      textMuted: C.textMuted,
      danger: C.danger,
      panelTopLine: C.panelTopLine,
    }),
    [C],
  );

  const isUndanganKeluar =
    jenisUndangan === "keluar" ||
    sourceUndangan === "undangan-keluar" ||
    fromUndangan === "undangan-keluar";

  // ── State ─────────────────────────────────────────────────────────────────

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [loadingPDF, setLoadingPDF] = useState(false);

  const [showApprove, setShowApprove] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null);
  const [catatan, setCatatan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  const [disposisiList, setDisposisiList] = useState<any[]>([]);
  const [loadingDisposisi, setLoadingDisposisi] = useState(false);

  const [showDisposisiModal, setShowDisposisiModal] = useState(false);
  const [kandidatDisposisi, setKandidatDisposisi] = useState<KandidatItem[]>(
    [],
  );
  const [submittingDisposisi, setSubmittingDisposisi] = useState(false);

  const [showAllPenerima, setShowAllPenerima] = useState(false);

  // ── Derived values ────────────────────────────────────────────────────────

  const documentId = useMemo(() => {
    return detail?.id_undangan ?? detail?.id ?? undanganId;
  }, [detail, undanganId]);

  const statusNow = normalizeStatus(
    detail?.status ??
      detail?.status_approval ??
      detail?.approval_status ??
      detail?.approval,
  );
  const statusCfg = STATUS_CONFIG[statusNow];

  const title = getValue(
    detail?.judul,
    detail?.title,
    detail?.perihal,
    detail?.agenda,
    "Detail Undangan",
  );
  const nomorSurat = getValue(
    detail?.nomor_surat,
    detail?.no_surat,
    detail?.nomor,
    detail?.kode_surat,
  );
  const tanggalUndangan = getValue(
    detail?.tgl_rapat,
    detail?.tanggal,
    detail?.tgl_undangan,
    detail?.date,
    detail?.tanggal_undangan,
  );
  const waktuMulai = getValue(detail?.waktu_mulai, detail?.jam_mulai);
  const waktuSelesai = getValue(detail?.waktu_selesai, detail?.jam_selesai);
  const tempat = getValue(detail?.tempat, detail?.lokasi, detail?.ruangan);
  const pengirim = getUserName(
    detail?.nama_pembuat ??
      detail?.pembuat ??
      detail?.pengirim ??
      detail?.created_by ??
      detail?.user ??
      detail?.dari,
  );

  const penerimaList = useMemo(() => {
    if (
      Array.isArray(detail?.tujuan_string) &&
      detail.tujuan_string.length > 0
    ) {
      return detail.tujuan_string.map((item: any) => String(item));
    }

    const candidates = [
      detail?.penerima,
      detail?.kepada,
      detail?.tujuan,
      detail?.divisi_tujuan,
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;

      if (Array.isArray(candidate) && candidate.length > 0) {
        return candidate.map((item: any) => getUserName(item));
      }

      if (typeof candidate === "string" && candidate.trim() !== "") {
        return [candidate];
      }
    }

    return [];
  }, [detail]);

  const managerUserId = getValue(
    detail?.manager_user_id,
    detail?.manager_id,
    detail?.manager?.id_user,
    detail?.manager?.id,
    detail?.manager?.user_id,
    detail?.user_manager_id,
    detail?.approval_user_id,
    detail?.approver_user_id,
  );

  const canApprove =
    statusNow === "pending" &&
    String(userId ?? "") !== "" &&
    String(managerUserId ?? "") !== "-" &&
    String(userId ?? "") === String(managerUserId ?? "");

  const isNoteRequired =
    selectedStatus === "reject" || selectedStatus === "correction";
  const isSaveDisabled = !selectedStatus || (isNoteRequired && !catatan.trim());

  const bottomOffset = insets.bottom + TABBAR_HEIGHT + 8;

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const loadUserId = async () => {
      try {
        const directId =
          (await AsyncStorage.getItem("user_id")) ||
          (await AsyncStorage.getItem("id_user")) ||
          (await AsyncStorage.getItem("id"));

        if (directId) {
          setUserId(String(directId));
          return;
        }

        const possibleUserKeys = [
          "user",
          "auth_user",
          "userData",
          "user_data",
          "currentUser",
          "login_user",
        ];

        for (const key of possibleUserKeys) {
          const raw = await AsyncStorage.getItem(key);
          if (!raw) continue;

          try {
            const parsed = JSON.parse(raw);
            const parsedId = getValue(
              parsed?.id_user,
              parsed?.user_id,
              parsed?.id,
              parsed?.data?.id_user,
              parsed?.data?.user_id,
              parsed?.data?.id,
              parsed?.user?.id_user,
              parsed?.user?.user_id,
              parsed?.user?.id,
            );

            if (parsedId && parsedId !== "-") {
              setUserId(String(parsedId));
              return;
            }
          } catch {
            // Abaikan key yang bukan JSON.
          }
        }
      } catch (error) {
        console.log("Gagal membaca user login:", error);
      }
    };

    loadUserId();
  }, []);

  useEffect(() => {
    if (!undanganId) return;

    fetchDetail();
    fetchDisposisiUndangan();
  }, [undanganId, notif_id]);

  // ── API calls ─────────────────────────────────────────────────────────────

  async function fetchDetail() {
    try {
      setLoading(true);

      try {
        if (notif_id) {
          await apiFetch(`/notifikasi/${notif_id}/read`, { method: "POST" });
        }
      } catch (error) {
        console.log("Gagal read notifikasi:", error);
      }

      const raw = await apiFetch(`/undangans/${undanganId}`);
      setDetail(raw?.data ?? raw);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Gagal memuat detail undangan.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchDisposisiUndangan() {
    if (!undanganId) return;

    try {
      setLoadingDisposisi(true);

      const res = await apiFetch("/disposisi?per_page=100");
      const masuk = res?.data?.masuk?.data ?? [];
      const keluar = res?.data?.keluar?.data ?? [];
      const merged = [...masuk, ...keluar];

      const related = merged.filter((item: any) => {
        const type =
          item.document_type ??
          item.tipe_document ??
          item.dokumen?.tipe ??
          item.dokumen?.document_type;

        const docId =
          item.document_id ??
          item.id_document ??
          item.dokumen?.id ??
          item.dokumen?.document_id;

        return (
          String(type) === "undangan" && String(docId) === String(undanganId)
        );
      });

      setDisposisiList(related);
    } catch (error) {
      console.log("Gagal memuat disposisi undangan:", error);
      setDisposisiList([]);
    } finally {
      setLoadingDisposisi(false);
    }
  }

  async function loadPDF() {
    if (!documentId) {
      Alert.alert("Error", "ID undangan tidak ditemukan.");
      return;
    }

    try {
      setLoadingPDF(true);

      const res = await apiFetch(`/undangans/${documentId}/pdf`);
      const url =
        res?.data?.url ??
        res?.data?.file_url ??
        res?.data?.pdf_url ??
        res?.url ??
        res?.file_url ??
        res?.pdf_url ??
        detail?.pdf_url ??
        detail?.file_url ??
        detail?.file;

      if (!url) {
        Alert.alert(
          "Info",
          res?.message || "File PDF undangan tidak tersedia.",
        );
        return;
      }

      const supported = await Linking.canOpenURL(String(url));

      if (!supported) {
        Alert.alert("Error", "Tidak dapat membuka PDF undangan.");
        return;
      }

      await Linking.openURL(String(url));
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Gagal membuka PDF undangan.");
    } finally {
      setLoadingPDF(false);
    }
  }

  async function openDisposisiModal() {
    if (!documentId) {
      Alert.alert("Error", "ID undangan tidak ditemukan.");
      return;
    }

    try {
      setSubmittingDisposisi(true);

      const res = await apiFetch(
        `/disposisi/kandidat-penerima?document_type=undangan&document_id=${documentId}`,
      );

      if (!res?.status) {
        Alert.alert(
          "Tidak bisa membuat disposisi",
          res?.message || "Gagal mengambil kandidat.",
        );
        return;
      }

      const kandidat: KandidatItem[] = Array.isArray(res.data)
        ? res.data.map((u: any) => ({
            id: u.id,
            nama: u.nama ?? u.name ?? u.fullname ?? `User ${u.id}`,
          }))
        : [];

      setKandidatDisposisi(kandidat);
      setShowDisposisiModal(true);

      if (kandidat.length === 0) {
        Alert.alert("Info", "Tidak ada kandidat penerima disposisi.");
      }
    } catch (error: any) {
      Alert.alert(
        "Tidak bisa membuat disposisi",
        error?.message || "Gagal mengambil kandidat.",
      );
    } finally {
      setSubmittingDisposisi(false);
    }
  }

  async function handleDisposisiSubmit(payload: {
    selectedUsers: Array<number | string>;
    instruksi: string;
    catatan: string;
    deadline: string;
  }) {
    if (!documentId) {
      Alert.alert("Error", "ID undangan tidak ditemukan.");
      return;
    }

    if (payload.selectedUsers.length === 0) {
      Alert.alert("Validasi", "Pilih minimal satu penerima disposisi.");
      return;
    }

    if (!payload.instruksi.trim()) {
      Alert.alert("Validasi", "Instruksi disposisi wajib diisi.");
      return;
    }

    try {
      setSubmittingDisposisi(true);

      const body: Record<string, any> = {
        document_type: "undangan",
        document_id: Number(documentId),
        kepada_user_id: payload.selectedUsers.map((u) => Number(u)),
        instruksi: payload.instruksi.trim(),
        catatan: payload.catatan.trim() || null,
      };

      if (payload.deadline.trim()) {
        body.deadline = payload.deadline.trim();
      }

      const res = await apiFetch("/disposisi", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!res?.status) {
        Alert.alert("Error", res?.message || "Gagal membuat disposisi.");
        return;
      }

      Alert.alert("Berhasil", res?.message || "Disposisi berhasil dibuat.");
      setShowDisposisiModal(false);
      await fetchDisposisiUndangan();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Gagal membuat disposisi.");
    } finally {
      setSubmittingDisposisi(false);
    }
  }

  async function submitApproval() {
    if (isSaveDisabled) return;

    try {
      setSubmitting(true);

      await apiFetch(`/undangans/${undanganId}/update-status?_method=PUT`, {
        method: "POST",
        body: JSON.stringify({
          status: selectedStatus,
          catatan: isNoteRequired ? catatan.trim() : null,
        }),
      });

      setDetail((prev: any) => ({ ...prev, status: selectedStatus }));
      setShowApprove(false);
      setSelectedStatus(null);
      setCatatan("");
      setShowAlert(true);
    } catch (error: any) {
      Alert.alert("Gagal", error?.message || "Gagal mengirim persetujuan.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading / empty states ────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={s.loadingRoot}>
        <ActivityIndicator color={C.accent} size="large" />
        <Text style={s.loadingText}>Memuat detail undangan...</Text>
      </SafeAreaView>
    );
  }

  if (!detail) {
    return (
      <SafeAreaView style={s.loadingRoot}>
        <Text style={s.emptyTitle}>Undangan tidak ditemukan</Text>
        <TouchableOpacity style={s.backHomeBtn} onPress={() => router.back()}>
          <Text style={s.backHomeText}>Kembali</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={C.bg}
      />

      <CustomAlert
        visible={showAlert}
        onClose={() => setShowAlert(false)}
        title="Berhasil"
        message="Persetujuan berhasil dikirim."
      />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[s.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity style={s.headerButton} onPress={() => router.back()}>
          <FontAwesome6 name="chevron-left" size={14} color={C.textPrimary} />
        </TouchableOpacity>

        <View style={s.headerTextWrap}>
          <Text style={s.headerTitle}>Detail Undangan</Text>
          <Text style={s.headerSub}>
            {isUndanganKeluar ? "Undangan Keluar" : "Undangan Masuk"}
          </Text>
        </View>

        <View style={s.headerIcon}>
          <FontAwesome6 name="envelope-open-text" size={15} color={C.accent} />
        </View>
      </View>

      {/* ── Scroll content ─────────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.scrollContent,
          { paddingBottom: 36 + bottomOffset + (canApprove ? 62 : 0) },
        ]}
      >
        {/* Hero card */}
        <View style={s.heroCard}>
          <View style={s.cardTopLine} />

          <View style={s.heroTop}>
            <View style={s.heroIcon}>
              <FontAwesome6 name="calendar-check" size={21} color={C.accent} />
            </View>

            <View
              style={[
                s.statusBadge,
                {
                  backgroundColor: statusCfg.bg,
                  borderColor: statusCfg.border,
                },
              ]}
            >
              <FontAwesome6
                name={statusCfg.icon as any}
                size={11}
                color={statusCfg.color}
              />
              <Text style={[s.statusText, { color: statusCfg.color }]}>
                {statusCfg.label}
              </Text>
            </View>
          </View>

          <Text style={s.heroTitle}>{title}</Text>

          <View style={s.numberPill}>
            <FontAwesome6 name="hashtag" size={11} color={C.textMuted} />
            <Text style={s.numberText}>{nomorSurat}</Text>
          </View>

          <View style={s.topActions}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={loadPDF}
              disabled={loadingPDF}
              style={[s.actionButton, s.pdfButton, loadingPDF && s.disabled]}
            >
              {loadingPDF ? (
                <ActivityIndicator size="small" color={C.danger} />
              ) : (
                <>
                  <FontAwesome6 name="file-pdf" size={14} color={C.danger} />
                  <Text style={s.pdfButtonText}>Lihat PDF</Text>
                </>
              )}
            </TouchableOpacity>

            {!isUndanganKeluar && (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={openDisposisiModal}
                disabled={submittingDisposisi}
                style={[
                  s.actionButton,
                  s.disposisiButton,
                  submittingDisposisi && s.disabled,
                ]}
              >
                {submittingDisposisi ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <FontAwesome6
                      name="paper-plane"
                      size={14}
                      color="#FFFFFF"
                    />
                    <Text style={s.disposisiButtonText}>Disposisi</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Informasi Undangan */}
        <View style={s.sectionCard}>
          <SectionHeader
            icon="circle-info"
            title="Informasi Undangan"
            C={C}
            s={s}
          />

          <InfoRow
            icon="calendar-days"
            label="Tanggal"
            value={formatDate(tanggalUndangan)}
            C={C}
            s={s}
          />
          <InfoRow
            icon="clock"
            label="Waktu"
            value={`${waktuMulai} – ${waktuSelesai}`}
            C={C}
            s={s}
          />
          <InfoRow
            icon="location-dot"
            label="Tempat"
            value={String(tempat)}
            C={C}
            s={s}
          />
          <InfoRow
            icon="user"
            label="Pengirim"
            value={String(pengirim)}
            C={C}
            s={s}
          />

          {penerimaList.length > 0 ? (
            <View style={s.penerimaBox}>
              <View style={s.penerimaHeader}>
                <FontAwesome6 name="users" size={12} color={C.accent} />
                <Text style={s.penerimaTitle}>Penerima Undangan</Text>
                <Text style={s.penerimaCount}>{penerimaList.length} orang</Text>
              </View>

              {(showAllPenerima ? penerimaList : penerimaList.slice(0, 8)).map(
                (item: string, index: number) => (
                  <View key={`${item}-${index}`} style={s.penerimaItem}>
                    <View style={s.penerimaBullet} />
                    <Text style={s.penerimaText}>{item}</Text>
                  </View>
                ),
              )}

              {penerimaList.length > 8 && (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setShowAllPenerima((prev) => !prev)}
                  style={s.penerimaToggleBtn}
                >
                  <FontAwesome6
                    name={showAllPenerima ? "chevron-up" : "chevron-down"}
                    size={10}
                    color={C.accent}
                  />
                  <Text style={s.penerimaToggleText}>
                    {showAllPenerima
                      ? "Sembunyikan"
                      : `Lihat semua ${penerimaList.length} penerima`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <InfoRow icon="users" label="Penerima" value="-" C={C} s={s} />
          )}
        </View>

        {/* Riwayat Disposisi */}
        <View style={s.sectionCard}>
          <SectionHeader
            icon="share-nodes"
            title="Riwayat Disposisi"
            C={C}
            s={s}
          />

          {loadingDisposisi ? (
            <View style={s.miniLoading}>
              <ActivityIndicator size="small" color={C.accent} />
              <Text style={s.miniLoadingText}>Memuat disposisi...</Text>
            </View>
          ) : disposisiList.length === 0 ? (
            <View style={s.emptyBox}>
              <FontAwesome6 name="inbox" size={18} color={C.textTertiary} />
              <Text style={s.emptyText}>Belum ada disposisi.</Text>
            </View>
          ) : (
            <View style={s.disposisiList}>
              {disposisiList.map((item, index) => {
                const cfg = getDisposisiStatus(item.status, C);

                return (
                  <TouchableOpacity
                    key={String(item.id ?? index)}
                    activeOpacity={0.82}
                    onPress={() =>
                      router.push({
                        pathname: "/disposisi/disposisi-detail" as any,
                        params: { id: String(item.id) },
                      })
                    }
                    style={s.disposisiItem}
                  >
                    <View style={s.disposisiTop}>
                      <View style={s.disposisiAvatar}>
                        <Text style={s.disposisiAvatarText}>
                          {String(getUserName(item.dari_user ?? item.dari))
                            .charAt(0)
                            .toUpperCase()}
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={s.disposisiName} numberOfLines={1}>
                          {getUserName(item.dari_user ?? item.dari)}
                        </Text>
                        <Text style={s.disposisiSub} numberOfLines={1}>
                          kepada {getUserName(item.kepada_user ?? item.kepada)}
                        </Text>
                      </View>

                      <View
                        style={[
                          s.disposisiStatus,
                          { backgroundColor: cfg.bg, borderColor: cfg.border },
                        ]}
                      >
                        <Text
                          style={[s.disposisiStatusText, { color: cfg.color }]}
                        >
                          {cfg.label}
                        </Text>
                      </View>
                    </View>

                    {!!item.instruksi && (
                      <Text style={s.disposisiNote}>{item.instruksi}</Text>
                    )}
                    {!!item.catatan && (
                      <Text style={s.disposisiCatatan}>{item.catatan}</Text>
                    )}

                    <View style={s.disposisiFooter}>
                      <View style={s.deadlinePill}>
                        <FontAwesome6
                          name="calendar-day"
                          size={10}
                          color={C.amber}
                        />
                        <Text style={s.deadlineText}>
                          {item.deadline
                            ? `Deadline ${formatDate(item.deadline)}`
                            : formatDate(item.updated_at ?? item.created_at)}
                        </Text>
                      </View>

                      <FontAwesome6
                        name="chevron-right"
                        size={11}
                        color={C.textTertiary}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {canApprove && (
        <View style={[s.bottomBar, { bottom: bottomOffset }]}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={s.approveFloatingBtn}
            onPress={() => setShowApprove(true)}
          >
            <FontAwesome6 name="shield-halved" size={15} color="#FFFFFF" />
            <Text style={s.approveFloatingText}>Persetujuan Undangan</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── DisposisiModal ─────────────────────────────────────────────────── */}
      <DisposisiModal
        visible={showDisposisiModal}
        onClose={() => setShowDisposisiModal(false)}
        onSubmit={handleDisposisiSubmit}
        kandidat={kandidatDisposisi}
        submitting={submittingDisposisi}
        C={DISPOSISI_THEME}
      />

      {/* ── ApprovalActionModal ────────────────────────────────────────────── */}
      <ApprovalActionModal
        visible={showApprove}
        title="Persetujuan Undangan"
        subtitle="Pilih keputusan persetujuan undangan."
        selectedStatus={selectedStatus as ApprovalStatus | null}
        catatan={catatan}
        isNoteRequired={isNoteRequired}
        isSaveDisabled={isSaveDisabled}
        submitting={submitting}
        C={C}
        onClose={() => setShowApprove(false)}
        onSelectStatus={setSelectedStatus}
        onChangeCatatan={setCatatan}
        onSubmit={submitApproval}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  C,
  s,
}: {
  icon: any;
  title: string;
  C: ThemeColors;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionIcon}>
        <FontAwesome6 name={icon} size={13} color={C.accent} />
      </View>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  C,
  s,
}: {
  icon: any;
  label: string;
  value: string;
  C: ThemeColors;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoIcon}>
        <FontAwesome6 name={icon} size={12} color={C.textMuted} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: C.bg,
    },
    loadingRoot: {
      flex: 1,
      backgroundColor: C.bg,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 13,
      fontWeight: "700",
      color: C.textMuted,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "900",
      color: C.textPrimary,
      marginBottom: 14,
    },
    backHomeBtn: {
      backgroundColor: C.accent,
      paddingHorizontal: 18,
      paddingVertical: 11,
      borderRadius: 14,
    },
    backHomeText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "800",
    },
    header: {
      paddingHorizontal: 18,
      paddingBottom: 14,
      backgroundColor: C.surface,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    headerButton: {
      width: 38,
      height: 38,
      borderRadius: 14,
      backgroundColor: C.surface2,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTextWrap: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "900",
      color: C.textPrimary,
    },
    headerSub: {
      marginTop: 2,
      fontSize: 11,
      fontWeight: "700",
      color: C.textMuted,
    },
    headerIcon: {
      width: 38,
      height: 38,
      borderRadius: 14,
      backgroundColor: C.accentBg,
      borderWidth: 1,
      borderColor: C.accentBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    scrollContent: {
      padding: 18,
    },
    heroCard: {
      backgroundColor: C.surface,
      borderRadius: 26,
      padding: 18,
      borderWidth: 1,
      borderColor: C.border,
      shadowColor: isDark ? "#000" : "#0F1E50",
      shadowOpacity: isDark ? 0 : 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
      marginBottom: 14,
      overflow: "hidden",
    },
    cardTopLine: {
      position: "absolute",
      top: 0,
      left: 44,
      right: 44,
      height: 1,
      backgroundColor: C.panelTopLine,
    },
    heroTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    heroIcon: {
      width: 46,
      height: 46,
      borderRadius: 16,
      backgroundColor: C.accentBg,
      borderWidth: 1,
      borderColor: C.accentBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 11,
      paddingVertical: 7,
    },
    statusText: {
      fontSize: 11,
      fontWeight: "900",
    },
    heroTitle: {
      marginTop: 16,
      fontSize: 19,
      lineHeight: 26,
      fontWeight: "900",
      color: C.textPrimary,
      letterSpacing: -0.4,
    },
    numberPill: {
      marginTop: 12,
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      backgroundColor: C.surface2,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 999,
      paddingHorizontal: 11,
      paddingVertical: 7,
    },
    numberText: {
      fontSize: 11,
      fontWeight: "800",
      color: C.textMuted,
    },
    topActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 16,
    },
    actionButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    pdfButton: {
      backgroundColor: C.dangerBg,
      borderWidth: 1,
      borderColor: C.dangerBd,
    },
    disposisiButton: {
      backgroundColor: C.accent,
      borderWidth: 1,
      borderColor: C.accentBorder,
    },
    pdfButtonText: {
      fontSize: 13,
      fontWeight: "900",
      color: C.danger,
    },
    disposisiButtonText: {
      fontSize: 13,
      fontWeight: "900",
      color: "#FFFFFF",
    },
    disabled: {
      opacity: 0.55,
    },
    sectionCard: {
      backgroundColor: C.surface,
      borderRadius: 22,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 14,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      marginBottom: 14,
    },
    sectionIcon: {
      width: 30,
      height: 30,
      borderRadius: 11,
      backgroundColor: C.accentBg,
      borderWidth: 1,
      borderColor: C.accentBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "900",
      color: C.textPrimary,
    },
    infoRow: {
      flexDirection: "row",
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    infoIcon: {
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: C.surface2,
      alignItems: "center",
      justifyContent: "center",
    },
    infoLabel: {
      fontSize: 10,
      fontWeight: "800",
      color: C.textTertiary,
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    infoValue: {
      marginTop: 3,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "700",
      color: C.textPrimary,
    },
    bodyText: {
      fontSize: 13,
      lineHeight: 21,
      fontWeight: "600",
      color: C.textSecondary,
    },
    penerimaBox: {
      marginTop: 12,
      backgroundColor: C.surface2,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: C.border,
      padding: 12,
    },
    penerimaHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 9,
    },
    penerimaTitle: {
      fontSize: 12,
      fontWeight: "900",
      color: C.textPrimary,
      flex: 1,
    },
    penerimaCount: {
      fontSize: 10,
      fontWeight: "800",
      color: C.textMuted,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    penerimaItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      paddingVertical: 5,
    },
    penerimaBullet: {
      width: 6,
      height: 6,
      borderRadius: 999,
      backgroundColor: C.accent,
      marginTop: 6,
    },
    penerimaText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: "700",
      color: C.textSecondary,
    },
    penerimaToggleBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginTop: 10,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: C.accentBg,
      borderWidth: 1,
      borderColor: C.accentBorder,
    },
    penerimaToggleText: {
      fontSize: 11,
      fontWeight: "900",
      color: C.accent,
    },
    miniLoading: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 10,
    },
    miniLoadingText: {
      fontSize: 12,
      fontWeight: "700",
      color: C.textMuted,
    },
    emptyBox: {
      alignItems: "center",
      paddingVertical: 20,
      gap: 8,
      backgroundColor: C.surface2,
      borderRadius: 16,
    },
    emptyText: {
      fontSize: 12,
      fontWeight: "700",
      color: C.textTertiary,
    },
    disposisiList: {
      gap: 10,
    },
    disposisiItem: {
      backgroundColor: C.surface2,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: C.border,
      padding: 12,
    },
    disposisiTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    disposisiAvatar: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: C.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    disposisiAvatarText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "900",
    },
    disposisiName: {
      fontSize: 13,
      fontWeight: "900",
      color: C.textPrimary,
    },
    disposisiSub: {
      marginTop: 2,
      fontSize: 11,
      fontWeight: "600",
      color: C.textMuted,
    },
    disposisiStatus: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    disposisiStatusText: {
      fontSize: 10,
      fontWeight: "900",
    },
    disposisiNote: {
      marginTop: 10,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: "700",
      color: C.textSecondary,
    },
    disposisiCatatan: {
      marginTop: 6,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: "600",
      color: C.textMuted,
    },
    disposisiFooter: {
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    deadlinePill: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      backgroundColor: C.amberBg,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    deadlineText: {
      fontSize: 10,
      fontWeight: "900",
      color: C.amber,
    },
    bottomBar: {
      position: "absolute",
      left: 0,
      right: 0,
      paddingHorizontal: 16,
      zIndex: 20,
    },
    approveFloatingBtn: {
      minHeight: 52,
      borderRadius: 999,
      backgroundColor: C.accent,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      shadowColor: C.accent,
      shadowOpacity: 0.22,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 5,
      bottom: 20,
    },
    approveFloatingText: {
      fontSize: 14,
      fontWeight: "900",
      color: "#FFFFFF",
    },
  });
}
