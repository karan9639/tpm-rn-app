import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import * as api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function DashboardScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // ⬇️ auth se role लो
  const { user } = useAuth();

  // role robust तरीके से detect (अगर backend ने अलग field दी हो)
  const roleRaw = (user?.role ?? user?.accountType ?? user?.employeeType ?? "")
    .toString()
    .toLowerCase();

  const isProduction = roleRaw.includes("production");

  useEffect(() => {
    (async () => {
      try {
        const d = await api.get_asset_counting();
        setStats(d?.data ?? null);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {/* content */}
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 4 }}>
          Dashboard
        </Text>
        {/* (optional) debug role दिखाने के लिए */}
        <Text style={{ color: "#6b7280", marginBottom: 12 }}>
          Role: {roleRaw || "—"}
        </Text>

        {loading ? (
          <ActivityIndicator />
        ) : (
          <View style={{ marginBottom: 16 }}>
            <Text>Total Assets: {stats?.totalAssets ?? "—"}</Text>
            <Text>Under Maintenance: {stats?.underMaintenance ?? "—"}</Text>
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

      {/* ✅ QR FAB — सिर्फ production के लिए */}
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
