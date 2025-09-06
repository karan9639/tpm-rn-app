import React from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet as RNStyleSheet,
} from "react-native";

export default function QRDetailsScreen({ route, navigation }) {
  const raw = route?.params?.data ?? route?.params?.scannedData ?? "";

  let assetDetails = null;
  try {
    assetDetails = JSON.parse(decodeURIComponent(raw));
  } catch {
    try {
      assetDetails = JSON.parse(raw);
    } catch {
      assetDetails = null;
    }
  }

  if (!assetDetails) {
    return (
      <View style={styles.invalidWrap}>
        <Text style={styles.invalidTitle}>Invalid QR Code</Text>
        <Text style={styles.invalidText}>
          The scanned QR code data is not valid.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("Dashboard")}
          style={styles.invalidBtn}
        >
          <Text style={styles.invalidBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getStatusClass = (status = "") => {
    const s = status.toLowerCase();
    if (s === "working") return { bg: "#dcfce7", color: "#166534" };
    if (s === "idle") return { bg: "#dbeafe", color: "#1e40af" };
    if (s === "under maintenance") return { bg: "#fee2e2", color: "#991b1b" };
    if (s === "waiting for approval")
      return { bg: "#fef3c7", color: "#92400e" };
    return { bg: "#f3f4f6", color: "#374151" };
  };

  const basicDetails = [
    { label: "Asset Code", value: assetDetails.code },
    { label: "Model", value: assetDetails.model },
    { label: "Category", value: assetDetails.category },
    { label: "Brand", value: assetDetails.brand },
    { label: "Location", value: assetDetails.location },
    { label: "Price", value: assetDetails.price },
  ];

  const additionalDetails = [
    { label: "Supplier", value: assetDetails.supplier },
    { label: "Purchase Date", value: assetDetails.purchaseDate },
    { label: "Last Maintenance", value: assetDetails.lastMaintenance },
    { label: "Next Maintenance", value: assetDetails.nextMaintenance },
  ];

  const statusStyle = getStatusClass(assetDetails.status);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backLink}>‹ Back</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <View style={styles.heroImageWrap}>
          <Image
            source={{
              uri: "https://dummyimage.com/600x338/edf2f7/2d3748&text=Asset+Image",
            }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>
            {assetDetails.assetId} - {assetDetails.name}
          </Text>

          <View
            style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}
          >
            <Text style={[styles.statusText, { color: statusStyle.color }]}>
              {assetDetails.status || "Unknown"}
            </Text>
          </View>

          <View style={styles.section}>
            {basicDetails.map((it) => (
              <View key={it.label} style={styles.detailRow}>
                <Text style={styles.rowLabel}>{it.label}</Text>
                <Text style={styles.rowValue}>{it.value || "N/A"}</Text>
              </View>
            ))}
          </View>

          <View style={styles.additionalBox}>
            <Text style={styles.additionalTitle}>Additional Information</Text>
            {additionalDetails.map((it) => (
              <View key={it.label} style={styles.additionalRow}>
                <Text style={styles.additionalLabel}>{it.label}:</Text>
                <Text style={styles.additionalValue}>{it.value || "N/A"}</Text>
              </View>
            ))}
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={() => navigation.navigate("TransferAsset")}
              style={[styles.btn, styles.btnPrimary]}
            >
              <Text style={styles.btnText}>Transfer Asset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate("MaintenanceRequests")}
              style={[styles.btn, styles.btnOutline]}
            >
              <Text style={styles.btnOutlineText}>Maintenance</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const COLORS = {
  bg: "#ffffff",
  surface: "#ffffff",
  text: "#0f172a",
  textMuted: "#6b7280",
  border: "#e5e7eb",
  primary: "#2563eb",
  inputBg: "#f9fafb",
};
const SHADOWS = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
};

const styles = RNStyleSheet.create({
  scrollContent: { padding: 16, gap: 16, backgroundColor: COLORS.bg },
  backLink: { color: COLORS.primary, fontWeight: "700", fontSize: 14 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  heroImageWrap: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  heroImage: { width: "100%", height: "100%" },
  content: { padding: 16 },

  title: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 10,
    letterSpacing: 0.2,
  },

  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    ...SHADOWS.sm,
  },
  statusText: { fontWeight: "800" },

  section: { marginTop: 16 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowLabel: { color: COLORS.textMuted, fontSize: 14 },
  rowValue: { fontWeight: "700", color: COLORS.text, fontSize: 14 },

  additionalBox: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  additionalTitle: {
    fontWeight: "800",
    marginBottom: 8,
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  additionalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  additionalLabel: { color: COLORS.textMuted, fontSize: 13 },
  additionalValue: { fontWeight: "700", color: COLORS.text, fontSize: 13 },

  actionsRow: { flexDirection: "row", columnGap: 12, marginTop: 16 },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  btnPrimary: { backgroundColor: COLORS.primary, ...SHADOWS.md },
  btnOutline: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  btnText: { color: "#fff", fontWeight: "800", letterSpacing: 0.3 },
  btnOutlineText: {
    color: COLORS.primary,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  invalidWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: COLORS.bg,
  },
  invalidTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
    color: COLORS.text,
  },
  invalidText: { color: COLORS.textMuted, textAlign: "center" },
  invalidBtn: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 12,
    ...SHADOWS.md,
  },
  invalidBtnText: { color: "#fff", fontWeight: "800", letterSpacing: 0.2 },
});
