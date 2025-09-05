// src/screens/AcknowledgementsScreen.js
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import * as api from "../services/api";
import { Feather } from "@expo/vector-icons";

const cap = (s) =>
  s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

const StatusChip = ({ status }) => {
  const s = (status || "").toLowerCase();
  const map = {
    completed: {
      bg: "#DCFCE7",
      fg: "#166534",
      icon: "check-circle",
      label: "Completed",
    },
    in_progress: {
      bg: "#FFE4D5",
      fg: "#C2410C",
      icon: "loader",
      label: "In Progress",
      spin: true,
    },
  };
  const c = map[s] || {
    bg: "#E0F2FE",
    fg: "#075985",
    icon: "tool",
    label: cap(s || "status"),
  };
  return (
    <View style={[styles.statusPill, { backgroundColor: c.bg }]}>
      <Feather
        name={c.icon}
        size={14}
        color={c.fg}
        style={c.spin ? { marginRight: 6 } : { marginRight: 6 }}
      />
      <Text style={{ color: c.fg, fontWeight: "700", fontSize: 12 }}>
        {c.label}
      </Text>
    </View>
  );
};

const DetailRow = ({ icon, label, value }) => (
  <View
    style={{
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: 6,
    }}
  >
    <Feather
      name={icon}
      size={16}
      color="#9CA3AF"
      style={{ marginRight: 10, marginTop: 2 }}
    />
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 12, color: "#6B7280" }}>{label}</Text>
      <Text style={{ color: "#111827", fontWeight: "500" }}>{value}</Text>
    </View>
  </View>
);

const AckCard = ({ ack }) => {
  const spareParts =
    Array.isArray(ack?.assetSpareId) && ack.assetSpareId.length > 0
      ? ack.assetSpareId.map((p) => p?.assetSpareName || p?._id).join(", ")
      : "N/A";

  return (
    <View style={styles.card}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: 8,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: "#F3F4F6",
        }}
      >
        <Text style={{ fontWeight: "700", color: "#111827" }}>
          Acknowledgement Details
        </Text>
        <StatusChip status={ack?.status} />
      </View>

      <View style={{ paddingTop: 8 }}>
        <DetailRow
          icon="message-circle"
          label="Remark"
          value={ack?.remark || "—"}
        />
        <DetailRow
          icon="message-square"
          label="Comment"
          value={ack?.comment || "No comment provided"}
        />
        <DetailRow icon="tag" label="Spare Parts Used" value={spareParts} />
        <DetailRow
          icon="info"
          label="Acknowledgement ID"
          value={ack?.acknowledgementId || "—"}
        />
        <DetailRow
          icon="calendar"
          label="Date"
          value={
            ack?.createdAt ? new Date(ack.createdAt).toLocaleString() : "—"
          }
        />
      </View>
    </View>
  );
};

export default function AcknowledgementsScreen({ route, navigation }) {
  const assetId = route?.params?.assetId;
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    navigation?.setOptions?.({ title: "Acknowledgements" });
  }, [navigation]);

  const fetchData = useCallback(async () => {
    if (!assetId) {
      setError("No Asset ID provided.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const resp = await api.get_acknowledgements(assetId);
      setItems(Array.isArray(resp?.data) ? resp.data : []);
    } catch (e) {
      setError(e?.message || "Failed to load acknowledgements.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { padding: 16 }]}>
        <Feather
          name="alert-triangle"
          size={28}
          color="#DC2626"
          style={{ marginBottom: 8 }}
        />
        <Text
          style={{ color: "#DC2626", textAlign: "center", marginBottom: 12 }}
        >
          {error}
        </Text>
        <TouchableOpacity style={styles.tryBtn} onPress={fetchData}>
          <Text style={styles.tryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(it, idx) => it?._id || String(idx)}
      contentContainerStyle={{ padding: 12 }}
      renderItem={({ item }) => <AckCard ack={item} />}
      ListEmptyComponent={
        <View style={[styles.center, { padding: 24 }]}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 999,
              backgroundColor: "#F3F4F6",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 8,
            }}
          >
            <Feather name="file-text" size={28} color="#9CA3AF" />
          </View>
          <Text
            style={{ fontWeight: "700", color: "#111827", marginBottom: 4 }}
          >
            No Acknowledgements Found
          </Text>
          <Text style={{ color: "#6B7280", textAlign: "center" }}>
            There are no acknowledgement records for this asset.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tryBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  tryBtnText: { color: "#fff", fontWeight: "700" },
});
