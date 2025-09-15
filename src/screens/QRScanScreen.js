// screens/QRScanScreen.js
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused, useRoute } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as api from "../services/api";

/* ----------------- helpers ----------------- */
const safeDecode = (s) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

function getAssetIdFrom(anything) {
  if (!anything) return null;

  if (typeof anything === "object") {
    return (
      anything.assetId ||
      anything.id ||
      anything.asset_id ||
      anything.code ||
      null
    );
  }

  const s = String(anything).trim();

  // Try JSON
  try {
    const obj = JSON.parse(safeDecode(s));
    const id =
      obj.assetId || obj.id || obj.asset_id || obj.code || obj.asset?.id;
    if (id) return String(id);
  } catch {}

  // Try URL (?assetId= / ?id= / ?code=) or path tail
  try {
    if (s.includes("://") || s.startsWith("http")) {
      const u = new URL(s);
      const qp = u.searchParams;
      const qId =
        qp.get("assetId") ||
        qp.get("asset_id") ||
        qp.get("id") ||
        qp.get("code");
      if (qId) return safeDecode(qId);
      const tail = u.pathname.split("/").filter(Boolean).pop();
      if (tail) return safeDecode(tail);
    }
  } catch {}

  // Fallback: look for …assetId=… patterns
  const m = s.match(/(?:assetId|asset_id|id|code)=([^&#]+)/i);
  if (m?.[1]) return safeDecode(m[1]);

  // Raw string looks like an id already
  if (s.length) return s;

  return null;
}

/* ----------------- screen ----------------- */
export default function QRScanScreen({ navigation }) {
  const isFocused = useIsFocused();
  const route = useRoute();
  const { expectedAssetId, requestId, next } = route.params || {}; // may be undefined (QR icon flow)

  const [permission, requestPermission] = useCameraPermissions();

  const [ready, setReady] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [err, setErr] = useState("");
  const throttleRef = useRef(0);

  // ask permission when focused
  useEffect(() => {
    let alive = true;
    (async () => {
      setReady(false);
      setScanned(false);
      setErr("");
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

  const gotoAssetDetails = useCallback(
    async (assetId) => {
      setFetching(true);
      setErr("");
      try {
        const res = await api.get_asset_details(assetId).catch(() => null);
        const payload = res?.data ?? res ?? undefined;

        navigation.replace("AssetDetails", {
          assetId,
          ...(payload ? { initialAsset: payload } : {}),
          fromQR: true,
        });
      } catch (e) {
        const msg = e?.message || "Failed to load asset.";
        setErr(msg);
        Alert.alert("Scan Result", msg, [{ text: "OK" }]);
        setScanned(false);
      } finally {
        setFetching(false);
      }
    },
    [navigation]
  );

  const gotoUpdateProcess = useCallback(async () => {
    try {
      setFetching(true);
      if (requestId) {
        await AsyncStorage.setItem(`started_req_${requestId}`, "1");
      }
      if (next?.screen) {
        navigation.replace(next.screen, next.params || {});
      } else {
        navigation.replace("UpdateProcess", { requestId });
      }
    } catch (e) {
      Alert.alert("Error", e?.message || "QR handling failed.", [
        { text: "OK", onPress: () => setScanned(false) },
      ]);
    } finally {
      setFetching(false);
    }
  }, [navigation, next, requestId]);

  const handleScanned = useCallback(
    ({ data }) => {
      if (scanned || fetching) return;

      const now = Date.now();
      if (now - throttleRef.current < 800) return; // debounce
      throttleRef.current = now;

      setScanned(true);
      setErr("");

      const scannedId = getAssetIdFrom(data);
      if (!scannedId) {
        setErr("Could not read asset ID from the QR code.");
        Alert.alert("Invalid QR", "Could not read asset ID from the QR code.", [
          { text: "Try again", onPress: () => setScanned(false) },
        ]);
        return;
      }

      // Mode A: Start Task flow (verify against expectedAssetId)
      if (expectedAssetId) {
        if (String(scannedId) !== String(expectedAssetId)) {
          setErr("Scanned QR does not match the selected request’s asset.");
          Alert.alert(
            "Mismatch",
            "Scanned QR code does not match this maintenance request’s asset.",
            [{ text: "Try again", onPress: () => setScanned(false) }]
          );
          return;
        }
        // Match OK -> mark started + go to UpdateProcess
        gotoUpdateProcess();
        return;
      }

      // Mode B: QR icon flow (no expectedAssetId) -> open Asset Details
      gotoAssetDetails(scannedId);
    },
    [scanned, fetching, expectedAssetId, gotoAssetDetails, gotoUpdateProcess]
  );

  /* ---------- permission/ready UIs ---------- */
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

  /* ----------------- view ----------------- */
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
        <Text style={styles.caption}>
          {fetching ? "Processing…" : "Point your camera at a QR code"}
        </Text>
        {!!err && (
          <Text
            style={[
              styles.caption,
              { marginTop: 8, opacity: 0.9, color: "#fecaca" },
            ]}
          >
            {err}
          </Text>
        )}
        {scanned && !fetching && (
          <TouchableOpacity
            style={styles.retryBtnDark}
            onPress={() => setScanned(false)}
          >
            <Text style={styles.retryTextLight}>Scan Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/* ----------------- styles ----------------- */
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
  retryBtnDark: {
    marginTop: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  retryTextLight: { color: "#fff", fontWeight: "800" },
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
