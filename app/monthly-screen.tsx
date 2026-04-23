import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import dayjs from "dayjs";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

type Booking = {
  customer_name: string;
  staff_earned_amount: number;
  completed_at: string;
};

const MonthlyScreen = () => {
  const router = useRouter();

  const currentYear = dayjs().year();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("MM"));

  const [earnings, setEarnings] = useState(0);
  const [data, setData] = useState<Booking[]>([]);

  const months = [
    { label: "Jan", value: "01" },
    { label: "Feb", value: "02" },
    { label: "Mar", value: "03" },
    { label: "Apr", value: "04" },
    { label: "May", value: "05" },
    { label: "Jun", value: "06" },
    { label: "Jul", value: "07" },
    { label: "Aug", value: "08" },
    { label: "Sep", value: "09" },
    { label: "Oct", value: "10" },
    { label: "Nov", value: "11" },
    { label: "Dec", value: "12" },
  ];

  const selectedYearMonth = `${selectedYear}-${selectedMonth}`;
  const fetchMonthlyData = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const email = userData?.user?.email;

    if (!email) return;

    const { data: profile } = await supabase
      .from("staff_profile")
      .select("monthly_earnings_json")
      .eq("email", email)
      .single();

    const monthlyJSON = profile?.monthly_earnings_json || {};
    const { data: bookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("assigned_staff_email", email)
      .eq("work_status", "COMPLETED");
    const filtered =
      bookings?.filter(
        (item: any) =>
          dayjs(item.completed_at).format("YYYY-MM") === selectedYearMonth,
      ) || [];

    setData(filtered);

    const total = filtered.reduce(
      (sum: number, item: any) => sum + Number(item.staff_earned_amount || 0),
      0,
    );

    setEarnings(total);
  };

  useEffect(() => {
    fetchMonthlyData();
  }, [selectedMonth, selectedYear]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <StatusBar style="dark" />

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
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <Text style={{ marginBottom: 6, fontWeight: "600" }}>
            Select Year
          </Text>
          <View style={styles.dropdownContainer}>
            <Picker
              selectedValue={selectedYear}
              onValueChange={(itemValue) => setSelectedYear(itemValue)}
              style={[styles.picker, { color: "#000" }]} // ✅ FIX
            >
              {Array.from({ length: 10 }, (_, i) => {
                const year = currentYear - i;
                return (
                  <Picker.Item
                    key={year}
                    label={`${year}`}
                    value={year}
                    color="#000" // ✅ ADD THIS
                  />
                );
              })}
            </Picker>
          </View>
          {/* 🔥 Month Selector */}
          <View style={styles.monthGrid}>
            {months.map((m) => (
              <TouchableOpacity
                key={m.value}
                onPress={() => setSelectedMonth(m.value)}
                style={[
                  styles.monthBox,
                  selectedMonth === m.value && styles.monthBoxActive,
                ]}
              >
                <Text style={styles.monthText}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 🔥 Earnings */}
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              marginTop: 20,
            }}
          >
            Earnings: ₹{earnings}
          </Text>

          {/* 🔥 Cards */}
          {data.length === 0 ? (
            <Text style={{ marginTop: 20, color: "gray" }}>
              No services for this month
            </Text>
          ) : (
            data.map((item, i) => (
              <View key={i} style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.customerName}>{item.customer_name}</Text>

                  <Text style={styles.amount}>₹{item.staff_earned_amount}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

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
  yearContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },

  yearBox: {
    padding: 10,
    marginRight: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
  },

  yearBoxActive: {
    backgroundColor: "#FFD700",
  },

  yearText: {
    fontWeight: "600",
  },

  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  monthBox: {
    width: "30%",
    margin: "1.5%",
    padding: 12,
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    alignItems: "center",
  },

  monthBoxActive: {
    backgroundColor: "#FFD700",
  },

  monthText: {
    fontWeight: "600",
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    marginBottom: 16,
    overflow: "hidden",
  },

  picker: {
    height: 50,
  },

  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    marginTop: 12,

    borderWidth: 1.5,
    borderColor: "#FFE066", // 🔥 light yellow

    elevation: 2, // subtle shadow
  },

  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  customerName: {
    fontWeight: "700",
    fontSize: 15,
    flex: 1, // prevents overflow
  },

  amount: {
    fontWeight: "800",
    fontSize: 16,
    color: "#16a34a",
  },
});
export default MonthlyScreen;
