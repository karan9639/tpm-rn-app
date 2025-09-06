import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import * as api from "../services/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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
      <View style={styles.loadingWrap}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Loading assets…</Text>
      </View>
    );

  const renderItem = ({ item }) => {
    const isMaint = !!item?.underMaintenance;
    const locationCode = item?.assetLocation?.locationCode ?? "—";
    const locationName = item?.assetLocation?.locationName ?? "—";
    const assetCode = item?.assetCode ?? "—";

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate("AssetDetails", { assetId: item._id })
        }
        style={[styles.card, isMaint ? styles.cardWarn : styles.cardOk]}
      >
        {/* Title + status */}
        <View style={styles.cardTopRow}>
          <Text style={styles.name} numberOfLines={1}>
            {item?.assetName ?? "Untitled Asset"}
          </Text>
          <Text
            style={[
              styles.badge,
              isMaint ? styles.badgeDanger : styles.badgeSuccess,
            ]}
            numberOfLines={1}
          >
            {isMaint ? "Under Maintenance" : "Operational"}
          </Text>
        </View>

        {/* Location */}
        <View style={styles.metaRow}>
          <View style={styles.metaIconWrap}>
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={16}
              color="#64748b"
            />
          </View>
          <Text style={styles.metaKey}>Location</Text>
          <Text style={styles.metaVal} numberOfLines={1}>
            {locationCode} · {locationName}
          </Text>
        </View>

        {/* Code */}
        <View style={styles.metaRow}>
          <View style={styles.metaIconWrap}>
            <MaterialCommunityIcons name="barcode" size={16} color="#64748b" />
          </View>
          <Text style={styles.metaKey}>Code</Text>
          <Text style={styles.metaVal} numberOfLines={1}>
            {assetCode}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={assets}
      keyExtractor={(item) => item._id}
      style={styles.screen}
      contentContainerStyle={[
        styles.listContent,
        !assets.length && { flex: 1 },
      ]}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.h1}>Assets</Text>
          <Text style={styles.subtitle}>
            {assets.length} item{assets.length === 1 ? "" : "s"}
          </Text>
        </View>
      }
      renderItem={renderItem}
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons
            name="tray-remove"
            size={28}
            color="#94a3b8"
          />
          <Text style={styles.emptyText}>No assets</Text>
          <Text style={styles.emptySubtext}>
            Items will appear here once added.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  // Screen
  screen: { backgroundColor: "#f8fafc" }, // slate-50
  listContent: { padding: 12, paddingTop: 6 },

  // Loading
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: { marginTop: 8, color: "#64748b", fontWeight: "600" },

  // Header
  header: { paddingHorizontal: 4, paddingVertical: 10, marginBottom: 6 },
  h1: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a", // slate-900
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  subtitle: {
    color: "#64748b", // slate-500
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  // Card
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb", // gray-200
    // Left accent bar
    borderLeftWidth: 6,
    // Shadow (iOS)
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    // Shadow (Android)
    elevation: 2,
  },
  cardOk: { borderLeftColor: "#10b981" }, // emerald-500
  cardWarn: { borderLeftColor: "#f59e0b" }, // amber-500

  // Top row
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    paddingRight: 8,
  },

  // Status badge
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
    fontSize: 12,
    fontWeight: "800",
    borderWidth: 1,
  },
  badgeSuccess: {
    backgroundColor: "#ecfdf5", // emerald-50
    color: "#065f46", // emerald-800
    borderColor: "#a7f3d0", // emerald-200
  },
  badgeDanger: {
    backgroundColor: "#fffbeb", // amber-50
    color: "#92400e", // amber-800
    borderColor: "#fde68a", // amber-200
  },

  // Meta rows
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9", // slate-100
  },
  metaIconWrap: {
    width: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  metaKey: {
    width: 78,
    color: "#6b7280", // gray-500
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  metaVal: {
    flex: 1,
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "600",
  },

  // Empty state
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },
  emptyText: {
    color: "#94a3b8",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 6,
  },
  emptySubtext: {
    color: "#a1a1aa",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "600",
  },
});
