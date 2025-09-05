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
    <View style={{ flex: 1 }}>
      {/* content */}
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 4 }}>
          Dashboard
        </Text>
        <Text style={{ color: "#6b7280", marginBottom: 12 }}>
          Role: {roleRaw || "—"}
        </Text>

        {loading ? (
          <ActivityIndicator />
        ) : (
          <View style={{ marginBottom: 16 }}>
            <Text>Total Assets: {show(stats.totalAssets)}</Text>
            <Text>Under Maintenance: {show(stats.underMaintenance)}</Text>
            {/* चाहें तो ये भी दिखाएँ: */}
            {/* <Text>Working: {show(stats.working)}</Text>
            <Text>Not Working: {show(stats.notWorking)}</Text>
            <Text>Special Assets: {show(stats.special)}</Text> */}
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

      {/* QR FAB — केवल production */}
      {isProduction && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate("QRScan")}
          style={styles.fab}
        >
          <MaterialCommunityIcons name="qrcode-scan" size={26} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: "#111827",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 8,
  },
  btnText: { color: "#fff", fontWeight: "700" },
  btnOutline: {
    borderWidth: 1,
    borderColor: "#111827",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  btnOutlineText: { color: "#111827", fontWeight: "700" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
});
