import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useFocusEffect, usePathname } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  Dimensions,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

const { height, width } = Dimensions.get("window");
const SLIDER_HEIGHT = height * 0.42;

export default function MyRoleScreen() {
  const pathname = usePathname();

  const [newCount, setNewCount] = useState(0);
  const [assignedCount, setAssignedCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [activeSlide, setActiveSlide] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [slides, setSlides] = useState<string[]>([]);
  const [isAvailable, setIsAvailable] = useState(false);

  const sliderRef = useRef<FlatList>(null);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ================= BACK HANDLER (FIXED) ================= */
  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        if (router.canGoBack()) {
          router.back();
          return true;
        }
        return false; // allow Android default behavior
      };

      const sub = BackHandler.addEventListener("hardwareBackPress", backAction);

      return () => sub.remove();
    }, []),
  );

  /* ================= FETCH SLIDES ================= */
  const fetchSlides = async () => {
    const { data, error } = await supabase
      .from("hero_images")
      .select("image_path")
      .eq("is_active", true) // ✅ only active images
      .order("priority", { ascending: true }); // ✅ order by priority

    if (error) {
      console.log("Error fetching slides:", error);
      return;
    }

    if (data) {
      const imageUrls = data.map((item) => {
        const { data: publicUrlData } = supabase.storage
          .from("hero-images-staff")
          .getPublicUrl(item.image_path);

        return publicUrlData.publicUrl;
      });

      setSlides(imageUrls);
    }
  };
  /* ================= FETCH COUNTS ================= */
  const fetchCounts = async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;

    const email = user.email;

    const { count: notif } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("assigned_staff_email", email)
      .eq("is_viewed", false);

    const { count: assigned } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("assigned_staff_email", email)
      .neq("work_status", "COMPLETED");

    const { count: completed } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("assigned_staff_email", email)
      .eq("work_status", "COMPLETED");

    const assignedValue = assigned || 0;

    setNewCount(notif || 0);
    setAssignedCount(assignedValue);
    setCompletedCount(completed || 0);

    // 🔥 NEW PART: Sync with staff_profile table
    await supabase
      .from("staff_profile")
      .update({ assigned_count: assignedValue })
      .eq("id", user.id);
  };

  /* ================= FETCH AVAILABILITY ================= */
  const fetchAvailability = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data } = await supabase
      .from("staff_profile")
      .select("is_available")
      .eq("id", userData.user.id)
      .single();

    setIsAvailable(data?.is_available ?? false);
  };

  useEffect(() => {
    fetchSlides();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCounts();
      fetchAvailability();
    }, []),
  );

  /* ================= AUTO SCROLL ================= */
  useEffect(() => {
    if (slides.length === 0) return;

    autoScrollRef.current = setInterval(() => {
      const next = (activeSlide + 1) % slides.length;
      sliderRef.current?.scrollToIndex({ index: next, animated: true });
      setActiveSlide(next);
    }, 3000);

    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    };
  }, [activeSlide, slides.length]);

  /* ================= UPDATE AVAILABILITY ================= */
  const handleToggleAvailability = async (value: boolean) => {
    setIsAvailable(value);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    await supabase
      .from("staff_profile")
      .update({ is_available: value })
      .eq("id", userData.user.id);
  };

  const handleLogout = () => {
    Alert.alert("Confirm Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/login");
        },
      },
    ]);
  };

  const handleCustomerCare = () => {
    Alert.alert("Customer Care", "+91 7617618567", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Call",
        onPress: () => Linking.openURL("tel:+917617618567"),
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* HEADER */}
      <View style={styles.header}>
        <Image
          source={require("../assets/images/logo.png")}
          style={styles.logo}
          contentFit="contain"
        />

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.bellIcon}
            onPress={() => router.push("/new-services")}
          >
            <Ionicons name="notifications" size={26} color="#000" />
            {newCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{newCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowMenu(true)}>
            <Ionicons name="person-circle-outline" size={34} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* DROPDOWN */}
      {showMenu && (
        <Pressable style={styles.overlay} onPress={() => setShowMenu(false)} />
      )}

      {showMenu && (
        <View style={styles.menu}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              router.push("/my-account");
            }}
          >
            <Text style={styles.menuText}>My Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              handleLogout();
            }}
          >
            <Text style={[styles.menuText, { color: "red" }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={[{ key: "main" }]}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchCounts} />
        }
        renderItem={() => (
          <View style={styles.container}>
            <StatusBar backgroundColor="#FFD700" barStyle="dark-content" />

            {/* SLIDER */}
            <View style={styles.sliderWrapper}>
              <FlatList
                ref={sliderRef}
                data={slides}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, i) => i.toString()}
                onMomentumScrollEnd={(e) =>
                  setActiveSlide(
                    Math.round(e.nativeEvent.contentOffset.x / width),
                  )
                }
                renderItem={({ item }) => (
                  <Image
                    source={{ uri: item }}
                    style={styles.slideImage}
                    contentFit="cover"
                    cachePolicy="disk" // 🔥 Enables disk caching
                    transition={300} // Smooth fade effect
                  />
                )}
              />

              <View style={styles.dots}>
                {slides.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, activeSlide === i && styles.activeDot]}
                  />
                ))}
              </View>
            </View>

            {/*   TOGGLE */}
            <View style={styles.availabilityWrapper}>
              <Text style={styles.availabilityText}>Available for Work</Text>
              <Switch
                value={isAvailable}
                onValueChange={handleToggleAvailability}
                trackColor={{ false: "#ede4e4", true: "#0fd357" }}
              />
            </View>

            {/* ACTION BUTTONS */}
            <View style={styles.actionWrapper}>
              {/* Calendar FIRST */}
              <TouchableOpacity
                style={[styles.primaryBtn, styles.actionBtnRow]}
                onPress={() => router.push("./availability-calendar")}
              >
                <Ionicons name="calendar-outline" size={18} color="#000" />
                <Text style={styles.primaryBtnText}>
                  My Availability Calendar
                </Text>
              </TouchableOpacity>

              {/* Assigned Services SECOND */}
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.push("/assigned-services")}
              >
                <Text style={styles.primaryBtnText}>My Assigned Services</Text>
              </TouchableOpacity>
            </View>

            {/* SUMMARY */}
            <View style={styles.summaryRow}>
              {/* ASSIGNED */}
              <TouchableOpacity
                style={[styles.summaryBox, styles.assignedBox]}
                onPress={() => router.push("/assigned-services")}
              >
                <Text style={styles.summaryTitle}>Assigned</Text>
                <Text style={[styles.summaryCount, { color: "#f97316" }]}>
                  {assignedCount}
                </Text>
              </TouchableOpacity>

              {/* COMPLETED */}
              <TouchableOpacity
                style={[styles.summaryBox, styles.completedBox]}
                onPress={() => router.push("/dashboard")}
              >
                <Text style={styles.summaryTitle}>Completed</Text>
                <Text style={[styles.summaryCount, { color: "#16a34a" }]}>
                  {completedCount}
                </Text>
              </TouchableOpacity>
            </View>

            {/* CUSTOMER CARE */}
            <View style={styles.customerCareWrapper}>
              <TouchableOpacity
                style={styles.customerCareBtn}
                onPress={handleCustomerCare}
              >
                <Ionicons name="headset-outline" size={18} color="#000" />
                <Text style={styles.customerCareText}>Customer Care</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* FOOTER (FIXED) */}
      <View style={styles.footer}>
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
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    height: 72,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 14 },
  logo: { width: 190, height: 64 },
  bellIcon: { position: "relative" },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    backgroundColor: "#000",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#FFD700", fontWeight: "800", fontSize: 12 },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },

  menu: {
    position: "absolute",
    top: 72,
    right: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 6,
    width: 150,
    zIndex: 20,
  },

  menuItem: { padding: 14 },

  menuText: { fontSize: 15, fontWeight: "600" },

  sliderWrapper: {
    height: SLIDER_HEIGHT,
    margin: 16,
    borderRadius: 18,
    overflow: "hidden",
  },
  slideImage: { width: width - 32, height: SLIDER_HEIGHT },

  summaryRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    gap: 10,
    marginTop: 10,
  },
  summaryBox: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10, // 🔽 reduced
    paddingHorizontal: 8,
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
  },
  assignedBox: { borderColor: "#f97316" },
  completedBox: { borderColor: "#16a34a" },
  summaryTitle: { fontWeight: "600", marginBottom: 6, fontSize: 13 },
  summaryCount: { fontSize: 18, fontWeight: "800" },

  availabilityWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    padding: 5,
    borderRadius: 14,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#dae90b",
  },

  availabilityText: { fontSize: 16, fontWeight: "700" },

  customerCareWrapper: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
  },

  customerCareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center", // center it nicely
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#000",
    backgroundColor: "#fff",
  },

  customerCareText: { fontSize: 14, fontWeight: "800" },

  fixedButtonWrapper: {
    paddingHorizontal: 40,
    paddingBottom: 10,
    backgroundColor: "#fff",
  },
  primaryBtn: {
    backgroundColor: "#FFD700",
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: "center",
  },
  primaryBtnText: { fontWeight: "800", fontSize: 16 },

  footer: {
    height: 70,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  footerItem: { alignItems: "center" },
  footerText: { fontSize: 12, marginTop: 4, fontWeight: "600" },
  footerTextActive: { fontSize: 12, marginTop: 4, fontWeight: "800" },

  dots: {
    position: "absolute",
    bottom: 10,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
  },

  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#ccc",
    marginHorizontal: 4,
  },

  actionWrapper: {
    marginHorizontal: 16,
    marginTop: 12,
    gap: 10,
  },

  actionBtnRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  activeDot: {
    backgroundColor: "#000",
  },
});
