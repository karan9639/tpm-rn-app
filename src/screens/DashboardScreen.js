// src/screens/DashboardScreen.js
import React, { useEffect, useState, useLayoutEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from "react-native";
import * as api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { BarCodeScanner } from "expo-barcode-scanner";

export default function DashboardScreen({ navigation }) {
  const [counts, setCounts] = useState({
    totalAssets: 0,
    breakdownMaintenance: 0,
    underMaintenance: 0,
  });
  const [loading, setLoading] = useState(true);

  // QR state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [hasPermission, setHasPermission] = useState(null); // null | boolean
  const [scanned, setScanned] = useState(false);

  const { user, logout } = useAuth();
  const roleRaw = (user?.role ?? user?.accountType ?? user?.employeeType ?? "")
    .toString()
    .toLowerCase();
  const isProduction = roleRaw.includes("production");

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={confirmLogout}
          style={{ paddingHorizontal: 8, paddingVertical: 6 }}
          accessibilityLabel="Logout"
        >
          <Feather name="log-out" size={20} color="#111827" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const confirmLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
          } catch (e) {
            Alert.alert("Error", e?.message || "Failed to logout");
          }
        },
      },
    ]);
  };

  // ---- counts
  useEffect(() => {
    (async () => {
      try {
        let resp =
          (api.assetAPI?.getAssetCounting &&
            (await api.assetAPI.getAssetCounting())) ||
          (await api.get_asset_counting());

        const arr =
          (Array.isArray(resp?.data) && resp?.data) ||
          (Array.isArray(resp?.data?.data) && resp?.data?.data) ||
          (Array.isArray(resp) && resp) ||
          [];

        const data = arr[0] || {};

        const totalAssets = data?.totalAssets?.[0]?.count || 0;

        const breakdownMaintenance =
          data.byStatus?.find((s) => (s?._id ?? s?.id) === "Not Working")
            ?.total || 0;

        const underMaintenance =
          data.underMaintenance?.find((it) => it?._id === true)?.total || 0;

        setCounts({ totalAssets, breakdownMaintenance, underMaintenance });
      } catch (error) {
        console.log("[Dashboard] get counts error:", error?.message || error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Ask camera permission when opening scanner
  useEffect(() => {
    if (!scannerOpen) return;
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === "granted");
      setScanned(false);
    })();
  }, [scannerOpen]);

  const cards = [
    {
      title: "Hi, Jasmine Knitting 👋",
      subtitle: "Time to check in!",
      description: "Please punch in.",
      iconName: "power",
      iconColor: "#fff",
      iconBg: "#22c55e",
      bgColor: "#eff6ff",
      borderColor: "#bfdbfe",
    },
    {
      title: `Total Assets - ${loading ? "..." : counts.totalAssets}`,
      description: `You have ${loading ? "..." : counts.totalAssets} assets.`,
      iconName: "warehouse",
      iconColor: "#1d4ed8",
      iconBg: "#ffffff",
      bgColor: "#eef2ff",
      borderColor: "#c7d2fe",
    },
    {
      title: `Breakdown Maintenance - ${
        loading ? "..." : counts.breakdownMaintenance
      }`,
      description: `You have ${
        loading ? "..." : counts.breakdownMaintenance
      } Breakdowns Left.`,
      iconName: "alert-octagon-outline",
      iconColor: "#f59e0b",
      iconBg: "#ffffff",
      bgColor: "#fff7ed",
      borderColor: "#fed7aa",
    },
    {
      title: `Under Maintenance - ${loading ? "..." : counts.underMaintenance}`,
      description: `Currently ${
        loading ? "..." : counts.underMaintenance
      } asset(s) under maintenance.`,
      iconName: "wrench-outline",
      iconColor: "#b45309",
      iconBg: "#ffffff",
      bgColor: "#fffbeb",
      borderColor: "#fde68a",
    },
  ];

  const handleBarCodeScanned = ({ type, data }) => {
    if (scanned) return;
    setScanned(true);
    setTimeout(() => setScannerOpen(false), 50);
    navigation.navigate("Assets", {
      scannedCode: data,
      scannedType: type,
    });
  };

  const openScanner = () => {
    setHasPermission(null);
    setScanned(false);
    setScannerOpen(true);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.rolePill}>Role: {roleRaw || "—"}</Text>
      </View>

      {/* Cards */}
      <View style={{ gap: 12 }}>
        {cards.map((c, idx) => (
          <View
            key={idx}
            style={[
              styles.card,
              { backgroundColor: c.bgColor, borderColor: c.borderColor },
            ]}
          >
            <View style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{c.title}</Text>
                {c.subtitle ? (
                  <Text style={styles.cardSubtitle}>{c.subtitle}</Text>
                ) : null}
                <Text style={styles.cardDesc}>{c.description}</Text>
              </View>
              <View
                style={[styles.iconCircleBig, { backgroundColor: c.iconBg }]}
              >
                <MaterialCommunityIcons
                  name={c.iconName}
                  size={28}
                  color={c.iconColor}
                />
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Actions */}
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

      {/* QR FAB — only for production users */}
      {isProduction && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={openScanner}
          style={styles.fab}
        >
          <MaterialCommunityIcons name="qrcode-scan" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      {/* QR Scanner Modal */}
      <Modal
        visible={scannerOpen}
        animationType="slide"
        onRequestClose={() => setScannerOpen(false)}
      >
        <View style={styles.scannerContainer}>
          <View style={styles.scannerTopBar}>
            <Text style={styles.scannerTitle}>Scan QR Code</Text>
            <TouchableOpacity
              onPress={() => {
                setScannerOpen(false);
                setScanned(false);
              }}
              style={styles.closeBtn}
              accessibilityLabel="Close scanner"
            >
              <Feather name="x" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {hasPermission === null ? (
            <View style={styles.scannerCenter}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.scannerText}>
                Requesting camera permission…
              </Text>
            </View>
          ) : hasPermission === false ? (
            <View style={styles.scannerCenter}>
              <Text style={styles.scannerText}>
                Camera permission not granted.
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  const { status } =
                    await BarCodeScanner.requestPermissionsAsync();
                  setHasPermission(status === "granted");
                }}
                style={styles.reqPermBtn}
              >
                <Text style={{ color: "#111827", fontWeight: "800" }}>
                  Allow Camera
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <BarCodeScanner
                onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
                style={StyleSheet.absoluteFillObject}
              />
              {scanned && (
                <TouchableOpacity
                  style={styles.scanAgainBtn}
                  onPress={() => setScanned(false)}
                >
                  <Text style={styles.scanAgainText}>Tap to Scan Again</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Screen
  container: { flex: 1, padding: 16, backgroundColor: "#f8fafc" },

  // Header
  header: { marginBottom: 12 },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  rolePill: {
    alignSelf: "flex-start",
    backgroundColor: "#eef2ff",
    color: "#3730a3",
    borderColor: "#c7d2fe",
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "700",
  },

  // Card
  card: { borderRadius: 16, padding: 14, borderWidth: 1 },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  cardSubtitle: { color: "#6b7280", marginBottom: 4, fontWeight: "700" },
  cardDesc: { color: "#6b7280" },
  iconCircleBig: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },

  // Buttons
  btn: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 3,
  },
  btnText: {
    color: "#fff",
    fontWeight: "800",
    letterSpacing: 0.3,
    fontSize: 15,
  },
  btnOutline: {
    borderWidth: 1.2,
    borderColor: "#111827",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnOutlineText: {
    color: "#111827",
    fontWeight: "800",
    letterSpacing: 0.3,
    fontSize: 15,
  },

  // FAB
  fab: {
    position: "absolute",
    right: 20,
    bottom: 28,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
  },

  // Scanner modal
  scannerContainer: { flex: 1, backgroundColor: "#000" },
  scannerTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(0,0,0,0.35)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 2,
  },
  scannerTitle: { color: "#fff", fontWeight: "800", fontSize: 16 },
  closeBtn: { padding: 6 },
  scannerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  scannerText: { color: "#fff", marginTop: 12, textAlign: "center" },
  reqPermBtn: {
    marginTop: 12,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  scanAgainBtn: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  scanAgainText: { color: "#fff", fontWeight: "800" },
});
