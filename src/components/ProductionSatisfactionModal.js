import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as api from "../services/api";

/**
 * Props: isOpen, onClose, assetId, assetName, onSuccess
 */
export default function ProductionSatisfactionModal({
  isOpen,
  onClose,
  assetId,
  assetName,
  onSuccess,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [satisfaction, setSatisfaction] = useState(""); // "Yes" | "No"
  // 🔁 remark -> acknowledgement (string)
  const [acknowledgement, setAcknowledgement] = useState("");
  const [errors, setErrors] = useState({});

  // Support any of your service exports
  const submitFn =
    api?.submit_production_satisfaction ||
    api?.maintenanceAPI?.submitProductionSatisfaction ||
    api?.submitProductionSatisfaction ||
    null;

  const validate = () => {
    const next = {};
    if (!satisfaction) next.satisfaction = "Please select Yes or No";
    if (satisfaction === "No" && !acknowledgement.trim())
      next.acknowledgement = "Acknowledgement is required when selecting No";
    if (!assetId) next.submit = "Asset ID not found.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      setErrors({});

      // ✅ Desired payload:
      // { "isProductionSatisfiedByMechanic": "No", "acknowledgement": "OKAY KARAN FIXED" }
      const payload = {
        isProductionSatisfiedByMechanic: satisfaction, // "Yes" | "No"
        ...(satisfaction === "No"
          ? { acknowledgement: acknowledgement.trim() }
          : {}), // include only when "No"
      };

      if (!submitFn) {
        throw new Error(
          "submit_production_satisfaction API not found in services/api"
        );
      }

      const resp = await submitFn(assetId, payload);

      if (resp?.success) {
        handleClose();
        onSuccess?.();
      } else {
        throw new Error(
          resp?.message || "Failed to submit production satisfaction"
        );
      }
    } catch (error) {
      const serverMsg =
        error?.response?.data?.message || error?.message || "Submission failed";
      setErrors({ submit: serverMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSatisfaction("");
    setAcknowledgement("");
    setErrors({});
    onClose?.();
  };

  return (
    <Modal visible={isOpen} animationType="fade" transparent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.title}>Machine Working Status</Text>
            <TouchableOpacity onPress={handleClose} disabled={isSubmitting}>
              <Feather name="x" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.muted}>
            <Text style={{ fontWeight: "700", color: "#111827" }}>Asset:</Text>{" "}
            {assetName || "N/A"}
          </Text>
          <Text style={[styles.muted, { marginBottom: 12 }]}>
            Is the machine working properly after maintenance?
          </Text>

          {/* Yes/No */}
          <Text style={styles.label}>Production Satisfaction *</Text>
          <View style={{ gap: 10, marginBottom: 8 }}>
            <TouchableOpacity
              style={styles.radioRow}
              onPress={() => {
                setSatisfaction("Yes");
                setAcknowledgement("");
                setErrors((e) => ({
                  ...e,
                  satisfaction: "",
                  acknowledgement: "",
                }));
              }}
              disabled={isSubmitting}
            >
              <Feather
                name={satisfaction === "Yes" ? "check-circle" : "circle"}
                size={18}
                color={satisfaction === "Yes" ? "#2563EB" : "#9CA3AF"}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.radioText}>Yes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.radioRow}
              onPress={() => {
                setSatisfaction("No");
                setErrors((e) => ({ ...e, satisfaction: "" }));
              }}
              disabled={isSubmitting}
            >
              <Feather
                name={satisfaction === "No" ? "check-circle" : "circle"}
                size={18}
                color={satisfaction === "No" ? "#2563EB" : "#9CA3AF"}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.radioText}>No</Text>
            </TouchableOpacity>
          </View>
          {!!errors.satisfaction && (
            <Text style={styles.errorText}>{errors.satisfaction}</Text>
          )}

          {/* Acknowledgement when No */}
          {satisfaction === "No" && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Acknowledgement *</Text>
              <TextInput
                style={[
                  styles.input,
                  !!errors.acknowledgement && { borderColor: "#EF4444" },
                ]}
                placeholder="Add acknowledgement / reason / action taken..."
                value={acknowledgement}
                onChangeText={(t) => {
                  setAcknowledgement(t);
                  setErrors((e) => ({ ...e, acknowledgement: "" }));
                }}
                multiline
                numberOfLines={3}
                editable={!isSubmitting}
              />
              {!!errors.acknowledgement && (
                <Text style={styles.errorText}>{errors.acknowledgement}</Text>
              )}
            </View>
          )}

          {!!errors.submit && (
            <Text style={[styles.errorText, { marginTop: 10 }]}>
              {errors.submit}
            </Text>
          )}

          {/* Actions */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: "#F3F4F6" }]}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={[styles.btnLabel, { color: "#111827" }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btn,
                {
                  backgroundColor: "#2563EB",
                  flex: 1,
                  opacity: isSubmitting ? 0.7 : 1,
                },
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnLabel}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#111827" },
  label: { fontWeight: "700", color: "#111827", marginTop: 8, marginBottom: 6 },
  muted: { color: "#6B7280" },
  radioRow: { flexDirection: "row", alignItems: "center" },
  radioText: { color: "#111827", fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff",
    textAlignVertical: "top",
  },
  errorText: { color: "#EF4444", marginTop: 4, fontSize: 12 },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    flex: 1,
  },
  btnLabel: { color: "#fff", fontWeight: "700" },
});
