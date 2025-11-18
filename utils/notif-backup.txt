import Constants from "expo-constants";
import * as Device from "expo-device";
import { Alert, Platform } from "react-native";

let Notifications: any;

try {
  // Aman untuk dev build / release
  Notifications = require("expo-notifications");

  // 🔹 Cegah error jika handler tidak tersedia (misal di Expo Go)
  if (Notifications.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
} catch (error) {
  // Mock supaya tidak error di Expo Go
  console.warn("⚠️ expo-notifications tidak aktif di Expo Go:", error);
  Notifications = {
    getPermissionsAsync: async () => ({ status: "undetermined" }),
    requestPermissionsAsync: async () => ({ status: "granted" }),
    getExpoPushTokenAsync: async () => ({ data: "ExpoGoMockToken" }),
    setNotificationChannelAsync: async () => {},
    addNotificationReceivedListener: () => ({ remove: () => {} }),
    addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
  };
}

/**
 * Register perangkat untuk menerima notifikasi
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      Alert.alert("Notifikasi hanya berfungsi di perangkat fisik.");
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      Alert.alert("Izin notifikasi tidak diberikan!");
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId ??
      "5f4848f3-6bce-4af5-b269-f0021407c68b"; // fallback ID kamu

    if (!projectId) {
      console.error("❌ Project ID tidak ditemukan di app.json → extra.eas.projectId");
      return null;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log("✅ Expo Push Token:", token);

    if (Platform.OS === "android" && Notifications.setNotificationChannelAsync) {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance?.MAX ?? 4,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#0B3B82",
      });
    }

    return token;
  } catch (error) {
    console.error("❌ Error register push:", error);
    return null;
  }
}

/**
 * Listener untuk menangani event notifikasi
 */
export function setupNotificationListeners() {
  const receivedListener = Notifications.addNotificationReceivedListener(
    (notification: any) => {
      console.log("📩 Notifikasi diterima:", notification);
    }
  );

  const responseListener = Notifications.addNotificationResponseReceivedListener(
    (response: any) => {
      console.log("👉 User menekan notifikasi:", response);
    }
  );

  return () => {
    receivedListener.remove?.();
    responseListener.remove?.();
  };
}
