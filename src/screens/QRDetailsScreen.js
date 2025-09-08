import React, { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet as RNStyleSheet,
} from "react-native";
import { Buffer } from "buffer";

/** ---------- helpers ---------- */
const FIRST_VALUE = (obj, keys) =>
  keys.map((k) => obj?.[k]).find((v) => v !== undefined && v !== null);

const safeDecode = (s) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

function tryBase64Decode(s) {
  if (!s || typeof s !== "string") return null;
  const clean = s
    .trim()
    .replace(/^data:.*?;base64,/, "")
    .replace(/[\r\n\s]+/g, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  try {
    return Buffer.from(clean, "base64").toString("utf8");
  } catch {
    return null;
  }
}

function tryParse(jsonish) {
  if (jsonish == null) return null;
  if (typeof jsonish === "object") return jsonish;
  const s = String(jsonish).trim();
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {}
  for (let i = 0; i < 2; i++) {
    try {
      return JSON.parse(safeDecode(i ? safeDecode(s) : s));
    } catch {}
  }
  const b64 = tryBase64Decode(s);
  if (b64) {
    try {
      return JSON.parse(b64);
    } catch {}
  }
  return null;
}

function parseFromUrlString(raw) {
  const s = (raw || "").trim();
  if (!s) return null;
  if (s.includes("://") || s.startsWith("http") || s.startsWith("myapp://")) {
    try {
      const u = new URL(s);
      const key = ["data", "payload", "p"].find((k) => u.searchParams.get(k));
      if (key) {
        const v = u.searchParams.get(key);
        return (
          tryParse(v) || tryParse(safeDecode(v)) || tryParse(tryBase64Decode(v))
        );
      }
    } catch {}
  }
  const m = s.match(/[?&](?:data|payload|p)=([^&#]+)/i);
  if (m?.[1]) {
    const val = m[1];
    return (
      tryParse(val) ||
      tryParse(safeDecode(val)) ||
      tryParse(tryBase64Decode(val))
    );
  }
  return null;
}

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
  const s = String(anything);
  const q = s.match(/[?&](?:assetId|asset_id|id|code)=([^&#]+)/i);
  if (q?.[1]) return safeDecode(q[1]);
  const last = s.split(/[?#]/)[0].split("/").filter(Boolean).pop();
  if (last && last.length) return last;
  return null;
}

function extractDetailsFromRoute(route) {
  const p = route?.params || {};
  const rawCandidate =
    FIRST_VALUE(p, [
      "data",
      "payload",
      "scannedData",
      "qrData",
      "value",
      "result",
      "text",
      "url",
      "deepLink",
      "link",
    ]) || "";

  if (typeof rawCandidate === "object") return rawCandidate;

  const raw = String(rawCandidate);
  const objDirect = tryParse(raw);
  if (objDirect) return objDirect;

  const objFromUrl = parseFromUrlString(raw);
  if (objFromUrl) return objFromUrl;

  const objFromParams = tryParse(p);
  if (objFromParams) return objFromParams;

  const id = getAssetIdFrom(raw) || getAssetIdFrom(p) || null;
  return id ? { assetId: id } : null;
}

/** ---------- screen ---------- */
export default function QRDetailsScreen({ route, navigation }) {
  const assetDetails = extractDetailsFromRoute(route);
  const assetId =
    getAssetIdFrom(assetDetails) || getAssetIdFrom(route?.params) || null;

  // If only assetId present, jump to AssetDetails to fetch real data
  useEffect(() => {
    if (assetId && (!assetDetails || Object.keys(assetDetails).length <= 2)) {
      navigation.replace("AssetDetails", { assetId, fromQR: true });
    }
  }, [assetId, assetDetails, navigation]);

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
    const s = (status || "").toLowerCase();
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
              uri:
                assetDetails.imageUrl ||
                "https://dummyimage.com/600x338/edf2f7/2d3748&text=Asset+Image",
            }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>
            {assetId || assetDetails.assetId || assetDetails.id || "Asset"}
            {assetDetails.name ? ` - ${assetDetails.name}` : ""}
          </Text>

          <View
            style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}
          >
            <Text style={[styles.statusText, { color: statusStyle.color }]}>
              {assetDetails.status || "Unknown"}
            </Text>
          </View>

          {/* Basic */}
          <View style={styles.section}>
            {basicDetails.map((it) => (
              <View key={it.label} style={styles.detailRow}>
                <Text style={styles.rowLabel}>{it.label}</Text>
                <Text style={styles.rowValue}>{it?.value ?? "N/A"}</Text>
              </View>
            ))}
          </View>

          {/* Additional */}
          <View style={styles.additionalBox}>
            <Text style={styles.additionalTitle}>Additional Information</Text>
            {additionalDetails.map((it) => (
              <View key={it.label} style={styles.additionalRow}>
                <Text style={styles.additionalLabel}>{it.label}:</Text>
                <Text style={styles.additionalValue}>{it?.value ?? "N/A"}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

/** ---------- styles ---------- */
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
