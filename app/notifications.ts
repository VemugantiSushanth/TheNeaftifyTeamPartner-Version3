import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";

/**
 * 🔥 HANDLER (FOR FOREGROUND NOTIFICATIONS)
 */
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
 * 🔥 REGISTER DEVICE FOR PUSH NOTIFICATIONS
 */
export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    alert("Must use physical device for Push Notifications");
    return;
  }

  // 🔹 Get permission
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    alert("Permission not granted!");
    return;
  }

  // 🔹 Get projectId (IMPORTANT for APK/EAS)
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;

  // 🔹 Get Expo push token
  const token = (
    await Notifications.getExpoPushTokenAsync({
      projectId,
    })
  ).data;

  console.log("✅ EXPO TOKEN:", token);

  // 🔹 Android setup
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  return token;
}

/**
 * 🔥 LISTENER (RECEIVE + CLICK)
 */
export const useNotificationListener = (onClick?: () => void) => {
  useEffect(() => {
    // 🔔 When notification received (foreground)
    const notificationSub =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("🔔 Notification Received:", notification);
      });

    // 👉 When notification clicked
    const responseSub =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("👉 Notification Clicked:", response);

        if (onClick) {
          onClick(); // 🔥 Navigate or handle action
        }
      });

    return () => {
      notificationSub.remove();
      responseSub.remove();
    };
  }, []);
};