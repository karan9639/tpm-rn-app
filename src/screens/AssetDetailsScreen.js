import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import * as api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function AssetDetailsScreen({ route, navigation }) {
  const assetId = route?.params?.assetId;
  const { user } = useAuth();

  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!assetId) throw new Error("Missing asset id");
        const d = await api.get_asset_details(assetId);
        if (!cancelled) setAsset(d?.data ?? null);
      } catch (err) {
        console.log("get_asset_details error:", err?.message || err);
        if (!cancelled) Alert.alert("Couldn't load asset", "Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  const role = (user?.role || "").toLowerCase();
  const canRequestMaintenance = role === "production"; // web rule
  const canTransfer = role === "supervisor"; // web rule

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  if (!asset)
    return (
      <View style={{ padding: 16 }}>
        <Text>No details found.</Text>
      </View>
    );

  const isUnderMaint = !!asset?.underMaintenance;
  const purchaseDate = asset?.assetPurchaseDate
    ? new Date(asset.assetPurchaseDate).toLocaleDateString()
    : "N/A";
  const status = asset?.assetStatus || "—";

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={styles.title}>
        {asset?.assetName ?? "Asset"}{" "}
        {asset?.assetCode ? `(#${asset.assetCode})` : ""}
      </Text>

      {!!asset?.assetQrCodeUrl && (
        <Image
          source={{ uri: asset.assetQrCodeUrl }}
          style={styles.qr}
          resizeMode="contain"
        />
      )}

      <View style={styles.pillsRow}>
        {status !== "—" && (
          <Text
            style={[
              styles.pill,
              status === "Working" ? styles.pillGreen : styles.pillRed,
            ]}
          >
            {status}
          </Text>
        )}
        {isUnderMaint && (
          <Text style={[styles.pill, styles.pillAmber]}>Under Maintenance</Text>
        )}
      </View>

      <View style={{ gap: 6 }}>
        <Text>
          <Text style={styles.bold}>Code: </Text>
          {asset?.assetCode ?? "—"}
        </Text>
        <Text>
          <Text style={styles.bold}>Model: </Text>
          {asset?.assetModelNo ?? "—"}
        </Text>
        <Text>
          <Text style={styles.bold}>Category: </Text>
          {asset?.assetCategory?.assetCategory ?? "—"}
        </Text>
        <Text>
          <Text style={styles.bold}>Brand: </Text>
          {asset?.assetBrand?.assetBrand ?? "—"}
        </Text>
        <Text>
          <Text style={styles.bold}>Location: </Text>
          {asset?.assetLocation?.locationCode ?? "—"}-
          {asset?.assetLocation?.locationName ?? "—"}
        </Text>
        <Text>
          <Text style={styles.bold}>Purchase Date: </Text>
          {purchaseDate}
        </Text>
        <Text>
          <Text style={styles.bold}>Price: </Text>
          {asset?.assetPrice ?? "—"}
        </Text>
        <Text>
          <Text style={styles.bold}>Special: </Text>
          {asset?.specialAsset ?? "—"}
        </Text>
      </View>

      {(canTransfer || canRequestMaintenance) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Actions</Text>

          {canTransfer && (
            <TouchableOpacity
              onPress={() => navigation.navigate("TransferAsset", { asset })}
              style={[styles.btn, styles.btnSecondary]}
            >
              <Text style={styles.btnText}>Transfer Asset</Text>
            </TouchableOpacity>
          )}

          {canRequestMaintenance && (
            <>
              <TouchableOpacity
                onPress={() =>
                  !isUnderMaint &&
                  navigation.navigate("RequestMaintenance", {
                    assetId,
                    assetName: asset.assetName,
                  })
                }
                disabled={isUnderMaint}
                style={[
                  styles.btn,
                  styles.btnPrimary,
                  isUnderMaint && styles.btnDisabled,
                ]}
              >
                <Text style={styles.btnText}>Request Maintenance</Text>
              </TouchableOpacity>
              {isUnderMaint && (
                <Text style={styles.helperWarn}>
                  This asset is already under maintenance.
                </Text>
              )}
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  qr: { width: 160, height: 160, alignSelf: "center", marginBottom: 16 },
  pillsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    fontSize: 12,
    overflow: "hidden",
  },
  pillGreen: { backgroundColor: "#dcfce7", color: "#166534" },
  pillRed: { backgroundColor: "#fee2e2", color: "#991b1b" },
  pillAmber: { backgroundColor: "#fff7ed", color: "#9a3412" },
  bold: { fontWeight: "700" },
  card: {
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: { fontWeight: "700", fontSize: 16, marginBottom: 6 },
  btn: {
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    marginTop: 6,
  },
  btnPrimary: { backgroundColor: "#2563eb" },
  btnSecondary: { backgroundColor: "#e5e7eb" },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700" },
  helperWarn: {
    textAlign: "center",
    fontSize: 12,
    color: "#9a3412",
    marginTop: 4,
  },
});
