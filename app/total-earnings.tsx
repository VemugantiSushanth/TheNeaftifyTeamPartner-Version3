import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
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
  id?: string;
  customer_name: string;
  staff_earned_amount: number;
  work_ended_at: string; // ✅ CHANGE THIS
};

export default function TotalEarnings() {
  const router = useRouter();

  const [data, setData] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);

  const fetchTotalData = async () => {
    setLoading(true); // ✅ start loading

    const { data: userData } = await supabase.auth.getUser();
    const email = userData?.user?.email;

    if (!email) return;

    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, customer_name, staff_earned_amount, work_ended_at")
      .eq("assigned_staff_email", email)
      .eq("work_status", "COMPLETED")
      .order("work_ended_at", { ascending: false });

    setData(bookings || []);

    const sum = (bookings || []).reduce(
      (acc: number, item: any) => acc + Number(item.staff_earned_amount || 0),
      0,
    );

    setTotal(sum);

    setLoading(false); // ✅ stop loading
  };

  useEffect(() => {
    fetchTotalData();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* HEADER */}
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

      <ScrollView style={{ padding: 16 }}>
        {/* TOTAL */}
        <Text style={styles.totalText}>Total: ₹{total}</Text>

        {/* LIST */}
        {loading ? (
          <Text style={{ textAlign: "center", marginTop: 40 }}>Loading...</Text>
        ) : data.length === 0 ? (
          <Text style={{ textAlign: "center", marginTop: 40, color: "gray" }}>
            No completed services
          </Text>
        ) : (
          data.map((item, i) => (
            <View
              key={item.id || `${item.customer_name}-${item.work_ended_at}`}
              style={styles.card}
            >
              <View style={styles.cardRow}>
                <Text style={styles.customerName}>{item.customer_name}</Text>

                <Text style={styles.amount}>₹{item.staff_earned_amount}</Text>
              </View>

              <Text style={styles.date}>
                {dayjs(item.work_ended_at).format("DD MMM YYYY")}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },

  totalText: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },

  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    marginTop: 12,

    borderWidth: 1.5,
    borderColor: "#FFE066", // ✅ same as monthly

    elevation: 2,
  },

  name: {
    fontWeight: "700",
    fontSize: 15,
  },

  logo: {
    width: 190,
    height: 64,
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

  date: {
    color: "gray",
    marginTop: 6,
  },
});
