import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
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

export default function AssignedServiceDetails() {
  const params = useLocalSearchParams();
  const booking = params.booking ? JSON.parse(params.booking as string) : null;

  const STORAGE_KEY = booking ? `booking_${booking.id}` : "";

  const [startOtp, setStartOtp] = useState("");
  const [endOtp, setEndOtp] = useState("");

  const [startVerified, setStartVerified] = useState(false);
  const [endVerified, setEndVerified] = useState(false);

  const [beforeImages, setBeforeImages] = useState<string[]>([]);
  const [afterImages, setAfterImages] = useState<string[]>([]);

  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [workStopped, setWorkStopped] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // ================= TIMER CHANGE =================
  const [workStartedAt, setWorkStartedAt] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [skipModalVisible, setSkipModalVisible] = useState(false);
  const [skipType, setSkipType] = useState<"start" | "end" | null>(null);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [startSkipReason, setStartSkipReason] = useState<string | null>(null);
  const [endSkipReason, setEndSkipReason] = useState<string | null>(null);

  const [popupVisible, setPopupVisible] = useState(false);
  const [popupTitle, setPopupTitle] = useState("");
  const [popupMessage, setPopupMessage] = useState("");
  const [popupConfirmText, setPopupConfirmText] = useState("OK");
  const [popupCancelText, setPopupCancelText] = useState<string | null>(null);
  const [popupOnConfirm, setPopupOnConfirm] = useState<(() => void) | null>(
    null,
  );

  const showPopup = ({
    title,
    message,
    confirmText = "OK",
    cancelText = null,
    onConfirm,
  }: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string | null;
    onConfirm?: () => void;
  }) => {
    setPopupTitle(title);
    setPopupMessage(message);
    setPopupConfirmText(confirmText);
    setPopupCancelText(cancelText);
    setPopupOnConfirm(() => onConfirm || null);
    setPopupVisible(true);
  };
  // ================= TIMER CHANGE END =================

  const scrollRef = useRef<ScrollView>(null);

  if (!booking) return null;

  const [startPhotoSkipped, setStartPhotoSkipped] = useState(false);
  const [endPhotoSkipped, setEndPhotoSkipped] = useState(false);

  /* ================= RESTORE LOCAL STATE ================= */
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        setStartOtp(d.startOtp || "");
        setEndOtp(d.endOtp || "");
        setStartVerified(d.startVerified || false);
        setEndVerified(d.endVerified || false);
        setBeforeImages(d.beforeImages || []);
        setAfterImages(d.afterImages || []);
        setRunning(d.running || false);
        setSeconds(d.seconds || 0);
        setWorkStopped(d.workStopped || false);
      }

      // ================= TIMER CHANGE =================
      const { data: latest } = await supabase
        .from("bookings")
        .select(
          "work_started_at, work_ended_at, start_photo_url, end_photo_url",
        )
        .eq("id", booking.id)
        .single();

      if (latest?.work_started_at && !latest?.work_ended_at) {
        // ✅ WORK IS RUNNING
        setWorkStartedAt(latest.work_started_at);
        setRunning(true);
        setWorkStopped(false);

        setStartVerified(true);
      } else if (latest?.work_ended_at) {
        // ✅ WORK COMPLETED
        setRunning(false);
        setWorkStopped(true);
        setWorkStartedAt(null);

        setStartVerified(true);
      }

      if (latest?.work_started_at && !latest?.work_ended_at) {
        setWorkStartedAt(latest.work_started_at);
        setRunning(true);
        setWorkStopped(false);

        setStartVerified(true);
      } else if (latest?.work_ended_at) {
        setRunning(false);
        setWorkStopped(true);
        setWorkStartedAt(null);

        setStartVerified(true);
      }

      /* ================= ADD HERE ================= */

      // 🔥 RESTORE START SKIP
      if (
        typeof latest?.start_photo_url === "string" &&
        latest.start_photo_url.startsWith("Skipped:")
      ) {
        const reason = latest.start_photo_url.replace("Skipped: ", "");

        setStartPhotoSkipped(true);
        setStartSkipReason(reason);
      }

      // 🔥 RESTORE END SKIP
      if (
        typeof latest?.end_photo_url === "string" &&
        latest.end_photo_url.startsWith("Skipped:")
      ) {
        const reason = latest.end_photo_url.replace("Skipped: ", "");

        setEndPhotoSkipped(true);
        setEndSkipReason(reason);
      }

      // 🔥 RESTORE START OTP (if work started)
      if (latest?.work_started_at) {
        setStartVerified(true);

        // show masked OTP if not available
        if (!startOtp) {
          setStartOtp("******");
        }
      }

      // 🔥 RESTORE START IMAGES
      if (latest?.start_photo_url && Array.isArray(latest.start_photo_url)) {
        setBeforeImages(latest.start_photo_url);
      }

      // 🔥 RESTORE END IMAGES
      if (latest?.end_photo_url && Array.isArray(latest.end_photo_url)) {
        setAfterImages(latest.end_photo_url);
      }

      // ================= TIMER CHANGE END =================
    })();
  }, []);

  /* ================= SAVE STATE ON EVERY CHANGE ================= */
  useEffect(() => {
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        startOtp,
        endOtp,
        startVerified,
        endVerified,
        beforeImages,
        afterImages,
        running,
        seconds,
        workStopped,
      }),
    );
  }, [
    startOtp,
    endOtp,
    startVerified,
    endVerified,
    beforeImages,
    afterImages,
    running,
    seconds,
    workStopped,
  ]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () =>
      setIsKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener("keyboardDidHide", () =>
      setIsKeyboardVisible(false),
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  useEffect(() => {
    if (!workStartedAt) return;

    const updateTimer = () => {
      const diff = Math.floor(
        (Date.now() - new Date(workStartedAt).getTime()) / 1000,
      );
      setSeconds(diff);
    };

    updateTimer();

    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [workStartedAt]);
  // ================= TIMER CHANGE END =================

  const formatDuration = (t: number) => {
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;

    let result = "";

    if (h > 0) result += `${h} hr `;
    if (m > 0) result += `${m} min `;
    if (s > 0) result += `${s} sec`;

    return result.trim();
  };

  const openMaps = (lat: number, lng: number) => {
    if (!lat || !lng) {
      showPopup({
        title: "Location Not Available 📍",
        message: "Customer location coordinates are missing.",
      });
      return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url);
  };
  const openCamera = async () => {
    const p = await ImagePicker.requestCameraPermissionsAsync();

    if (!p.granted) {
      showPopup({
        title: "Camera Permission Required 📷",
        message: "Please allow camera access to upload work photos.",
        confirmText: "Open Settings",
        cancelText: "Cancel",
        onConfirm: () => {
          Linking.openSettings(); // Opens app settings
        },
      });

      return null;
    }

    const r = await ImagePicker.launchCameraAsync({ quality: 0.6 });

    return r.canceled ? null : r.assets[0].uri;
  };

  /* ================= IMAGE UPLOAD (NETWORK SAFE) ================= */
  const uploadImage = async (localUri: string, type: "start" | "end") => {
    try {
      setUploading(true);

      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;
      if (!email) return;

      // ================= COMPRESS IMAGE =================
      const compressedImage = await ImageManipulator.manipulateAsync(
        localUri,
        [
          {
            resize: { width: 800 }, // reduce resolution (optional but recommended)
          },
        ],
        {
          compress: 0.4, // 0.1 = very low quality | 0.4 good | 0.6 medium
          format: ImageManipulator.SaveFormat.JPEG,
        },
      );

      // Use compressed URI
      const compressedUri = compressedImage.uri;

      const base64 = await FileSystem.readAsStringAsync(compressedUri, {
        encoding: "base64",
      });
      const byteArray = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

      const filePath = `staff_uploads/${email}/${booking.id}/${type}_${Date.now()}.jpg`;

      const { error } = await supabase.storage
        .from("work-photos")
        .upload(filePath, byteArray, {
          contentType: "image/jpeg",
        });

      if (error) throw error;

      const { data: publicData } = supabase.storage
        .from("work-photos")
        .getPublicUrl(filePath);

      const imageUrl = publicData.publicUrl;

      /* ================= EXISTING URL ARRAY ================= */

      // 🔥 Get latest booking data from database
      const { data: latestBooking, error: fetchError } = await supabase
        .from("bookings")
        .select("start_photo_url, end_photo_url")
        .eq("id", booking.id)
        .single();

      if (fetchError) throw fetchError;

      let urls: string[] = [];

      const existingValue =
        type === "start"
          ? latestBooking.start_photo_url
          : latestBooking.end_photo_url;

      if (existingValue) {
        try {
          urls = Array.isArray(existingValue)
            ? existingValue
            : JSON.parse(existingValue);
        } catch {
          urls = [];
        }
      }

      const updatedUrls = [...urls, imageUrl];

      /* ================= UPDATE BOOKINGS TABLE ================= */

      if (type === "start") {
        setBeforeImages((p) => [...p, localUri]);

        await supabase
          .from("bookings")
          .update({
            start_photo_url: updatedUrls,
          })
          .eq("id", booking.id);
      } else {
        setAfterImages((p) => [...p, localUri]);

        await supabase
          .from("bookings")
          .update({
            end_photo_url: updatedUrls,
          })
          .eq("id", booking.id);
      }
    } catch (err: any) {
      showPopup({
        title: "Slow Network ⚠️",
        message: "Please check your internet connection and try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const verifyStartOtp = () => {
    if (startOtp !== booking.startotp) {
      showPopup({
        title: "Invalid OTP ❌",
        message:
          "The entered Start OTP is incorrect. Please check and try again.",
      });
      return;
    }

    setStartVerified(true);

    showPopup({
      title: "OTP Verified ✅",
      message: "Start OTP has been successfully verified.",
    });
  };

  const verifyEndOtp = () => {
    if (endOtp !== booking.endotp) {
      showPopup({
        title: "Invalid OTP ❌",
        message: "The entered End OTP is incorrect.",
      });
      return;
    }

    setEndVerified(true);

    showPopup({
      title: "OTP Verified ✅",
      message: "End OTP verified successfully.",
    });
  };

  const removeImage = (index: number, type: "start" | "end") => {
    if (type === "start")
      setBeforeImages((p) => p.filter((_, i) => i !== index));
    else setAfterImages((p) => p.filter((_, i) => i !== index));
  };

  const openSkipModal = (type: "start" | "end") => {
    setSkipType(type);
    setSelectedReason(null);
    setSkipModalVisible(true);
  };

  const confirmSkip = async () => {
    if (!selectedReason || !skipType) return;

    const reasonText = `Skipped: ${selectedReason}`;

    if (skipType === "start") {
      setStartPhotoSkipped(true);
      setStartSkipReason(selectedReason);

      await supabase
        .from("bookings")
        .update({
          start_photo_url: reasonText,
        })
        .eq("id", booking.id);
    } else {
      setEndPhotoSkipped(true);
      setEndSkipReason(selectedReason);

      await supabase
        .from("bookings")
        .update({
          end_photo_url: reasonText,
        })
        .eq("id", booking.id);
    }

    setSkipModalVisible(false);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar backgroundColor="#FFD700" barStyle="dark-content" />

      {uploading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loaderText}>Uploading image...</Text>
        </View>
      )}

      <View style={styles.header}>
        <Image
          source={require("../assets/images/logo.png")}
          style={styles.logo}
          contentFit="contain"
        />
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "android" ? "height" : "padding"}
        keyboardVerticalOffset={Platform.OS === "android" ? 60 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.body,
            { paddingBottom: 80, minHeight: "100%" },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.title}>{booking.customer_name}</Text>
            <Text>Date: {booking.booking_date}</Text>
            <Text>Time: {booking.booking_time}</Text>
            <Text>Address: {booking.full_address}</Text>

            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => {
                if (!booking.phone_number) {
                  showPopup({
                    title: "Number Not Available 📞",
                    message:
                      "Customer phone number is not available for this booking.",
                  });
                  return;
                }

                Linking.openURL(`tel:${booking.phone_number}`);
              }}
            >
              <Ionicons name="call" size={18} color="#ffffff" />
              <Text style={styles.callText}>Call Customer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mapBtn}
              onPress={() => openMaps(booking.latitude, booking.longitude)}
            >
              <Text>Location</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Start OTP</Text>
            <TextInput
              style={[
                styles.otpInput,
                startVerified && { backgroundColor: "#eee" },
              ]}
              value={startOtp}
              onChangeText={setStartOtp}
              keyboardType="number-pad"
              maxLength={6}
              editable={!startVerified}
            />

            {startVerified && (
              <View style={styles.verifiedRow}>
                <Ionicons name="checkmark-circle" size={16} color="green" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}

            {!startVerified && (
              <TouchableOpacity style={styles.btn} onPress={verifyStartOtp}>
                <Text style={styles.btnText}>Verify Start OTP</Text>
              </TouchableOpacity>
            )}

            {startVerified && (
              <>
                <View style={styles.imageRow}>
                  {beforeImages.map((uri, i) => (
                    <View key={i} style={styles.imageWrapper}>
                      <Image source={{ uri }} style={styles.preview} />
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => removeImage(i, "start")}
                      >
                        <Ionicons name="close-circle" size={18} color="red" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={async () => {
                    const uri = await openCamera();
                    if (uri) uploadImage(uri, "start");
                  }}
                >
                  <Text>
                    {beforeImages.length === 0
                      ? "Upload Image"
                      : "Upload Another Image"}
                  </Text>
                  <Ionicons name="camera" size={18} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => openSkipModal("start")}
                  style={{
                    marginTop: 8,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderWidth: 1,
                    borderColor: "#FFD700",
                    borderRadius: 6,
                    alignSelf: "flex-end",
                    backgroundColor: "#FFD700",
                  }}
                >
                  <Text style={{ color: "#0e0e0e", fontWeight: "bold" }}>
                    Skip Photo
                  </Text>
                </TouchableOpacity>
                {startSkipReason && (
                  <Text style={{ color: "red", marginTop: 6 }}>
                    Skipped: {startSkipReason}
                  </Text>
                )}
              </>
            )}

            {(beforeImages.length > 0 || startPhotoSkipped) &&
              !running &&
              !workStopped && (
                <TouchableOpacity
                  style={styles.startBtn}
                  onPress={() => {
                    showPopup({
                      title: "You Are Ready To Go 🚀",
                      message: "Click On START to start work.",
                      confirmText: "START",
                      cancelText: "Cancel",
                      onConfirm: async () => {
                        const startTime = new Date().toISOString();

                        await supabase
                          .from("bookings")
                          .update({
                            work_started_at: startTime,
                          })
                          .eq("id", booking.id);

                        // ================= TIMER CHANGE =================
                        setWorkStartedAt(startTime);
                        setRunning(true);
                        // ================= TIMER CHANGE END =================
                      },
                    });
                  }}
                >
                  <Text style={styles.btnText}>Start Work</Text>
                </TouchableOpacity>
              )}

            {running && (
              <Text style={styles.timer}>{formatDuration(seconds)}</Text>
            )}

            {running && (
              <TouchableOpacity
                style={styles.completeBtn}
                onPress={() => {
                  if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                  }

                  const endTime = new Date().toISOString();

                  showPopup({
                    title: "Work Completed 🎉",
                    message: `You have successfully completed the work in ${formatDuration(
                      seconds,
                    )}.\n\nTo finalize the service, please upload the end photo and verify with OTP.`,
                    confirmText: "Proceed",
                    onConfirm: async () => {
                      // 🔥 SAVE TO DB
                      await supabase
                        .from("bookings")
                        .update({
                          work_ended_at: endTime,
                        })
                        .eq("id", booking.id);

                      setRunning(false);
                      setWorkStopped(true);
                      setWorkStartedAt(null);
                    },
                  });
                }}
              >
                <Text>Work Complete</Text>
              </TouchableOpacity>
            )}

            {workStopped && (
              <Text style={styles.timer}>
                Worked Time: {formatDuration(seconds)}
              </Text>
            )}

            {workStopped && (
              <>
                <View style={styles.imageRow}>
                  {afterImages.map((uri, i) => (
                    <View key={i} style={styles.imageWrapper}>
                      <Image source={{ uri }} style={styles.preview} />
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => removeImage(i, "end")}
                      >
                        <Ionicons name="close-circle" size={18} color="red" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={async () => {
                    const uri = await openCamera();
                    if (uri) uploadImage(uri, "end");
                  }}
                >
                  <Text>
                    {afterImages.length === 0
                      ? "Upload Image"
                      : "Upload Another Image"}
                  </Text>
                  <Ionicons name="camera" size={18} />
                </TouchableOpacity>

                {/* ✅ ADD SKIP BUTTON RIGHT HERE */}
                <TouchableOpacity
                  onPress={() => openSkipModal("end")}
                  style={{
                    marginTop: 8,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderWidth: 1,
                    borderColor: "#FFD700",
                    borderRadius: 6,
                    alignSelf: "flex-end",
                    backgroundColor: "#FFD700",
                  }}
                >
                  <Text style={{ color: "black", fontWeight: "bold" }}>
                    Skip Photo
                  </Text>
                </TouchableOpacity>
                {endSkipReason && (
                  <Text style={{ color: "red", marginTop: 6 }}>
                    Skipped: {endSkipReason}
                  </Text>
                )}

                {(afterImages.length > 0 || endPhotoSkipped) && (
                  <>
                    <Text style={styles.label}>End OTP</Text>

                    <TextInput
                      style={[
                        styles.otpInput,
                        endVerified && {
                          backgroundColor: "#e5e5e5",
                          color: "#777",
                        },
                      ]}
                      value={endOtp}
                      onChangeText={setEndOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!endVerified} // 🔥 This locks field after verification
                      onFocus={() => {
                        if (!endVerified) {
                          // 🔥 Prevent scroll trigger after verified
                          setTimeout(() => {
                            scrollRef.current?.scrollToEnd({ animated: true });
                          }, 300);
                        }
                      }}
                    />

                    {endVerified && (
                      <View style={styles.verifiedRow}>
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color="green"
                        />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    )}

                    {!endVerified && (
                      <TouchableOpacity
                        style={styles.btn}
                        onPress={verifyEndOtp}
                      >
                        <Text style={styles.btnText}>Verify End OTP</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </>
            )}

            {endVerified && (afterImages.length > 0 || endPhotoSkipped) && (
              <TouchableOpacity
                style={styles.serviceDone}
                onPress={async () => {
                  await supabase
                    .from("bookings")
                    .update({
                      work_status: "COMPLETED",
                      worked_duration: formatDuration(seconds),
                      work_ended_at: new Date().toISOString(),
                    })
                    .eq("id", booking.id);

                  showPopup({
                    title: "Well Done! 🎉",
                    message: "You have successfully completed this service.",
                    confirmText: "Go to Dashboard",
                    onConfirm: () => {
                      router.replace("/dashboard");
                    },
                  });
                }}
              >
                <Text style={styles.serviceDoneText}>Service Completed</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {skipModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={{ fontWeight: "bold", fontSize: 16 }}>
              Why are you skipping?
            </Text>

            {[
              "Camera not working",
              "Customer denied permission",
              "Low light issue",
            ].map((reason) => (
              <TouchableOpacity
                key={reason}
                onPress={() => setSelectedReason(reason)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 8,
                }}
              >
                <Ionicons
                  name={
                    selectedReason === reason
                      ? "radio-button-on"
                      : "radio-button-off"
                  }
                  size={18}
                  color="#000"
                />
                <Text style={{ marginLeft: 8 }}>{reason}</Text>
              </TouchableOpacity>
            ))}

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 15,
              }}
            >
              <TouchableOpacity onPress={() => setSkipModalVisible(false)}>
                <Text style={{ color: "red" }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={!selectedReason}
                onPress={confirmSkip}
              >
                <Text
                  style={{
                    color: selectedReason ? "green" : "gray",
                    fontWeight: "bold",
                  }}
                >
                  Confirm
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <Modal visible={popupVisible} transparent animationType="fade">
        <View style={styles.popupOverlay}>
          <View style={styles.popupCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="checkmark" size={28} color="#000" />
            </View>

            <Text style={styles.popupTitle}>{popupTitle}</Text>
            <Text style={styles.popupMessage}>{popupMessage}</Text>

            <View style={styles.buttonRow}>
              {popupCancelText && (
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setPopupVisible(false)}
                >
                  <Text style={styles.cancelText}>{popupCancelText}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => {
                  setPopupVisible(false);
                  if (popupOnConfirm) popupOnConfirm();
                }}
              >
                <Text style={styles.confirmText}>{popupConfirmText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ✅ FOOTER LOCKED */}
      {!isKeyboardVisible && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.footerItem}
            onPress={() => router.push("/my-role")}
          >
            <Ionicons name="home" size={22} color="#000" />
            <Text style={styles.footerTextActive}>Home</Text>
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
      )}
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  header: {
    height: 72,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: { width: 190, height: 64 },
  body: { padding: 20 },
  card: { borderWidth: 2, borderRadius: 16, padding: 16 },
  title: { fontSize: 18, fontWeight: "800" },
  label: { marginTop: 16, fontWeight: "700" },
  otpInput: { borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 6 },
  verifiedRow: { flexDirection: "row", gap: 6, marginTop: 6 },
  verifiedText: { color: "green", fontWeight: "700" },
  btn: {
    marginTop: 10,
    backgroundColor: "#FFD700",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: { color: "#000000", fontWeight: "700" },
  imageRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  preview: { width: 60, height: 60, borderRadius: 8 },
  uploadBtn: {
    marginTop: 10,
    backgroundColor: "#e5e7eb",
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  startBtn: {
    marginTop: 14,
    backgroundColor: "#FFD700",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  completeBtn: {
    marginTop: 10,
    backgroundColor: "#FFD700",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  timer: { marginTop: 10, fontWeight: "800", textAlign: "center" },
  mapBtn: {
    backgroundColor: "#FFD700",
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    alignItems: "center",
  },
  callBtn: {
    marginTop: 10,
    backgroundColor: "#000000",
    padding: 10,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  callText: { fontWeight: "700", color: "#ffffff" },
  serviceDone: {
    marginTop: 24,
    backgroundColor: "#16a34a",
    padding: 14,
    borderRadius: 18,
    alignItems: "center",
  },
  serviceDoneText: { color: "#fff", fontWeight: "800" },
  imageWrapper: { position: "relative" },
  removeBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#fff",
    borderRadius: 20,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  loaderText: { marginTop: 10, fontWeight: "700" },
  footer: {
    height: 70,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  footerItem: { alignItems: "center" },
  footerText: { fontSize: 12, marginTop: 4, fontWeight: "600" },
  footerTextActive: { fontSize: 12, marginTop: 4, fontWeight: "800" },

  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalContainer: {
    backgroundColor: "#fff",
    width: "85%",
    padding: 20,
    borderRadius: 12,
  },

  popupBox: {
    width: "85%",
    backgroundColor: "#FFD700",
    padding: 25,
    borderRadius: 25,
    alignItems: "center",
    elevation: 20,
  },

  popupCancel: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginRight: 10,
  },

  popupConfirm: {
    backgroundColor: "#000",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },

  popupOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  popupCard: {
    width: "85%",
    backgroundColor: "#ded8b9",
    borderRadius: 18,
    paddingVertical: 25,
    paddingHorizontal: 20,
    alignItems: "center",
    elevation: 10,
  },

  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },

  popupTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
  },

  popupMessage: {
    fontSize: 14,
    color: "#333",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },

  buttonRow: {
    flexDirection: "row",
    marginTop: 20,
  },

  cancelBtn: {
    marginRight: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },

  cancelText: {
    color: "#000",
    fontWeight: "600",
  },

  confirmBtn: {
    backgroundColor: "#000",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },

  confirmText: {
    color: "#fff",
    fontWeight: "600",
  },
});
