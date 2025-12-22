// components/BottomNav.tsx
import { apiFetch } from "@/utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, usePathname, useRouter, type Href } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  ImageSourcePropType,
  Platform,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const COLORS = {
  bg: "#fff",
  border: "#eee",
  activeText: "#1E4178",
  inactiveText: "#808080",
  activeBg: "rgba(30, 65, 120, 0.12)",
};

type NavItem = {
  key: "home" | "notification" | "signature" | "profile";
  label: string;
  href: Href;
  img: { active: ImageSourcePropType; inactive: ImageSourcePropType };
};

const ITEMS: NavItem[] = [
  {
    key: "home",
    label: "Beranda",
    href: "/beranda/beranda",
    img: {
      active: require("../assets/icons/home/home_active.png"),
      inactive: require("../assets/icons/home/home_disabled.png"),
    },
  },
  {
    key: "notification",
    label: "Notifikasi",
    href: "/notifikasi/notifikasi",
    img: {
      active: require("../assets/icons/notification/notification_active.png"),
      inactive: require("../assets/icons/notification/notification_disabled.png"),
    },
  },
  {
    key: "signature",
    label: "Approval",
    href: "/approval/approval",
    img: {
      active: require("../assets/icons/signature/signature_active.png"),
      inactive: require("../assets/icons/signature/signature_disabled.png"),
    },
  },
  {
    key: "profile",
    label: "Profil",
    href: "/profil/profil",
    img: {
      active: require("../assets/icons/profile/profile_active.png"),
      inactive: require("../assets/icons/profile/profile_disabled.png"),
    },
  },
];

function NavButton({
  item,
  isActive,
  onPress,
  available, // ✅ Terima sebagai prop
}: {
  item: NavItem;
  isActive: boolean;
  onPress: () => void;
  available: boolean; // ✅ Tambahkan type
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    // animasi bounce 1x
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(pulseAnim, {
        toValue: 1,
        friction: 4,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();

    // navigasi
    onPress();
  };

  return (
    <TouchableWithoutFeedback onPress={handlePress}>
      <Animated.View
        style={[
          styles.item,
          isActive && { backgroundColor: COLORS.activeBg },
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <View style={{ position: "relative" }}>
          <Image
            source={isActive ? item.img.active : item.img.inactive}
            style={styles.icon}
          />
          {item.key === "notification" && available && (
            <View style={styles.redDot} />
          )}
        </View>
        <Text
          style={[
            styles.label,
            { color: isActive ? COLORS.activeText : COLORS.inactiveText },
          ]}
        >
          {item.label}
        </Text>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [available, setAvailable] = useState<boolean>(false); // ✅ Pindahkan ke sini!

  useEffect(() => {
    (async () => {
      try {
        const r = await AsyncStorage.getItem("role");
        setRole(r);
      } catch {
        // ignore
      }
    })();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      const fetchStatus = async () => {
        try {
          const r = await AsyncStorage.getItem("role");
          if (isActive) setRole(r);

          const res = await apiFetch("/notifikasi/status");
          if (res) {
            const status = res.status; // true / false
            if (isActive) setAvailable(status);
          }
        } catch (e) {
          console.warn("Notification status fetch error:", e);
        }
      };

      fetchStatus();

      // Optional: poll every 5s
      const interval = setInterval(fetchStatus, 5000);

      return () => {
        isActive = false;
        clearInterval(interval);
      };
    }, [])
  );

  return (
    <SafeAreaView edges={["bottom"]} style={{ backgroundColor: COLORS.bg }}>
      <View style={styles.container}>
        {ITEMS.map((item) => {
          // hide approval jika bukan role 3
          // if (item.key === "signature" && role !== "3") return null;

          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <NavButton
              key={item.key}
              item={item}
              isActive={isActive}
              onPress={() => router.navigate(item.href)}
              available={available} // ✅ Pass sebagai prop
            />
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.bg,
    paddingTop: 8,
    paddingBottom: Platform.OS === "android" ? 12 : 8,
  },
  item: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  icon: {
    width: 28,
    height: 28,
    marginBottom: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
  },
  redDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "red",
    borderWidth: 1,
    borderColor: "#fff", // gives a white outline for contrast
  },
});
