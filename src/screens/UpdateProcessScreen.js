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
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as api from "../services/api";
import { maintenanceAPI as MAINT_MAYBE } from "../services/api";
import { Feather } from "@expo/vector-icons";
import SparePartsModal from "../components/SparePartsModal.native";

/* ---------------- Helpers for options ---------------- */
const normalizeOptions = (options) =>
  options.map((o) => (typeof o === "string" ? { label: o, value: o } : o));
const getLabel = (options, value) => {
  if (!value) return "";
  const os = normalizeOptions(options);
  return os.find((o) => o.value === value)?.label ?? value;
};

/* ---------------- Reusable UI: Select field + modal ---------------- */
const SelectField = ({ label, required, valueLabel, placeholder, onOpen }) => (
  <View>
    <Text style={styles.label}>
      {label} {required ? "*" : ""}
    </Text>
    <Pressable
      style={styles.select}
      onPress={onOpen}
      android_ripple={{ color: "#eef2ff" }}
    >
      <Text style={[styles.selectText, !valueLabel && styles.muted]}>
        {valueLabel || placeholder}
      </Text>
      <Feather name="chevron-down" size={18} color="#6B7280" />
    </Pressable>
  </View>
);

const SelectModal = ({ visible, title, options, onClose, onSelect }) => {
  const os = useMemo(() => normalizeOptions(options), [options]);
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Feather name="x" size={20} color="#6B7280" />
          </Pressable>
        </View>
        <FlatList
          data={os}
          keyExtractor={(item) => item.value}
          ItemSeparatorComponent={() => <View style={styles.listDivider} />}
          renderItem={({ item }) => (
            <Pressable
              style={styles.optionRow}
              onPress={() => {
                onSelect(item.value);
                onClose();
              }}
              android_ripple={{ color: "#f3f4f6" }}
            >
              <Text style={styles.optionLabel}>{item.label}</Text>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
};

/* ---------------- Screen ---------------- */
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

  // shared picker modal state
  const [picker, setPicker] = useState({
    visible: false,
    title: "",
    options: [],
    onSelect: () => {},
  });

  const openPicker = (title, options, onSelect) =>
    setPicker({ visible: true, title, options, onSelect });

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

  const statusLabel = getLabel(statusOptions, formData.status);
  const canSubmit =
    !!formData.status &&
    !!formData.remark &&
    (formData.remark !== "Others" || formData.customRemark.trim().length > 0) &&
    !isSubmitting;

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
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* Header */}
          <View style={styles.headerWrap}>
            {/* Uncomment to show a back button like web */}
            {/* <Pressable onPress={() => navigation.goBack()} style={styles.backRow} hitSlop={10}>
              <Feather name="arrow-left" size={20} color="#2563EB" />
              <Text style={styles.backText}>Back</Text>
            </Pressable> */}
            <View style={styles.titleWrap}>
              <Text style={styles.title}>{request.assetName}</Text>
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
                    style={{
                      color: "#1D4ED8",
                      fontWeight: "700",
                      marginLeft: 6,
                    }}
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

            <View style={styles.divider} />

            {/* Remark */}
            <View style={{ marginBottom: 12 }}>
              <SelectField
                label="Remark"
                required
                valueLabel={formData.remark}
                placeholder="Choose a Remark"
                onOpen={() =>
                  openPicker("Choose Remark", remarkOptions, (v) =>
                    setFormData((s) => ({ ...s, remark: v }))
                  )
                }
              />
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
              <SelectField
                label="Repair Comment"
                valueLabel={formData.repairComment}
                placeholder="Choose a Repair Comment (Optional)"
                onOpen={() =>
                  openPicker(
                    "Choose Repair Comment",
                    repairCommentOptions,
                    (v) => setFormData((s) => ({ ...s, repairComment: v }))
                  )
                }
              />
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
              <SelectField
                label="Status"
                required
                valueLabel={statusLabel}
                placeholder="Select status"
                onOpen={() =>
                  openPicker("Choose Status", statusOptions, (v) =>
                    setFormData((s) => ({ ...s, status: v }))
                  )
                }
              />
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={submit}
              disabled={!canSubmit}
              style={[
                styles.primaryBtn,
                (!canSubmit || isSubmitting) && { opacity: 0.6 },
              ]}
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
      </KeyboardAvoidingView>

      <SparePartsModal
        visible={showSpareModal}
        onClose={() => setShowSpareModal(false)}
        onAdd={handleAddSpares}
      />

      {/* Shared picker modal for all selects */}
      <SelectModal
        visible={picker.visible}
        title={picker.title}
        options={picker.options}
        onClose={() => setPicker((s) => ({ ...s, visible: false }))}
        onSelect={(v) => picker.onSelect(v)}
      />
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
    backgroundColor: "#f8fafc",
  },

  /* ---------- Header ---------- */
  headerWrap: {
    padding: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backRow: { flexDirection: "row", alignItems: "center" },
  backText: { color: "#2563EB", fontWeight: "800", marginLeft: 6 },
  titleWrap: { marginTop: 8 },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: 0.2,
  },
  subtitle: { color: "#6b7280", marginTop: 2, fontWeight: "600" },

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

  /* ---------- Select (tap-to-open sheet) ---------- */
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
  selectText: { color: "#0f172a", fontWeight: "600", flex: 1, marginRight: 8 },

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

  /* ---------- Bottom Sheet Modal ---------- */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "60%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 10,
    elevation: 10,
  },
  sheetHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  optionRow: { paddingHorizontal: 16, paddingVertical: 14 },
  optionLabel: { fontSize: 15, color: "#111827", fontWeight: "600" },
  listDivider: { height: 1, backgroundColor: "#f3f4f6" },
});
