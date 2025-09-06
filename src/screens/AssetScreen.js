import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
} from "react-native";
import * as api from "../services/api";

export default function AssetScreen({ navigation }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const env = await api.get_assets();
        setAssets(env?.data || []);
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading)
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );

  return (
    <FlatList
      data={assets}
      keyExtractor={(item) => item._id}
      contentContainerStyle={{ padding: 12 }}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("AssetDetails", { assetId: item._id })
          }
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 12,
            marginBottom: 10,
            elevation: 2,
          }}
        >
          <Text style={{ fontWeight: "700" }}>{item.assetName}</Text>
          <Text style={{ color: "#6b7280" }}> Location: {item.assetLocation.locationCode} - {item.assetLocation.locationName}</Text>
          <Text style={{ color: "#6b7280" }}>Code: {item.assetCode}</Text>
          <Text style={{ marginTop: 4 }}>
            {item.underMaintenance ? "Under Maintenance" : "Operational"}
          </Text>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <Text style={{ textAlign: "center", marginTop: 20 }}>No assets</Text>
      }
    />
  );
}
