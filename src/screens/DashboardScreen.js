import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import * as api from "../services/api";

export default function DashboardScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12 }}>
        Dashboard
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
});
