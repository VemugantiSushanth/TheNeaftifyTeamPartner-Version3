import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

export default function NewServices() {
  const [services, setServices] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  /* ================= LOAD NEW SERVICES ================= */
  const loadServices = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email;
    if (!email) return;

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("assigned_staff_email", email)
      .eq("is_viewed", false)
      .order("created_at", { ascending: false });

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    setServices(bookings || []);
  };

  useEffect(() => {
    loadServices();
  }, []);

  /* ================= MARK AS VIEWED ON EXIT ================= */
  useEffect(() => {
    return () => {
      if (services.length === 0) return;

      const markAsViewed = async () => {
        const ids = services.map((item) => item.id);
        await supabase
          .from("bookings")
          .update({ is_viewed: true })
          .in("id", ids);
      };

      markAsViewed();
    };
  }, [services]);

  /* ================= PULL TO REFRESH ================= */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadServices();
    setRefreshing(false);
  }, []);

  /* ================= GOOGLE MAPS ================= */
  const openMaps = (lat: number, lng: number) => {
    if (!lat || !lng) {
      Alert.alert("Location coordinates not available");
      return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar backgroundColor="#FFD700" barStyle="dark-content" />

      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <Image
          source={require("../assets/images/logo.png")}
          style={styles.logo}
          contentFit="contain"
        />

        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* ================= CONTENT ================= */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 110 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {services.length === 0 ? (
          <Text style={styles.emptyText}>No New Services Assigned</Text>
        ) : (
          services.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardTitle}>{item.customer_name}</Text>

              <Text>
                <Text style={styles.label}>Email:</Text> {item.email}
              </Text>

              <Text>
                <Text style={styles.label}>Phone:</Text> {item.phone_number}
              </Text>

              <Text>
                <Text style={styles.label}>Address:</Text> {item.full_address}
              </Text>

              <View style={styles.section}>
                <Text style={styles.label}>Services:</Text>
                {item.services?.map((s: any, i: number) => (
                  <View key={i} style={styles.serviceItem}>
                    <Text style={styles.serviceName}>• {s.title}</Text>
                    <Text style={styles.serviceMeta}>
                      Date: {item.booking_date}
                    </Text>
                    <Text style={styles.serviceMeta}>
                      Duration: {s.duration}
                    </Text>
                  </View>
                ))}
              </View>

              <Text>
                <Text style={styles.label}>Time:</Text> {item.booking_time}
              </Text>

              <TouchableOpacity
                style={styles.mapBtn}
                onPress={() => openMaps(item.latitude, item.longitude)}
              >
                <Text style={styles.mapBtnText}>Location</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* ================= FOOTER ================= */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => router.replace("/my-role")}
        >
          <Ionicons name="home-outline" size={22} color="#000000" />
          <Text style={styles.footerText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => router.push("/dashboard")}
        >
          <Ionicons name="calendar-outline" size={22} color="#000" />
          <Text style={styles.footerText}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => router.push("/my-account")}
        >
          <Ionicons name="person-outline" size={22} color="#000" />
          <Text style={styles.footerText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  header: {
    height: 70,
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  logo: {
    width: 190,
    height: 64,
  },

  emptyText: {
    textAlign: "center",
    fontSize: 16,
    marginTop: 40,
    color: "#666",
  },

  card: {
    borderWidth: 2,
    borderColor: "#000",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    backgroundColor: "#FAFAFA",
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },

  label: { fontWeight: "700" },

  section: { marginVertical: 10 },

  serviceItem: { marginLeft: 10, marginTop: 6 },

  serviceName: { fontWeight: "700" },

  serviceMeta: {
    marginLeft: 10,
    color: "#555",
    fontSize: 13,
  },

  mapBtn: {
    marginTop: 14,
    backgroundColor: "#FFD700",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },

  mapBtnText: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 14,
  },

  footer: {
    height: 70,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },

  footerItem: {
    alignItems: "center",
    justifyContent: "center",
  },

  footerText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
    color: "#000",
  },
});
