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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MaterialCommunityIcons as MCI } from "@expo/vector-icons";

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

  const Icon = ({ name, size = 18, color = "#0f172a" }) => {
    const map = MCI.glyphMap || {};
    const aliases = {
      "information-slab-circle-outline": "information-outline",
      "gesture-tap-button": "gesture-tap",
    };
    const resolved = map[name]
      ? name
      : map[aliases[name]]
      ? aliases[name]
      : "information-outline";
    return <MCI name={resolved} size={size} color={color} />;
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.loadingHint}>Loading details…</Text>
      </View>
    );

  if (!asset)
    return (
      <View style={styles.fallback}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={22}
          color="#ef4444"
        />
        <Text style={styles.fallbackText}>No details found.</Text>
      </View>
    );

  const isUnderMaint = !!asset?.underMaintenance;
  const purchaseDate = asset?.assetPurchaseDate
    ? new Date(asset.assetPurchaseDate).toLocaleDateString()
    : "N/A";
  const status = asset?.assetStatus || "—";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Title */}
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>
          {asset?.assetName ?? "Asset"}{" "}
          {asset?.assetCode ? (
            <Text style={styles.titleCode}>(#{asset.assetCode})</Text>
          ) : null}
        </Text>

        {/* Pills */}
        <View style={styles.pillsRow}>
          {status !== "—" && (
            <View
              style={[
                styles.pill,
                status === "Working" ? styles.pillGreen : styles.pillRed,
              ]}
            >
              <MaterialCommunityIcons
                name={status === "Working" ? "check-circle" : "alert-octagon"}
                size={14}
                color={status === "Working" ? "#166534" : "#991b1b"}
              />
              <Text
                style={[
                  styles.pillText,
                  status === "Working"
                    ? styles.pillTextGreen
                    : styles.pillTextRed,
                ]}
              >
                {status}
              </Text>
            </View>
          )}
          {isUnderMaint && (
            <View style={[styles.pill, styles.pillAmber]}>
              <MaterialCommunityIcons
                name="wrench-clock"
                size={14}
                color="#9a3412"
              />
              <Text style={[styles.pillText, styles.pillTextAmber]}>
                Under Maintenance
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* QR */}
      {!!asset?.assetQrCodeUrl && (
        <View style={styles.qrCard}>
          <View style={styles.qrHeader}>
            <MaterialCommunityIcons name="qrcode" size={16} color="#374151" />
            <Text style={styles.qrLabel}>Asset QR</Text>
          </View>
          <Image
            source={{ uri: asset.assetQrCodeUrl }}
            style={styles.qr}
            resizeMode="contain"
          />
        </View>
      )}

      {/* Details Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Icon name="information-slab-circle-outline" />
          <Text style={styles.cardTitle}>Details</Text>
        </View>

        <View style={styles.row}>
          <View style={styles.rowIconWrap}>
            <MaterialCommunityIcons name="barcode" size={16} color="#64748b" />
          </View>
          <Text style={styles.rowKey}>Code</Text>
          <Text style={styles.rowVal} numberOfLines={1}>
            {asset?.assetCode ?? "—"}
          </Text>
        </View>

        <View style={styles.row}>
          <View style={styles.rowIconWrap}>
            <MaterialCommunityIcons
              name="cube-outline"
              size={16}
              color="#64748b"
            />
          </View>
          <Text style={styles.rowKey}>Model</Text>
          <Text style={styles.rowVal} numberOfLines={1}>
            {asset?.assetModelNo ?? "—"}
          </Text>
        </View>

        <View style={styles.row}>
          <View style={styles.rowIconWrap}>
            <MaterialCommunityIcons
              name="shape-outline"
              size={16}
              color="#64748b"
            />
          </View>
          <Text style={styles.rowKey}>Category</Text>
          <Text style={styles.rowVal} numberOfLines={1}>
            {asset?.assetCategory?.assetCategory ?? "—"}
          </Text>
        </View>

        <View style={styles.row}>
          <View style={styles.rowIconWrap}>
            <MaterialCommunityIcons
              name="alpha-b-box-outline"
              size={16}
              color="#64748b"
            />
          </View>
          <Text style={styles.rowKey}>Brand</Text>
          <Text style={styles.rowVal} numberOfLines={1}>
            {asset?.assetBrand?.assetBrand ?? "—"}
          </Text>
        </View>

        <View style={styles.row}>
          <View style={styles.rowIconWrap}>
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={16}
              color="#64748b"
            />
          </View>
          <Text style={styles.rowKey}>Location</Text>
          <Text style={styles.rowVal} numberOfLines={1}>
            {asset?.assetLocation?.locationCode ?? "—"} ·{" "}
            {asset?.assetLocation?.locationName ?? "—"}
          </Text>
        </View>

        <View style={styles.row}>
          <View style={styles.rowIconWrap}>
            <MaterialCommunityIcons
              name="calendar-month-outline"
              size={16}
              color="#64748b"
            />
          </View>
          <Text style={styles.rowKey}>Purchase</Text>
          <Text style={styles.rowVal} numberOfLines={1}>
            {purchaseDate}
          </Text>
        </View>

        <View style={styles.row}>
          <View style={styles.rowIconWrap}>
            <MaterialCommunityIcons
              name="cash-multiple"
              size={16}
              color="#64748b"
            />
          </View>
          <Text style={styles.rowKey}>Price</Text>
          <Text style={styles.rowVal} numberOfLines={1}>
            {asset?.assetPrice ?? "—"}
          </Text>
        </View>

        <View style={styles.row}>
          <View style={styles.rowIconWrap}>
            <MaterialCommunityIcons
              name="star-outline"
              size={16}
              color="#64748b"
            />
          </View>
          <Text style={styles.rowKey}>Special</Text>
          <Text style={styles.rowVal} numberOfLines={1}>
            {asset?.specialAsset ?? "—"}
          </Text>
        </View>
      </View>

      {/* Actions */}
      {(canTransfer || canRequestMaintenance) && (
        <View style={[styles.card, styles.cardTight]}>
          <View style={styles.cardHeader}>
            <Icon name="gesture-tap-button" />
            <Text style={styles.cardTitle}>Actions</Text>
          </View>

          {canTransfer && (
            <TouchableOpacity
              onPress={() => navigation.navigate("TransferAsset", { asset })}
              style={[styles.btn, styles.btnSecondary]}
              activeOpacity={0.9}
            >
              <MaterialCommunityIcons
                name="swap-horizontal"
                size={18}
                color="#111827"
              />
              <Text style={[styles.btnText, styles.btnTextSecondary]}>
                Transfer Asset
              </Text>
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
                activeOpacity={0.9}
              >
                <MaterialCommunityIcons
                  name="wrench-outline"
                  size={18}
                  color="#fff"
                />
                <Text style={[styles.btnText, styles.btnTextPrimary]}>
                  Request Maintenance
                </Text>
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
  // Screen & structure
  screen: { flex: 1, backgroundColor: "#f8fafc" }, // slate-50
  content: { padding: 16, paddingBottom: 28 },

  // Loading & fallback
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  loadingHint: { marginTop: 8, color: "#64748b", fontWeight: "600" },
  fallback: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    columnGap: 8,
  },
  fallbackText: { marginLeft: 8, color: "#ef4444", fontWeight: "700" },

  // Header
  header: { marginBottom: 10 },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a", // slate-900
    letterSpacing: 0.2,
  },
  titleCode: { color: "#475569", fontWeight: "800" },

  // Pills
  pillsRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  pillText: { marginLeft: 6, fontSize: 12, fontWeight: "800" },
  pillGreen: { backgroundColor: "#dcfce7", borderColor: "#bbf7d0" },
  pillRed: { backgroundColor: "#fee2e2", borderColor: "#fecaca" },
  pillAmber: { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
  pillTextGreen: { color: "#166534" },
  pillTextRed: { color: "#991b1b" },
  pillTextAmber: { color: "#9a3412" },

  // QR card
  qrCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    // subtle shadow
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  qrHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  qrLabel: { marginLeft: 6, color: "#374151", fontWeight: "800" },
  qr: { width: 180, height: 180 },

  // Generic card
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb", // gray-200
    // shadow
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  cardTight: { paddingTop: 10, paddingBottom: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  cardTitle: {
    marginLeft: 8,
    fontWeight: "800",
    fontSize: 16,
    color: "#0f172a",
  },

  // Rows
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9", // slate-100
  },
  rowIconWrap: { width: 24, alignItems: "center", justifyContent: "center" },
  rowKey: {
    width: 90,
    fontSize: 12,
    color: "#6b7280", // gray-500
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginLeft: 6,
  },
  rowVal: { flex: 1, fontSize: 14, color: "#0f172a", fontWeight: "600" },

  // Buttons
  btn: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    marginTop: 8,
    flexDirection: "row",
  },
  btnPrimary: {
    backgroundColor: "#2563eb", // blue-600
    // shadow
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 3,
  },
  btnSecondary: {
    backgroundColor: "#e5e7eb", // gray-200
  },
  btnDisabled: { opacity: 0.65 },
  btnText: {
    marginLeft: 8,
    fontWeight: "800",
    letterSpacing: 0.3,
    fontSize: 15,
  },
  btnTextPrimary: { color: "#fff" },
  btnTextSecondary: { color: "#111827" },

  // Helper
  helperWarn: {
    textAlign: "center",
    fontSize: 12,
    color: "#9a3412",
    marginTop: 8,
    fontWeight: "700",
  },
});
