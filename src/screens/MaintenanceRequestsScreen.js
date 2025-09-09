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
import MechanicAssignmentModal from "../components/MechanicAssignmentModal";
import ProductionSatisfactionModal from "../components/ProductionSatisfactionModal";

/* -----------------------------------------------
   Helpers (status + normalizers)
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
          locationCode: item?.assetId?.location?.locationCode || "N/A",
          underMaintenance: item?.assetId?.underMaintenance || false,
          // ✅ critical: copy production-satisfaction flags too
          isProductionSatisfiedByMechanic:
            item?.assetId?.isProductionSatisfiedByMechanic ?? false,
          isProductionSatisfiedPopupVisible:
            item?.assetId?.isProductionSatisfiedPopupVisible ?? false,
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
            locationCode: assetDetails?.location?.locationCode || "N/A",
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

          const locationCode =
            asset0?.location &&
            Array.isArray(asset0?.location) &&
            asset0.location[0]
              ? asset0.location[0].locationCode
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
              ? { ...asset0, locationName, locationCode }
              : {
                  assetName: "N/A",
                  assetCode: "N/A",
                  locationName: "N/A",
                  locationCode: "N/A",
                },
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
              locationCode: item?.assetId?.location?.locationCode || "N/A",
            },
            mechanicDetails: { _id: item?.mechanic },
          };
        }

        return item;
      })
    : [];

/* -----------------------------------------------
   Small UI bits
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

/* -----------------------------------------------
   Card – mirrors web card + production modal
------------------------------------------------- */
/* -----------------------------------------------
   Card – mirrors web card + production modal
------------------------------------------------- */
const MaintenanceRequestCard = ({
  request,
  userRole,
  onRefresh,
  navigation,
}) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [prodOpen, setProdOpen] = useState(false);

  // Pull production-satisfaction flags regardless of shape
  const getProductionSatisfactionStatus = () => {
  const pickBool = (...vals) => {
    for (const v of vals) if (typeof v === "boolean") return v;
    return false;
  };

  const a1 = request?.assetDetails;
  const a2 = request?.asset?.[0];
  const a3 = request?.assetMaintenanceRequestDetails?.[0]?.assetDetails?.[0];
  const a4 =
    request?.assetId && typeof request.assetId === "object"
      ? request.assetId
      : undefined;

  const isProductionSatisfied = pickBool(
    a1?.isProductionSatisfiedByMechanic,
    a2?.isProductionSatisfiedByMechanic,
    a3?.isProductionSatisfiedByMechanic,
    a4?.isProductionSatisfiedByMechanic
  );

  const showButton = pickBool(
    a1?.isProductionSatisfiedPopupVisible,
    a2?.isProductionSatisfiedPopupVisible,
    a3?.isProductionSatisfiedPopupVisible,
    a4?.isProductionSatisfiedPopupVisible
  );

  const resolved = a1 || a2 || a3 || a4 || {};
  return {
    showButton,
    isProductionSatisfied,
    assetId: resolved?._id || null,
    assetName: resolved?.assetName || null,
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

  // ✅ same behavior as web: show button if we have an asset id
  const resolvedAssetId = assetDetails?._id || assetId;
  const canViewAcknowledgements = !!resolvedAssetId;

  const handleMaintenanceDone = async () => {
    const id = resolvedAssetId;
    if (!id) {
      Alert.alert("Error", "Asset ID not found. Cannot complete maintenance.");
      return;
    }
    try {
      setIsCompleting(true);
      await api.maintenanceAPI.closeMaintenanceRequest(id);
      Alert.alert("Success", "Maintenance request completed successfully!");
      onRefresh?.();
    } catch (e) {
      Alert.alert("Error", e?.message || "Failed to complete maintenance.");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleStartTask = () => {
    navigation.navigate("QRScan", {
      allowScan: true,
      next: {
        screen: "UpdateProcess",
        params: { requestId: request._id, request },
      },
    });
  };

  return (
    <View style={styles.card}>
      {/* Header */}
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

      {/* Details */}
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
          {(assetDetails?.locationCode ||
            assetDetails?.location?.locationCode ||
            request.asset?.[0]?.location?.[0]?.locationCode ||
            "N/A") +
            " - " +
            (assetDetails?.locationName ||
              assetDetails?.location?.locationName ||
              request.asset?.[0]?.location?.[0]?.locationName ||
              "N/A")}
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
      {userRole === "production" && (
        <View>
          {!isCompleted && isAssigned && showProductionSatisfactionButton && (
            <TouchableOpacity
              style={styles.btnSecondaryBlue}
              onPress={() => setProdOpen(true)}
            >
              <Text style={styles.btnSecondaryBlueText}>Machine Working</Text>
            </TouchableOpacity>
          )}

          {/* ✅ ALWAYS show for production if we have an asset id */}
          {canViewAcknowledgements && (
            <TouchableOpacity
              style={styles.btnSecondaryPurple}
              onPress={() =>
                navigation?.navigate?.("Acknowledgements", {
                  assetId: resolvedAssetId,
                })
              }
            >
              <Text style={styles.btnSecondaryPurpleText}>
                View Acknowledgements
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {userRole === "supervisor" && (
        <View>
          {!isCompleted && (
            <>
              {!isAssigned ? (
                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={() => setAssignOpen(true)}
                >
                  <Text style={styles.btnSecondaryText}>
                    Assign to Mechanic
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.btnPrimary,
                    (isCompleting || !isProductionSatisfied) && {
                      opacity: 0.5,
                    },
                  ]}
                  disabled={isCompleting || !isProductionSatisfied}
                  onPress={handleMaintenanceDone}
                >
                  {isCompleting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnPrimaryText}>Maintenance Done</Text>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}

          {/* ✅ supervisor also gets the button, not tied to acknowledgementId */}
          {canViewAcknowledgements && (
            <TouchableOpacity
              style={styles.btnSecondaryPurple}
              onPress={() =>
                navigation?.navigate?.("Acknowledgements", {
                  assetId: resolvedAssetId,
                })
              }
            >
              <Text style={styles.btnSecondaryPurpleText}>
                View Acknowledgements
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {userRole === "mechanic" && (
        <View>
          {!isCompleted && (
            <>
              {acknowledgementId ? (
                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={() =>
                    navigation.navigate("UpdateProcess", {
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

          {/* ✅ mechanic also gets the button */}
          {canViewAcknowledgements && (
            <TouchableOpacity
              style={styles.btnSecondaryPurple}
              onPress={() =>
                navigation?.navigate?.("Acknowledgements", {
                  assetId: resolvedAssetId,
                })
              }
            >
              <Text style={styles.btnSecondaryPurpleText}>
                View Acknowledgements
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Mechanic Assignment Modal */}
      <MechanicAssignmentModal
        isOpen={assignOpen}
        onClose={() => setAssignOpen(false)}
        request={request}
        onSuccess={() => {
          setAssignOpen(false);
          onRefresh?.();
        }}
      />

      {/* Production Satisfaction Modal */}
      <ProductionSatisfactionModal
        isOpen={prodOpen}
        onClose={() => setProdOpen(false)}
        assetId={resolvedAssetId}
        assetName={assetName}
        onSuccess={() => {
          setProdOpen(false);
          onRefresh?.();
        }}
      />
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
    const env = await api.maintenanceAPI.getAllMaintenanceRequests();
    const normalized = normalizeAllRequestsData(env?.data || []);
    setAllRequests(normalized);
    return normalized;
  }, []);

  const loadAssignedForSupervisor = useCallback(async () => {
    const env = await api.maintenanceAPI.getAssetsWithMechanics();
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
        const env = await api.maintenanceAPI.getMyAssignedMaintenances();
        setAllRequests(normalizeRequestData(env?.data || [], role));
        setAssignedRequests([]);
      } else {
        // production
        const env = await api.maintenanceAPI.getAllRequestsWithMechanic();
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
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Maintenance Requests</Text>
        <Text style={styles.headerSubtitle}>
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
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },

  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    color: "#64748b",
    marginTop: 4,
    fontWeight: "600",
  },

  filterRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  chipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
  },
  chipText: { color: "#111827", fontWeight: "700", letterSpacing: 0.2 },
  chipTextActive: { color: "#ffffff" },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },

  kv: { color: "#374151", marginTop: 2 },
  k: {
    fontWeight: "800",
    color: "#0f172a",
    textTransform: "uppercase",
    fontSize: 12,
    letterSpacing: 0.6,
  },
  v: { fontWeight: "600", color: "#0f172a" },

  tryBtn: {
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  tryBtnText: { color: "#ffffff", fontWeight: "800", letterSpacing: 0.3 },

  btnPrimary: {
    marginTop: 10,
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 3,
  },
  btnPrimaryText: { color: "#ffffff", fontWeight: "800", letterSpacing: 0.3 },

  btnSecondary: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnSecondaryText: { color: "#111827", fontWeight: "800", letterSpacing: 0.2 },

  btnSecondaryBlue: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnSecondaryBlueText: {
    color: "#1d4ed8",
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  btnSecondaryPurple: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#ddd6fe",
    backgroundColor: "#f5f3ff",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnSecondaryPurpleText: {
    color: "#6d28d9",
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
