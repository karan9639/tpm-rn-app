import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import * as api from "../services/api";

export default function UpdateProcessScreen() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const env = await api.get_my_assigned_maintenances();
      setItems(env?.data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const closeReq = async (assetId) => {
    try {
      await api.close_maintenance_request(assetId);
      Alert.alert("Closed", "Maintenance closed.");
      await load();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  if (loading)
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );

  return (
    <FlatList
      data={items}
      keyExtractor={(it, idx) => it._id || String(idx)}
      contentContainerStyle={{ padding: 12 }}
      renderItem={({ item }) => (
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 12,
            marginBottom: 10,
            elevation: 2,
          }}
        >
          <Text style={{ fontWeight: "700" }}>
            {item.assetName || item.asset?.assetName || "Asset"}
          </Text>
          <Text style={{ color: "#6b7280" }}>{item.description || "—"}</Text>
          <Text style={{ marginTop: 4 }}>
            Status: {item.closed ? "Closed" : "Open"}
          </Text>
          {!item.closed && (
            <TouchableOpacity
              onPress={() => closeReq(item.assetId || item.asset?._id)}
              style={{
                backgroundColor: "#2563eb",
                padding: 10,
                borderRadius: 8,
                marginTop: 8,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                Mark Completed
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    />
  );
}
