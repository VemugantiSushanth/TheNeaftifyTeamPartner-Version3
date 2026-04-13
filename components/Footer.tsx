import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Footer() {
  const pathname = usePathname();

  return (
    <View style={styles.footer}>
      {/* HOME */}
      <TouchableOpacity
        style={styles.footerItem}
        onPress={() => router.push("/my-role")}
      >
        <Ionicons
          name={pathname === "/my-role" ? "home" : "home-outline"}
          size={22}
          color="#000"
        />
        <Text
          style={
            pathname === "/my-role"
              ? styles.footerTextActive
              : styles.footerText
          }
        >
          Home
        </Text>
      </TouchableOpacity>

      {/* DASHBOARD */}
      <TouchableOpacity
        style={styles.footerItem}
        onPress={() => router.push("/dashboard")}
      >
        <Ionicons
          name={pathname === "/dashboard" ? "calendar" : "calendar-outline"}
          size={22}
          color="#000"
        />
        <Text
          style={
            pathname === "/dashboard"
              ? styles.footerTextActive
              : styles.footerText
          }
        >
          Dashboard
        </Text>
      </TouchableOpacity>

      {/* PROFILE */}
      <TouchableOpacity
        style={styles.footerItem}
        onPress={() => router.push("/my-account")}
      >
        <Ionicons
          name={pathname === "/my-account" ? "person" : "person-outline"}
          size={22}
          color="#000"
        />
        <Text
          style={
            pathname === "/my-account"
              ? styles.footerTextActive
              : styles.footerText
          }
        >
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderColor: "#ddd",
    zIndex: 999, // 🔥 ADD THIS
    elevation: 10, // 🔥 AND THIS (Android fix)
  },

  footerItem: {
    alignItems: "center",
  },

  footerText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },

  footerTextActive: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "800",
  },
});
