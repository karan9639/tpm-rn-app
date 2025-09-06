import React, { useEffect, useState, useLayoutEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import * as api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";

export default function DashboardScreen({ navigation }) {
  const [stats, setStats] = useState({
    totalAssets: null,
    underMaintenance: null,
    working: null,
    notWorking: null,
    special: null,
  });
  const [loading, setLoading] = useState(true);

  const { user, logout } = useAuth();
  const roleRaw = (user?.role ?? user?.accountType ?? user?.employeeType ?? "")
    .toString()
    .toLowerCase();
  const isProduction = roleRaw.includes("production");

  // headerRight -> Logout
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={confirmLogout}
          style={{ paddingHorizontal: 8, paddingVertical: 6 }}
          accessibilityLabel="Logout"
        >
          <Feather name="log-out" size={20} color="#111827" />
        </TouchableOpacity>
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

  useEffect(() => {
    (async () => {
      try {
        const env = await api.get_asset_counting(); // <- your current API
        // shape: { statusCode, data: [ { totalAssets:[{count}], byStatus:[...], underMaintenance:[{_id:true,total}], specialAssets:[{_id:'Yes', total}] } ], success }
        const block = Array.isArray(env?.data) ? env.data[0] : env?.data || {};

        const totalAssets = block?.totalAssets?.[0]?.count ?? 0;
        const underMaintenance = block?.underMaintenance?.[0]?.total ?? 0;

        const findByStatus = (label) =>
          (block?.byStatus || []).find((x) => (x?._id || x?.id) === label)
            ?.total ?? 0;

        const working = findByStatus("Working");
        const notWorking = findByStatus("Not Working");
        const special = block?.specialAssets?.[0]?.total ?? 0;

        setStats({
          totalAssets,
          underMaintenance,
          working,
          notWorking,
          special,
        });
      } catch (e) {
        console.log("dashboard stats error:", e?.message || e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const show = (v) => (v === null || v === undefined ? "—" : String(v));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.rolePill}>Role: {roleRaw || "—"}</Text>
      </View>

      {loading ? (
        <ActivityIndicator />
      ) : (
        <View style={styles.grid}>
          <View style={[styles.statCard, styles.cardPrimary]}>
            <View style={[styles.iconCircle, styles.iconPrimary]}>
              <MaterialCommunityIcons
                name="warehouse"
                size={18}
                color="#1d4ed8"
              />
            </View>
            <Text style={styles.statLabel}>Total Assets</Text>
            <Text style={styles.statValue}>{show(stats.totalAssets)}</Text>
          </View>

          <View style={[styles.statCard, styles.cardAmber]}>
            <View style={[styles.iconCircle, styles.iconAmber]}>
              <MaterialCommunityIcons
                name="wrench-outline"
                size={18}
                color="#b45309"
              />
            </View>
            <Text style={styles.statLabel}>Under Maintenance</Text>
            <Text style={styles.statValue}>{show(stats.underMaintenance)}</Text>
          </View>

          {/* Uncomment if you want to show these too */}
          {/* <View style={[styles.statCard, styles.cardSuccess]}>
        <View style={[styles.iconCircle, styles.iconSuccess]}>
          <MaterialCommunityIcons name="check-circle-outline" size={18} color="#15803d" />
        </View>
        <Text style={styles.statLabel}>Working</Text>
        <Text style={styles.statValue}>{show(stats.working)}</Text>
      </View>

      <View style={[styles.statCard, styles.cardDanger]}>
        <View style={[styles.iconCircle, styles.iconDanger]}>
          <MaterialCommunityIcons name="alert-octagon-outline" size={18} color="#b91c1c" />
        </View>
        <Text style={styles.statLabel}>Not Working</Text>
        <Text style={styles.statValue}>{show(stats.notWorking)}</Text>
      </View>

      <View style={[styles.statCard, styles.cardIndigo]}>
        <View style={[styles.iconCircle, styles.iconIndigo]}>
          <MaterialCommunityIcons name="star-outline" size={18} color="#4338ca" />
        </View>
        <Text style={styles.statLabel}>Special Assets</Text>
        <Text style={styles.statValue}>{show(stats.special)}</Text>
      </View> */}
        </View>
      )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  // Screen
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f8fafc", // slate-50
  },

  // Header
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a", // slate-900
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  rolePill: {
    alignSelf: "flex-start",
    backgroundColor: "#eef2ff", // indigo-50
    color: "#3730a3", // indigo-700
    borderColor: "#c7d2fe", // indigo-200
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "700",
  },

  // Stat grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb", // gray-200
    // iOS shadow
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    // Android
    elevation: 2,
  },
  statLabel: {
    color: "#6b7280", // gray-500
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 2,
  },
  statValue: {
    color: "#0f172a", // slate-900
    fontSize: 22,
    fontWeight: "800",
    marginTop: 6,
  },

  // Icon bubble
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    borderWidth: 1,
  },

  // Color accents (soft backgrounds + bolder borders)
  cardPrimary: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }, // blue
  iconPrimary: { backgroundColor: "#dbeafe", borderColor: "#bfdbfe" },

  cardAmber: { backgroundColor: "#fffbeb", borderColor: "#fde68a" }, // amber
  iconAmber: { backgroundColor: "#fef3c7", borderColor: "#fde68a" },

  cardSuccess: { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" }, // emerald
  iconSuccess: { backgroundColor: "#d1fae5", borderColor: "#a7f3d0" },

  cardDanger: { backgroundColor: "#fef2f2", borderColor: "#fecaca" }, // red
  iconDanger: { backgroundColor: "#fee2e2", borderColor: "#fecaca" },

  cardIndigo: { backgroundColor: "#eef2ff", borderColor: "#c7d2fe" }, // indigo
  iconIndigo: { backgroundColor: "#e0e7ff", borderColor: "#c7d2fe" },

  // Buttons
  btn: {
    backgroundColor: "#111827", // gray-900
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
    // nicer shadow
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
    backgroundColor: "#2563eb", // blue-600
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
  },
});

