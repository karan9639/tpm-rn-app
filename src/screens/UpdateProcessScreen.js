// src/screens/UpdateProcessScreen.js
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  StyleSheet,
  Modal,
} from "react-native";
import * as api from "../services/api";
import { maintenanceAPI as MAINT_MAYBE } from "../services/api";
import { Feather } from "@expo/vector-icons";
import SparePartsModal from "../components/SparePartsModal.native";
import { BarCodeScanner } from "expo-barcode-scanner";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function UpdateProcessScreen({ route, navigation }) {
  const requestFromNav = route?.params?.request || null;
  const requestId = route?.params?.requestId || requestFromNav?._id;

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  // QR first-time verification state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);

  const [spareParts, setSpareParts] = useState([]);
  const [showSpareModal, setShowSpareModal] = useState(false);

  const [isSubmitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    remark: "",
    customRemark: "",
    repairComment: "",
    customRepairComment: "",
    status: "in_progress",
  });

  useEffect(() => {
    navigation?.setOptions?.({ title: "Update Process" });
  }, [navigation]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const r = requestFromNav;
        if (!r) {
          throw new Error(
            "Request details not found. Open this screen from the list."
          );
        }
        const normalized = {
          _id: r._id,
          maintenanceId: r.maintenanceId || r._id,
          assetId: r.assetDetails?._id || r.assetId?._id || r.assetId,
          assetName:
            r.assetDetails?.assetName || r.assetName || "Unknown Asset",
          assetCode: r.assetDetails?.assetCode || r.assetCode || "N/A",
        };
        setRequest(normalized);

        // ---- QR verify only first time for THIS request ----
        const key = `qr_verified_${r._id}`;
        const already = await AsyncStorage.getItem(key);
        if (!already) {
          // ask permission and open scanner
          const { status } = await BarCodeScanner.requestPermissionsAsync();
          setHasPermission(status === "granted");
          setScanned(false);
          setScannerOpen(true);
        }
      } catch (e) {
        Alert.alert(
          "Error",
          e?.message || "Failed to load maintenance details.",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [requestId, requestFromNav, navigation]);

  // If scanner is opened later (manually), re-check permission
  useEffect(() => {
    if (!scannerOpen || hasPermission !== null) return;
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, [scannerOpen, hasPermission]);

  const remarkOptions = useMemo(
    () => [
      "Machine fixed",
      "Parts replaced",
      "Calibration done",
      "Cleaning completed",
      "Safety check done",
      "Others",
    ],
    []
  );

  const repairCommentOptions = useMemo(
    () => [
      "Routine maintenance",
      "Emergency repair",
      "Preventive maintenance",
      "Quality improvement",
      "Safety enhancement",
      "Others",
    ],
    []
  );

  const statusOptions = useMemo(
    () => [
      { value: "in_progress", label: "In Progress" },
      { value: "completed", label: "Completed" },
      { value: "on_hold", label: "On Hold" },
      { value: "requires_parts", label: "Requires Parts" },
    ],
    []
  );

  const handleAddSpares = (parts) => {
    const normalized = parts.map((p) => ({
      ...p,
      name: p.name || p.assetSpareName || "Spare",
      usedQuantity: p.usedQuantity || 1,
      assetSpareId: p.assetSpareId || p._id || p.id || null,
    }));
    setSpareParts((prev) => [...prev, ...normalized]);
    setShowSpareModal(false);
    Alert.alert("Added", `Added ${normalized.length} spare part(s).`);
  };

  const validate = () => {
    if (!formData.status) {
      Alert.alert("Validation", "Please select a status.");
      return false;
    }
    if (!formData.remark) {
      Alert.alert("Validation", "Please select a remark.");
      return false;
    }
    if (formData.remark === "Others" && !formData.customRemark.trim()) {
      Alert.alert("Validation", "Please provide a custom remark.");
      return false;
    }
    if (!request?.assetId) {
      Alert.alert("Error", "Asset ID not found. Please reopen this task.");
      return false;
    }
    return true;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const spareIds = spareParts.map((p) => p.assetSpareId).filter(Boolean);

      const payload = {
        maintenanceId: request.maintenanceId,
        assetId: request.assetId,
        status: formData.status,
        remark:
          formData.remark === "Others"
            ? formData.customRemark
            : formData.remark,
        comment:
          formData.repairComment === "Others"
            ? formData.customRepairComment
            : formData.repairComment || "",
      };

      if (spareIds.length === 1) {
        payload.assetSpareId = spareIds[0];
      } else if (spareIds.length > 1) {
        payload.assetSpareId = spareIds[0];
        console.warn(
          "Multiple spare IDs selected; backend expects a single ID. Sending the first:",
          spareIds[0]
        );
      }

      const sendAckFn =
        MAINT_MAYBE?.sendAcknowledgement ||
        api?.maintenanceAPI?.sendAcknowledgement ||
        api?.sendAcknowledgement ||
        api?.send_acknowledgement;

      if (!sendAckFn) {
        throw new Error(
          "sendAcknowledgement API not found in services/api (export it like on web)."
        );
      }

      await sendAckFn(payload);

      Alert.alert("Success", "Maintenance process updated successfully!", [
        {
          text: "OK",
          onPress: () => navigation.replace("MaintenanceRequests"),
        },
      ]);
    } catch (e) {
      Alert.alert("Error", e?.message || "Failed to submit acknowledgement.");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- QR handling (first-time only) ----
  const matchesAsset = (text) => {
    try {
      const maybe = JSON.parse(text);
      const scannedCode =
        maybe?.assetCode || maybe?.code || maybe?.asset?.code || null;
      const scannedId =
        maybe?.assetId || maybe?._id || maybe?.asset?._id || null;

      if (
        scannedCode &&
        request?.assetCode &&
        String(scannedCode) === String(request.assetCode)
      ) {
        return true;
      }
      if (
        scannedId &&
        request?.assetId &&
        String(scannedId) === String(request.assetId)
      ) {
        return true;
      }
    } catch (_) {
      // not JSON, fall back to plain text compare/contains
    }
    const plain = String(text || "").trim();
    if (request?.assetCode && plain.includes(String(request.assetCode)))
      return true;
    if (request?.assetId && plain.includes(String(request.assetId)))
      return true;
    return false;
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned) return;
    setScanned(true);

    if (!request) return;

    if (matchesAsset(data)) {
      const key = `qr_verified_${request._id}`;
      await AsyncStorage.setItem(key, "1");
      setScannerOpen(false);
      Alert.alert("Verified", "QR scan matched this asset. You can proceed.");
    } else {
      // allow rescan
      Alert.alert(
        "Mismatch",
        "This QR does not match the asset for this request. Please try again.",
        [{ text: "OK", onPress: () => setScanned(false) }]
      );
    }
  };

  if (loading || !request) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ color: "#6B7280", marginTop: 8 }}>
          Loading maintenance details…
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ padding: 12, backgroundColor: "#fff" }}>
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827" }}>
              {request.assetName}
            </Text>
          </View>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Spares */}
          <View style={{ marginBottom: 16 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Text
                style={{ fontWeight: "700", color: "#111827", fontSize: 16 }}
              >
                Spares
              </Text>
              <TouchableOpacity
                onPress={() => setShowSpareModal(true)}
                style={[
                  styles.pillBtn,
                  { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
                ]}
              >
                <Feather name="plus" size={16} color="#1D4ED8" />
                <Text
                  style={{ color: "#1D4ED8", fontWeight: "700", marginLeft: 6 }}
                >
                  Add Spares
                </Text>
              </TouchableOpacity>
            </View>

            {spareParts.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={{ color: "#6B7280" }}>No Spare Parts Added</Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {spareParts.map((p, i) => (
                  <View
                    key={`${p.name}-${i}`}
                    style={{
                      padding: 10,
                      backgroundColor: "#F3F4F6",
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ fontWeight: "600", color: "#111827" }}>
                      {p.name}
                    </Text>
                    <Text style={{ color: "#6B7280", marginTop: 2 }}>
                      Qty: {p.usedQuantity}
                      {p.assetSpareId ? `  •  id: ${p.assetSpareId}` : ""}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Remark */}
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.label}>Remark *</Text>
            <View style={styles.select}>
              <Text
                style={styles.selectText}
                onPress={() =>
                  Alert.alert(
                    "Choose Remark",
                    "",
                    [
                      ...remarkOptions.map((o) => ({
                        text: o,
                        onPress: () =>
                          setFormData((s) => ({ ...s, remark: o })),
                      })),
                      { text: "Cancel", style: "cancel" },
                    ],
                    { cancelable: true }
                  )
                }
              >
                {formData.remark || "Choose a Remark"}
              </Text>
              <Feather name="chevron-down" size={18} color="#6B7280" />
            </View>
            {formData.remark === "Others" && (
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                multiline
                numberOfLines={3}
                placeholder="Enter custom remark"
                value={formData.customRemark}
                onChangeText={(t) =>
                  setFormData((s) => ({ ...s, customRemark: t }))
                }
              />
            )}
          </View>

          {/* Repair Comment */}
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.label}>Repair Comment</Text>
            <View style={styles.select}>
              <Text
                style={styles.selectText}
                onPress={() =>
                  Alert.alert(
                    "Choose Repair Comment",
                    "",
                    [
                      ...repairCommentOptions.map((o) => ({
                        text: o,
                        onPress: () =>
                          setFormData((s) => ({ ...s, repairComment: o })),
                      })),
                      { text: "Cancel", style: "cancel" },
                    ],
                    { cancelable: true }
                  )
                }
              >
                {formData.repairComment || "Choose a Repair Comment (Optional)"}
              </Text>
              <Feather name="chevron-down" size={18} color="#6B7280" />
            </View>
            {formData.repairComment === "Others" && (
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                multiline
                numberOfLines={3}
                placeholder="Enter custom repair comment"
                value={formData.customRepairComment}
                onChangeText={(t) =>
                  setFormData((s) => ({ ...s, customRepairComment: t }))
                }
              />
            )}
          </View>

          {/* Status */}
          <View>
            <Text style={styles.label}>Status *</Text>
            <View style={styles.select}>
              <Text
                style={styles.selectText}
                onPress={() =>
                  Alert.alert(
                    "Choose Status",
                    "",
                    [
                      ...statusOptions.map((o) => ({
                        text: o.label,
                        onPress: () =>
                          setFormData((s) => ({ ...s, status: o.value })),
                      })),
                      { text: "Cancel", style: "cancel" },
                    ],
                    { cancelable: true }
                  )
                }
              >
                {statusOptions.find((o) => o.value === formData.status)
                  ?.label || "Select status"}
              </Text>
              <Feather name="chevron-down" size={18} color="#6B7280" />
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={submit}
            disabled={isSubmitting}
            style={[styles.primaryBtn, isSubmitting && { opacity: 0.6 }]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather
                  name="send"
                  size={18}
                  color="#fff"
                  style={{ marginRight: 6 }}
                />
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  Submit Acknowledgement
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <SparePartsModal
        visible={showSpareModal}
        onClose={() => setShowSpareModal(false)}
        onAdd={handleAddSpares}
      />

      {/* First-time QR verification modal */}
      <Modal
        visible={scannerOpen}
        animationType="slide"
        onRequestClose={() => setScannerOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          {/* Top bar */}
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              paddingTop: 50,
              paddingBottom: 12,
              paddingHorizontal: 16,
              backgroundColor: "rgba(0,0,0,0.35)",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              zIndex: 2,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
              Scan Asset QR (First-time verification)
            </Text>
            <TouchableOpacity
              onPress={() => {
                setScannerOpen(false);
                setScanned(false);
              }}
              style={{ padding: 6 }}
              accessibilityLabel="Close scanner"
            >
              <Feather name="x" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {hasPermission === null ? (
            <View style={styles.center}>
              <ActivityIndicator color="#fff" />
              <Text style={{ color: "#fff", marginTop: 8 }}>
                Requesting camera permission…
              </Text>
            </View>
          ) : hasPermission === false ? (
            <View style={styles.center}>
              <Text style={{ color: "#fff", marginBottom: 10 }}>
                Camera permission not granted.
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  const { status } =
                    await BarCodeScanner.requestPermissionsAsync();
                  setHasPermission(status === "granted");
                }}
                style={{
                  backgroundColor: "#f9fafb",
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: "#111827", fontWeight: "800" }}>
                  Allow Camera
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <BarCodeScanner
                onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
                style={StyleSheet.absoluteFillObject}
              />
              {scanned && (
                <TouchableOpacity
                  style={{
                    position: "absolute",
                    bottom: 40,
                    alignSelf: "center",
                    backgroundColor: "rgba(0,0,0,0.6)",
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 999,
                  }}
                  onPress={() => setScanned(false)}
                >
                  <Text style={{ color: "#fff", fontWeight: "800" }}>
                    Tap to Scan Again
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  /* ---------- Screen / Layout ---------- */
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },

  /* ---------- Card ---------- */
  card: {
    margin: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },

  /* ---------- Field Labels / Inputs ---------- */
  label: {
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    fontSize: 15,
    color: "#0f172a",
  },

  /* ---------- Select (press-to-open Alert) ---------- */
  select: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
  },
  selectText: {
    color: "#0f172a",
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },

  /* ---------- Spares Section ---------- */
  pillBtn: {
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
  },
  emptyBox: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },

  /* ---------- Primary CTA ---------- */
  primaryBtn: {
    marginTop: 16,
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 3,
  },

  /* ---------- Utility ---------- */
  muted: { color: "#6b7280" },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 10,
    borderRadius: 1,
  },
});
