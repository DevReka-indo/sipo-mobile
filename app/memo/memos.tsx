import CustomModal from "@/components/filter-modal";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { stylesIndex } from "@/constants/theme";
import { apiFetch } from "@/utils/api";
import { formatTanggalID } from "@/utils/date";
import { FontAwesome6 } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
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

/* ============ Types ============ */
type Status = "pending" | "correction" | "approve" | "reject";

interface MemoItem {
  id_memo: number;
  judul: string;
  nomor_memo?: string;
  status: Status;
  nama_pembuat?: string;
  tujuan_string?: string;
  created_at?: string;
  tgl_memo?: string;
  isi_memo?: string;
  kode?: string;
  lampiran_url?: string | null;
}

/* ============ Status Config ============ */
const statusConfig: Record<
  Status,
  { label: string; color: string; soft: string }
> = {
  pending: { label: "Diproses", color: "#0B63F6", soft: "#E3EFFF" },
  correction: { label: "Dikoreksi", color: "#B58100", soft: "#FFF4D9" },
  approve: { label: "Diterima", color: "#118C4F", soft: "#E7FAEE" },
  reject: { label: "Ditolak", color: "#C62E2E", soft: "#FFE8E8" },
};

export default function MemoScreen() {
  const router = useRouter();
  const { approval } = useLocalSearchParams<{ approval?: string }>();

  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Filter states
  const [status, setStatus] = useState<string | null>(null);
  const [divisi, setDivisi] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<"status" | "divisi" | null>(null);
  const [divisiOptions, setDivisiOptions] = useState<
    { label: string; value: string }[]
  >([]);

  const statusOptions = [
    { label: "Diproses", value: "pending" },
    { label: "Dikoreksi", value: "correction" },
    { label: "Diterima", value: "approve" },
    { label: "Ditolak", value: "reject" },
  ];

  // Fetch divisi options
  useEffect(() => {
    const fetchDivisiOptions = async () => {
      try {
        const raw = await apiFetch("/memos/kode");
        const data = Array.isArray(raw) ? raw : raw.data;
        const formatted = data.map((item: any) => ({
          label: item,
          value: item,
        }));
        setDivisiOptions(formatted);
      } catch (err) {
        console.error("Gagal ambil opsi divisi/kode:", err);
      }
    };
    fetchDivisiOptions();
  }, []);

  // Fetch memos
  const fetchMemos = useCallback(async () => {
    try {
      let url = "/memos";

      if (approval === "1") {
        url = "/memos?status=pending";
      } else {
        const params = new URLSearchParams();
        if (status) params.append("status", status);
        if (divisi) params.append("kode", divisi);
        if ([...params].length > 0) url += `?${params.toString()}`;
      }

      const res = await apiFetch(url);
      const arr: MemoItem[] = Array.isArray(res) ? res : res?.data ?? [];
      setMemos(arr);
    } catch (err) {
      console.error("Gagal ambil memos:", err);
      Alert.alert("Error", "Gagal memuat memo. Silakan coba lagi.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status, divisi, approval]);

  useEffect(() => {
    fetchMemos();
  }, [fetchMemos]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMemos();
  }, [fetchMemos]);

  const handleReset = () => {
    setStatus(null);
    setDivisi(null);
  };

  const handleSelect = (type: "status" | "divisi", value: string) => {
    if (type === "status") setStatus(value);
    else setDivisi(value);
    setOpenDropdown(null);
  };

  // Loading State
  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={Colors.navy} />
        <Text style={[Fonts.paragraphMediumSmall, styles.loadingText]}>
          Memuat memo...
        </Text>
      </SafeAreaView>
    );
  }

  const isEmpty = memos.length === 0;

  return (
    <SafeAreaView
      style={[stylesIndex.container, { backgroundColor: Colors.white }]}
      edges={["top", "bottom"]}
    >
      {/* Header */}
      <View style={stylesIndex.header}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable
            onPress={() => router.push("/beranda/beranda")}
            hitSlop={10}
            style={{ padding: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Kembali ke Beranda"
          >
            <FontAwesome6
              name="chevron-left"
              size={20}
              color={Colors.textPrimary}
            />
          </Pressable>

          <View style={{ flex: 1 }}>
            <ThemedText style={[Fonts.header1, { color: Colors.navy }]}>
              Memo
            </ThemedText>
            <ThemedText
              style={[
                Fonts.paragraphRegularLarge,
                { color: Colors.textSecondary },
              ]}
            >
              Daftar memo yang diterima
            </ThemedText>
          </View>

          {approval !== "1" && (
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              style={styles.filterBtn}
            >
              <FontAwesome6 name="sliders" size={22} color={Colors.navy} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Modal */}
      <CustomModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      >
        <View>
          {/* Close Button */}
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setModalVisible(false)}
          >
            <FontAwesome6 name="xmark" size={24} color={Colors.gray} />
          </TouchableOpacity>

          <Text style={[Fonts.header5, styles.modalTitle]}>FILTER</Text>

          {/* Status Dropdown */}
          <Text style={[Fonts.paragraphMediumLarge, styles.dropdownLabel]}>
            Status
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              setOpenDropdown(openDropdown === "status" ? null : "status")
            }
            style={styles.dropdownButton}
          >
            <Text
              style={[
                Fonts.paragraphRegularLarge,
                { color: status ? "#000" : "#777" },
              ]}
            >
              {status
                ? statusOptions.find((opt) => opt.value === status)?.label
                : "Pilih Status"}
            </Text>
            <FontAwesome6
              name={openDropdown === "status" ? "chevron-up" : "chevron-down"}
              size={16}
              color="#777"
            />
          </TouchableOpacity>

          {openDropdown === "status" && (
            <View style={styles.dropdownList}>
              {statusOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => handleSelect("status", opt.value)}
                  style={styles.dropdownItem}
                >
                  <Text style={Fonts.paragraphRegularLarge}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Divisi Dropdown */}
          <Text style={[Fonts.paragraphMediumLarge, styles.dropdownLabel]}>
            Divisi
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              setOpenDropdown(openDropdown === "divisi" ? null : "divisi")
            }
            style={styles.dropdownButton}
          >
            <Text
              style={[
                Fonts.paragraphRegularLarge,
                { color: divisi ? "#000" : "#777" },
              ]}
            >
              {divisi
                ? divisiOptions.find((o) => o.value === divisi)?.label
                : "Pilih Divisi"}
            </Text>
            <FontAwesome6
              name={openDropdown === "divisi" ? "chevron-up" : "chevron-down"}
              size={14}
              color="#777"
            />
          </TouchableOpacity>

          {openDropdown === "divisi" && (
            <View style={styles.dropdownList}>
              {divisiOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => handleSelect("divisi", opt.value)}
                  style={styles.dropdownItem}
                >
                  <Text style={Fonts.paragraphRegularLarge}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Filter Buttons */}
          <View style={styles.filterButtons}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Text style={[Fonts.paragraphMediumLarge, styles.filterBtnText]}>
                Atur Ulang
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={[Fonts.paragraphMediumLarge, styles.filterBtnText]}>
                Pakai
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </CustomModal>

      {/* Content */}
      <ScrollView
        contentContainerStyle={[
          stylesIndex.list,
          isEmpty && styles.emptyScrollContent,
        ]}
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
                source={require("@/assets/icons/memo/memo_fill_blue.png")}
                style={styles.emptyIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={[Fonts.header6, styles.emptyTitle]}>
              Belum Ada Memo
            </Text>
            <Text style={[Fonts.paragraphRegularSmall, styles.emptyMessage]}>
              {approval === "1"
                ? "Tidak ada memo yang menunggu\npersetujuan Anda saat ini"
                : status || divisi
                ? "Tidak ada memo yang sesuai\ndengan filter yang dipilih"
                : "Anda belum memiliki memo\nyang diterima"}
            </Text>
            {(status || divisi) && (
              <TouchableOpacity
                style={styles.clearFilterBtn}
                onPress={handleReset}
              >
                <Text style={[Fonts.paragraphMediumSmall, styles.clearFilterText]}>
                  Hapus Filter
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          // Memo List
          memos.map((item) => {
            const cfg = statusConfig[item.status] ?? statusConfig.pending;
            const tanggal = item.tgl_memo
              ? formatTanggalID(item.tgl_memo)
              : item.created_at
              ? formatTanggalID(item.created_at)
              : "-";

            return (
              <TouchableOpacity
                key={item.id_memo}
                activeOpacity={0.85}
                onPress={() =>
                  router.push(`/memo/memo-detail?id=${item.id_memo}`)
                }
                style={stylesIndex.card}
              >
                {/* Title */}
                <ThemedText
                  style={[
                    Fonts.paragraphMediumLarge,
                    { marginBottom: 8, color: Colors.navy },
                  ]}
                >
                  {item.judul}
                </ThemedText>

                {/* Date */}
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, Fonts.paragraphRegularSmall]}>
                    Tanggal :
                  </Text>
                  <Text style={[styles.infoValue, Fonts.paragraphRegularSmall]}>
                    {tanggal}
                  </Text>
                </View>

                {/* Division */}
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, Fonts.paragraphRegularSmall]}>
                    Divisi :
                  </Text>
                  <Text style={[styles.infoValue, Fonts.paragraphRegularSmall]}>
                    {item.kode || "-"}
                  </Text>
                </View>

                {/* Creator */}
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, Fonts.paragraphRegularSmall]}>
                    Pembuat :
                  </Text>
                  <Text style={[styles.infoValue, Fonts.paragraphRegularSmall]}>
                    {item.nama_pembuat || "-"}
                  </Text>
                </View>

                {/* Status */}
                <View style={styles.statusRow}>
                  <Text style={[styles.infoLabel, Fonts.paragraphRegularSmall]}>
                    Status :
                  </Text>
                  <Text
                    style={[
                      styles.statusValue,
                      Fonts.paragraphMediumSmall,
                      { color: cfg.color },
                    ]}
                  >
                    {cfg.label}
                  </Text>
                </View>

                {/* Status Bar */}
                <View style={[styles.softBg, { backgroundColor: cfg.soft }]} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ============ Styles ============ */
const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F8FA",
  },
  loadingText: {
    marginTop: 8,
    color: Colors.textSecondary,
  },
  filterBtn: {
    padding: 8,
    marginLeft: 8,
  },

  // Empty State
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
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
    backgroundColor: "#EAF0FF",
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
  clearFilterBtn: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: Colors.navy,
    borderRadius: 20,
  },
  clearFilterText: {
    color: "#fff",
  },

  // Card Info
  infoRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: "row",
    marginTop: 4,
  },
  infoLabel: {
    width: 100,
    color: Colors.textSecondary,
  },
  infoValue: {
    flex: 1,
    color: Colors.textSecondary,
  },
  statusValue: {
    flex: 1,
    fontWeight: "700",
  },
  softBg: {
    height: 6,
    borderRadius: 8,
    marginTop: 10,
  },

  // Modal
  modalCloseBtn: {
    position: "absolute",
    right: 0,
    padding: 4,
    zIndex: 10,
  },
  modalTitle: {
    marginBottom: 12,
    color: Colors.navy,
    textAlign: "center",
  },
  dropdownLabel: {
    color: Colors.navy,
    marginBottom: 4,
  },
  dropdownButton: {
    backgroundColor: "#F2F2F2",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 4,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownList: {
    backgroundColor: "#F9F9F9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 10,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  filterButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 10,
  },
  resetBtn: {
    paddingVertical: 10,
    borderRadius: 20,
    flex: 1,
    backgroundColor: "#FA7268",
  },
  applyBtn: {
    paddingVertical: 10,
    borderRadius: 20,
    flex: 1,
    backgroundColor: "#1F316F",
  },
  filterBtnText: {
    color: "white",
    textAlign: "center",
  },
});