import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import * as api from "../services/api";

export default function AssetDetailsScreen({ route, navigation }) {
  const assetId = route?.params?.assetId;
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!assetId) throw new Error("Missing asset id");
        const d = await api.get_asset_details(assetId); // -> { success, data, ... }
        if (!cancelled) setAsset(d?.data ?? null);
      } catch (err) {
        console.log("get_asset_details error:", err?.message || err);
        if (!cancelled) Alert.alert("Couldn't load asset", "Please try again.");
      } finally {
        if (!cancelled) {
          console.log("Finished loading asset details.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assetId]);

  // (Optional) set the header title when data is available
  useEffect(() => {
    if (asset?.assetName && navigation?.setOptions) {
      navigation.setOptions({ title: asset.assetName });
    }
  }, [asset?.assetName, navigation]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!asset) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>
          Asset #{String(assetId)}
        </Text>
        <Text style={{ color: "#6b7280" }}>No details found.</Text>
      </View>
    );
  }

  const purchaseDate = asset?.assetPurchaseDate
    ? new Date(asset.assetPurchaseDate).toLocaleDateString()
    : "—";

  const status = asset?.assetStatus || "—";
  const isUnderMaint = !!asset?.underMaintenance;

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 12 }}>
        {asset?.assetName ?? "Asset"}{" "}
        {asset?.assetCode ? `(#${asset.assetCode})` : ""}
      </Text>

      {!!asset?.assetQrCodeUrl && (
        <Image
          source={{ uri: asset.assetQrCodeUrl }}
          style={{
            width: 160,
            height: 160,
            alignSelf: "center",
            marginBottom: 16,
          }}
          resizeMode="contain"
        />
      )}

      <View
        style={{
          flexDirection: "row",
          gap: 8,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        {status !== "—" && (
          <Text
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 9999,
              backgroundColor: status === "Working" ? "#dcfce7" : "#fee2e2",
              color: status === "Working" ? "#166534" : "#991b1b",
              fontSize: 12,
            }}
          >
            {status}
          </Text>
        )}
        {isUnderMaint && (
          <Text
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 9999,
              backgroundColor: "#fff7ed",
              color: "#9a3412",
              fontSize: 12,
            }}
          >
            Under Maintenance
          </Text>
        )}
      </View>

      <View style={{ gap: 6 }}>
        <Text>
          <Text style={{ fontWeight: "700" }}>Code: </Text>
          {asset?.assetCode ?? "—"}
        </Text>
        <Text>
          <Text style={{ fontWeight: "700" }}>Model: </Text>
          {asset?.assetModelNo ?? "—"}
        </Text>
        <Text>
          <Text style={{ fontWeight: "700" }}>Category: </Text>
          {asset?.assetCategory?.assetCategory ?? "—"}
        </Text>
        <Text>
          <Text style={{ fontWeight: "700" }}>Brand: </Text>
          {asset?.assetBrand?.assetBrand ?? "—"}
        </Text>
        <Text>
          <Text style={{ fontWeight: "700" }}>Location: </Text>
          {asset?.assetLocation?.locationCode ?? "—"}-
          {asset?.assetLocation?.locationName ?? "—"}
        </Text>
        <Text>
          <Text style={{ fontWeight: "700" }}>Purchase Date: </Text>
          {purchaseDate}
        </Text>
        <Text>
          <Text style={{ fontWeight: "700" }}>Price: </Text>
          {asset?.assetPrice ?? "—"}
        </Text>
        <Text>
          <Text style={{ fontWeight: "700" }}>Special: </Text>
          {asset?.specialAsset ?? "—"}
        </Text>
      </View>

      {/* Debug JSON (optional) */}
      {/* <Text style={{ marginTop: 16, fontFamily: 'monospace' }}>{JSON.stringify(asset, null, 2)}</Text> */}
    </ScrollView>
  );
}
