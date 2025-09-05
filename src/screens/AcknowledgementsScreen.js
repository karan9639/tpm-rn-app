import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, FlatList } from "react-native";
import * as api from "../services/api";

export default function AcknowledgementsScreen({ route }) {
  const assetId = route?.params?.assetId;
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const env = await api.get_acknowledgements(assetId);
        setItems(env?.data || []);
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, [assetId]);

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
            {item.title || "Acknowledgement"}
          </Text>
          <Text style={{ color: "#6b7280" }}>{item.message || "—"}</Text>
          <Text style={{ marginTop: 4 }}>
            By: {item.by || item.sender || "—"}
          </Text>
        </View>
      )}
      ListEmptyComponent={
        <Text style={{ textAlign: "center", marginTop: 20 }}>
          No acknowledgements
        </Text>
      }
    />
  );
}
