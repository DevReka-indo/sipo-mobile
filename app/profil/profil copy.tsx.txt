// app/profil/profil.tsx
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { apiFetch } from "@/utils/api";
import { FontAwesome6 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, Text, View } from "react-native";

import Button from "@/components/button";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfilScreen() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? "1.0.0";

  const handleLogout = async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
    router.replace("/login");
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const data = await apiFetch(`/profile`);
        setUser(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: Colors.white,
        }}
      >
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text
          style={[
            Fonts.paragraphMediumLarge,
            { marginTop: 12, color: Colors.textSecondary },
          ]}
        >
          Memuat profil...
        </Text>
      </SafeAreaView>
    );
  }

  if (!user) return null;

  return (
    <SafeAreaView 
      style={{ flex: 1, backgroundColor: "#E8F1FF" }}
      edges={['top', 'left', 'right']}
    >
      {/* 🔥 STATUS BAR opsi : (dark, light, auto) - Ubah jadi dark (text hitam) untuk background cerah */}
      <StatusBar style="dark" />

      {/* BODY SCROLL */}
      <ScrollView
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: 120,
        }}
        style={{ backgroundColor: "#E8F1FF" }}
      >
        {/* FOTO PROFIL */}
        <View
          style={{
            alignItems: "center",
            marginTop: 20,
            marginBottom: 10,
          }}
        >
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
              backgroundColor: Colors.navy,
            }}
          >
            {user.profile_image ? (
              <Image
                source={{ uri: user.profile_image }}
                style={{ width: 100, height: 100 }}
              />
            ) : (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <FontAwesome6 name="user" size={56} color={Colors.white} />
              </View>
            )}
          </View>
          <Text
            style={[
              Fonts.paragraphMediumLarge,
              { marginTop: 12, color: Colors.textPrimary },
            ]}
          >
            {user.fullname}
          </Text>
        </View>

        {/* CARD 1 */}
        <View
          style={{
            marginTop: 14,
            marginHorizontal: 20,
            padding: 16,
            backgroundColor: Colors.white,
            borderRadius: 12,
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Text
            style={[
              Fonts.paragraphMediumLarge,
              { color: Colors.textPrimary, marginBottom: 12 },
            ]}
          >
            Data Pribadi
          </Text>

          <Row label="Nama Lengkap" value={user.fullname} />
          <Row label="Email" value={user.email} />
          <Row label="Nomor Telepon" value={user.phone_number} />
        </View>

        {/* CARD 2 */}
        <View
          style={{
            marginTop: 14,
            marginHorizontal: 20,
            padding: 16,
            backgroundColor: Colors.white,
            borderRadius: 12,
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Text
            style={[
              Fonts.paragraphMediumLarge,
              { color: Colors.textPrimary, marginBottom: 12 },
            ]}
          >
            Informasi Kepegawaian
          </Text>

          <Row label="Nomor Induk Pegawai" value={user.nip} />
          <Row label="Posisi" value={user.position || "-"} />
          <Row label="Direktorat" value={user.direktorat || "-"} />
          <Row label="Struktur Organisasi" value={user.organisasi || "-"} />
        </View>

        {/* LOGOUT */}
        <View style={{ marginTop: 20, paddingHorizontal: 20 }}>
          <Button title="Logout" onPress={handleLogout} color={Colors.danger} />
        </View>

        {/* VERSION */}
        <Text
          style={{
            textAlign: "center",
            marginTop: 8,
            color: Colors.textSecondary,
            marginBottom: 20,
          }}
        >
          Versi {version}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const Row = ({ label, value }) => (
  <View style={{ marginBottom: 10 }}>
    <Text style={[Fonts.paragraphMediumSmall, { color: Colors.textSecondary }]}>
      {label}
    </Text>
    <Text
      style={{
        color: Colors.textPrimary,
        fontSize: 15,
        marginTop: 2,
        fontWeight: "500",
      }}
    >
      {value || "-"}
    </Text>
  </View>
);