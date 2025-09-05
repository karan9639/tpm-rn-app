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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  subtitle: { color: "#6b7280", marginBottom: 12 },
  label: { fontWeight: "600", color: "#111827", marginBottom: 6 },
  chipsRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  chipSelected: { backgroundColor: "#dbeafe", borderColor: "#93c5fd" },
  chipText: { color: "#111827", fontWeight: "600" },
  chipTextSelected: { color: "#1e40af" },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 12,
    minHeight: 120,
    textAlignVertical: "top",
    backgroundColor: "#fff",
  },
  error: { color: "#b00020", marginTop: 10 },
  row: { flexDirection: "row", gap: 10, marginTop: 16 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  btnPrimary: { backgroundColor: "#2563eb" },
  btnGhost: { backgroundColor: "#f3f4f6" },
  btnText: { color: "#fff", fontWeight: "700" },
  btnGhostText: { color: "#111827" },
});
