import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert, // ✅ ADD
  Animated, // ✅ ADD
  Easing,
  Linking,
  Modal,
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

export default function AssignedServices() {
  const [services, setServices] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  const [showApproveModal, setShowApproveModal] = useState(false);

  /* ================= LOAD SERVICES ================= */
  const loadServices = async () => {
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email;

    const { data: bookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("assigned_staff_email", email)
      .neq("work_status", "COMPLETED");

    setServices(bookings || []);
  };

  /* FIRST LOAD */
  useEffect(() => {
    loadServices();
  }, []);

  /* RELOAD ON FOCUS */
  useFocusEffect(
    useCallback(() => {
      loadServices();
    }, []),
  );

  useEffect(() => {
    if (showRejectModal || showApproveModal) {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [showRejectModal, showApproveModal]);
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

  const updateResponse = async (
    id: string,
    status: "APPROVED" | "REJECTED",
  ) => {
    const { error } = await supabase
      .from("bookings")
      .update({ staff_response: status })
      .eq("id", id);

    if (error) {
      Alert.alert("Error", "Failed to update status");
    } else {
      if (status === "REJECTED") {
        // 🔥 remove card immediately
        setServices((prev) => prev.filter((item) => item.id !== id));
      } else {
        loadServices(); // refresh for approve
      }
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
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

      {/* ================= BODY ================= */}
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {services.length === 0 ? (
          <Text style={styles.emptyText}>No Assigned Services</Text>
        ) : (
          services.map((item) => {
            const isActive =
              item.work_started_at &&
              (!item.work_ended_at || item.work_ended_at === null);

            return (
              <View
                key={item.id}
                style={[
                  styles.card,
                  isActive && styles.activeHighlight,
                  item.staff_response === "APPROVED" && {
                    borderColor: "green",
                  },
                  item.staff_response === "REJECTED" && { borderColor: "red" },
                ]}
              >
                {/* 🔥 HEADER ROW */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={styles.cardTitle}>{item.customer_name}</Text>

                  {isActive && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>ACTIVE</Text>
                    </View>
                  )}
                </View>

                {/* 🔥 RUNNING STATUS */}
                {isActive && (
                  <Text style={styles.runningText}>⏱ Work in progress</Text>
                )}

                <Text>
                  <Text style={styles.label}>Phone:</Text>{" "}
                  {item.phone_number || "N/A"}
                </Text>

                <Text>
                  <Text style={styles.label}>Date:</Text> {item.booking_date}
                </Text>

                <Text>
                  <Text style={styles.label}>Time:</Text> {item.booking_time}
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
                        Duration: {s.duration}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* LOCATION BUTTON */}
                <TouchableOpacity
                  style={styles.mapBtn}
                  onPress={() => openMaps(item.latitude, item.longitude)}
                >
                  <Text style={styles.mapBtnText}>Location</Text>
                </TouchableOpacity>

                {/* 🔥 OPEN / RESUME BUTTON */}
                <TouchableOpacity
                  style={styles.openServiceBtn}
                  onPress={() =>
                    router.push({
                      pathname: "/assigned-service-details",
                      params: { booking: JSON.stringify(item) },
                    })
                  }
                >
                  <Text style={styles.openServiceText}>
                    {isActive ? "Resume Work" : "Open Service"}
                  </Text>
                </TouchableOpacity>

                <View style={styles.actionRow}>
                  {item.staff_response === "APPROVED" ? (
                    // ✅ FULL WIDTH APPROVED BUTTON
                    <View style={styles.fullApprove}>
                      <Text style={styles.fullApproveText}>✔ Approved</Text>
                    </View>
                  ) : (
                    <>
                      {/* APPROVE */}
                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={() => {
                          setSelectedId(item.id);
                          setShowApproveModal(true);
                        }}
                      >
                        <Text style={styles.btnText}>Approve</Text>
                      </TouchableOpacity>

                      {/* REJECT */}
                      <TouchableOpacity
                        style={styles.rejectBtn}
                        onPress={() => {
                          setSelectedId(item.id);
                          setShowRejectModal(true);
                        }}
                      >
                        <Text style={styles.btnText}>Reject</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal transparent visible={showRejectModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[styles.modalBox, { transform: [{ scale: scaleAnim }] }]}
          >
            <Text style={styles.modalTitle}>Reject Service?</Text>
            <Text style={styles.modalText}>
              Are you sure you want to reject this service?
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowRejectModal(false)}
              >
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmRejectBtn}
                onPress={() => {
                  if (selectedId) {
                    updateResponse(selectedId, "REJECTED");
                  }
                  setShowRejectModal(false);
                }}
              >
                <Text style={styles.btnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <Modal transparent visible={showApproveModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[styles.modalBox, { transform: [{ scale: scaleAnim }] }]}
          >
            <Text style={styles.modalTitle}>Approve Service?</Text>
            <Text style={styles.modalText}>
              Do you want to accept this service?
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowApproveModal(false)}
              >
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmRejectBtn, { backgroundColor: "green" }]}
                onPress={() => {
                  if (selectedId) {
                    updateResponse(selectedId, "APPROVED");
                  }
                  setShowApproveModal(false);
                }}
              >
                <Text style={styles.btnText}>Approve</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

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
    height: 72,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  logo: {
    width: 190,
    height: 64,
  },

  body: {
    padding: 20,
    paddingBottom: 90,
  },

  card: {
    borderWidth: 2,
    borderColor: "#000",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    backgroundColor: "#FAFAFA",
  },

  /* 🔥 ACTIVE CARD HIGHLIGHT */
  activeHighlight: {
    borderColor: "#FFD700",
    backgroundColor: "#fffbea",
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },

  activeBadge: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  activeBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
  },

  runningText: {
    fontWeight: "700",
    marginBottom: 6,
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

  openServiceBtn: {
    marginTop: 8,
    backgroundColor: "#FFD700",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },

  openServiceText: {
    color: "#080700",
    fontWeight: "bold",
  },

  emptyText: {
    textAlign: "center",
    fontSize: 16,
    marginTop: 40,
    color: "#666",
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

  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },

  approveBtn: {
    flex: 1,
    backgroundColor: "#d1fae5",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginRight: 5,
  },

  rejectBtn: {
    flex: 1,
    backgroundColor: "#fee2e2",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginLeft: 5,
  },

  selectedApprove: {
    backgroundColor: "#22c55e",
  },

  selectedReject: {
    backgroundColor: "#ef4444",
  },

  btnText: {
    fontWeight: "bold",
    color: "#000",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalBox: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 14,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },

  modalText: {
    fontSize: 14,
    color: "#444",
    marginBottom: 20,
  },

  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  cancelBtn: {
    flex: 1,
    padding: 10,
    marginRight: 5,
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
    alignItems: "center",
  },

  confirmRejectBtn: {
    flex: 1,
    padding: 10,
    marginLeft: 5,
    backgroundColor: "#ef4444",
    borderRadius: 8,
    alignItems: "center",
  },

  fullApprove: {
    flex: 1,
    backgroundColor: "#22c55e",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  fullApproveText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
