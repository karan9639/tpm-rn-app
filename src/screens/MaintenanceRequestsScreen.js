import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import * as api from "../services/api";
import { useAuth } from "../context/AuthContext";

// ---------- helpers (ported from your web code) ----------
const deriveStatus = (req, hasMaintenanceId = false) => {
  const st = (req?.status || "").toLowerCase();
  if (["pending", "assigned", "in_progress", "completed"].includes(st)) {
    return st;
  }
  if (req && req.isActive === false) return "completed";
  if (st === "in_progress") return "in_progress";
  if (hasMaintenanceId || req?.maintenanceId) return "assigned";
  return "pending";
};

// supervisor -> all requests
const normalizeAllRequestsData = (data) => {
  if (!Array.isArray(data)) return [];
  return data.map((item) => ({
    _id: item?._id,
    assetId: item?.assetId?._id,
    assetMaintenanceRequestId: item?.assetMaintenanceRequestId,
    maintenanceId: item?.maintenanceId,
    isActive: item?.isActive,
    createdAt: item?.createdAt,
    updatedAt: item?.updatedAt,
    priority: item?.priority || "Medium",
    remark: item?.remark || "No remarks",
    assetMaintenanceRequestCreator: item?.assetMaintenanceRequestCreator,
    status: item?.status || deriveStatus(item),
    acknowledgementId: item?.acknowledgementId,
    assetDetails: {
      _id: item?.assetId?._id,
      assetName: item?.assetId?.assetName || "N/A",
      assetCode: item?.assetId?.assetCode || "N/A",
      assetStatus: item?.assetId?.assetStatus || "N/A",
      locationName: item?.assetId?.location?.locationName || "N/A",
      underMaintenance: item?.assetId?.underMaintenance || false,
    },
    mechanicDetails: null,
    creatorDetails: item?.assetMaintenanceRequestCreator,
  }));
};

// supervisor -> assigned list
const normalizeAssignedRequestsData = (data) => {
  if (!Array.isArray(data)) return [];
  return data.map((item) => {
    const requestDetails = item?.assetMaintenanceRequestDetails?.[0] || {};
    const assetDetails = requestDetails?.assetDetails?.[0] || {};
    const mechanicDetails = item?.mechanicDetails?.[0] || null;

    return {
      _id: item?._id,
      assetId: item?.assetId,
      assetMaintenanceRequestId: item?.assetMaintenanceRequestId,
      maintenanceId: item?.maintenanceId,
      isActive: item?.isActive,
      createdAt: requestDetails?.createdAt || item?.createdAt,
      updatedAt: item?.updatedAt,
      priority: requestDetails?.priority || "Medium",
      remark: requestDetails?.remark || "No remarks",
      assetMaintenanceRequestCreator: item?.assetMaintenanceRequestCreator,
      status: item?.status || deriveStatus(item, true),
      acknowledgementId: item?.acknowledgementId,
      assetDetails: {
        ...assetDetails,
        assetName: assetDetails?.assetName || "N/A",
        assetCode: assetDetails?.assetCode || "N/A",
        assetStatus: assetDetails?.assetStatus || "N/A",
        locationName: assetDetails?.location?.locationName || "N/A",
      },
      mechanicDetails,
    };
  });
};

// production / mechanic role specific
const normalizeRequestData = (data, userRole) => {
  if (!Array.isArray(data)) return [];

  return data.map((item) => {
    const role = (userRole || "").toLowerCase();
    if (role === "production") {
      // production endpoint: get_all_requests_with_mechanic
      const asset0 = Array.isArray(item?.asset) && item.asset[0];
      const locationName =
        asset0?.location &&
        Array.isArray(asset0?.location) &&
        asset0.location[0]
          ? asset0.location[0].locationName
          : "N/A";
      const mechanic =
        item?.result &&
        item.result[0] &&
        item.result[0].mechanic &&
        item.result[0].mechanic[0]
          ? item.result[0].mechanic[0]
          : null;

      return {
        ...item,
        _id: item?._id,
        status: item?.status || deriveStatus(item),
        priority: item?.priority || "Medium",
        remark: item?.remark || item?.description || "No remarks",
        assetDetails: asset0
          ? { ...asset0, locationName }
          : { assetName: "N/A", assetCode: "N/A", locationName: "N/A" },
        mechanicDetails: mechanic,
      };
    }

    if (role === "mechanic") {
      // mechanic endpoint: get_my_assigned_maintenances
      return {
        _id: item?._id,
        assetId: item?.assetId?._id,
        assetMaintenanceRequestId: item?.assetMaintenanceRequestId,
        maintenanceId: item?.maintenanceId,
        isActive: item?.isActive,
        createdAt: item?.createdAt,
        updatedAt: item?.updatedAt,
        priority: "Medium",
        remark: "Assigned maintenance task",
        assetMaintenanceRequestCreator: item?.assetId?.assetCreator,
        status: item?.status || deriveStatus(item),
        acknowledgementId: item?.acknowledgementId,
        assetDetails: {
          ...item?.assetId,
          assetName: item?.assetId?.assetName || "N/A",
          assetCode: item?.assetId?.assetCode || "N/A",
          assetStatus: item?.assetId?.assetStatus || "N/A",
          locationName: item?.assetId?.location?.locationName || "N/A",
        },
        mechanicDetails: { _id: item?.mechanic },
      };
    }

    return item;
  });
};

// ---------------- Screen ----------------
export default function MaintenanceRequestsScreen({ navigation }) {
  const { user } = useAuth();
  const role = (user?.role || "").toLowerCase();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [allRequests, setAllRequests] = useState([]); // generic list
  const [assignedRequests, setAssignedRequests] = useState([]); // supervisor-only
  const [statusFilter, setStatusFilter] = useState("all"); // all | pending | assigned | in_progress | completed

  const effectRan = useRef(false);

  const loadAllForSupervisor = useCallback(async () => {
    const env = await api.get_all_maintenance_requests();
    const normalized = normalizeAllRequestsData(env?.data || []);
    setAllRequests(normalized);
    return normalized;
  }, []);

  const loadAssignedForSupervisor = useCallback(async () => {
    const env = await api.get_assets_with_mechanics();
    const normalized = normalizeAssignedRequestsData(env?.data || []);
    setAssignedRequests(normalized);
    return normalized;
  }, []);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      if (role === "supervisor") {
        await Promise.all([
          loadAllForSupervisor(),
          loadAssignedForSupervisor(),
        ]);
      } else if (role === "mechanic") {
        const env = await api.get_my_assigned_maintenances();
        setAllRequests(normalizeRequestData(env?.data || [], role));
        setAssignedRequests([]);
      } else {
        // production
        const env = await api.get_all_requests_with_mechanic();
        setAllRequests(normalizeRequestData(env?.data || [], role));
        setAssignedRequests([]);
      }
    } catch (e) {
      setError(e?.message || "Failed to load maintenance requests.");
      setAllRequests([]);
      setAssignedRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [role, loadAllForSupervisor, loadAssignedForSupervisor]);

  useEffect(() => {
    if (effectRan.current) return;
    loadRequests();
    return () => {
      effectRan.current = true;
    };
  }, [loadRequests]);

  const FILTERS = [
    { id: "all", label: "All" },
    { id: "pending", label: "Pending" },
    { id: "assigned", label: "Assigned" },
    { id: "in_progress", label: "In Progress" },
    { id: "completed", label: "Completed" },
  ];

  const requestsForDisplay = useMemo(() => {
    const base =
      role === "supervisor" && statusFilter === "assigned"
        ? assignedRequests
        : allRequests;

    if (statusFilter === "all") return base;

    if (statusFilter === "completed") {
      return base.filter(
        (req) =>
          !req?.assetDetails?.underMaintenance || req?.status === "completed"
      );
    }
    return base.filter(
      (req) => (req?.status || "").toLowerCase() === statusFilter
    );
  }, [allRequests, assignedRequests, statusFilter, role]);

  // ---- UI helpers ----
  const StatusChip = ({ status }) => {
    const s = (status || "").toLowerCase();
    const map = {
      pending: { bg: "#fef3c7", fg: "#92400e" },
      assigned: { bg: "#e0f2fe", fg: "#075985" },
      in_progress: { bg: "#ede9fe", fg: "#5b21b6" },
      completed: { bg: "#dcfce7", fg: "#166534" },
    };
    const c = map[s] || { bg: "#e5e7eb", fg: "#374151" };
    return (
      <View
        style={{
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: c.bg,
        }}
      >
        <Text style={{ fontSize: 12, color: c.fg, fontWeight: "700" }}>
          {s || "—"}
        </Text>
      </View>
    );
  };

  const RequestCard = ({ item }) => (
    <View style={styles.card}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <Text style={{ fontWeight: "700" }}>
          {item?.assetDetails?.assetName || "Asset"}{" "}
          <Text style={{ color: "#6b7280" }}>
            ({item?.assetDetails?.assetCode || "N/A"})
          </Text>
        </Text>
        <StatusChip status={item?.status} />
      </View>
      {!!item?.remark && (
        <Text style={{ color: "#6b7280", marginBottom: 6 }}>{item.remark}</Text>
      )}
      <Text style={{ fontSize: 12, color: "#6b7280" }}>
        Location: {item?.assetDetails?.locationName || "N/A"}
      </Text>
      {!!item?.mechanicDetails?.name && (
        <Text style={{ fontSize: 12, color: "#6b7280" }}>
          Mechanic: {item?.mechanicDetails?.name}
        </Text>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { padding: 16 }]}>
        <Text style={{ color: "#b00020", marginBottom: 12 }}>{error}</Text>
        <TouchableOpacity onPress={loadRequests} style={styles.btn}>
          <Text style={styles.btnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* header text */}
      <View style={{ padding: 16, backgroundColor: "#fff" }}>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>
          Maintenance Requests
        </Text>
        <Text style={{ color: "#6b7280", marginTop: 4 }}>
          {role === "supervisor"
            ? "Manage and assign all maintenance requests."
            : role === "mechanic"
            ? "View and update your assigned maintenance tasks."
            : "Track the status of your maintenance requests."}
        </Text>
      </View>

      {/* filters */}
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 8,
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {FILTERS.map((f) => {
          const active = statusFilter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              onPress={() => setStatusFilter(f.id)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={requestsForDisplay}
        keyExtractor={(it, idx) => it?._id || String(idx)}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => <RequestCard item={item} />}
        ListEmptyComponent={
          <Text
            style={{ textAlign: "center", marginTop: 32, color: "#6b7280" }}
          >
            {statusFilter === "all"
              ? "No maintenance requests."
              : `No ${statusFilter.replace("_", " ")} requests.`}
          </Text>
        }
      />
    </View>
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
  btn: {
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnText: { color: "#fff", fontWeight: "700" },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  chipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  chipText: { color: "#111827", fontWeight: "600" },
  chipTextActive: { color: "#fff" },
});
