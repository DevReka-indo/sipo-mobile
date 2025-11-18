import { FontAwesome6 } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState, } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomModal from "../../components/filter-modal";
import { ThemedText } from "../../components/themed-text";
import { Colors } from "../../constants/colors";
import { Fonts } from "../../constants/fonts";
import { stylesIndex } from "../../constants/theme";
import { apiFetch } from "../../utils/api";
import { formatTanggalID } from "../../utils/date";


/* ============ Types ============ */
type Status = "pending" | "correction" | "approve" | "reject";

type Invitation = {
  id: number;
  title: string;
  date: string; // hasil formatTanggalID
  status: Status;
  waktu_mulai?: string;
  waktu_selesai?: string;
  tempat?: string;
};

/* ============ Config Status Color ============ */
const statusConfig: Record<
  Status,
  { label: string; color: string; soft: string }
> = {
  pending: { label: "Diproses", color: "#0B63F6", soft: "#D9E0EA" },
  correction: { label: "Dikoreksi", color: "#B58100", soft: "#D9E0EA" },
  approve: { label: "Diterima", color: "#118C4F", soft: "#D9E0EA" },
  reject: { label: "Ditolak", color: "#C62E2E", soft: "#D9E0EA" },
};

/* ============ Helpers ============ */

/* ============ Screen ============ */
const UndanganScreen = () => {
  const router = useRouter();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const { approval } = useLocalSearchParams<{ approval?: string }>();
  const [refreshing, setRefreshing] = useState(false);

  /* ============ Screen ============ */
  const [status, setStatus] = useState<string | null>(null);
  const [divisi, setDivisi] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<"status" | "divisi" | null>(
    null
  );

  const [divisiOptions, setDivisiOptions] = useState<
    { label: string; value: string }[]
  >([]);

  const statusOptions = [
    { label: "Diproses", value: "pending" },
    { label: "Dikoreksi", value: "correction" },
    { label: "Diterima", value: "approve" },
    { label: "Ditolak", value: "reject" },
  ];

  const handleReset = () => {
    setStatus(null);
    setDivisi(null);
  };

  const handleSelect = (type: "status" | "divisi", value: string) => {
    if (type === "status") setStatus(value);
    else setDivisi(value);
    setOpenDropdown(null);
  };

  useEffect(() => {
    const fetchDivisiOptions = async () => {
      try {
        const raw = await apiFetch("/undangans/kode"); // ← adjust the endpoint
        const data = Array.isArray(raw) ? raw : raw.data;

        const formatted = data.map((item: any) => ({
          label: item, // or whatever your field name is
          value: item,
        }));

        setDivisiOptions(formatted);
      } catch (err) {
        console.error("Failed to load divisi options:", err);
      }
    };

    fetchDivisiOptions();
  }, []);

  const fetchInvitations = async () => {
  try {
    let url = "/undangans";

    if (approval === "1") {
      url = "/undangans?status=pending";
    } else {
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (divisi) params.append("kode", divisi);

      if ([...params].length > 0) {
        url += `?${params.toString()}`;
      }
    }

    const raw = await apiFetch(url);
    const data = Array.isArray(raw) ? raw : raw.data;

    const formatted: Invitation[] = data.map((item: any) => ({
      id: item.id_undangan,
      title: item.judul,
      date: formatTanggalID(item.tgl_rapat),
      status: item.status as Status,
      waktu_mulai: item.waktu_mulai ?? "-",
      waktu_selesai: item.waktu_selesai ?? "-",
      tempat: item.tempat,
    }));

    setInvitations(formatted);
  } catch (e) {
    console.error("Error fetching invitations:", e);
    Alert.alert("Gagal memuat undangan" + (e as string));
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

useEffect(() => {
  fetchInvitations();
}, [status, divisi]);

const onRefresh = async () => {
  setRefreshing(true);
  await fetchInvitations();
};


  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary ?? "#0B3B82"} />
        <Text style={[Fonts.paragraphRegularSmall, styles.loadingText]}>
          Sedang memuat undangan...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[stylesIndex.container, { flex: 1, backgroundColor: Colors.white }]} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={stylesIndex.header}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable
            onPress={() => router.replace("/beranda/beranda")}
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
              Undangan Rapat
            </ThemedText>
            <ThemedText
              style={[
                Fonts.paragraphRegularLarge,
                { color: Colors.textSecondary },
              ]}
            >
              Daftar undangan rapat yang diterima
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

      {/* Modal (tetap) */}
      <CustomModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      >
        <View>
          {/* Tombol Close */}
          <TouchableOpacity
            style={{ position: "absolute", right: 0, padding: 4 }}
            onPress={() => setModalVisible(false)}
          >
            <FontAwesome6 name="xmark" size={24} color={Colors.gray} />
          </TouchableOpacity>

          <Text
            style={[
              Fonts.header5,
              { marginBottom: 12, color: Colors.navy, textAlign: "center" },
            ]}
          >
            FILTER
          </Text>

          {/* Dropdown Status */}
          <Text style={[Fonts.paragraphMediumLarge, { color: Colors.navy }]}>
            Status
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              setOpenDropdown(openDropdown === "status" ? null : "status");
            }}
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
                : "Select Option"}
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
                  <Text style={{ color: "#000" }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Dropdown Divisi */}
          <Text style={[Fonts.paragraphMediumLarge, { color: Colors.navy }]}>
            Divisi
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              setOpenDropdown(openDropdown === "divisi" ? null : "divisi");
            }}
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
                : "Select Option"}
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
                  <Text style={{ color: "#000" }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Tombol bawah */}
          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={[styles.resetBtn, { backgroundColor: "#FA7268" }]}
              onPress={handleReset}
            >
              <Text style={[Fonts.paragraphMediumLarge, styles.filterBtnText]}>Atur Ulang</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: "#1F316F" }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={[Fonts.paragraphMediumLarge, styles.filterBtnText]}>
                Pakai
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </CustomModal>

      {/* List */}
      <ScrollView 
      contentContainerStyle={stylesIndex.list}
      refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={[Colors.primary]}
    />
  }
      >
        {invitations.map((item) => {
          const cfg = statusConfig[item.status] ?? statusConfig.pending;
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.85}
              onPress={() =>
                router.push(`/undangan/undangan-detail?id=${item.id}`)
              }
              style={[stylesIndex.card]}
            >
              {/* Judul */}
              <ThemedText
                style={[
                  Fonts.paragraphMediumLarge,
                  { marginBottom: 8, color: Colors.navy },
                ]}
              >
                {item.title}
              </ThemedText>

              {/* Hari/Tanggal */}
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, Fonts.paragraphRegularSmall]}>
                  Hari, Tanggal :
                </Text>
                <Text style={[styles.infoValue, Fonts.paragraphRegularSmall]}>
                  {item.date || "-"}
                </Text>
              </View>

              {/* Waktu (sebelahan) */}
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, Fonts.paragraphRegularSmall]}>
                  Waktu :
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <Text
                    style={[
                      { color: Colors.textSecondary },
                      Fonts.paragraphRegularSmall,
                    ]}
                  >
                    {item.waktu_mulai || "Mulai"}
                  </Text>
                  <Text
                    style={[
                      { color: Colors.textSecondary },
                      Fonts.paragraphRegularSmall,
                      { marginHorizontal: 4 },
                    ]}
                  >
                    -
                  </Text>
                  <Text
                    style={[
                      { color: Colors.textSecondary },
                      Fonts.paragraphRegularSmall,
                    ]}
                  >
                    {item.waktu_selesai || "Selesai"}
                  </Text>
                </View>
              </View>

              {/* Tempat */}
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, Fonts.paragraphRegularSmall]}>
                  Tempat :
                </Text>
                <Text style={[styles.infoValue, Fonts.paragraphRegularSmall]}>
                  {item.tempat || "-"}
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

              {/* Soft highlight bar sesuai status */}
              <View style={[styles.softBg, { backgroundColor: cfg.soft }]} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

export default UndanganScreen;

/* ============ Local styles (layout kecil saja, font pakai Fonts) ============ */
const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F8FA",
  },
  loadingText: {
    marginTop: 8,
    color: "#475569",
  },
  filterBtn: { padding: 8, marginLeft: 8 },

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
  },
  resetBtn: {
    paddingVertical: 10,
    borderRadius: 20,
    width: "45%",
  },
  applyBtn: {
    paddingVertical: 10,
    borderRadius: 20,
    width: "45%",
  },
  filterBtnText: {
    color: "white",
    textAlign: "center",
  },
});
