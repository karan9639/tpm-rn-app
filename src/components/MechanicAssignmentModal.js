// src/components/MechanicAssignmentModal.js
import React, { useEffect, useState, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Alert,
  Pressable,
} from "react-native";
import * as api from "../services/api";

/**
 * Props:
 * - isOpen: boolean
 * - onClose: function
 * - request: maintenance request object (needs assetDetails._id or assetId)
 * - onSuccess: callback after successful assignment
 */
const MechanicAssignmentModal = ({ isOpen, onClose, request, onSuccess }) => {
  const [mechanics, setMechanics] = useState([]);
  const [selectedMechanic, setSelectedMechanic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState("");

  const assetName =
    request?.assetDetails?.assetName || request?.asset?.assetName || "N/A";

  const assetId =
    request?.assetDetails?._id ||
    request?.assetId ||
    request?.asset?._id ||
    null;

  const loadMechanics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      // Try multiple possible API shapes to match your web code & RN services
      const res = (api.userAPI && api.userAPI.getAllEmployees
        ? await api.userAPI.getAllEmployees()
        : api.get_all_employees
        ? await api.get_all_employees()
        : { data: [] }) || { data: [] };

      const list = Array.isArray(res.data) ? res.data : [];

      const mech = list.filter(
        (emp) => (emp?.accountType || "").toLowerCase() === "mechanic"
      );

      setMechanics(mech);

      if (mech.length === 0) {
        Alert.alert("Info", "No mechanics found in the system.");
      }
    } catch (e) {
      const msg = e?.message || "Failed to load mechanics.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelectedMechanic("");
      setError("");
      loadMechanics();
    }
  }, [isOpen, loadMechanics]);

  const handleAssign = async () => {
    if (!selectedMechanic) {
      Alert.alert("Validation", "Please select a mechanic to assign.");
      return;
    }
    if (!assetId) {
      Alert.alert("Error", "Asset ID not found. Cannot assign mechanic.");
      return;
    }

    try {
      setIsAssigning(true);

      // Match web code call; fallback if your RN service names differ
      if (api.maintenanceAPI?.assignMechanic) {
        await api.maintenanceAPI.assignMechanic(assetId, selectedMechanic);
      } else if (api.assign_mechanic) {
        await api.assign_mechanic(assetId, selectedMechanic);
      } else {
        throw new Error("assignMechanic API not available.");
      }

      const chosen =
        mechanics.find((m) => m._id === selectedMechanic)?.fullName ||
        "Mechanic";
      Alert.alert("Success", `Assigned ${chosen} to this maintenance request.`);
      onSuccess?.();
      onClose?.();
    } catch (e) {
      Alert.alert("Error", e?.message || "Failed to assign mechanic.");
    } finally {
      setIsAssigning(false);
    }
  };

  const closeModal = () => {
    setSelectedMechanic("");
    setError("");
    onClose?.();
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={closeModal}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={closeModal} />

      {/* Modal card */}
      <View style={styles.centerWrap}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, marginRight: 8, minWidth: 0 }}>
              <Text style={styles.title}>Assign Mechanic</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                Asset: {assetName}
              </Text>
            </View>
            <TouchableOpacity
              onPress={closeModal}
              style={styles.closeBtn}
              hitSlop={10}
            >
              <Text style={{ fontSize: 20, color: "#6b7280" }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.body}>
            {isLoading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator />
                <Text style={styles.mutedText}>Loading mechanics...</Text>
              </View>
            ) : error ? (
              <View style={styles.centerBox}>
                <Text style={[styles.mutedText, { marginBottom: 8 }]}>
                  {error}
                </Text>
                <TouchableOpacity
                  onPress={loadMechanics}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : mechanics.length === 0 ? (
              <View style={styles.centerBox}>
                <Text style={styles.mutedText}>
                  No mechanics found in the system.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.label}>Select Mechanic:</Text>
                <FlatList
                  data={mechanics}
                  keyExtractor={(m) => m._id}
                  contentContainerStyle={{ paddingBottom: 6 }}
                  renderItem={({ item }) => {
                    const isSelected = selectedMechanic === item._id;
                    return (
                      <TouchableOpacity
                        onPress={() => setSelectedMechanic(item._id)}
                        style={[
                          styles.mechanicRow,
                          isSelected ? styles.rowActive : styles.rowInactive,
                        ]}
                        activeOpacity={0.9}
                      >
                        <View style={styles.avatar}>
                          <Text style={{ color: "#1D4ED8", fontWeight: "700" }}>
                            {String(item.fullName || item.employeeName || "?")
                              .trim()
                              .charAt(0)
                              .toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.mechName} numberOfLines={1}>
                            {item.fullName || item.employeeName || "Unknown"}
                          </Text>
                          {!!item.email && (
                            <Text style={styles.mechEmail} numberOfLines={1}>
                              {item.email}
                            </Text>
                          )}
                          {!!item.jobTitle && (
                            <Text style={styles.mechJob} numberOfLines={1}>
                              {item.jobTitle}
                            </Text>
                          )}
                        </View>
                        <View
                          style={[
                            styles.radio,
                            isSelected ? styles.radioOn : styles.radioOff,
                          ]}
                        />
                      </TouchableOpacity>
                    );
                  }}
                />
              </>
            )}
          </View>

          {/* Footer */}
          {!isLoading && !error && mechanics.length > 0 && (
            <View style={styles.footer}>
              <TouchableOpacity onPress={closeModal} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAssign}
                disabled={!selectedMechanic || isAssigning}
                style={[
                  styles.primaryBtn,
                  (!selectedMechanic || isAssigning) && { opacity: 0.5 },
                ]}
              >
                {isAssigning ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Assign Mechanic</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default MechanicAssignmentModal;

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  centerWrap: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "90%",
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
  },
  title: { fontSize: 18, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  body: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  centerBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  mutedText: { color: "#6B7280", marginTop: 8, textAlign: "center" },
  label: { fontWeight: "600", color: "#111827", marginBottom: 8 },
  mechanicRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  rowActive: { borderColor: "#3B82F6", backgroundColor: "#EFF6FF" },
  rowInactive: { borderColor: "#E5E7EB", backgroundColor: "#fff" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  mechName: { fontWeight: "600", color: "#111827" },
  mechEmail: { fontSize: 12, color: "#6B7280" },
  mechJob: { fontSize: 11, color: "#9CA3AF" },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginLeft: 10,
  },
  radioOn: { backgroundColor: "#2563EB" },
  radioOff: { backgroundColor: "#E5E7EB" },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    padding: 12,
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelBtnText: { color: "#374151", fontWeight: "700" },
  primaryBtn: {
    flex: 1,
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
});
