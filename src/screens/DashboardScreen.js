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
  const [stats, setStats] = useState({
    totalAssets: null,
    underMaintenance: null,
    working: null,
    notWorking: null,
    special: null,
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

  // headerRight -> Logout
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    (async () => {
      try {
        const env = await api.get_asset_counting();
        const block = Array.isArray(env?.data) ? env.data[0] : env?.data || {};

        const totalAssets = block?.totalAssets?.[0]?.count ?? 0;
        const underMaintenance = block?.underMaintenance?.[0]?.total ?? 0;

        const findByStatus = (label) =>
          (block?.byStatus || []).find((x) => (x?._id || x?.id) === label)
            ?.total ?? 0;

        const working = findByStatus("Working");
        const notWorking = findByStatus("Not Working");
        const special = block?.specialAssets?.[0]?.total ?? 0;

        setStats({
          totalAssets,
          underMaintenance,
          working,
          notWorking,
          special,
        });
      } catch (e) {
        console.log("dashboard stats error:", e?.message || e);
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
    })();
  }, [scannerOpen]);

  const show = (v) => (v === null || v === undefined ? "—" : String(v));

  const handleBarCodeScanned = ({ type, data }) => {
    if (scanned) return;
    setScanned(true);
    setScannerOpen(false);

    // TODO: adjust destination if needed (e.g., "AssetDetails")
    // Pass the scanned data along for your next screen to handle.
    navigation.navigate("Assets", {
      scannedCode: data,
      scannedType: type,
    });

    // If you want a quick visual confirmation:
    // Alert.alert("Scanned", `Type: ${type}\nData: ${data}`);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.rolePill}>Role: {roleRaw || "—"}</Text>
      </View>

      {loading ? (
        <ActivityIndicator />
      ) : (
        <View style={styles.grid}>
          <View style={[styles.statCard, styles.cardPrimary]}>
            <View style={[styles.iconCircle, styles.iconPrimary]}>
              <MaterialCommunityIcons
                name="warehouse"
                size={18}
                color="#1d4ed8"
              />
            </View>
            <Text style={styles.statLabel}>Total Assets</Text>
            <Text style={styles.statValue}>{show(stats.totalAssets)}</Text>
          </View>

          <View style={[styles.statCard, styles.cardAmber]}>
            <View style={[styles.iconCircle, styles.iconAmber]}>
              <MaterialCommunityIcons
                name="wrench-outline"
                size={18}
                color="#b45309"
              />
            </View>
            <Text style={styles.statLabel}>Under Maintenance</Text>
            <Text style={styles.statValue}>{show(stats.underMaintenance)}</Text>
          </View>

          {/*
          // Uncomment these if you'd like to show more cards
          <View style={[styles.statCard, styles.cardSuccess]}>
            <View style={[styles.iconCircle, styles.iconSuccess]}>
              <MaterialCommunityIcons name="check-circle-outline" size={18} color="#15803d" />
            </View>
            <Text style={styles.statLabel}>Working</Text>
            <Text style={styles.statValue}>{show(stats.working)}</Text>
          </View>

          <View style={[styles.statCard, styles.cardDanger]}>
            <View style={[styles.iconCircle, styles.iconDanger]}>
              <MaterialCommunityIcons name="alert-octagon-outline" size={18} color="#b91c1c" />
            </View>
            <Text style={styles.statLabel}>Not Working</Text>
            <Text style={styles.statValue}>{show(stats.notWorking)}</Text>
          </View>

          <View style={[styles.statCard, styles.cardIndigo]}>
            <View style={[styles.iconCircle, styles.iconIndigo]}>
              <MaterialCommunityIcons name="star-outline" size={18} color="#4338ca" />
            </View>
            <Text style={styles.statLabel}>Special Assets</Text>
            <Text style={styles.statValue}>{show(stats.special)}</Text>
          </View>
          */}
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

      {/* QR FAB — only for production users */}
      {isProduction && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            setScanned(false);
            setScannerOpen(true);
          }}
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
          {/* Top bar */}
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
              {/* Optional "scan again" when paused */}
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
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f8fafc", // slate-50
  },

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

  // Stat grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  statLabel: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 2,
  },
  statValue: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 6,
  },

  // Icon bubble
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    borderWidth: 1,
  },

  // Color accents
  cardPrimary: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" },
  iconPrimary: { backgroundColor: "#dbeafe", borderColor: "#bfdbfe" },

  cardAmber: { backgroundColor: "#fffbeb", borderColor: "#fde68a" },
  iconAmber: { backgroundColor: "#fef3c7", borderColor: "#fde68a" },

  cardSuccess: { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" },
  iconSuccess: { backgroundColor: "#d1fae5", borderColor: "#a7f3d0" },

  cardDanger: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  iconDanger: { backgroundColor: "#fee2e2", borderColor: "#fecaca" },

  cardIndigo: { backgroundColor: "#eef2ff", borderColor: "#c7d2fe" },
  iconIndigo: { backgroundColor: "#e0e7ff", borderColor: "#c7d2fe" },

  // Buttons
  btn: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
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
  scannerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
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
  scannerTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  closeBtn: {
    padding: 6,
  },
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
