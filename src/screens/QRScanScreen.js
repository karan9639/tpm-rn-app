// src/screens/QRScanScreen.js
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { BarCodeScanner } from "expo-barcode-scanner";

export default function QRScanScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      if (mounted) setHasPermission(status === "granted");
      setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleBarCodeScanned = ({ data }) => {
    if (scanned) return;
    setScanned(true);

    // web में data को URL param में भेजते थे;
    // यहां हम सीधे next स्क्रीन को data दे देंगे
    navigation.replace("QRDetails", { data });
  };

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Preparing camera…</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera permission denied</Text>
        <Text style={styles.muted}>
          Enable camera permission from settings.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
        barCodeTypes={[BarCodeScanner.Constants.BarCodeType.qr]}
      />
      {/* Simple scan-frame overlay */}
      <View style={styles.overlay}>
        <View style={styles.frame} />
        <Text style={styles.caption}>Point your camera at a QR code</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  muted: { color: "#6b7280" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    width: 250,
    height: 250,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.9)",
  },
  caption: {
    marginTop: 16,
    color: "#fff",
    fontWeight: "600",
  },
});
