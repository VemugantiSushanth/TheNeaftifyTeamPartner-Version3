import { Image } from "expo-image";
import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
import { Eye, EyeOff, Lock, Mail } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [sessionExists, setSessionExists] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [loginMode, setLoginMode] = useState<"email" | "mobile">("email");
  // const [mobile, setMobile] = useState("");
  // const [otp, setOtp] = useState("");
  // const [otpSent, setOtpSent] = useState(false);

  // // ✅ NEW STATES FOR TIMER
  // const [timer, setTimer] = useState(60);
  // const [isResendDisabled, setIsResendDisabled] = useState(false);

  useEffect(() => {
    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) setSessionExists(true);
        else setSessionExists(false);
        setCheckingSession(false);
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // ✅ SAFE TIMER EFFECT (NO TYPESCRIPT ERROR)
  // useEffect(() => {
  //   if (!otpSent) return;

  //   setIsResendDisabled(true);
  //   setTimer(60);

  //   const interval = setInterval(() => {
  //     setTimer((prev) => {
  //       if (prev <= 1) {
  //         clearInterval(interval);
  //         setIsResendDisabled(false);
  //         return 0;
  //       }
  //       return prev - 1;
  //     });
  //   }, 1000);

  //   return () => clearInterval(interval);
  // }, [otpSent]);

  // useEffect(() => {
  //   const backAction = () => {
  //     if (loginMode === "mobile") {
  //       setLoginMode("email");
  //       setOtpSent(false);
  //       setMobile("");
  //       setOtp("");
  //       setIsResendDisabled(false);
  //       setTimer(60);
  //       return true;
  //     }
  //     return false;
  //   };

  //   const backHandler = BackHandler.addEventListener(
  //     "hardwareBackPress",
  //     backAction,
  //   );

  //   return () => backHandler.remove();
  // }, [loginMode]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        BackHandler.exitApp(); // closes the app
        return true; // prevent default behavior
      },
    );

    return () => subscription.remove();
  }, []);

  const checkSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) setSessionExists(true);
    setCheckingSession(false);
  };

  const verifyDeviceSecurity = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) return true;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Neatify Staff",
      });

      return result.success;
    } catch {
      return true;
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Email and password required");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Login with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const userId = data.user.id;

      // Step 2: Check if this user exists in staff_profile
      const { data: staffData } = await supabase
        .from("staff_profile")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (!staffData) {
        // If not staff → block login
        await supabase.auth.signOut();
        Alert.alert(
          "Access Denied",
          "This account is not authorized to access the Staff App.",
        );
        return;
      }

      // Step 3: Optional biometric verification
      const verified = await verifyDeviceSecurity();

      if (!verified) {
        await supabase.auth.signOut();
        Alert.alert("Verification Failed");
        return;
      }

      // Step 4: Allow staff to enter app
      router.replace("./my-role");
    } catch (err: any) {
      Alert.alert("Login Failed", err.message);
    } finally {
      setLoading(false);
    }
  };
  // const getCleanMobile = () => mobile.replace(/\D/g, "");

  // const checkIfMobileRegistered = async () => {
  //   const cleanedMobile = getCleanMobile();

  //   if (cleanedMobile.length !== 10) {
  //     Alert.alert("Error", "Enter valid 10 digit mobile number");
  //     return false;
  //   }

  //   const formattedPhone = `+91${cleanedMobile}`;

  //   const { data } = await supabase
  //     .from("staff_profile")
  //     .select("phone")
  //     .eq("phone", formattedPhone)
  //     .maybeSingle();

  //   if (!data) {
  //     Alert.alert("Error", "Number not registered yet");
  //     return false;
  //   }

  //   return true;
  // };

  // const handleSendOtp = async () => {
  //   const exists = await checkIfMobileRegistered();
  //   if (!exists) return;

  //   const formattedPhone = `+91${getCleanMobile()}`;

  //   setLoading(true);

  //   const { error } = await supabase.auth.signInWithOtp({
  //     phone: formattedPhone,
  //   });

  //   setLoading(false);

  //   if (error) {
  //     Alert.alert("Error", error.message);
  //   } else {
  //     setOtpSent(true); // triggers timer
  //     setOtp("");
  //     Alert.alert("Success", "OTP sent successfully");
  //   }
  // };

  // const handleVerifyOtp = async () => {
  //   if (!otp) {
  //     Alert.alert("Error", "Enter OTP");
  //     return;
  //   }

  //   const formattedPhone = `+91${getCleanMobile()}`;

  //   setLoading(true);

  //   const { error } = await supabase.auth.verifyOtp({
  //     phone: formattedPhone,
  //     token: otp,
  //     type: "sms",
  //   });

  //   if (error) {
  //     setLoading(false);
  //     Alert.alert("Error", "Invalid OTP");
  //     return;
  //   }

  //   const verified = await verifyDeviceSecurity();

  //   if (!verified) {
  //     await supabase.auth.signOut();
  //     Alert.alert("Verification Failed");
  //     setLoading(false);
  //     return;
  //   }

  //   router.replace("./my-role");
  // };

  const handleUnlock = async () => {
    const verified = await verifyDeviceSecurity();
    if (verified) router.replace("./my-role");
    else Alert.alert("Verification Failed");
  };

  if (checkingSession) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  if (sessionExists) {
    return (
      <View style={styles.unlockContainer}>
        <StatusBar barStyle="dark-content" />
        <Image
          source={require("../assets/images/logo.png")}
          style={styles.logo}
          contentFit="contain"
        />
        <TouchableOpacity style={styles.primaryBtn} onPress={handleUnlock}>
          <Text style={styles.primaryBtnText}>Unlock</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Image
            source={require("../assets/images/logo.png")}
            style={styles.logo}
          />
          <Text style={styles.subtitle}>Partner Login</Text>
        </View>

        {loginMode === "email" && (
          <>
            <View style={styles.inputContainer}>
              <Mail size={20} />
              <TextInput
                placeholder="Email Address"
                placeholderTextColor="#666"
                style={styles.input}
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                keyboardAppearance="light"
                selectionColor="#000"
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={20} />
              <TextInput
                placeholder="Password"
                placeholderTextColor="#666"
                style={styles.input}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                keyboardAppearance="light"
                selectionColor="#000"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff /> : <Eye />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.primaryBtnText}>Log In</Text>
              )}
            </TouchableOpacity>

            {/* <Text style={styles.orText}>OR</Text>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => setLoginMode("mobile")}
            >
              <Text style={styles.primaryBtnText}>
                Login With Mobile Number
              </Text>
            </TouchableOpacity> */}
          </>
        )}

        {/* {loginMode === "mobile" && !otpSent && (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                placeholder="Enter 10 digit number"
                keyboardType="phone-pad"
                style={styles.input}
                maxLength={10}
                value={mobile}
                onChangeText={(text) => setMobile(text.replace(/\D/g, ""))}
              />
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleSendOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.primaryBtnText}>Send OTP</Text>
              )}
            </TouchableOpacity>
          </>
        )} */}

        {/* {loginMode === "mobile" && otpSent && (
          <>
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Enter OTP"
                keyboardType="number-pad"
                style={styles.input}
                value={otp}
                onChangeText={setOtp}
              />
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.primaryBtnText}>Verify OTP</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (!isResendDisabled) handleSendOtp();
              }}
              disabled={isResendDisabled}
              style={{ marginTop: 15 }}
            >
              <Text
                style={{
                  textAlign: "center",
                  fontWeight: "600",
                  color: isResendDisabled ? "#999" : "#000",
                }}
              >
                {isResendDisabled ? `Resend OTP in ${timer}s` : "Resend OTP"}
              </Text>
            </TouchableOpacity>
          </>
        )} */}

        {/* {loginMode === "mobile" && (
          <TouchableOpacity
            onPress={() => {
              setLoginMode("email");
              setOtpSent(false);
              setMobile("");
              setOtp("");
            }}
            style={styles.backContainer}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        )} */}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 25,
    justifyContent: "center",
  },
  unlockContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 25,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 300,
    height: 100,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 15,
    marginBottom: 15,
    gap: 8,
    backgroundColor: "#FFFFFF",
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
  },
  primaryBtn: {
    backgroundColor: "#FFD700",
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  primaryBtnText: {
    color: "#000",
    fontSize: 17,
    fontWeight: "700",
  },
  orText: {
    textAlign: "center",
    marginVertical: 15,
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },
  backContainer: {
    marginTop: 25,
  },
  backText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  countryCode: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
});
