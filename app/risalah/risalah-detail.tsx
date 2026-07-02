// app/risalah/detail.tsx
import ApprovalActionModal, {
  ApprovalStatus,
} from "@/components/ApprovalActionModal";
import CustomAlert from "@/components/CustomAlert";
import { useTheme } from "@/context/ThemeContext";
import { apiFetch, viewPDF } from "@/utils/api";
import { formatTanggalID } from "@/utils/date";
import { FontAwesome6 } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

type Status = "pending" | "correction" | "approve" | "reject";

const LIGHT = {
  bg: "#F6F8FF",
  surface: "#FFFFFF",
  surface2: "#F8FAFC",
  accent: "#2563EB",
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
  panelTopLine: "rgba(37,99,235,0.28)",
  pdfBg: "#FFF1F2",
  handle: "#CBD5E1",
  backdrop: "rgba(15,30,80,0.45)",
  shadowColor: "#0F1E50",
};

const DARK = {
  bg: "#060B18",
  surface: "#0C1220",
  surface2: "#0F1828",
  accent: "#00D4FF",
  accentBg: "rgba(0,212,255,0.08)",
  accentBorder: "rgba(0,212,255,0.18)",
  border: "rgba(255,255,255,0.07)",
  borderStrong: "rgba(255,255,255,0.12)",
  textPrimary: "rgba(255,255,255,0.90)",
  textSecondary: "rgba(255,255,255,0.62)",
  textTertiary: "rgba(255,255,255,0.38)",
  textMuted: "rgba(255,255,255,0.46)",
  green: "#00CC80",
  greenBg: "rgba(0,200,120,0.13)",
  greenBd: "rgba(0,200,120,0.25)",
  danger: "#FF6B7A",
  dangerBg: "rgba(255,77,109,0.10)",
  dangerBd: "rgba(255,77,109,0.25)",
  amber: "#FFAA00",
  amberBg: "rgba(255,170,0,0.10)",
  amberBd: "rgba(255,170,0,0.25)",
  panelTopLine: "rgba(0,212,255,0.28)",
  pdfBg: "rgba(255,77,109,0.10)",
  handle: "rgba(255,255,255,0.22)",
  backdrop: "rgba(0,0,0,0.62)",
  shadowColor: "#000000",
};

type ThemeColors = typeof LIGHT;

const TABBAR_HEIGHT = Platform.select({
  ios: 49,
  android: 56,
  default: 56,
})!;

const TUJUAN_COLLAPSE_THRESHOLD = 6;

function getStatusConfig(
  C: ThemeColors,
): Record<
  Status,
  { label: string; icon: string; color: string; bg: string; border: string }
> {
  return {
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
  };
}

function normalizeStatus(raw: any): Status {
  const s = String(raw ?? "")
    .toLowerCase()
    .trim();

  if (["approve", "approved", "diterima", "1"].includes(s)) return "approve";
  if (["reject", "rejected", "ditolak", "2"].includes(s)) return "reject";
  if (["correction", "dikoreksi", "3"].includes(s)) return "correction";

  return "pending";
}

function getValue(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return "-";
}

function formatDate(value: any) {
  if (!value) return "-";

  try {
    return formatTanggalID(value);
  } catch {
    return String(value);
  }
}

export default function RisalahDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, notif_id } = useLocalSearchParams();
  const { isDark } = useTheme();

  const C: ThemeColors = isDark ? DARK : LIGHT;
  const s = useMemo(() => createStyles(C, isDark), [C, isDark]);
  const STATUS_CONFIG = useMemo(() => getStatusConfig(C), [C]);

  const risalahId = Array.isArray(id) ? id[0] : id;

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);
  const [owner, setOwner] = useState(false);
  const [loadingPDF, setLoadingPDF] = useState(false);

  const [showApprove, setShowApprove] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null);
  const [catatan, setCatatan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [showAllTujuan, setShowAllTujuan] = useState(false);

  const statusNow = normalizeStatus(detail?.status);
  const statusCfg = STATUS_CONFIG[statusNow];

  const documentId = useMemo(() => {
    return detail?.id_risalah ?? detail?.id ?? risalahId;
  }, [detail, risalahId]);

  const title = getValue(
    detail?.judul,
    detail?.title,
    detail?.agenda,
    "Detail Risalah",
  );
  const nomorRisalah = getValue(
    detail?.nomor_risalah,
    detail?.no_risalah,
    detail?.nomor,
    detail?.kode_risalah,
  );
  const tanggalRapat = getValue(
    detail?.tgl_dibuat,
    detail?.tgl_rapat,
    detail?.tanggal,
    detail?.date,
  );
  const pembuat = getValue(detail?.nama_pembuat, detail?.pembuat, detail?.kode);
  const tempat = getValue(detail?.tempat, detail?.lokasi, detail?.ruangan);
  const waktuMulai = getValue(detail?.waktu_mulai, detail?.jam_mulai);
  const waktuSelesai = getValue(detail?.waktu_selesai, detail?.jam_selesai);

  const tujuanList = useMemo(() => {
    if (Array.isArray(detail?.tujuan_string)) return detail.tujuan_string;
    if (Array.isArray(detail?.tujuan)) return detail.tujuan;
    if (typeof detail?.tujuan_string === "string")
      return [detail.tujuan_string];
    if (typeof detail?.tujuan === "string") return [detail.tujuan];
    return [];
  }, [detail]);

  const isNoteRequired =
    selectedStatus === "reject" || selectedStatus === "correction";
  const isSaveDisabled = !selectedStatus || (isNoteRequired && !catatan.trim());
  const canApprove = statusNow === "pending" && owner;
  const bottomOffset = insets.bottom + TABBAR_HEIGHT + 8;

  useEffect(() => {
    if (!risalahId) return;
    fetchDetail();
  }, [risalahId, notif_id]);

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

      const raw = await apiFetch(`/risalahs/${risalahId}`);
      const data = raw?.data ?? raw;

      setDetail(data);
      setOwner(Boolean(raw?.owner));
    } catch (error: any) {
      Alert.alert(
        "Gagal",
        error?.message || "Tidak dapat memuat detail risalah.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadPDF() {
    if (!documentId) {
      Alert.alert("Error", "ID risalah tidak ditemukan.");
      return;
    }

    try {
      setLoadingPDF(true);
      await viewPDF("risalahs", documentId);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Gagal membuka PDF risalah.");
    } finally {
      setLoadingPDF(false);
    }
  }

  async function submitApproval() {
    if (isSaveDisabled) return;

    try {
      setSubmitting(true);

      await apiFetch(`/risalahs/${risalahId}/update-status?_method=PUT`, {
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

  if (loading) {
    return (
      <SafeAreaView style={s.loadingRoot}>
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={C.bg}
        />
        <ActivityIndicator color={C.accent} size="large" />
        <Text style={s.loadingText}>Memuat detail risalah...</Text>
      </SafeAreaView>
    );
  }

  if (!detail) {
    return (
      <SafeAreaView style={s.loadingRoot}>
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={C.bg}
        />
        <Text style={s.emptyTitle}>Risalah tidak ditemukan</Text>
        <TouchableOpacity style={s.backHomeBtn} onPress={() => router.back()}>
          <Text style={s.backHomeText}>Kembali</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

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

      <View style={[s.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity style={s.headerButton} onPress={() => router.back()}>
          <FontAwesome6 name="chevron-left" size={14} color={C.textPrimary} />
        </TouchableOpacity>

        <View style={s.headerTextWrap}>
          <Text style={s.headerTitle}>Detail Risalah</Text>
          <Text style={s.headerSub}>Informasi risalah rapat</Text>
        </View>

        <View style={s.headerIcon}>
          <FontAwesome6 name="clipboard-list" size={15} color={C.accent} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.scrollContent,
          { paddingBottom: 36 + bottomOffset + (canApprove ? 62 : 0) },
        ]}
      >
        <View style={s.heroCard}>
          <View style={s.cardTopLine} />

          <View style={s.heroTop}>
            <View style={s.heroIcon}>
              <FontAwesome6 name="clipboard-list" size={21} color={C.accent} />
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
            <Text style={s.numberText}>{nomorRisalah}</Text>
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
          </View>
        </View>

        <View style={s.sectionCard}>
          <SectionHeader
            s={s}
            C={C}
            icon="circle-info"
            title="Informasi Risalah"
          />

          <InfoRow
            s={s}
            C={C}
            icon="user"
            label="Pembuat"
            value={String(pembuat)}
          />
          <InfoRow
            s={s}
            C={C}
            icon="calendar-days"
            label="Tanggal Rapat"
            value={formatDate(tanggalRapat)}
          />
          <InfoRow
            s={s}
            C={C}
            icon="clock"
            label="Waktu"
            value={`${waktuMulai} - ${waktuSelesai}`}
          />
          <InfoRow
            s={s}
            C={C}
            icon="location-dot"
            label="Tempat"
            value={String(tempat)}
          />
        </View>

        {tujuanList.length > 0 && (
          <View style={s.sectionCard}>
            <SectionHeader s={s} C={C} icon="users" title="Ditujukan Untuk" />

            <View style={s.tujuanBox}>
              <View style={s.tujuanHeader}>
                <FontAwesome6 name="paper-plane" size={12} color={C.accent} />
                <Text style={s.tujuanTitle}>Penerima Risalah</Text>
                <Text style={s.tujuanCount}>{tujuanList.length} orang</Text>
              </View>

              {(showAllTujuan
                ? tujuanList
                : tujuanList.slice(0, TUJUAN_COLLAPSE_THRESHOLD)
              ).map((item: any, index: number) => (
                <View key={`${String(item)}-${index}`} style={s.tujuanItem}>
                  <View style={s.tujuanBullet} />
                  <Text style={s.tujuanText}>{String(item)}</Text>
                </View>
              ))}

              {tujuanList.length > TUJUAN_COLLAPSE_THRESHOLD && (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setShowAllTujuan((prev) => !prev)}
                  style={s.tujuanToggleBtn}
                >
                  <FontAwesome6
                    name={showAllTujuan ? "chevron-up" : "chevron-down"}
                    size={10}
                    color={C.accent}
                  />
                  <Text style={s.tujuanToggleText}>
                    {showAllTujuan
                      ? "Sembunyikan"
                      : `Lihat semua ${tujuanList.length} penerima`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {(statusNow === "correction" || statusNow === "reject") &&
          !!detail?.catatan && (
            <View style={s.noteCard}>
              <View style={s.noteHeader}>
                <View style={s.noteIcon}>
                  <FontAwesome6
                    name={
                      statusNow === "reject" ? "circle-xmark" : "pen-to-square"
                    }
                    size={13}
                    color={statusCfg.color}
                  />
                </View>
                <Text style={s.noteTitle}>Catatan Persetujuan</Text>
              </View>

              <Text style={s.noteText}>{detail.catatan}</Text>
            </View>
          )}
      </ScrollView>

      {canApprove && (
        <View style={[s.bottomBar, { bottom: bottomOffset }]}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={s.approveFloatingBtn}
            onPress={() => setShowApprove(true)}
          >
            <FontAwesome6 name="shield-halved" size={15} color="#FFFFFF" />
            <Text style={s.approveFloatingText}>Persetujuan Risalah</Text>
          </TouchableOpacity>
        </View>
      )}

      <ApprovalActionModal
        visible={showApprove}
        title="Persetujuan Risalah"
        subtitle="Pilih keputusan persetujuan risalah."
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

function SectionHeader({
  icon,
  title,
  C,
  s,
}: {
  icon: any;
  title: string;
  C: ThemeColors;
  s: ReturnType<typeof createStyles>;
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
  s: ReturnType<typeof createStyles>;
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

function createStyles(C: ThemeColors, isDark: boolean) {
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
      shadowColor: C.shadowColor,
      shadowOpacity: isDark ? 0 : 0.08,
      shadowRadius: isDark ? 0 : 18,
      shadowOffset: { width: 0, height: isDark ? 0 : 8 },
      elevation: isDark ? 0 : 3,
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
      backgroundColor: C.pdfBg,
      borderWidth: 1,
      borderColor: C.dangerBd,
    },
    pdfButtonText: {
      fontSize: 13,
      fontWeight: "900",
      color: C.danger,
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
    tujuanBox: {
      backgroundColor: C.surface2,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: C.border,
      padding: 12,
    },
    tujuanHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 9,
    },
    tujuanTitle: {
      fontSize: 12,
      fontWeight: "900",
      color: C.textPrimary,
      flex: 1,
    },
    tujuanCount: {
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
    tujuanItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      paddingVertical: 5,
    },
    tujuanBullet: {
      width: 6,
      height: 6,
      borderRadius: 999,
      backgroundColor: C.accent,
      marginTop: 6,
    },
    tujuanText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: "700",
      color: C.textSecondary,
    },
    tujuanToggleBtn: {
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
    tujuanToggleText: {
      fontSize: 11,
      fontWeight: "900",
      color: C.accent,
    },
    noteCard: {
      backgroundColor: C.surface,
      borderRadius: 22,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 14,
    },
    noteHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      marginBottom: 10,
    },
    noteIcon: {
      width: 30,
      height: 30,
      borderRadius: 11,
      backgroundColor: C.surface2,
      alignItems: "center",
      justifyContent: "center",
    },
    noteTitle: {
      fontSize: 14,
      fontWeight: "900",
      color: C.textPrimary,
    },
    noteText: {
      fontSize: 13,
      lineHeight: 20,
      fontWeight: "600",
      color: C.textSecondary,
      backgroundColor: C.surface2,
      borderRadius: 14,
      padding: 12,
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
      shadowOpacity: isDark ? 0 : 0.22,
      shadowRadius: isDark ? 0 : 14,
      shadowOffset: { width: 0, height: isDark ? 0 : 8 },
      elevation: isDark ? 0 : 5,
    },
    approveFloatingText: {
      fontSize: 14,
      fontWeight: "900",
      color: "#FFFFFF",
    },
  });
}
