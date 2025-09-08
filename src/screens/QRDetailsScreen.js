// src/screens/QRDetailsScreen.js
import React from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet as RNStyleSheet,
} from "react-native";
import { Buffer } from "buffer"; // base64 fallback

/** ---------- helpers ---------- */

const FIRST_VALUE = (obj, keys) =>
  keys.map((k) => obj?.[k]).find((v) => v !== undefined && v !== null);

/** decodeURIComponent safely */
function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** try base64 (normal or URL-safe) */
function tryBase64Decode(s) {
  if (!s || typeof s !== "string") return null;
  const clean = s
    .trim()
    .replace(/^data:.*?;base64,/, "") // data URI
    .replace(/[\r\n\s]+/g, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/"); // url-safe -> std
  try {
    // atob may not exist on RN; Buffer is reliable
    return Buffer.from(clean, "base64").toString("utf8");
  } catch {
    return null;
  }
}

/** JSON.parse with a few common encodings */
function tryParse(jsonish) {
  if (jsonish == null) return null;

  // Already an object?
  if (typeof jsonish === "object") return jsonish;

  const s = String(jsonish).trim();
  if (!s) return null;

  // direct JSON
  try {
    return JSON.parse(s);
  } catch {}

  // URI-decoded JSON (1–2 times)
  for (let i = 0; i < 2; i++) {
    try {
      return JSON.parse(safeDecode(i ? safeDecode(s) : s));
    } catch {}
  }

  // base64 -> JSON
  const b64 = tryBase64Decode(s);
  if (b64) {
    try {
      return JSON.parse(b64);
    } catch {}
  }

  return null;
}

/** Read ?data=/ ?payload=/ ?p= from a URL-like string (encoded, base64, etc.) */
function parseFromUrlString(raw) {
  const s = (raw || "").trim();
  if (!s) return null;

  // Use URL API if possible
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

  // Fallback regex
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

/** Pull a plausible assetId from object/string/URL */
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

  // query param
  const q = s.match(/[?&](?:assetId|asset_id|id|code)=([^&#]+)/i);
  if (q?.[1]) return safeDecode(q[1]);

  // path tail …/assets/<id> or …/<id>
  const last = s.split(/[?#]/)[0].split("/").filter(Boolean).pop();
  if (last && /^[\w-]{3,}$/.test(last)) return last;

  return null;
}

/** Try to extract details from many shapes (web-parity) */
function extractDetailsFromRoute(route) {
  const p = route?.params || {};

  // Common param names that scanners/deep-links use
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

  // 1) If an object was passed directly
  if (typeof rawCandidate === "object") {
    return rawCandidate;
  }

  const raw = String(rawCandidate);

  // 2) direct JSON / uri-decoded / base64
  const objDirect = tryParse(raw);
  if (objDirect) return objDirect;

  // 3) URL with ?data= / ?payload= / ?p=
  const objFromUrl = parseFromUrlString(raw);
  if (objFromUrl) return objFromUrl;

  // 4) Sometimes the whole route.params itself carries the fields
  const objFromParams = tryParse(p);
  if (objFromParams) return objFromParams;

  // 5) Last resort: build minimal details from an id we can find
  const id = getAssetIdFrom(raw) || getAssetIdFrom(p) || null;

  return id ? { assetId: id } : null;
}

/** ---------- screen ---------- */

export default function QRDetailsScreen({ route, navigation }) {
  const assetDetails = extractDetailsFromRoute(route);
  const assetId =
    getAssetIdFrom(assetDetails) || getAssetIdFrom(route?.params) || null;

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

          {/* Specifications */}
          {!!assetDetails.specifications &&
            typeof assetDetails.specifications === "object" && (
              <View style={styles.additionalBox}>
                <Text style={styles.additionalTitle}>Specifications</Text>
                {Object.entries(assetDetails.specifications).map(([k, v]) => (
                  <View key={k} style={styles.additionalRow}>
                    <Text style={styles.additionalLabel}>
                      {k.replace(/([A-Z])/g, " $1")}:
                    </Text>
                    <Text style={styles.additionalValue}>{String(v)}</Text>
                  </View>
                ))}
              </View>
            )}

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("TransferAsset", { assetId, assetDetails })
              }
              style={[styles.btn, styles.btnPrimary]}
            >
              <Text style={styles.btnText}>Transfer Asset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("MaintenanceRequests", {
                  assetId,
                  assetDetails,
                })
              }
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
