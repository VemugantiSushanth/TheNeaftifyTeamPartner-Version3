import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Image } from "expo-image";
import { router, usePathname } from "expo-router"; // ✅ added usePathname
import { useEffect, useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const pathname = usePathname();

  const [data, setData] = useState<any[]>([]);
  const [filterDate, setFilterDate] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "date" | "name">("recent");
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadCompleted();
  }, []);

  useEffect(() => {
    loadCompleted(filterDate || undefined);
  }, [sortBy]);

  /* ================= LOAD COMPLETED ================= */
  const loadCompleted = async (date?: string) => {
    const { data: user } = await supabase.auth.getUser();
    const email = user.user?.email;

    let query = supabase
      .from("bookings")
      .select("customer_name,email,services,work_ended_at,worked_duration")
      .eq("assigned_staff_email", email)
      .eq("work_status", "COMPLETED");
    if (sortBy === "recent") {
      query = query.order("work_ended_at", { ascending: false });
    } else if (sortBy === "date") {
      query = query.order("work_ended_at", { ascending: true });
    } else if (sortBy === "name") {
      query = query.order("customer_name", { ascending: true });
    }

    if (date) {
      query = query
        .gte("work_ended_at", `${date}T00:00:00`)
        .lte("work_ended_at", `${date}T23:59:59`);
    }

    const { data } = await query;
    setData(data || []);
  };

  /* ================= FORMAT DATE ================= */
  const formatDateTime = (value: string) => {
    const d = new Date(value);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
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

      {/* ================= TOTAL COUNT ================= */}
      <View style={styles.countBox}>
        <Text style={styles.countText}>
          Total Completed: <Text style={styles.countNumber}>{data.length}</Text>
        </Text>
      </View>

      {/* ================= FILTER ================= */}
      <View style={styles.filterRow}>
        <View style={styles.filterBox}>
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            onPress={() => setShowCalendar(true)}
          >
            <Ionicons
              name="calendar-outline"
              size={20}
              color="#000"
              style={{ marginRight: 8 }}
            />

            <TextInput
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#000"
              value={filterDate}
              keyboardType="number-pad"
              maxLength={10}
              onChangeText={(v) => {
                const digits = v.replace(/[^0-9]/g, "");

                let formatted = digits;

                if (digits.length > 4) {
                  formatted = digits.slice(0, 4) + "-" + digits.slice(4);
                }
                if (digits.length > 6) {
                  formatted =
                    digits.slice(0, 4) +
                    "-" +
                    digits.slice(4, 6) +
                    "-" +
                    digits.slice(6, 8);
                }

                setFilterDate(formatted);

                if (formatted.length === 10) loadCompleted(formatted);
                if (formatted.length === 0) loadCompleted();
              }}
              style={styles.filterInput}
            />
          </TouchableOpacity>
        </View>

        <View style={{ marginLeft: 10 }}>
          <TouchableOpacity
            style={styles.sortBtn}
            onPress={() => setShowSortOptions(!showSortOptions)}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.sortText}>
                {sortBy === "recent"
                  ? "Recent"
                  : sortBy === "date"
                    ? "Oldest"
                    : "Name"}
              </Text>
              <Ionicons
                name={showSortOptions ? "chevron-up" : "chevron-down"}
                size={18}
                color="#000"
                style={{ marginLeft: 5 }}
              />
            </View>
          </TouchableOpacity>

          {showSortOptions && (
            <View style={styles.dropdown}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setSortBy("recent");
                  setShowSortOptions(false);
                }}
              >
                <Text>Recent</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setSortBy("date");
                  setShowSortOptions(false);
                }}
              >
                <Text>Oldest</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setSortBy("name");
                  setShowSortOptions(false);
                }}
              >
                <Text>Name</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {showCalendar && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowCalendar(false);
            if (selectedDate) {
              const year = selectedDate.getFullYear();
              const month = String(selectedDate.getMonth() + 1).padStart(
                2,
                "0",
              );
              const day = String(selectedDate.getDate()).padStart(2, "0");

              const formatted = `${year}-${month}-${day}`;
              setFilterDate(formatted);
              loadCompleted(formatted);
            }
          }}
        />
      )}

      {/* ================= BODY ================= */}
      <ScrollView contentContainerStyle={styles.body}>
        {data.length === 0 && (
          <Text style={styles.empty}>No completed services</Text>
        )}

        {data.map((item, i) => (
          <View key={i} style={styles.card}>
            {/* TOP ROW */}
            <View style={styles.cardTop}>
              <Text style={styles.name}>{item.customer_name}</Text>

              <Text style={styles.completedBadge}>COMPLETED</Text>
            </View>

            {/* BUTTON */}
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => {
                setSelectedItem(item);
                setShowModal(true);
              }}
            >
              <Text style={styles.viewText}>View Details</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {showModal && selectedItem && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Service Details</Text>

            <Text style={styles.modalText}>
              Name: {selectedItem.customer_name}
            </Text>

            <Text style={styles.modalText}>Email: {selectedItem.email}</Text>

            <Text style={styles.modalText}>Services:</Text>

            {selectedItem.services?.map((s: any, i: number) => (
              <View key={i} style={{ marginLeft: 10, marginTop: 5 }}>
                <Text>• {s.title}</Text>
                <Text style={{ color: "#252424" }}>Duration: {s.duration}</Text>
              </View>
            ))}

            <Text style={styles.modalText}>
              Completed: {formatDateTime(selectedItem.work_ended_at)}
            </Text>

            {selectedItem.worked_duration && (
              <Text style={styles.modalText}>
                Worked Time: {selectedItem.worked_duration}
              </Text>
            )}

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowModal(false)}
            >
              <Text style={{ color: "#000000", fontWeight: "700" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ================= UPDATED FOOTER ONLY ================= */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => router.replace("/my-role")}
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
          onPress={() => router.replace("/dashboard")}
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
          onPress={() => router.replace("/my-account")}
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

  countBox: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#cad84b",
  },

  countText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#065f46",
  },

  countNumber: {
    fontSize: 18,
    fontWeight: "800",
  },

  filterBox: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  filterInput: {
    flex: 1,
  },

  body: {
    padding: 20,
    paddingBottom: 20,
  },

  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#666",
    fontWeight: "600",
  },

  card: {
    borderWidth: 1.5,
    borderColor: "#b5ca42",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    backgroundColor: "#fff", // ✅ makes it cleaner
  },

  name: {
    fontWeight: "800",
    fontSize: 15,
  },

  email: {
    color: "#555",
  },

  date: {
    marginTop: 4,
    fontSize: 12,
    color: "#374151",
  },

  completed: {
    color: "#16a34a",
    fontWeight: "800",
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

  footerTextActive: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "800",
    color: "#000",
  },

  worked: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "#16a34a",
  },

  dropdown: {
    position: "absolute",
    top: 55,
    right: 0,
    width: 120,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    elevation: 5,
    zIndex: 999,
  },

  dropdownItem: {
    padding: 10,
    borderBottomWidth: 0.5,
    borderColor: "#eee",
  },

  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 10,
    zIndex: 1000,
  },

  sortBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 12,
    borderColor: "#000",
    marginLeft: 10,
  },

  sortText: {
    fontWeight: "700",
  },

  completedBtn: {
    marginTop: 10,
    backgroundColor: "#dcfce7",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignSelf: "flex-start",
  },

  completedText: {
    color: "#16a34a",
    fontWeight: "800",
  },

  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
  },

  modalBox: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },

  modalText: {
    marginBottom: 6,
    color: "#333",
  },

  closeBtn: {
    marginTop: 15,
    backgroundColor: "#FFD700",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },

  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  completedBadge: {
    color: "#16a34a",
    fontWeight: "800",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
  },

  viewBtn: {
    marginTop: 12,
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 15,
    alignSelf: "center",

    borderWidth: 1.5, // ✅ add border
    borderColor: "#000", // ✅ match your theme color
  },

  viewText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 13,
  },
});
