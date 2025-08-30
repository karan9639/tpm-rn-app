import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import * as api from "../services/api";
import { useNavigation /*, useFocusEffect*/ } from "@react-navigation/native";

const normalizeAssets = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.assets)) return res.assets;
  if (Array.isArray(res?.result)) return res.result;
  return [];
};

export default function AssetsScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get_assets();
      // console.log("Fetched assets:", res);
      setItems(normalizeAssets(res));
    } catch (err) {
      console.error("Failed to fetch assets:", err);
      Alert.alert(
        "Couldn’t load assets",
        "Please check your network/API and try again."
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  // Optional: reload whenever screen focuses
  // useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderItem = useCallback(
    ({ item }) => {
      const id = item?.id || item?._id || item?.assetId;
      const name = item?.name || item?.assetName || "Asset";
      const code = item?.code || item?.assetCode || "";
      const status = item?.assetStatus || item?.status || "";
      const underMaint = !!item?.underMaintenance;
      const qr = item?.assetQrCodeUrl;

      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate("AssetDetails", { assetId: id })}
          style={{
            padding: 12,
            borderWidth: 1,
            borderColor: "#e5e7eb",
            borderRadius: 8,
            marginBottom: 12,
            backgroundColor: "#fff",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {qr ? (
              <Image
                source={{ uri: qr }}
                style={{ width: 56, height: 56, marginRight: 12 }}
                resizeMode="contain"
              />
            ) : null}

            <View style={{ flex: 1 }}>
              <Text
                style={{ fontWeight: "700", fontSize: 16 }}
                numberOfLines={1}
              >
                {name}
              </Text>
              <Text style={{ color: "#6b7280" }} numberOfLines={1}>
                {code}
              </Text>

              <View style={{ flexDirection: "row", marginTop: 6, gap: 8 }}>
                {!!status && (
                  <Text
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 9999,
                      overflow: "hidden",
                      backgroundColor:
                        status === "Working" ? "#dcfce7" : "#fee2e2",
                      color: status === "Working" ? "#166534" : "#991b1b",
                      fontSize: 12,
                    }}
                  >
                    {status}
                  </Text>
                )}
                {underMaint && (
                  <Text
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 9999,
                      overflow: "hidden",
                      backgroundColor: "#fff7ed",
                      color: "#9a3412",
                      fontSize: 12,
                    }}
                  >
                    Under Maintenance
                  </Text>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [navigation]
  );

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: "#f9fafb" }}>
      {loading && items.length === 0 ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 12, color: "#6b7280" }}>
            Loading assets…
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it, idx) =>
            String(it?.id || it?._id || it?.assetId || idx)
          }
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={load} />
          }
          ListEmptyComponent={
            <Text
              style={{ textAlign: "center", marginTop: 24, color: "#6b7280" }}
            >
              No assets
            </Text>
          }
          initialNumToRender={12}
          removeClippedSubviews
        />
      )}
    </View>
  );
}
