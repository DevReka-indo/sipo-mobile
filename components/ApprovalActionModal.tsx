import { FontAwesome6 } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

export type ApprovalStatus = "approve" | "reject" | "correction";

type StatusConfig = {
  label: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
};

type Props = {
  visible: boolean;
  title: string;
  subtitle: string;
  selectedStatus: ApprovalStatus | null;
  catatan: string;
  isNoteRequired: boolean;
  isSaveDisabled: boolean;
  submitting: boolean;
  C: any;
  onClose: () => void;
  onSelectStatus: (status: ApprovalStatus) => void;
  onChangeCatatan: (text: string) => void;
  onSubmit: () => void;
};

export default function ApprovalActionModal({
  visible,
  title,
  subtitle,
  selectedStatus,
  catatan,
  isNoteRequired,
  isSaveDisabled,
  submitting,
  C,
  onClose,
  onSelectStatus,
  onChangeCatatan,
  onSubmit,
}: Props) {
  const STATUS_CONFIG: Record<ApprovalStatus, StatusConfig> = {
    approve: {
      label: "Setujui",
      icon: "check",
      color: C.green ?? C.accent,
      bg: C.greenBg ?? C.accentBg,
      border: C.greenBd ?? C.accentBorder,
    },
    reject: {
      label: "Tolak",
      icon: "xmark",
      color: C.red ?? C.danger ?? "#EF4444",
      bg: C.redBg ?? "rgba(239,68,68,0.08)",
      border: C.redBd ?? "rgba(239,68,68,0.22)",
    },
    correction: {
      label: "Koreksi",
      icon: "pen",
      color: C.amber ?? "#D97706",
      bg: C.amberBg ?? "rgba(245,158,11,0.10)",
      border: C.amberBd ?? "rgba(245,158,11,0.24)",
    },
  };

  const shouldShowNote = selectedStatus !== "approve";

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      statusBarTranslucent={false}
      navigationBarTranslucent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[s.safe, { backgroundColor: C.bg ?? C.surface }]}>
        <View style={[s.container, { backgroundColor: C.bg ?? C.surface }]}>
          {/* ── Header ── */}
          <View
            style={[
              s.header,
              {
                backgroundColor: C.bg ?? C.surface,
                borderBottomColor: C.border,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                s.iconBtn,
                {
                  backgroundColor: C.surface,
                  borderColor: C.borderStrong,
                },
              ]}
              onPress={onClose}
              activeOpacity={0.75}
            >
              <FontAwesome6
                name="arrow-left"
                size={13}
                color={C.textSecondary}
              />
            </TouchableOpacity>

            <View style={s.headerText}>
              <Text style={[s.title, { color: C.textPrimary }]}>{title}</Text>
              <Text style={[s.subtitle, { color: C.textTertiary }]}>
                {subtitle}
              </Text>
            </View>

            <View
              style={[
                s.headerIcon,
                {
                  backgroundColor: C.accentBg,
                  borderColor: C.accentBorder,
                },
              ]}
            >
              <FontAwesome6 name="shield-halved" size={14} color={C.accent} />
            </View>
          </View>

          {/* ── Scrollable Content ── */}
          <KeyboardAwareScrollView
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            enableOnAndroid={true}
            enableAutomaticScroll={true}
            extraScrollHeight={20}
            extraHeight={120}
          >
            {/* Card: Status Keputusan */}
            <View
              style={[
                s.card,
                {
                  backgroundColor: C.surface,
                  borderColor: C.borderStrong,
                },
              ]}
            >
              <Text style={[s.sectionTitle, { color: C.textPrimary }]}>
                Status Keputusan
              </Text>
              <Text style={[s.sectionSub, { color: C.textTertiary }]}>
                Pilih salah satu keputusan untuk dokumen ini.
              </Text>

              <View style={s.statusGrid}>
                {(["approve", "reject", "correction"] as ApprovalStatus[]).map(
                  (value) => {
                    const cfg = STATUS_CONFIG[value];
                    const active = selectedStatus === value;

                    return (
                      <TouchableOpacity
                        key={value}
                        activeOpacity={0.82}
                        onPress={() => onSelectStatus(value)}
                        style={[
                          s.statusOption,
                          {
                            backgroundColor: active ? cfg.bg : C.surface2,
                            borderColor: active ? cfg.border : C.borderStrong,
                          },
                        ]}
                      >
                        <View
                          style={[
                            s.statusIcon,
                            {
                              backgroundColor: active ? cfg.bg : C.accentBg,
                              borderColor: active ? cfg.border : C.accentBorder,
                            },
                          ]}
                        >
                          <FontAwesome6
                            name={cfg.icon as any}
                            size={12}
                            color={active ? cfg.color : C.textTertiary}
                          />
                        </View>

                        <Text
                          style={[
                            s.statusOptionText,
                            {
                              color: active ? cfg.color : C.textSecondary,
                            },
                          ]}
                        >
                          {cfg.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  },
                )}
              </View>
            </View>

            {/* Card: Catatan */}
            {shouldShowNote && (
              <View
                style={[
                  s.card,
                  {
                    backgroundColor: C.surface,
                    borderColor: C.borderStrong,
                  },
                ]}
              >
                <View style={s.noteHeader}>
                  <View>
                    <Text style={[s.sectionTitle, { color: C.textPrimary }]}>
                      Catatan
                      {isNoteRequired ? (
                        <Text style={{ color: C.danger ?? "#EF4444" }}> *</Text>
                      ) : null}
                    </Text>

                    <Text style={[s.sectionSub, { color: C.textTertiary }]}>
                      {isNoteRequired
                        ? "Catatan wajib diisi untuk keputusan ini."
                        : "Catatan opsional untuk menambahkan keterangan."}
                    </Text>
                  </View>
                </View>

                <TextInput
                  placeholder={
                    isNoteRequired
                      ? "Tulis alasan atau catatan persetujuan..."
                      : "Tulis catatan tambahan, opsional..."
                  }
                  placeholderTextColor={C.textTertiary}
                  value={catatan}
                  onChangeText={onChangeCatatan}
                  multiline
                  textAlignVertical="top"
                  style={[
                    s.noteInput,
                    {
                      backgroundColor: C.surface2,
                      borderColor: C.borderStrong,
                      color: C.textPrimary,
                    },
                  ]}
                />
              </View>
            )}
          </KeyboardAwareScrollView>

          {/* ── Footer ── */}
          <View
            style={[
              s.footer,
              {
                backgroundColor: C.bg ?? C.surface,
                borderTopColor: C.border,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                s.cancelBtn,
                {
                  backgroundColor: C.surface,
                  borderColor: C.borderStrong,
                },
              ]}
              onPress={onClose}
              activeOpacity={0.75}
            >
              <Text style={[s.cancelText, { color: C.textSecondary }]}>
                Batal
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                s.saveBtn,
                {
                  backgroundColor: C.accent,
                  opacity: isSaveDisabled || submitting ? 0.45 : 1,
                },
              ]}
              disabled={isSaveDisabled || submitting}
              onPress={onSubmit}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={s.saveText}>Simpan</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    minHeight: 66,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.35,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 120,
    gap: 14,
  },
  card: {
    borderRadius: 20,
    borderWidth: 0.5,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: -0.25,
  },
  sectionSub: {
    fontSize: 11.5,
    fontWeight: "600",
    lineHeight: 17,
    marginTop: 3,
  },
  statusGrid: {
    gap: 10,
    marginTop: 14,
  },
  statusOption: {
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
  },
  statusOptionText: {
    fontSize: 13,
    fontWeight: "900",
  },
  noteHeader: {
    marginBottom: 12,
  },
  noteInput: {
    minHeight: 140,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 18,
    borderTopWidth: 0.5,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 18,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 13,
    fontWeight: "800",
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
});
