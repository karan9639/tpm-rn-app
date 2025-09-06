// src/components/SparePartsModal.native.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { sparePartsAPI as SPA_MAYBE } from "../services/api";
import * as api from "../services/api";

export default function SparePartsModal({ visible, onClose, onAdd }) {
  const [availableParts, setAvailableParts] = useState([]);
  const [selectedParts, setSelectedParts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // pick whichever export exists in your api module
  const getAvailablePartsFn =
    SPA_MAYBE?.getAvailableParts ||
    api?.sparePartsAPI?.getAvailableParts ||
    api?.getAvailableParts ||
    null;

  useEffect(() => {
    if (visible) loadAvailableParts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const loadAvailableParts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!getAvailablePartsFn) {
        throw new Error(
          "sparePartsAPI.getAvailableParts API not found in services/api"
        );
      }

      const response = await getAvailablePartsFn();

      // same normalization as web
      const d = response?.data;
      const rawList = Array.isArray(d)
        ? d
        : Array.isArray(d?.items)
        ? d.items
        : Array.isArray(d?.results)
        ? d.results
        : Array.isArray(d?.docs)
        ? d.docs
        : d && typeof d === "object" && Object.keys(d).length === 0
        ? []
        : null;

      const msg = String(response?.message ?? "").toLowerCase();
      const saysNoParts = /no asset spare found|no\s*(spare\s*)?parts/.test(
        msg
      );

      if (response?.success && rawList !== null) {
        const transformed = rawList.map((part) => ({
          id: part._id,
          _id: part._id,
          name: part.assetSpareName,
          code: part._id,
          category: part.assetSpareCategory?.assetCategory || "N/A",
          isSpecialSpare: part.isAssetSpecialSpare,
          createdAt: part.createdAt,
          updatedAt: part.updatedAt,
          availableQuantity: 1,
          selectedQuantity: 0,
        }));
        setAvailableParts(transformed);
        return;
      }

      if (response?.success && saysNoParts) {
        setAvailableParts([]);
        setError(null);
        return;
      }

      throw new Error(response?.message || "Invalid response format");
    } catch (err) {
      const status = err?.response?.status;
      const emsg =
        err?.response?.data?.message ??
        err?.message ??
        "Failed to load spare parts.";
      if (
        status === 204 ||
        status === 404 ||
        /no asset spare found|no\s*(spare\s*)?parts/i.test(String(emsg))
      ) {
        setAvailableParts([]);
        setError(null);
      } else {
        setError(emsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getQty = (partId) =>
    selectedParts.find((p) => p.id === partId)?.usedQuantity || 0;

  const changeQty = (partId, qty) => {
    if (qty === 0) {
      setSelectedParts((prev) => prev.filter((p) => p.id !== partId));
      return;
    }
    setSelectedParts((prev) => {
      const existing = prev.find((p) => p.id === partId);
      if (existing) {
        return prev.map((p) =>
          p.id === partId ? { ...p, usedQuantity: qty } : p
        );
      }
      const part = availableParts.find((p) => p.id === partId);
      if (!part) return prev;
      return [
        ...prev,
        { ...part, usedQuantity: qty, assetSpareId: part._id }, // backend field
      ];
    });
  };

  const handleAdd = () => {
    if (selectedParts.length === 0) return;
    onAdd([...selectedParts]);
    setSelectedParts([]);
  };

  const handleClose = () => {
    setSelectedParts([]);
    setError(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { maxHeight: "85%" }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.title}>Add Spare Parts</Text>
            <TouchableOpacity onPress={handleClose}>
              <Feather name="x" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator />
              <Text style={styles.muted}>Loading spare parts…</Text>
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Text style={styles.errorTitle}>Failed to load parts</Text>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={loadAvailableParts} style={styles.btn}>
                <Text style={styles.btnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : availableParts.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.title}>No Spare Parts Available</Text>
              <Text style={styles.muted}>Spare parts not available.</Text>
            </View>
          ) : (
            <FlatList
              data={availableParts}
              keyExtractor={(it) => String(it.id)}
              contentContainerStyle={{ paddingVertical: 6 }}
              renderItem={({ item }) => (
                <View style={styles.partRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontWeight: "600", color: "#111827" }}>
                      {item.name}
                    </Text>
                    <Text style={{ color: "#6B7280", fontSize: 12 }}>
                      Category: {item.category}
                    </Text>
                    <Text style={{ color: "#9CA3AF", fontSize: 11 }}>
                      ID: {item.code}
                    </Text>
                  </View>
                  <View style={styles.qtyBox}>
                    <TouchableOpacity
                      onPress={() =>
                        changeQty(item.id, Math.max(0, getQty(item.id) - 1))
                      }
                      disabled={getQty(item.id) === 0}
                      style={[
                        styles.qtyBtn,
                        getQty(item.id) === 0 && { opacity: 0.5 },
                      ]}
                    >
                      <Feather name="minus" size={16} color="#111827" />
                    </TouchableOpacity>
                    <Text style={{ width: 24, textAlign: "center" }}>
                      {getQty(item.id)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => changeQty(item.id, getQty(item.id) + 1)}
                      style={styles.qtyBtn}
                    >
                      <Feather name="plus" size={16} color="#111827" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}

          {/* Footer */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <TouchableOpacity style={styles.btn} onPress={handleClose}>
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btn,
                {
                  backgroundColor: "#2563EB",
                  flex: 1,
                  opacity: selectedParts.length === 0 ? 0.5 : 1,
                },
              ]}
              disabled={selectedParts.length === 0}
              onPress={handleAdd}
            >
              <Feather name="check" color="#fff" size={16} />
              <Text style={[styles.btnText, { marginLeft: 6 }]}>
                Add Selected ({selectedParts.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: { fontWeight: "700", fontSize: 16, color: "#111827" },
  center: { alignItems: "center", paddingVertical: 24 },
  muted: { color: "#6B7280", marginTop: 6 },
  errorTitle: { color: "#B91C1C", fontWeight: "700" },
  errorText: { color: "#6B7280", marginTop: 4, textAlign: "center" },
  btn: {
    backgroundColor: "#111827",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    flexDirection: "row",
  },
  btnText: { color: "#fff", fontWeight: "700" },
  partRow: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  qtyBox: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 999,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
