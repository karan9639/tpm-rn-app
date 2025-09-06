// src/screens/RequestMaintenanceScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import * as api from "../services/api";

const PRIORITIES = ["Low", "Medium", "High"];

export default function RequestMaintenanceScreen({ route, navigation }) {
  const { assetId, assetName, onSuccess } = route.params || {};
  const [priority, setPriority] = useState("Medium");
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!assetId) {
      Alert.alert("Missing info", "Asset ID is required.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    }
  }, [assetId]);

  const submit = async () => {
    setError("");
    if (!priority || !remark.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      await api.create_maintenance_request(assetId, { priority, remark });
      Alert.alert("Success", "Maintenance request submitted successfully.");
      if (typeof onSuccess === "function") onSuccess();
      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", e?.message || "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  const Chip = ({ value }) => {
    const selected = priority === value;
    return (
      <TouchableOpacity
        onPress={() => setPriority(value)}
        style={[styles.chip, selected && styles.chipSelected]}
      >
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
          {value}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Request Maintenance</Text>
      {!!assetName && <Text style={styles.subtitle}>For: {assetName}</Text>}

      <Text style={styles.label}>Priority *</Text>
      <View style={styles.chipsRow}>
        {PRIORITIES.map((p) => (
          <Chip key={p} value={p} />
        ))}
      </View>

      <Text style={[styles.label, { marginTop: 14 }]}>Remarks *</Text>
      <TextInput
        placeholder="Describe the issue with the machine..."
        value={remark}
        onChangeText={setRemark}
        style={styles.input}
        multiline
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.row}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.btn, styles.btnGhost]}
          disabled={submitting}
        >
          <Text style={[styles.btnText, styles.btnGhostText]}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={submit}
          style={[styles.btn, styles.btnPrimary]}
          disabled={submitting}
        >
          <Text style={styles.btnText}>
            {submitting ? "Submitting..." : "Submit Request"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const COLORS = {
  bg: "#ffffff",
  surface: "#ffffff",
  text: "#0f172a",
  textMuted: "#6b7280",
  border: "#e5e7eb",
  borderStrong: "#d1d5db",
  primary: "#2563eb",
  primaryDark: "#1e40af",
  primarySoft: "#dbeafe",
  primaryBorder: "#93c5fd",
  chipBg: "#ffffff",
  chipText: "#111827",
  error: "#b00020",
  errorBg: "#fef2f2",
  errorBorder: "#fecaca",
  inputBg: "#f9fafb",
  ghostBg: "#f3f4f6",
};

const SHADOWS = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6,
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
    backgroundColor: COLORS.bg,
  },

  // Headers
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: 14,
  },

  // Labels
  label: {
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
    fontSize: 14,
  },

  // Priority Chips
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.chipBg,
    ...SHADOWS.sm,
  },
  chipSelected: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primaryBorder,
    ...SHADOWS.md,
  },
  chipText: {
    color: COLORS.chipText,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  chipTextSelected: {
    color: COLORS.primaryDark,
  },

  // Input
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    minHeight: 130,
    textAlignVertical: "top",
    backgroundColor: COLORS.inputBg,
    fontSize: 16,
    lineHeight: 22,
    ...SHADOWS.sm,
  },

  // Error
  error: {
    color: COLORS.error,
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
    fontSize: 13,
  },

  // Buttons
  row: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  btn: {
    flex: 1,
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.md,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
  },
  btnGhost: {
    backgroundColor: COLORS.ghostBg,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    ...SHADOWS.sm,
  },
  btnText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  btnGhostText: {
    color: COLORS.text,
  },
});

