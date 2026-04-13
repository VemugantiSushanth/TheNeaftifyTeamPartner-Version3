import { Stack, usePathname } from "expo-router";
import { SafeAreaView, View } from "react-native";
import Footer from "../components/Footer";

export default function Layout() {
  const pathname = usePathname(); // 👈 get current route

  const hideFooter = pathname === "/login"; // 👈 condition

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* SCREENS */}
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            animation: "slide_from_right",
            gestureEnabled: true,
            gestureDirection: "horizontal",
            animationDuration: 250,
            headerShown: false,
          }}
        />
      </View>

      {/* FOOTER (HIDE ON LOGIN) */}
      {!hideFooter && <Footer />}
    </SafeAreaView>
  );
}
