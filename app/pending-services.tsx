import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
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

export default function PendingServices() {
  const [services, setServices] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0)).current;

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const rejectReasons = [
    "Location too far",
    "Time Not Available",
    "Personal Emergency",
    "Customer not reachable",
    "Out of scope (Commercial / PG / Hostels / High-usage / Unmanaged Locations)",
  ];
  /* ================= LOAD ONLY PENDING ================= */
  const loadServices = async () => {
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email;

    const { data: bookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("assigned_staff_email", email)
      .or("staff_response.is.null,staff_response.eq.pending");

    setServices(bookings || []);
  };

  useFocusEffect(
    useCallback(() => {
      loadServices();
    }, []),
  );

  useEffect(() => {
    if (showRejectModal || showApproveModal || showSuccessModal) {
      scaleAnim.setValue(0); // 🔥 reset before animation

      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [showRejectModal, showApproveModal, showSuccessModal]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadServices();
    setRefreshing(false);
  }, []);

  /* ================= MAP ================= */
  const openMaps = (lat: number, lng: number) => {
    if (!lat || !lng) {
      Alert.alert("Location coordinates not available");
      return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url);
  };

  /* ================= UPDATE ================= */
  const updateResponse = async (
    id: string,
    status: "APPROVED" | "REJECTED",
    reason?: string,
  ) => {
    let updateData: any = { staff_response: status };

    if (status === "APPROVED") {
      updateData.work_status = "ASSIGNED";
    }

    if (status === "REJECTED") {
      updateData.reject_reason = reason;
    }

    const { error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", id);

    if (error) {
      Alert.alert("Error", "Failed to update");
    } else {
      // ✅ UPDATE LOCALLY INSTEAD OF RELOAD
      setServices((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, ...updateData } : item,
        ),
      );

      if (status === "APPROVED") {
        setShowSuccessModal(true); // 👈 show popup
      }
    }
  };
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar backgroundColor="#FFD700" barStyle="dark-content" />

      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/my-role")}>
          <Image
            source={require("../assets/images/logo.png")}
            style={styles.logo}
            contentFit="contain"
          />
        </TouchableOpacity>

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
          <Text style={styles.emptyText}>No Pending Services</Text>
        ) : (
          services.map((item) => (
            <View key={item.id} style={styles.card}>
              {/* HEADER */}
              <View style={styles.topRow}>
                <Text style={styles.cardTitle}>{item.customer_name}</Text>

                <Text style={styles.pendingBadge}>PENDING</Text>
              </View>

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

              {/* SERVICES */}
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

              {/* MAP */}
              <TouchableOpacity
                style={styles.mapBtn}
                onPress={() => openMaps(item.latitude, item.longitude)}
              >
                <Text style={styles.mapBtnText}>Location</Text>
              </TouchableOpacity>

              {/* ACTION BUTTONS */}
              <View style={styles.actionRow}>
                {item.staff_response === "APPROVED" ? (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.approveBtn,
                        { backgroundColor: "#bbf7d0" },
                      ]}
                      disabled
                    >
                      <Text style={styles.btnText}>Approved</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.viewBtn}
                      onPress={() => router.push("/assigned-services")}
                    >
                      <Text style={styles.btnText}>View Service</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => {
                        setSelectedId(item.id);
                        setShowApproveModal(true);
                      }}
                    >
                      <Text style={styles.btnText}>Approve</Text>
                    </TouchableOpacity>

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
          ))
        )}
      </ScrollView>

      {/* APPROVE MODAL */}
      <Modal transparent visible={showApproveModal}>
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
                style={[styles.confirmBtn, { backgroundColor: "green" }]}
                onPress={() => {
                  if (selectedId) {
                    updateResponse(selectedId, "APPROVED");
                  }

                  setShowApproveModal(false); // close confirm modal
                }}
              >
                <Text style={styles.btnText}>Approve</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* REJECT MODAL */}
      <Modal transparent visible={showRejectModal}>
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[styles.modalBox, { transform: [{ scale: scaleAnim }] }]}
          >
            <Text style={styles.modalTitle}>Select Reason</Text>

            {rejectReasons.map((reason, index) => (
              <TouchableOpacity
                key={index}
                style={styles.reasonRow}
                onPress={() => setSelectedReason(reason)}
              >
                <View style={styles.radioOuter}>
                  {selectedReason === reason && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={styles.reasonText}>{reason}</Text>
              </TouchableOpacity>
            ))}

            <View style={[styles.modalActions, { marginTop: 20 }]}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowRejectModal(false);
                  setSelectedReason(null);
                }}
              >
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => {
                  if (!selectedReason) {
                    Alert.alert("Please select a reason");
                    return;
                  }

                  if (selectedId)
                    updateResponse(selectedId, "REJECTED", selectedReason);

                  setShowRejectModal(false);
                  setSelectedReason(null);
                }}
              >
                <Text style={styles.btnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
      <Modal transparent visible={showSuccessModal}>
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[styles.modalBox, { transform: [{ scale: scaleAnim }] }]}
          >
            <Text style={styles.modalTitle}>Service Approved ✅</Text>

            <Text style={styles.modalText}>
              Do you want to view this service?
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowSuccessModal(false)}
              >
                <Text style={styles.btnText}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: "green" }]}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.push("/assigned-services");
                }}
              >
                <Text style={styles.btnText}>View Service</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  header: {
    height: 72,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: { width: 190, height: 64 },

  body: { padding: 20, paddingBottom: 90 },

  card: {
    borderWidth: 2,
    borderColor: "#facc15",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    backgroundColor: "#fffbea",
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  pendingBadge: {
    color: "#facc15",
    fontWeight: "800",
  },

  cardTitle: { fontSize: 16, fontWeight: "800" },

  label: { fontWeight: "700" },

  section: { marginVertical: 10 },

  serviceItem: { marginLeft: 10, marginTop: 6 },

  serviceName: { fontWeight: "700" },

  serviceMeta: { marginLeft: 10, color: "#555", fontSize: 13 },

  mapBtn: {
    marginTop: 14,
    backgroundColor: "#FFD700",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },

  mapBtnText: { fontWeight: "700" },

  actionRow: {
    flexDirection: "row",
    marginTop: 10,
  },

  approveBtn: {
    flex: 1,
    backgroundColor: "#d1fae5",
    padding: 10,
    borderRadius: 8,
    marginRight: 5,
    alignItems: "center",
  },

  rejectBtn: {
    flex: 1,
    backgroundColor: "#fee2e2",
    padding: 10,
    borderRadius: 8,
    marginLeft: 5,
    alignItems: "center",
  },

  btnText: { fontWeight: "bold" },

  emptyText: {
    textAlign: "center",
    marginTop: 40,
    color: "#666",
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

  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },

  modalText: { marginBottom: 20 },

  modalActions: { flexDirection: "row" },

  cancelBtn: {
    flex: 1,
    padding: 10,
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
    marginRight: 5,
    alignItems: "center",
  },

  confirmBtn: {
    flex: 1,
    padding: 10,
    backgroundColor: "#ef4444",
    borderRadius: 8,
    marginLeft: 5,
    alignItems: "center",
  },

  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },

  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ef4444",
  },

  reasonText: {
    flex: 1,
    fontSize: 14,
  },

  viewBtn: {
    flex: 1,
    backgroundColor: "#dbeafe",
    padding: 10,
    borderRadius: 8,
    marginLeft: 5,
    alignItems: "center",
  },
});
