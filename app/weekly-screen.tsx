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

const WeeklyScreen = () => {
  const router = useRouter();

  const getCurrentWeek = () => {
    const day = dayjs().date();

    if (day <= 7) return 1;
    if (day <= 14) return 2;
    if (day <= 21) return 3;
    return 4;
  };

  const currentYear = dayjs().year();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("MM"));
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());

  const [earnings, setEarnings] = useState(0);
  const [data, setData] = useState<Booking[]>([]);

  const selectedYearWeek = `${selectedYear}-W${String(selectedWeek).padStart(2, "0")}`;

  const getWeekRange = (year: number, month: string, week: number) => {
    const startDay = (week - 1) * 7 + 1;
    const endDay = week === 4 ? 31 : week * 7;

    const start = dayjs(`${year}-${month}-${startDay}`).startOf("day");
    const end = dayjs(`${year}-${month}-${endDay}`).endOf("day");

    return { start, end };
  };

  const fetchWeeklyData = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const email = userData?.user?.email;

    if (!email) return;

    const { start, end } = getWeekRange(
      selectedYear,
      selectedMonth,
      selectedWeek,
    );

    const { data: bookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("assigned_staff_email", email)
      .eq("work_status", "COMPLETED");

    const filtered =
      bookings?.filter((item: any) => {
        const date = dayjs(item.completed_at);
        return (
          date.isSame(start) ||
          date.isSame(end) ||
          (date.isAfter(start) && date.isBefore(end))
        );
      }) || [];

    setData(filtered);

    const total = filtered.reduce(
      (sum: number, item: any) => sum + Number(item.staff_earned_amount || 0),
      0,
    );

    setEarnings(total);
  };

  useEffect(() => {
    fetchWeeklyData();
  }, [selectedWeek, selectedMonth, selectedYear]);

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
          {/* YEAR SELECT */}
          <Text style={{ marginBottom: 6, fontWeight: "600" }}>
            Select Year
          </Text>
          <View style={styles.dropdownContainer}>
            <Picker
              selectedValue={selectedYear}
              onValueChange={(itemValue) => setSelectedYear(itemValue)}
              style={styles.picker}
            >
              {Array.from({ length: 10 }, (_, i) => {
                const year = currentYear - i;
                return (
                  <Picker.Item key={year} label={`${year}`} value={year} />
                );
              })}
            </Picker>
          </View>

          {/* MONTH SELECT */}

          <Text style={{ marginBottom: 6, fontWeight: "600" }}>
            Select Month
          </Text>

          <View style={styles.dropdownContainer}>
            <Picker
              selectedValue={selectedMonth}
              onValueChange={(itemValue) => setSelectedMonth(itemValue)}
              style={styles.picker}
            >
              {[
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
              ].map((m) => (
                <Picker.Item key={m.value} label={m.label} value={m.value} />
              ))}
            </Picker>
          </View>

          {/* WEEK SELECT */}
          <Text style={{ marginBottom: 6, fontWeight: "600" }}>
            Select Week
          </Text>

          <View style={styles.dropdownContainer}>
            <Picker
              selectedValue={selectedWeek}
              onValueChange={(itemValue) => setSelectedWeek(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="Week 1 (1-7)" value={1} />
              <Picker.Item label="Week 2 (8-14)" value={2} />
              <Picker.Item label="Week 3 (15-21)" value={3} />
              <Picker.Item label="Week 4 (22-end)" value={4} />
            </Picker>
          </View>

          {/* EARNINGS */}
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              marginTop: 20,
            }}
          >
            Earnings: ₹{earnings}
          </Text>

          {/* CARDS */}
          {data.length === 0 ? (
            <Text style={{ marginTop: 20, color: "gray" }}>
              No services for this week
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
    borderColor: "#FFE066",
    elevation: 2,
  },

  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  customerName: {
    fontWeight: "700",
    fontSize: 15,
    flex: 1,
  },

  amount: {
    fontWeight: "800",
    fontSize: 16,
    color: "#16a34a",
  },
});

export default WeeklyScreen;
