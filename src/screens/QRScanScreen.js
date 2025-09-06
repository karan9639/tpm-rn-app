import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useIsFocused } from "@react-navigation/native";
import UnauthorizedScreen from "./UnauthorizedScreen";

export default function QRScanScreen({ route, navigation }) {
  // Open camera only if caller explicitly allowed it
  const allowScan = route?.params?.allowScan === true;
  const next = route?.params?.next; // { screen, params }

  // HOOKS (must be declared before any return)
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [scanned, setScanned] = useState(false);
  const throttleRef = useRef(0);

  const handleScanned = useCallback(
    ({ data, type }) => {
      if (scanned) return;

      const now = Date.now();
      if (now - throttleRef.current < 800) return; // throttle double fires
      throttleRef.current = now;

      setScanned(true);

      if (next?.screen) {
        navigation.replace(next.screen, {
          ...(next.params || {}),
          scannedData: data,
          scannedType: type,
        });
      } else {
        navigation.replace("QRDetails", { data, type });
      }
    },
    [navigation, next, scanned]
  );

  // Ask permission when focused
  useEffect(() => {
    let alive = true;
    (async () => {
      setReady(false);
      setScanned(false);

      if (!isFocused) {
        if (alive) setReady(true);
        return;
      }
      if (!permission || permission.status === "undetermined") {
        await requestPermission();
      }
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [isFocused, permission?.status, requestPermission]);

  // Gate — if caller didn’t allow, show Unauthorized
  if (!allowScan) return <UnauthorizedScreen />;

  // Permission flow UIs
  if (!ready || !permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Preparing camera…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera permission required</Text>
        <Text style={styles.muted}>
          Please allow access to use the scanner.
        </Text>
        <TouchableOpacity onPress={requestPermission} style={styles.retryBtn}>
          <Text style={styles.retryText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Scanner
  return (
    <View style={styles.container}>
      {isFocused && (
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={scanned ? undefined : handleScanned}
        />
      )}

      {/* Overlay */}
      <View style={styles.overlay}>
        <View style={styles.frame}>
          <View style={styles.scanLine} />
        </View>
        <Text style={styles.caption}>Point your camera at a QR code</Text>
        {scanned && (
          <Text style={[styles.caption, { marginTop: 8, opacity: 0.8 }]}>
            Processing…
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 6, color: "#111827" },
  muted: { color: "#6b7280", textAlign: "center" },
  retryBtn: {
    marginTop: 12,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: "#111827", fontWeight: "800" },
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    width: 260,
    height: 260,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.95)",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  scanLine: {
    position: "absolute",
    top: 0,
    width: "90%",
    height: 2,
    backgroundColor: "#22c55e",
  },
  caption: { marginTop: 16, color: "#fff", fontWeight: "700" },
});
