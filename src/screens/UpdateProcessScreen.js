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
} from "react-native";
import * as api from "../services/api";
import { maintenanceAPI as MAINT_MAYBE } from "../services/api";
import { Feather } from "@expo/vector-icons";
import SparePartsModal from "../components/SparePartsModal.native";

export default function UpdateProcessScreen({ route, navigation }) {
  const requestFromNav = route?.params?.request || null;
  const requestId = route?.params?.requestId || requestFromNav?._id;

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

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
        setRequest({
          _id: r._id,
          maintenanceId: r.maintenanceId || r._id,
          assetId: r.assetDetails?._id || r.assetId?._id || r.assetId,
          assetName:
            r.assetDetails?.assetName || r.assetName || "Unknown Asset",
          assetCode: r.assetDetails?.assetCode || r.assetCode || "N/A",
        });
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

      // Use the same naming as web with safe fallbacks.
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
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ flexDirection: "row" }}
          >
            <Feather name="arrow-left" size={20} color="#2563EB" />
            <Text
              style={{ color: "#2563EB", fontWeight: "700", marginLeft: 6 }}
            >
              Back
            </Text>
          </TouchableOpacity>

          <View style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827" }}>
              Update Process
            </Text>
            <Text style={{ color: "#6B7280", marginTop: 2 }}>
              {request.assetCode} - {request.assetName}
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
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    margin: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff",
  },
  label: { fontWeight: "700", color: "#111827", marginBottom: 6 },
  select: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },
  selectText: { color: "#111827", fontWeight: "500", flex: 1, marginRight: 8 },
  emptyBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingVertical: 18,
    alignItems: "center",
  },
  pillBtn: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
});
