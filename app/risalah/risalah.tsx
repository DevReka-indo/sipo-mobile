import MemoFilterModal from "@/components/MemoFilterModal";
import { useTheme } from "@/context/ThemeContext";
import { apiFetch } from "@/utils/api";
import { formatTanggalID } from "@/utils/date";
import { FontAwesome6 } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

type Status = "pending" | "correction" | "approve" | "reject";

interface RisalahItem {
  id_risalah: number;
  judul: string;
  status: Status;
  created_at?: string;
  updated_at?: string;
  tgl_dibuat?: string;
  tgl_disahkan?: string;
  tgl_rapat?: string;
  waktu_mulai?: string;
  waktu_selesai?: string;
  tempat?: string;
  kode?: string;
  kode_bagian?: string;
  nama_bagian?: string;
  nama_pembuat?: string;
  nama_notulis_acara?: string;
  tujuan_string?: string[] | string;
  pemimpin_acara?: string;
  notulis_acara?: string;
}

const LIGHT = {
  bg: "#F4F7FB",
  surface: "#FFFFFF",
  surface2: "#F8FAFE",
  surface3: "#EDFBF4",
  border: "#E6ECF5",
  borderSoft: "#EEF2F7",
  primary: "#1A8A4A",
  textPrimary: "#0D1829",
  textSecondary: "#5B6F8F",
  iconBg: "#E7FAEE",
  activeBg: "#EDFBF4",
  activeBorder: "#C8EED8",
  danger: "#C62E2E",
  dangerBg: "#FFECEC",
  dangerBorder: "#FFD0D0",
  shadow: {
    shadowColor: "#1A3C8C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
};

const DARK = {
  bg: "#060B18",
  surface: "#0C1220",
  surface2: "#0F1828",
  surface3: "#0A2018",
  border: "rgba(255,255,255,0.1)",
  borderSoft: "rgba(255,255,255,0.07)",
  primary: "#00CC80",
  textPrimary: "rgba(255,255,255,0.9)",
  textSecondary: "rgba(255,255,255,0.55)",
  iconBg: "rgba(0,200,120,0.13)",
  activeBg: "rgba(0,200,120,0.13)",
  activeBorder: "rgba(0,200,120,0.25)",
  danger: "#FF6B7A",
  dangerBg: "rgba(255,77,109,0.1)",
  dangerBorder: "rgba(255,77,109,0.25)",
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
};

type ThemeColors = typeof LIGHT;

const statusOptions = [
  { label: "Pending", value: "pending" },
  { label: "Correction", value: "correction" },
  { label: "Approve", value: "approve" },
  { label: "Reject", value: "reject" },
];

const getStatusConfig = (C: ThemeColors) => ({
  pending: {
    label: "Pending",
    color: C.primary,
    soft: C.activeBg,
    border: C.activeBorder,
  },
  correction: {
    label: "Correction",
    color: "#D69A00",
    soft: "rgba(214,154,0,0.12)",
    border: "rgba(214,154,0,0.25)",
  },
  approve: {
    label: "Approve",
    color: "#21B36B",
    soft: "rgba(33,179,107,0.12)",
    border: "rgba(33,179,107,0.25)",
  },
  reject: {
    label: "Reject",
    color: C.danger,
    soft: C.dangerBg,
    border: C.dangerBorder,
  },
});

const getKodeLabel = (item: any) => {
  if (typeof item === "string") return item;

  const kode = item?.kode_bagian || item?.kode || item?.value || "";
  const nama =
    item?.nama_bagian || item?.nama_divisi || item?.label || item?.name || "";

  if (kode && nama && kode !== nama) return `${kode} - ${nama}`;
  return kode || nama || "-";
};

const getKodeValue = (item: any) => {
  if (typeof item === "string") return item;
  return item?.kode_bagian || item?.kode || item?.value || "";
};

const getRisalahKode = (item: RisalahItem) => {
  return item.kode_bagian || item.kode || "-";
};

const getRisalahBagian = (item: RisalahItem) => {
  const kode = item.kode_bagian || item.kode || "";
  const nama = item.nama_bagian || "";

  if (kode && nama) return `${kode} - ${nama}`;
  return kode || nama || "-";
};

const getRisalahPembuat = (item: any) => {
  const pembuat =
    item?.nama_notulis_acara ||
    item?.nama_pembuat ||
    item?.notulis_acara?.nama ||
    item?.notulis_acara?.name ||
    item?.notulis_acara ||
    item?.notulis ||
    "-";

  return String(pembuat).trim() || "-";
};

const getTujuanText = (tujuan?: string[] | string) => {
  if (!tujuan) return "-";
  if (Array.isArray(tujuan)) return tujuan.length > 0 ? tujuan.join(", ") : "-";
  return tujuan;
};

export default function RisalahScreen() {
  const router = useRouter();
  const { approval } = useLocalSearchParams<{ approval?: string }>();
  const { isDark } = useTheme();

  const C: ThemeColors = isDark ? DARK : LIGHT;
  const statusConfig = getStatusConfig(C);

  const [allRisalah, setAllRisalah] = useState<RisalahItem[]>([]);
  const [risalah, setRisalah] = useState<RisalahItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const [status, setStatus] = useState<string | null>(
    approval === "1" ? "pending" : null,
  );
  const [kodeBagian, setKodeBagian] = useState<string | null>(null);

  const [kodeOptions, setKodeOptions] = useState<
    { label: string; value: string }[]
  >([]);

  const hasFilter = !!status || !!kodeBagian;

  const selectedStatusLabel = useMemo(() => {
    return statusOptions.find((opt) => opt.value === status)?.label ?? null;
  }, [status]);

  const selectedKodeLabel = useMemo(() => {
    return kodeOptions.find((opt) => opt.value === kodeBagian)?.label ?? null;
  }, [kodeBagian, kodeOptions]);

  const applyLocalFilter = useCallback(
    (data: RisalahItem[]) => {
      const selectedKode = String(kodeBagian || "")
        .trim()
        .toUpperCase();

      return data.filter((item) => {
        const matchStatus = status ? item.status === status : true;

        const itemKode = String(item.kode_bagian || item.kode || "")
          .trim()
          .toUpperCase();

        const matchKode = kodeBagian ? itemKode === selectedKode : true;

        return matchStatus && matchKode;
      });
    },
    [status, kodeBagian],
  );

  const fetchKodeOptions = useCallback(async () => {
    try {
      const raw = await apiFetch("/risalahs/kode");
      const data = Array.isArray(raw) ? raw : (raw?.data ?? []);

      const formatted = (data ?? [])
        .map((item: any) => ({
          label: getKodeLabel(item),
          value: String(getKodeValue(item)),
        }))
        .filter((item: any) => item.value && item.label !== "-");

      const uniqueOptions = formatted.filter(
        (item: any, index: number, self: any[]) =>
          index === self.findIndex((opt) => opt.value === item.value),
      );

      setKodeOptions(uniqueOptions);
    } catch (err) {
      console.error("Gagal ambil opsi kode bagian risalah:", err);
    }
  }, []);

  const fetchRisalah = useCallback(async () => {
    try {
      let url = "/risalahs";
      const params = new URLSearchParams();

      if (approval === "1") params.append("approval", "true");
      if (status) params.append("status", status);
      if (kodeBagian) params.append("kode", kodeBagian);

      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;

      const res = await apiFetch(url);
      const arr: RisalahItem[] = Array.isArray(res) ? res : (res?.data ?? []);
      const filteredData = applyLocalFilter(arr);

      setAllRisalah(arr);
      setRisalah(filteredData);
    } catch (err) {
      console.error("Gagal ambil risalah:", err);
      Alert.alert("Error", "Gagal memuat risalah. Silakan coba lagi.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [approval, status, kodeBagian, applyLocalFilter]);

  useEffect(() => {
    fetchKodeOptions();
  }, [fetchKodeOptions]);

  useEffect(() => {
    fetchRisalah();
  }, [fetchRisalah]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRisalah();
  }, [fetchRisalah]);

  const handleReset = () => {
    setStatus(approval === "1" ? "pending" : null);
    setKodeBagian(null);
  };

  const totalDokumen = risalah.length;
  const totalSemuaDokumen = allRisalah.length;

  const approvedCount = risalah.filter(
    (item) => item.status === "approve",
  ).length;
  const pendingCount = risalah.filter(
    (item) => item.status === "pending",
  ).length;
  const correctionCount = risalah.filter(
    (item) => item.status === "correction",
  ).length;
  const rejectCount = risalah.filter((item) => item.status === "reject").length;

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />

        <SafeAreaView style={[styles.center, { backgroundColor: C.bg }]}>
          <StatusBar
            barStyle={isDark ? "light-content" : "dark-content"}
            backgroundColor={C.bg}
          />

          <ActivityIndicator size="large" color={C.primary} />

          <Text style={[styles.loadingText, { color: C.textSecondary }]}>
            Memuat risalah...
          </Text>
        </SafeAreaView>
      </>
    );
  }

  const isEmpty = risalah.length === 0;

  return (
    <>
      {approval !== "1" && (
        <MemoFilterModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title="Filter Risalah"
          subtitle="Saring risalah berdasarkan status dan kode bagian"
          statusOptions={statusOptions}
          kodeOptions={kodeOptions}
          initialStatus={status}
          initialKodeBagian={kodeBagian}
          onApply={(filters) => {
            setStatus(filters.status);
            setKodeBagian(filters.kodeBagian);
          }}
          isDark={isDark}
        />
      )}

      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView
        style={[styles.container, { backgroundColor: C.bg }]}
        edges={["top", "bottom"]}
      >
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={C.bg}
        />

        <View
          style={[
            styles.header,
            { backgroundColor: C.bg, borderBottomColor: C.border },
          ]}
        >
          <View style={styles.headerTop}>
            <Pressable
              onPress={() => router.push("/beranda/beranda")}
              hitSlop={10}
              style={[
                styles.backBtn,
                { backgroundColor: C.surface, borderColor: C.border },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Kembali ke Beranda"
            >
              <FontAwesome6 name="chevron-left" size={18} color={C.primary} />
            </Pressable>

            <View style={styles.headerTitleWrap}>
              <Text style={[styles.headerTitle, { color: C.primary }]}>
                Risalah Rapat
              </Text>

              <Text style={[styles.headerSubtitle, { color: C.textSecondary }]}>
                Daftar risalah rapat yang tersedia
              </Text>
            </View>

            {approval !== "1" && (
              <TouchableOpacity
                onPress={() => setModalVisible(true)}
                style={[
                  styles.filterBtn,
                  {
                    backgroundColor: hasFilter ? C.primary : C.surface,
                    borderColor: hasFilter ? C.primary : C.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <FontAwesome6
                  name="sliders"
                  size={17}
                  color={hasFilter ? "#FFFFFF" : C.primary}
                />
              </TouchableOpacity>
            )}
          </View>

          <View
            style={[
              styles.headerInfoCard,
              { backgroundColor: C.surface, borderColor: C.border },
              C.shadow,
            ]}
          >
            <View style={styles.headerInfoLeft}>
              <View
                style={[styles.headerInfoIcon, { backgroundColor: C.iconBg }]}
              >
                <FontAwesome6 name="file-lines" size={18} color={C.primary} />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.headerInfoLabel, { color: C.textPrimary }]}
                >
                  Total Risalah
                </Text>

                <Text
                  style={[styles.headerInfoSub, { color: C.textSecondary }]}
                >
                  {hasFilter
                    ? `Menampilkan ${totalDokumen} dari ${totalSemuaDokumen} dokumen`
                    : "Semua risalah rapat yang tersedia"}
                </Text>
              </View>
            </View>

            <View
              style={[styles.headerCountBox, { backgroundColor: C.surface3 }]}
            >
              <Text style={[styles.headerCount, { color: C.primary }]}>
                {totalDokumen}
              </Text>

              <Text
                style={[styles.headerCountText, { color: C.textSecondary }]}
              >
                dokumen
              </Text>
            </View>
          </View>

          {hasFilter && (
            <View style={styles.activeFilterWrap}>
              {selectedStatusLabel && (
                <View
                  style={[
                    styles.activeFilterChip,
                    {
                      backgroundColor: C.activeBg,
                      borderColor: C.activeBorder,
                    },
                  ]}
                >
                  <Text style={[styles.activeFilterText, { color: C.primary }]}>
                    Status: {selectedStatusLabel}
                  </Text>
                </View>
              )}

              {selectedKodeLabel && (
                <View
                  style={[
                    styles.activeFilterChip,
                    {
                      backgroundColor: C.activeBg,
                      borderColor: C.activeBorder,
                    },
                  ]}
                >
                  <Text style={[styles.activeFilterText, { color: C.primary }]}>
                    Kode: {selectedKodeLabel}
                  </Text>
                </View>
              )}

              {approval !== "1" && (
                <TouchableOpacity
                  style={[
                    styles.activeFilterReset,
                    { backgroundColor: C.dangerBg },
                  ]}
                  onPress={handleReset}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.activeFilterResetText, { color: C.danger }]}
                  >
                    Reset
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.listContent,
            isEmpty && styles.emptyScrollContent,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[C.primary]}
              tintColor={C.primary}
              progressBackgroundColor={C.surface}
            />
          }
        >
          {!isEmpty && (
            <View style={styles.statsGrid}>
              {[
                ["Pending", pendingCount],
                ["Approve", approvedCount],
                ["Correction", correctionCount],
                ["Reject", rejectCount],
              ].map(([label, value]) => (
                <View
                  key={String(label)}
                  style={[
                    styles.statCard,
                    { backgroundColor: C.surface, borderColor: C.border },
                  ]}
                >
                  <Text style={[styles.statValue, { color: C.primary }]}>
                    {value}
                  </Text>

                  <Text style={[styles.statLabel, { color: C.textSecondary }]}>
                    {label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {isEmpty ? (
            <View style={styles.emptyStateContainer}>
              <View
                style={[styles.emptyIconWrapper, { backgroundColor: C.iconBg }]}
              >
                <Image
                  source={require("@/assets/icons/risalah/risalah_fill_green.png")}
                  style={styles.emptyIcon}
                  resizeMode="contain"
                />
              </View>

              <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
                Belum Ada Risalah
              </Text>

              <Text style={[styles.emptyMessage, { color: C.textSecondary }]}>
                {approval === "1"
                  ? "Tidak ada risalah yang menunggu persetujuan Anda saat ini."
                  : hasFilter
                    ? "Tidak ada risalah yang sesuai dengan filter yang dipilih."
                    : "Anda belum memiliki risalah rapat."}
              </Text>

              {hasFilter && approval !== "1" && (
                <TouchableOpacity
                  style={[
                    styles.clearFilterBtn,
                    { backgroundColor: C.primary },
                  ]}
                  onPress={handleReset}
                  activeOpacity={0.8}
                >
                  <Text style={styles.clearFilterText}>Hapus Filter</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            risalah.map((item) => {
              const cfg = statusConfig[item.status] ?? statusConfig.pending;

              const tanggal = item.tgl_rapat
                ? formatTanggalID(item.tgl_rapat)
                : item.tgl_dibuat
                  ? formatTanggalID(item.tgl_dibuat)
                  : item.tgl_disahkan
                    ? formatTanggalID(item.tgl_disahkan)
                    : item.created_at
                      ? formatTanggalID(item.created_at)
                      : item.updated_at
                        ? formatTanggalID(item.updated_at)
                        : "-";

              return (
                <TouchableOpacity
                  key={item.id_risalah}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({
                      pathname: "/risalah/risalah-detail" as any,
                      params: {
                        id: String(item.id_risalah),
                        source: "risalah",
                        from: "risalah",
                      },
                    })
                  }
                  style={[
                    styles.risalahCard,
                    {
                      backgroundColor: C.surface,
                      borderColor: C.border,
                    },
                    C.shadow,
                  ]}
                >
                  <View style={styles.risalahCardHeader}>
                    <View
                      style={[
                        styles.risalahIconBox,
                        { backgroundColor: C.iconBg },
                      ]}
                    >
                      <FontAwesome6
                        name="file-lines"
                        size={16}
                        color={C.primary}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.risalahTitle, { color: C.primary }]}
                        numberOfLines={2}
                      >
                        {item.judul || "Tanpa Judul"}
                      </Text>

                      <Text
                        style={[
                          styles.risalahNumber,
                          { color: C.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {tanggal}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.risalahMetaBox,
                      {
                        backgroundColor: C.surface2,
                        borderColor: C.borderSoft,
                      },
                    ]}
                  >
                    {[
                      ["Tanggal", tanggal],
                      [
                        "Waktu",
                        `${item.waktu_mulai || "-"} - ${
                          item.waktu_selesai || "-"
                        }`,
                      ],
                      ["Tempat", item.tempat || "-"],
                      ["Kode Bagian", getRisalahKode(item)],
                      ["Bagian", getRisalahBagian(item)],
                      ["Tujuan", getTujuanText(item.tujuan_string)],
                      ["Pembuat", getRisalahPembuat(item)],
                    ].map(([label, value]) => (
                      <View style={styles.risalahMetaRow} key={label}>
                        <Text
                          style={[
                            styles.risalahMetaLabel,
                            { color: C.textSecondary },
                          ]}
                        >
                          {label}
                        </Text>

                        <Text
                          style={[
                            styles.risalahMetaValue,
                            { color: C.textPrimary },
                          ]}
                          numberOfLines={1}
                        >
                          {value}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.risalahFooter}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: cfg.soft,
                          borderColor: cfg.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: cfg.color },
                        ]}
                      />

                      <Text
                        style={[styles.statusBadgeText, { color: cfg.color }]}
                      >
                        {cfg.label}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.detailBtn,
                        { backgroundColor: C.surface3 },
                      ]}
                    >
                      <Text
                        style={[styles.detailBtnText, { color: C.primary }]}
                      >
                        Detail
                      </Text>

                      <FontAwesome6
                        name="chevron-right"
                        size={10}
                        color={C.primary}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  headerInfoCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerInfoIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfoLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
  headerInfoSub: {
    fontSize: 11,
    marginTop: 3,
    lineHeight: 16,
  },
  headerCountBox: {
    minWidth: 74,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    marginLeft: 12,
  },
  headerCount: {
    fontSize: 23,
    fontWeight: "900",
    lineHeight: 25,
  },
  headerCountText: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },

  activeFilterWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  activeFilterChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  activeFilterText: {
    fontSize: 11,
    fontWeight: "700",
  },
  activeFilterReset: {
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  activeFilterResetText: {
    fontSize: 11,
    fontWeight: "800",
  },

  listContent: {
    padding: 16,
    paddingBottom: 110,
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    width: "47.8%",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "700",
  },

  risalahCard: {
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  risalahCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  risalahIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  risalahTitle: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21,
  },
  risalahNumber: {
    fontSize: 11,
    marginTop: 3,
  },
  risalahMetaBox: {
    borderRadius: 16,
    padding: 12,
    gap: 8,
    borderWidth: 1,
  },
  risalahMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  risalahMetaLabel: {
    width: 95,
    fontSize: 11,
    fontWeight: "700",
  },
  risalahMetaValue: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
  },
  risalahFooter: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  detailBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  detailBtnText: {
    fontSize: 11,
    fontWeight: "800",
  },

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
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyIcon: {
    width: 64,
    height: 64,
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
  },
  emptyMessage: {
    textAlign: "center",
    lineHeight: 20,
    fontSize: 12,
  },
  clearFilterBtn: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  clearFilterText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
});
