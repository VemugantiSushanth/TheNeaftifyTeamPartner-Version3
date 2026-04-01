import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

export default function AvailabilityCalendar() {
  const [markedDates, setMarkedDates] = useState<any>({});
  const [mode, setMode] = useState("available");
  const [hasSavedData, setHasSavedData] = useState(false);

  const month = new Date().toISOString().slice(0, 7);

  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 90);

  /* LOAD AVAILABILITY */

  const loadAvailability = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const userId = userData.user.id;

    const { data, error } = await supabase
      .from("staff_monthly_availability")
      .select("calendar_data")
      .eq("staff_id", userId)
      .eq("month", month)
      .maybeSingle();

    if (error) {
      console.log("Fetch error:", error);
      return;
    }

    if (!data?.calendar_data) {
      setMarkedDates({});
      setHasSavedData(false);
      return;
    }

    const marks: any = {};

    Object.entries(data.calendar_data).forEach(([date, status]: any) => {
      marks[date] = {
        selected: true,
        selectedColor: status === "available" ? "#16a34a" : "#ef4444",
      };
    });

    setMarkedDates(marks);
    setHasSavedData(true);
  };

  /* reload when screen opens */

  useFocusEffect(
    useCallback(() => {
      loadAvailability();
    }, []),
  );

  /* SELECT DATE */

  const onDayPress = (day: any) => {
    const date = day.dateString;
    const existing = markedDates[date];

    if (existing) {
      const updated = { ...markedDates };
      delete updated[date];
      setMarkedDates(updated);
    } else {
      const color = mode === "available" ? "#16a34a" : "#ef4444";

      setMarkedDates({
        ...markedDates,
        [date]: {
          selected: true,
          selectedColor: color,
        },
      });
    }
  };

  /* SAVE / UPDATE */

  const saveAvailability = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const userId = userData.user.id;

    const { data: profile } = await supabase
      .from("staff_profile")
      .select("name,email")
      .eq("id", userId)
      .single();

    const json: any = {};

    Object.entries(markedDates).forEach(([date, value]: any) => {
      json[date] =
        value.selectedColor === "#16a34a" ? "available" : "not_available";
    });

    const { error } = await supabase.from("staff_monthly_availability").upsert(
      {
        staff_id: userId,
        staff_name: profile?.name,
        staff_email: profile?.email,
        month: month,
        calendar_data: json,
      },
      { onConflict: "staff_id,month" },
    );

    if (error) {
      console.log("Save error:", error);
      return;
    }

    setHasSavedData(true);

    await loadAvailability();

    alert("Availability Updated");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar backgroundColor="#FFD700" barStyle="dark-content" />

      {/* HEADER */}

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

      {/* CONTENT */}

      <View style={{ flex: 1, padding: 20 }}>
        <Text style={styles.title}>My Availability Calendar</Text>

        {/* MODE BUTTONS */}

        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "available" && styles.green]}
            onPress={() => setMode("available")}
          >
            <Text style={styles.modeText}>Available</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeBtn, mode === "not_available" && styles.red]}
            onPress={() => setMode("not_available")}
          >
            <Text style={styles.modeText}>Not Available</Text>
          </TouchableOpacity>
        </View>

        {/* CALENDAR */}

        <Calendar
          minDate={today.toISOString().split("T")[0]}
          maxDate={maxDate.toISOString().split("T")[0]}
          onDayPress={onDayPress}
          markedDates={markedDates}
          theme={{
            todayTextColor: "#FFD700",
          }}
        />

        {/* SAVE BUTTON */}

        <TouchableOpacity style={styles.saveBtn} onPress={saveAvailability}>
          <Text style={styles.saveText}>
            {hasSavedData ? "Update Availability" : "Save Availability"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* FOOTER */}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => router.replace("/my-role")}
        >
          <Ionicons name="home-outline" size={22} color="#000" />
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

  title: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 15,
  },

  modeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  modeBtn: {
    width: "48%",
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#eee",
    alignItems: "center",
  },

  green: {
    backgroundColor: "#16a34a",
  },

  red: {
    backgroundColor: "#ef4444",
  },

  modeText: {
    fontWeight: "700",
  },

  saveBtn: {
    marginTop: 20,
    backgroundColor: "#FFD700",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  saveText: {
    fontWeight: "700",
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
  },

  footerText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
    color: "#000",
  },
});
