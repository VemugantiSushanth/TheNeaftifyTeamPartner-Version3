import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export async function registerForPushNotificationsAsync() {
  // ✅ Step 1: Check device
  if (!Device.isDevice) {
    console.log("Must use physical device");
    return;
  }

  // ✅ Step 2: Ask permission
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") {
    console.log("Notification permission not granted");
    return;
  }

  // ✅ Step 3: Get token
  const token = (await Notifications.getExpoPushTokenAsync()).data;

  // ✅ Step 4: Android channel (ADD HERE)
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  return token;
}
