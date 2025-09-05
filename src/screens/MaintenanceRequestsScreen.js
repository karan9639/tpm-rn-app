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
  Alert,
} from "react-native";
import * as api from "../services/api";
import { useAuth } from "../context/AuthContext";

/* -----------------------------------------------
   Helpers (status + normalizers) – aligned to web
------------------------------------------------- */
const deriveStatus = (req, hasMaintenanceId = false) => {
  const st = (req?.status || "").toLowerCase();
  if (["pending", "assigned", "in_progress", "completed"].includes(st))
    return st;
  if (req?.isActive === false) return "completed";
  if (hasMaintenanceId || req?.maintenanceId) return "assigned";
  return "pending";
};

const normalizeAllRequestsData = (data) =>
  Array.isArray(data)
    ? data.map((item) => ({
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
      }))
    : [];

const normalizeAssignedRequestsData = (data) =>
  Array.isArray(data)
    ? data.map((item) => {
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
      })
    : [];

const normalizeRequestData = (data, userRole) =>
  Array.isArray(data)
    ? data.map((item) => {
        const role = (userRole || "").toLowerCase();

        if (role === "production") {
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
      })
    : [];

/* -----------------------------------------------
   Card component – mirrors web MaintenanceRequestCard
------------------------------------------------- */
const StatusChip = ({ status }) => {
  const s = (status || "").toLowerCase();
  const map = {
    pending: { bg: "#FEF3C7", fg: "#92400E", label: "Pending" },
    assigned: { bg: "#E0F2FE", fg: "#075985", label: "Assigned" },
    in_progress: { bg: "#FFE4D5", fg: "#C2410C", label: "In Progress" },
    completed: { bg: "#DCFCE7", fg: "#166534", label: "Completed" },
  };
  const c = map[s] || { bg: "#E5E7EB", fg: "#374151", label: "Unknown" };
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
        {c.label}
      </Text>
    </View>
  );
};

const MaintenanceRequestCard = ({
  request,
  userRole,
  onRefresh,
  navigation,
}) => {
  // --- parse production satisfaction like web code ---
  const getProductionSatisfactionStatus = () => {
    const assetData =
      request?.assetDetails ??
      request?.asset?.[0] ??
      request?.assetMaintenanceRequestDetails?.[0]?.assetDetails?.[0] ??
      request?.assetId ??
      null;

    if (!assetData) {
      return {
        showButton: false,
        isProductionSatisfied: false,
        assetId: null,
        assetName: null,
      };
    }

    return {
      showButton: assetData.isProductionSatisfiedPopupVisible === true,
      isProductionSatisfied: assetData.isProductionSatisfiedByMechanic === true,
      assetId: assetData?._id || null,
      assetName: assetData?.assetName || null,
    };
  };

  const {
    showButton: showProductionSatisfactionButton,
    isProductionSatisfied,
    assetId,
    assetName,
  } = getProductionSatisfactionStatus();

  const { assetDetails, mechanicDetails, acknowledgementId } = request;
  const isAssigned = request.status === "assigned" || !!request.maintenanceId;
  const isCompleted =
    request.status === "completed" || request.isActive === false;

  // --- actions (map to your API) ---
  const handleMaintenanceDone = async () => {
    if (!assetDetails?._id && !assetId) {
      Alert.alert("Error", "Asset ID not found.");
      return;
    }
    try {
      // Use same API name as web if available
      await (api.closeMaintenanceRequest
        ? api.closeMaintenanceRequest(assetDetails?._id || assetId)
        : api.close_maintenance_request(assetDetails?._id || assetId));
      Alert.alert("Success", "Maintenance request completed successfully!");
      onRefresh?.();
    } catch (e) {
      Alert.alert("Error", e?.message || "Failed to complete maintenance.");
    }
  };

  const handleAssign = () => {
    // If you have an Assign screen/modal, navigate/use it here.
    // Placeholder to keep parity with web behavior:
    Alert.alert(
      "Assign to Mechanic",
      "Open your assignment screen/modal here."
    );
  };

  const handleProductionSatisfaction = () => {
    // Open your native satisfaction modal/screen if you have one.
    Alert.alert("Machine Working", `Mark ${assetName || "asset"} as working?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: async () => {
          try {
            // Call your satisfaction API here if available
            // await api.mark_machine_working(assetId);
            onRefresh?.();
          } catch (e) {
            Alert.alert("Error", e?.message || "Failed to update status.");
          }
        },
      },
    ]);
  };

  const handleStartTask = () => {
    // Web uses QR scan; you can do the same or go straight to UpdateProcess.
    // If you already have a QR screen, navigate there instead.
    navigation?.navigate?.("UpdateProcess", {
      requestId: request._id,
      request,
    });
  };

  return (
    <View style={styles.card}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontWeight: "700", fontSize: 16 }} numberOfLines={1}>
            {assetDetails?.assetName || assetName || "N/A"}
          </Text>
          <Text style={{ color: "#6b7280", marginTop: 2 }} numberOfLines={1}>
            Code:{" "}
            {assetDetails?.assetCode || request?.asset?.[0]?.assetCode || "N/A"}
          </Text>
        </View>
        <StatusChip status={request.status} />
      </View>

      <View style={{ height: 8 }} />

      <Text style={styles.kv}>
        <Text style={styles.k}>Priority: </Text>
        <Text style={styles.v}>{request.priority || "—"}</Text>
      </Text>
      <Text style={styles.kv}>
        <Text style={styles.k}>Asset Status: </Text>
        <Text style={styles.v}>
          {assetDetails?.assetStatus ||
            request.asset?.[0]?.assetStatus ||
            "N/A"}
        </Text>
      </Text>
      <Text style={styles.kv}>
        <Text style={styles.k}>Location: </Text>
        <Text style={styles.v}>
          {assetDetails?.locationName ||
            assetDetails?.location?.locationName ||
            request.asset?.[0]?.location?.[0]?.locationName ||
            "N/A"}
        </Text>
      </Text>
      {!!request.remark && (
        <Text style={[styles.kv, { marginTop: 4 }]}>
          <Text style={styles.k}>Remark: </Text>
          <Text style={styles.v}>{request.remark}</Text>
        </Text>
      )}
      {isAssigned && (mechanicDetails?.fullName || mechanicDetails?.name) && (
        <Text style={styles.kv}>
          <Text style={styles.k}>Assigned to: </Text>
          <Text style={styles.v}>
            {mechanicDetails?.fullName || mechanicDetails?.name}
          </Text>
        </Text>
      )}
      {!!request.createdAt && (
        <Text style={styles.kv}>
          <Text style={styles.k}>Date: </Text>
          <Text style={styles.v}>
            {new Date(request.createdAt).toLocaleDateString()}
          </Text>
        </Text>
      )}

      {/* Actions by role */}
      {userRole === "production" && !isCompleted && isAssigned && (
        <>
          {showProductionSatisfactionButton && (
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={handleProductionSatisfaction}
            >
              <Text style={styles.btnSecondaryText}>Machine Working</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {userRole === "supervisor" && !isCompleted && (
        <>
          {!isAssigned ? (
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={handleAssign}
            >
              <Text style={styles.btnSecondaryText}>Assign to Mechanic</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.btnPrimary,
                !isProductionSatisfied && { opacity: 0.5 },
              ]}
              disabled={!isProductionSatisfied}
              onPress={handleMaintenanceDone}
            >
              <Text style={styles.btnPrimaryText}>Maintenance Done</Text>
            </TouchableOpacity>
          )}

          {!!acknowledgementId && (
            <TouchableOpacity
              style={[
                styles.btnSecondary,
                { backgroundColor: "#F5F3FF", borderColor: "#DDD6FE" },
              ]}
              onPress={() =>
                navigation?.navigate?.("Acknowledgements", {
                  assetId: assetDetails?._id || assetId,
                })
              }
            >
              <Text style={[styles.btnSecondaryText, { color: "#6D28D9" }]}>
                View Acknowledgements
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {userRole === "mechanic" && !isCompleted && (
        <>
          {acknowledgementId ? (
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() =>
                navigation?.navigate?.("UpdateProcess", {
                  requestId: request._id,
                  request,
                })
              }
            >
              <Text style={styles.btnSecondaryText}>Update Process</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={handleStartTask}
            >
              <Text style={styles.btnPrimaryText}>Start Task</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
};

/* -----------------------------------------------
   Screen
------------------------------------------------- */
export default function MaintenanceRequestsScreen({ navigation }) {
  const { user } = useAuth();
  const role = (user?.role || "").toLowerCase();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [allRequests, setAllRequests] = useState([]);
  const [assignedRequests, setAssignedRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");

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
        <TouchableOpacity onPress={loadRequests} style={styles.tryBtn}>
          <Text style={styles.tryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* header */}
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
      <View style={styles.filterRow}>
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
        renderItem={({ item }) => (
          <MaintenanceRequestCard
            request={item}
            userRole={role}
            navigation={navigation}
            onRefresh={loadRequests}
          />
        )}
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

/* -----------------------------------------------
   Styles
------------------------------------------------- */
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

  // small key/value text lines
  kv: { color: "#374151", marginTop: 2 },
  k: { fontWeight: "700", color: "#111827" },
  v: { fontWeight: "500", color: "#111827" },

  // retry button
  tryBtn: {
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  tryBtnText: { color: "#fff", fontWeight: "700" },

  // filter chips
  filterRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
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

  // buttons on card
  btnPrimary: {
    marginTop: 10,
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnPrimaryText: { color: "#fff", fontWeight: "700" },

  btnSecondary: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnSecondaryText: { color: "#1D4ED8", fontWeight: "700" },
});
