import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Alert, Platform } from "react-native";

// Setup notification handler (SDK 54 requires all properties)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register perangkat untuk menerima notifikasi (SDK 54+)
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    console.log("=== 🔔 NOTIFICATION DEBUG START (SDK 54) ===");
    console.log("SDK Version:", Constants.expoConfig?.sdkVersion);
    console.log("App Version:", Constants.expoConfig?.version);
    
    console.log("Device Info:", {
      isDevice: Device.isDevice,
      brand: Device.brand,
      modelName: Device.modelName,
      osName: Device.osName,
      osVersion: Device.osVersion,
    });
    
    // Debug: Check all possible Constants properties
    console.log("Constants structure:", {
      hasExpoConfig: !!Constants.expoConfig,
      hasExtra: !!Constants.expoConfig?.extra,
      hasEas: !!Constants.expoConfig?.extra?.eas,
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });
    
    if (!Device.isDevice) {
      console.error("⚠️ Not a physical device");
      Alert.alert("Error", "Notifikasi hanya berfungsi di perangkat fisik.");
      return null;
    }
    console.log("✅ Physical device detected");

    // IMPORTANT: Setup Android channel BEFORE requesting permissions
    if (Platform.OS === "android") {
      console.log("📱 Setting up Android notification channel...");
      try {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default Notifications",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#0B3B82",
          sound: "default",
          enableVibrate: true,
          showBadge: true,
        });
        console.log("✅ Android channel created");
      } catch (channelError: any) {
        console.error("❌ Channel creation error:", channelError.message);
        // Continue even if channel creation fails
      }
    }

    // Check and request permissions
    console.log("🔐 Checking permissions...");
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log("Existing permission status:", existingStatus);
    
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      console.log("📝 Requesting permission...");
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log("New permission status:", finalStatus);
    }

    if (finalStatus !== "granted") {
      console.error("❌ Permission denied by user");
      Alert.alert("Izin Ditolak", "Izin notifikasi diperlukan untuk menerima pemberitahuan.");
      return null;
    }
    console.log("✅ Permission granted");

    // SDK 54: Get projectId from Constants.expoConfig
    // This is the ONLY reliable way in SDK 54+
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    console.log("📦 Project ID from expoConfig:", projectId);

    if (!projectId) {
      console.error("❌ Project ID not found in Constants.expoConfig.extra.eas.projectId");
      console.error("Make sure app.json has:");
      console.error(JSON.stringify({
        extra: {
          eas: {
            projectId: "your-project-id"
          }
        }
      }, null, 2));
      
      Alert.alert(
        "Configuration Error",
        "Project ID not found. Please check app.json configuration."
      );
      return null;
    }

    // SDK 54: getExpoPushTokenAsync now requires valid projectId
    console.log("🎫 Attempting to get Expo Push Token...");
    console.log("🎫 Using projectId:", projectId);
    
    try {
      const tokenResponse = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });
      
      const token = tokenResponse.data;
      console.log("✅ SUCCESS! Expo Push Token received");
      console.log("Token (first 20 chars):", token.substring(0, 20) + "...");
      console.log("=== 🔔 NOTIFICATION DEBUG END ===");
      
      return token;
    } catch (tokenError: any) {
      console.error("❌ Token generation failed:");
      console.error("Error name:", tokenError.name);
      console.error("Error message:", tokenError.message);
      console.error("Error code:", tokenError.code);
      
      // Common SDK 54 errors
      if (tokenError.code === "E_PROJECT_NOT_FOUND") {
        console.error("→ Project ID is invalid or not found in Expo servers");
        Alert.alert(
          "Invalid Project ID",
          "The project ID is not recognized. Please check your Expo configuration."
        );
      } else if (tokenError.code === "E_NETWORK_ERROR") {
        console.error("→ Network error - check internet connection");
        Alert.alert("Network Error", "Please check your internet connection.");
      }
      
      throw tokenError;
    }
  } catch (error: any) {
    console.error("=== ❌ NOTIFICATION REGISTRATION FAILED ===");
    console.error("Error type:", typeof error);
    console.error("Error name:", error?.name);
    console.error("Error message:", error?.message);
    console.error("Error code:", error?.code);
    console.error("Error stack:", error?.stack);
    
    if (error?.toString) {
      console.error("Error toString:", error.toString());
    }
    
    try {
      console.error("Full error JSON:", JSON.stringify(error, null, 2));
    } catch (e) {
      console.error("Could not stringify error");
    }
    
    console.error("=== ❌ ERROR END ===");
    
    if (__DEV__) {
      Alert.alert(
        "Notification Registration Failed",
        `${error?.message || "Unknown error"}\n\nCheck console for details.`
      );
    }
    
    return null;
  }
}

/**
 * Setup notification listeners
 */
export function setupNotificationListeners() {
  console.log("🔔 Setting up notification listeners...");
  
  const receivedListener = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log("📩 Notification received:", {
        title: notification.request.content.title,
        body: notification.request.content.body,
        data: notification.request.content.data,
      });
    }
  );

  const responseListener = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      console.log("👉 User tapped notification:", {
        actionIdentifier: response.actionIdentifier,
        data: response.notification.request.content.data,
      });
    }
  );

  console.log("✅ Notification listeners active");

  return () => {
    console.log("🔕 Removing notification listeners...");
    receivedListener.remove();
    responseListener.remove();
  };
}

/**
 * Test function to verify notification setup
 */
export async function testNotificationSetup() {
  console.log("🧪 Testing notification setup...");
  
  const hasDevice = Device.isDevice;
  const permissions = await Notifications.getPermissionsAsync();
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  
  const results = {
    isPhysicalDevice: hasDevice,
    hasPermission: permissions.status === "granted",
    hasProjectId: !!projectId,
    projectId: projectId,
    platform: Platform.OS,
    sdkVersion: Constants.expoConfig?.sdkVersion,
  };
  
  console.log("📊 Notification Setup Results:", results);
  
  return results;
}