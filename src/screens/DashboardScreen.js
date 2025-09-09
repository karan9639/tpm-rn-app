// src/screens/DashboardScreen.js
import React, { useEffect, useState, useLayoutEffect, useMemo } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  StatusBar,
  Platform,
} from "react-native";
import * as api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";

const capitalize = (s = "") => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const getInitials = (name = "") =>
  (name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
const formatDate = (iso) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString();
  } catch {
    return "";
  }
};

function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon} size={18} color="#475569" />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  const [counts, setCounts] = useState({
    totalAssets: 0,
    breakdownMaintenance: 0,
    underMaintenance: 0,
  });
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [deptName, setDeptName] = useState("");

  const { user, logout } = useAuth();

  // --- Map your login API fields
  const fullName = user?.fullName || user?.name || "User";
  const email = user?.email || "";
  const accountType = user?.accountType || user?.role || "";
  const jobTitle = user?.jobTitle || "";
  const shift = user?.shift || "";
  const phone = String(user?.contactNumber || user?.phone || "");
  const departmentId = user?.department || "";
  const createdAt = user?.createdAt || "";
  const roleRaw = (accountType || "").toString().toLowerCase();
  const roleLabel = accountType || "—";
  const isProduction = roleRaw.includes("production");

  // Optionally fetch department name (graceful: tries known function names)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!departmentId) return;
      try {
        const fns = [
          api?.departmentAPI?.getDepartmentById,
          api?.departmentAPI?.getById,
          api?.departmentAPI?.getOne,
          api?.get_department_by_id,
        ].filter((fn) => typeof fn === "function");

        for (const fn of fns) {
          const resp = await fn(departmentId);
          const name =
            resp?.data?.name ||
            resp?.data?.data?.name ||
            resp?.name ||
            resp?.data?.department?.name;
          if (name) {
            if (!cancelled) setDeptName(name);
            return;
          }
        }
      } catch {
        // ignore and show id
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [departmentId]);

useLayoutEffect(() => {
  navigation.setOptions({
    headerRight: () => (
      <View style={{ flexDirection: "row" }}>
        <TouchableOpacity
          onPress={loadCounts}
          style={{ paddingHorizontal: 8, paddingVertical: 6, marginRight: 4 }}
          accessibilityLabel="Refresh counts"
        >
          <Feather name="refresh-ccw" size={20} color="#111827" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={confirmLogout}
          style={{ paddingHorizontal: 8, paddingVertical: 6 }}
          accessibilityLabel="Logout"
        >
          <Feather name="log-out" size={20} color="#111827" />
        </TouchableOpacity>
      </View>
    ),
  });
}, [navigation]);


  const confirmLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
          } catch (e) {
            Alert.alert("Error", e?.message || "Failed to logout");
          }
        },
      },
    ]);
  };

  // ---- counts
  const loadCounts = async () => {
    setLoadingCounts(true);
    try {
      let resp =
        (api.assetAPI?.getAssetCounting &&
          (await api.assetAPI.getAssetCounting())) ||
        (await api.get_asset_counting());

      const arr =
        (Array.isArray(resp?.data) && resp?.data) ||
        (Array.isArray(resp?.data?.data) && resp?.data?.data) ||
        (Array.isArray(resp) && resp) ||
        [];

      const data = arr[0] || {};
      const totalAssets = data?.totalAssets?.[0]?.count || 0;
      const breakdownMaintenance =
        data.byStatus?.find((s) => (s?._id ?? s?.id) === "Not Working")
          ?.total || 0;
      const underMaintenance =
        data.underMaintenance?.find((it) => it?._id === true)?.total || 0;

      setCounts({ totalAssets, breakdownMaintenance, underMaintenance });
    } catch (error) {
      console.log("[Dashboard] get counts error:", error?.message || error);
    } finally {
      setLoadingCounts(false);
    }
  };

  useEffect(() => {
    loadCounts();
  }, []);

  const openScanner = () => {
    navigation.navigate("QRScan", { allowScan: true });
  };

  const cards = useMemo(
    () => [
      {
        title: `Hi, ${fullName} 👋`,
        subtitle: "Welcome back!",
        description: "Time to check in — please punch in.",
        iconName: "power",
        iconColor: "#fff",
        iconBg: "#22c55e",
        bgColor: "#eff6ff",
        borderColor: "#bfdbfe",
      },
      {
        title: `Total Assets - ${loadingCounts ? "…" : counts.totalAssets}`,
        description: `You have ${
          loadingCounts ? "…" : counts.totalAssets
        } assets.`,
        iconName: "warehouse",
        iconColor: "#1d4ed8",
        iconBg: "#ffffff",
        bgColor: "#eef2ff",
        borderColor: "#c7d2fe",
      },
      {
        title: `Breakdown Maintenance - ${
          loadingCounts ? "…" : counts.breakdownMaintenance
        }`,
        description: `You have ${
          loadingCounts ? "…" : counts.breakdownMaintenance
        } Breakdowns Left.`,
        iconName: "alert-octagon-outline",
        iconColor: "#f59e0b",
        iconBg: "#ffffff",
        bgColor: "#fff7ed",
        borderColor: "#fed7aa",
      },
      {
        title: `Under Maintenance - ${
          loadingCounts ? "…" : counts.underMaintenance
        }`,
        description: `Currently ${
          loadingCounts ? "…" : counts.underMaintenance
        } asset(s) under maintenance.`,
        iconName: "wrench-outline",
        iconColor: "#b45309",
        iconBg: "#ffffff",
        bgColor: "#fffbeb",
        borderColor: "#fde68a",
      },
    ],
    [fullName, counts, loadingCounts]
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card (from login payload) */}
        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(fullName) || "U"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{fullName}</Text>
              <Text style={styles.profileSub}>{email || phone || "—"}</Text>
              <View style={styles.chipsRow}>
                {roleLabel ? (
                  <Text style={[styles.chip, styles.chipRole]}>
                    {roleLabel}
                  </Text>
                ) : null}
                {jobTitle ? <Text style={styles.chip}>{jobTitle}</Text> : null}
                {shift ? <Text style={styles.chip}>{shift}</Text> : null}
              </View>
            </View>
          </View>

          {/* Quick info list */}
          <View style={styles.infoList}>
            
            <InfoRow icon="email-outline" label="Email" value={email} />
            <InfoRow icon="phone" label="Phone" value={phone} />
            <InfoRow
              icon="calendar-check"
              label="Joined"
              value={formatDate(createdAt)}
            />
          </View>
        </View>

        {/* Stat Cards */}
        <View style={{ gap: 12 }}>
          {cards.map((c, idx) => (
            <View
              key={idx}
              style={[
                styles.card,
                { backgroundColor: c.bgColor, borderColor: c.borderColor },
              ]}
            >
              <View style={styles.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{c.title}</Text>
                  {c.subtitle ? (
                    <Text style={styles.cardSubtitle}>{c.subtitle}</Text>
                  ) : null}
                  <Text style={styles.cardDesc}>{c.description}</Text>
                </View>
                <View
                  style={[styles.iconCircleBig, { backgroundColor: c.iconBg }]}
                >
                  <MaterialCommunityIcons
                    name={c.iconName}
                    size={28}
                    color={c.iconColor}
                  />
                </View>
              </View>
              {/* Small loader inline for counts */}
              {idx > 0 && loadingCounts ? (
                <View style={styles.inlineLoader}>
                  <ActivityIndicator size="small" />
                </View>
              ) : null}
            </View>
          ))}
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={styles.btn}
          onPress={() => navigation.navigate("Assets")}
        >
          <Text style={styles.btnText}>Go to Assets</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnOutline}
          onPress={() => navigation.navigate("MaintenanceRequests")}
        >
          <Text style={styles.btnOutlineText}>Maintenance Requests</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* QR FAB — only for production users */}
      {isProduction && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={openScanner}
          style={styles.fab}
        >
          <MaterialCommunityIcons name="qrcode-scan" size={26} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },

  header: { marginBottom: 12 },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  rolePill: {
    alignSelf: "flex-start",
    backgroundColor: "#eef2ff",
    color: "#3730a3",
    borderColor: "#c7d2fe",
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "700",
  },

  // Profile card
  profileCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    marginBottom: 12,
    ...Platform.select({
      android: { elevation: 1 },
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
    }),
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#e0e7ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { color: "#3730a3", fontWeight: "800", fontSize: 16 },
  profileName: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  profileSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    color: "#334155",
    fontSize: 11,
    fontWeight: "700",
    backgroundColor: "#f8fafc",
    marginRight: 6,
    marginBottom: 6,
  },
  chipRole: {
    backgroundColor: "#eef2ff",
    borderColor: "#c7d2fe",
    color: "#3730a3",
  },
  infoList: { marginTop: 4 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  infoLabel: {
    marginLeft: 8,
    width: 105,
    color: "#475569",
    fontWeight: "700",
    fontSize: 12,
  },
  infoValue: { flex: 1, color: "#0f172a", fontSize: 12 },

  // Stat cards
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  cardSubtitle: { color: "#6b7280", marginBottom: 4, fontWeight: "700" },
  cardDesc: { color: "#6b7280" },
  iconCircleBig: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  inlineLoader: {
    marginTop: 8,
    alignItems: "flex-start",
  },

  // Buttons
  btn: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 3,
  },
  btnText: {
    color: "#fff",
    fontWeight: "800",
    letterSpacing: 0.3,
    fontSize: 15,
  },
  btnOutline: {
    borderWidth: 1.2,
    borderColor: "#111827",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnOutlineText: {
    color: "#111827",
    fontWeight: "800",
    letterSpacing: 0.3,
    fontSize: 15,
  },

  // FAB
  fab: {
    position: "absolute",
    right: 20,
    bottom: 28,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
  },
});
