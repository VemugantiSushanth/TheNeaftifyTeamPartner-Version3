import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
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
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

type Booking = {
  customer_name: string;
  staff_earned_amount: number;
  work_ended_at: string;
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

  const [dailyData, setDailyData] = useState<
    { date: string; amount: number }[]
  >([]);

  const [earnings, setEarnings] = useState(0);
  const [data, setData] = useState<Booking[]>([]);

  const getWeekLabel = () => {
    if (selectedWeek === 1) return "Week 1 (1-7)";
    if (selectedWeek === 2) return "Week 2 (8-14)";
    if (selectedWeek === 3) return "Week 3 (15-21)";
    return "Week 4 (22-end)";
  };

  const selectedYearWeek = `${selectedYear}-W${String(selectedWeek).padStart(2, "0")}`;

  const getWeekRange = (year: number, month: string, week: number) => {
    const startDay = (week - 1) * 7 + 1;

    // ✅ get actual last day of month
    const daysInMonth = dayjs(`${year}-${month}-01`).daysInMonth();
    let endDay = week * 7;

    // ✅ fix for last week
    if (week === 4 || endDay > daysInMonth) {
      endDay = daysInMonth;
    }

    const start = dayjs(
      `${year}-${month}-${String(startDay).padStart(2, "0")}`,
    ).startOf("day");

    const end = dayjs(
      `${year}-${month}-${String(endDay).padStart(2, "0")}`,
    ).endOf("day");

    return { start, end };
  };

  const getDailyEarnings = (
    bookings: any[],
    start: dayjs.Dayjs,
    end: dayjs.Dayjs,
  ) => {
    let result: { date: string; amount: number }[] = [];

    const totalDays = end.diff(start, "day") + 1; // ✅ includes last day

    for (let i = 0; i < totalDays; i++) {
      const current = start.add(i, "day");
      const dateStr = current.format("YYYY-MM-DD");

      const total = bookings
        .filter(
          (item) => dayjs(item.work_ended_at).format("YYYY-MM-DD") === dateStr,
        )
        .reduce((sum, item) => sum + Number(item.staff_earned_amount || 0), 0);

      result.push({
        date: dateStr,
        amount: total,
      });
    }

    return result;
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

    const startStr = start.format("YYYY-MM-DD");
    const endStr = end.format("YYYY-MM-DD");

    const filtered =
      bookings?.filter((item: any) => {
        if (!item.work_ended_at) return false;

        const dateStr = dayjs(item.work_ended_at).format("YYYY-MM-DD");

        return dateStr >= startStr && dateStr <= endStr;
      }) || [];

    setData(filtered);

    // ✅ NEW
    const daily = getDailyEarnings(filtered, start, end);
    setDailyData(daily);

    const monthKey = `${selectedYear}-${selectedMonth}`;
    const weekKey = `week${selectedWeek}`;

    // convert daily array → object
    const dailyObject: any = {};

    daily.forEach((item) => {
      dailyObject[item.date] = item.amount;
    });

    const { data: profile } = await supabase
      .from("staff_profile")
      .select("weekly_earnings_json")
      .eq("email", email)
      .single();

    let existing = profile?.weekly_earnings_json || {};

    if (!existing[monthKey]) {
      existing[monthKey] = {};
    }

    existing[monthKey][weekKey] = dailyObject;

    await supabase
      .from("staff_profile")
      .update({
        weekly_earnings_json: existing,
      })
      .eq("email", email);

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
              style={[styles.picker, { color: "#000" }]} // ✅ FIX
            >
              {Array.from({ length: 10 }, (_, i) => {
                const year = currentYear - i;
                return (
                  <Picker.Item
                    key={year}
                    label={`${year}`}
                    value={year}
                    color="#000"
                  />
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
              <Picker.Item label="Week 1 (1-7)" value={1} color="#000" />
              <Picker.Item label="Week 2 (8-14)" value={2} color="#000" />
              <Picker.Item label="Week 3 (15-21)" value={3} color="#000" />
              <Picker.Item label="Week 4 (22-end)" value={4} color="#000" />
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
          {dailyData.length === 0 ? (
            <Text style={{ marginTop: 20, color: "gray" }}>
              No data for this week
            </Text>
          ) : (
            <>
              {/* 🔥 WEEK HEADER */}
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "800",
                  marginTop: 20,
                  marginBottom: 10,
                }}
              >
                {getWeekLabel()}
              </Text>

              {/* 🔥 DAILY LIST */}
              {/* TABLE HEADER */}
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderText}>Date</Text>
                <Text style={styles.tableHeaderText}>Earnings</Text>
              </View>

              {/* TABLE ROWS */}
              {dailyData.map((item, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.tableDate}>
                    {dayjs(item.date).format("DD-MM-YYYY")}
                  </Text>

                  <Text style={styles.tableAmount}>₹{item.amount}</Text>
                </View>
              ))}
            </>
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
    color: "#000", // ✅ REQUIRED
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

  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F1F5F9",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },

  tableHeaderText: {
    fontWeight: "800",
    fontSize: 14,
  },

  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  tableDate: {
    fontWeight: "600",
  },

  tableAmount: {
    fontWeight: "800",
    color: "#16a34a",
  },
});

export default WeeklyScreen;
