// src/screens/AcknowledgementsScreen.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { maintenanceAPI, assetAPI, userAPI } from "../services/api";

const cap = (s) =>
  s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

/* --------------------------
   Status / Chips for UI
--------------------------- */
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
        style={{ marginRight: 6 }}
      />
      <Text style={{ color: c.fg, fontWeight: "700", fontSize: 12 }}>
        {c.label}
      </Text>
    </View>
  );
};

const prodChipFromAck = (ackStr) => {
  const val = String(ackStr || "")
    .trim()
    .toLowerCase();
  if (!val)
    return {
      bg: "#E0F2FE",
      fg: "#075985",
      icon: "tool",
      label: "Acknowledgement",
    };
  if (val === "false")
    return {
      bg: "#FEE2E2",
      fg: "#991B1B",
      icon: "alert-triangle",
      label: "Not Acknowledged",
    };
  if (val.includes("recheck"))
    return {
      bg: "#FFEDD5",
      fg: "#9A3412",
      icon: "alert-triangle",
      label: "Recheck Requested",
    };
  return { bg: "#DBEAFE", fg: "#1E3A8A", icon: "check", label: cap(val) };
};

const Pill = ({ chip }) => (
  <View style={[styles.statusPill, { backgroundColor: chip.bg }]}>
    <Feather
      name={chip.icon}
      size={14}
      color={chip.fg}
      style={{ marginRight: 6 }}
    />
    <Text style={{ color: chip.fg, fontWeight: "700", fontSize: 12 }}>
      {chip.label}
    </Text>
  </View>
);

const Row = ({ icon, label, value }) => (
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

/* --------------------------
   Cards
--------------------------- */
const SupervisorAckCard = ({ ack, assetName, creatorName }) => {
  const spares =
    Array.isArray(ack?.assetSpareId) && ack.assetSpareId.length > 0
      ? ack.assetSpareId.map((p) => p?.assetSpareName || p?._id).join(", ")
      : "N/A";

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Acknowledgement Details</Text>
        <StatusChip status={ack?.status} />
      </View>

      {/* Meta */}
      <Row icon="cpu" label="Asset" value={assetName || "—"} />
      {!!creatorName && (
        <Row icon="user" label="Created By" value={creatorName} />
      )}

      {/* Details */}
      <View style={{ paddingTop: 2 }}>
        <Row icon="message-circle" label="Remark" value={ack?.remark || "—"} />
        <Row
          icon="message-square"
          label="Comment"
          value={ack?.comment || "No comment provided"}
        />
        <Row icon="tag" label="Spare Parts Used" value={spares} />
        <Row
          icon="info"
          label="Acknowledgement ID"
          value={ack?.acknowledgementId || "—"}
        />
        <Row
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

const ProductionAckCard = ({ ack, assetName, creatorName }) => {
  const chip = prodChipFromAck(ack?.acknowledgement);
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Production Acknowledgement</Text>
        {/* <Pill chip={chip} /> */}
      </View>

      {/* Meta */}
      <Row icon="cpu" label="Asset" value={assetName || "—"} />
      {!!creatorName && (
        <Row icon="user" label="Created By" value={creatorName} />
      )}

      {/* Details */}
      <View style={{ paddingTop: 2 }}>
        <Row
          icon="info"
          label="Acknowledgement"
          value={ack?.acknowledgement || "—"}
        />
        <Row
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

/* --------------------------
   Screen
--------------------------- */
export default function AcknowledgementsScreen({ route, navigation }) {
  const assetId = route?.params?.assetId;
  const { user } = useAuth();
  const role = useMemo(
    () => (user?.accountType || user?.role || "").toLowerCase(),
    [user]
  );

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    navigation?.setOptions?.({ title: "Acknowledgements" });
  }, [navigation]);

  const hydrateNames = useCallback(async (list) => {
    // collect unique ids
    const assetIds = new Set();
    const creatorIds = new Set();

    list.forEach((it) => {
      if (it?.assetId) assetIds.add(it.assetId);
      const creatorId =
        it?.productionAcknowledgementCreator ||
        it?.assetMaintenanceRequestCreator ||
        it?.createdBy ||
        it?.creator;
      if (creatorId) creatorIds.add(creatorId);
    });

    // fetch employees once
    const employeesResp = await userAPI.getAllEmployees().catch(() => null);
    const employees = employeesResp?.data || employeesResp || [];
    const empMap = new Map(
      employees.map((e) => [
        e?._id,
        e?.fullName ||
          e?.name ||
          [e?.firstName, e?.lastName].filter(Boolean).join(" ") ||
          e?._id ||
          "—",
      ])
    );

    // fetch each asset detail (no batch endpoint, so fan out)
    const assetPairs = await Promise.all(
      [...assetIds].map(async (id) => {
        try {
          const r = await assetAPI.getAssetById(id);
          const data = r?.data || r;
          const name =
            data?.assetName || data?.asset?.assetName || data?.name || id;
          return [id, name];
        } catch {
          return [id, id];
        }
      })
    );
    const assetMap = new Map(assetPairs);

    // attach friendly names
    return list.map((it) => {
      const creatorId =
        it?.productionAcknowledgementCreator ||
        it?.assetMaintenanceRequestCreator ||
        it?.createdBy ||
        it?.creator;
      return {
        ...it,
        __assetName: assetMap.get(it?.assetId) || it?.assetId || "—",
        __creatorName: creatorId ? empMap.get(creatorId) || creatorId : "",
      };
    });
  }, []);

  const fetchData = useCallback(async () => {
    if (!assetId) {
      setError("No Asset ID provided.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");

    try {
      const useProductionAPI = role === "production" || role === "mechanic";
      const resp = useProductionAPI
        ? await maintenanceAPI.getProductionSatisfactionByAssetId(assetId)
        : await maintenanceAPI.getAcknowledgementsByAssetId(assetId);

      const raw = Array.isArray(resp?.data) ? resp.data : [];
      const hydrated = await hydrateNames(raw);
      setItems(hydrated);
    } catch (e) {
      setError(e?.message || "Failed to load acknowledgements.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [assetId, role, hydrateNames]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderItem = ({ item }) => {
    // detect shape: supervisor vs production
    const looksSupervisor =
      item?.status !== undefined ||
      item?.remark !== undefined ||
      Array.isArray(item?.assetSpareId);

    return looksSupervisor ? (
      <SupervisorAckCard
        ack={item}
        assetName={item.__assetName}
        creatorName={item.__creatorName}
      />
    ) : (
      <ProductionAckCard
        ack={item}
        assetName={item.__assetName}
        creatorName={item.__creatorName}
      />
    );
  };

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
      keyExtractor={(it, idx) =>
        it?._id || it?.acknowledgementId || String(idx)
      }
      contentContainerStyle={{ padding: 12 }}
      renderItem={renderItem}
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

/* --------------------------
   Styles
--------------------------- */
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F3F4F6",
  },
  cardTitle: { fontWeight: "800", color: "#111827" },

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
