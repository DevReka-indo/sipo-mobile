import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { apiFetch } from "@/utils/api";
import { formatTanggalID } from "@/utils/date";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ItemType = "memo" | "undangan" | "risalah";

interface ApprovalItem {
  id: number | string;
  type: ItemType;
  title: string;
  date: string | Date;
  isEmpty?: boolean;
}

interface ApprovalResponse {
  memo?: {
    id?: number;
    judul?: string;
    updated_at?: string;
  };
  undangan?: {
    id?: number;
    judul?: string;
    updated_at?: string;
  };
  risalah?: {
    id?: number;
    judul?: string;
    updated_at?: string;
  };
}

export default function ApprovalIndex() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadApprovals = useCallback(async () => {
    try {
      setError(null);
      const response = await apiFetch("/approval");
      const data: ApprovalResponse = response?.data || {};

      const approvalItems: ApprovalItem[] = [];

      // Process Memo
      if (data.memo && data.memo.judul) {
        approvalItems.push({
          id: data.memo.id || `memo-${Date.now()}`,
          type: "memo",
          title: data.memo.judul,
          date: data.memo.updated_at || new Date(),
          isEmpty: false,
        });
      }

      // Process Undangan
      if (data.undangan && data.undangan.judul) {
        approvalItems.push({
          id: data.undangan.id || `undangan-${Date.now()}`,
          type: "undangan",
          title: data.undangan.judul,
          date: data.undangan.updated_at || new Date(),
          isEmpty: false,
        });
      }

      // Process Risalah
      if (data.risalah && data.risalah.judul) {
        approvalItems.push({
          id: data.risalah.id || `risalah-${Date.now()}`,
          type: "risalah",
          title: data.risalah.judul,
          date: data.risalah.updated_at || new Date(),
          isEmpty: false,
        });
      }

      setItems(approvalItems);
    } catch (err: any) {
      console.error("Error loading approvals:", err);
      setError(err?.message || "Gagal memuat data approval");
      Alert.alert(
        "Error",
        "Gagal memuat data approval. Silakan coba lagi.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadApprovals();
  }, [loadApprovals]);

  const handleNavigate = (type: ItemType) => {
    const routes = {
      memo: "/memo/memos",
      undangan: "/undangan/undangan",
      risalah: "/risalah/risalah",
    };

    router.push({
      pathname: routes[type] as any,
      params: { approval: "1" },
    });
  };

  // Loading State
  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={["top"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#F7F8FA" />
        <ActivityIndicator size="large" color={Colors.navy} />
        <Text style={[Fonts.paragraphMediumSmall, styles.loadingText]}>
          Memuat data approval...
        </Text>
      </SafeAreaView>
    );
  }

  // Empty State
  const isEmpty = items.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      
      {/* Header - Di luar ScrollView agar selalu di atas */}
      <View style={styles.header}>
        <Text style={[Fonts.header1, styles.headerTitle]}>Approval</Text>
        <Text style={[Fonts.paragraphRegularSmall, styles.headerSubtitle]}>
          Daftar dokumen menunggu persetujuan
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isEmpty && styles.scrollContentCentered,
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
        {/* Empty State */}
        {isEmpty ? (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyIconWrapper}>
              <Image
                source={require("@/assets/icons/signature/signature_fill_yellow.png")}
                style={styles.emptyIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={[Fonts.header6, styles.emptyTitle]}>
              Belum Ada Approval
            </Text>
            <Text style={[Fonts.paragraphRegularSmall, styles.emptyMessage]}>
              Saat ini tidak ada dokumen yang{"\n"}menunggu persetujuan Anda
            </Text>
          </View>
        ) : (
          /* Approval List */
          <View style={styles.listContainer}>
            {items.map((item) => (
              <ApprovalCard
                key={item.id}
                item={item}
                onPress={() => handleNavigate(item.type)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ========== Approval Card Component ========== */
interface ApprovalCardProps {
  item: ApprovalItem;
  onPress: () => void;
}

function ApprovalCard({ item, onPress }: ApprovalCardProps) {
  const { type, title, date } = item;

  return (
    <TouchableOpacity
      style={[styles.card, getCardBackground(type)]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={[styles.iconBox, getIconBackground(type)]}>
        <Image
          source={getIconSource(type)}
          style={styles.iconImage}
          resizeMode="contain"
        />
      </View>

      <View style={styles.cardContent}>
        <Text style={[Fonts.paragraphMediumLarge, styles.cardTitle]}>
          Persetujuan {capitalizeFirst(type)}
        </Text>

        <Text style={[Fonts.paragraphMediumSmall, styles.cardLabel]}>
          {getTypeLabel(type)}{" "}
          <Text style={[Fonts.paragraphRegularSmall, styles.cardValue]}>
            {title}
          </Text>
        </Text>

        <Text style={[Fonts.paragraphMediumSmall, styles.cardLabel]}>
          Hari, Tanggal:{" "}
          <Text style={[Fonts.paragraphRegularSmall, styles.cardValue]}>
            {formatTanggalID(date)}
          </Text>
        </Text>
      </View>

      <View style={styles.chevronWrapper}>
        <Text style={[Fonts.header3, styles.chevron]}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

/* ========== Helper Functions ========== */
function getCardBackground(type: ItemType) {
  const backgrounds = {
    memo: { backgroundColor: Colors.memo_card_bg },
    undangan: { backgroundColor: Colors.undangan_card_bg },
    risalah: { backgroundColor: Colors.risalah_card_bg },
  };
  return backgrounds[type];
}

function getIconBackground(type: ItemType) {
  const backgrounds = {
    memo: { backgroundColor: Colors.memo_card_bg_icon },
    undangan: { backgroundColor: Colors.undangan_card_bg_icon },
    risalah: { backgroundColor: Colors.risalah_card_bg_icon },
  };
  return backgrounds[type];
}

function getIconSource(type: ItemType) {
  const icons = {
    memo: require("@/assets/icons/memo/memo_blue.png"),
    undangan: require("@/assets/icons/undangan/undangan_purple.png"),
    risalah: require("@/assets/icons/risalah/risalah_green.png"),
  };
  return icons[type];
}

function getTypeLabel(type: ItemType) {
  const labels = {
    memo: "Memo Terbaru:",
    undangan: "Undangan Terbaru:",
    risalah: "Risalah Terbaru:",
  };
  return labels[type];
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ========== Styles ========== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F8FA",
  },
  loadingText: {
    marginTop: 12,
    color: Colors.textSecondary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  scrollContentCentered: {
    flexGrow: 1,
    justifyContent: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 0,
    backgroundColor: Colors.white,
  },
  headerTitle: {
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    color: Colors.textSecondary,
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
    backgroundColor: "#FFF9E6",
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

  // List
  listContainer: {
    gap: 14,
  },

  // Card
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  iconImage: {
    width: 32,
    height: 32,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  cardLabel: {
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  cardValue: {
    color: Colors.textSecondary,
  },
  chevronWrapper: {
    marginLeft: 8,
    justifyContent: "center",
  },
  chevron: {
    color: Colors.textPrimary,
  },
});