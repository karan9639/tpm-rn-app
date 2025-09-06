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

export default function QRDetailsScreen({ route, navigation }) {
  const raw = route?.params?.data || "";

  let assetDetails = null;
  try {
    // web की तरह decodeURIComponent → JSON.parse
    assetDetails = JSON.parse(decodeURIComponent(raw));
  } catch {
    try {
      assetDetails = JSON.parse(raw);
    } catch {
      /* ignore */
    }
  }

  if (!assetDetails) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 4 }}>
          Invalid QR Code
        </Text>
        <Text style={{ color: "#6b7280", textAlign: "center" }}>
          The scanned QR code data is not valid.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("Dashboard")}
          style={{
            marginTop: 12,
            backgroundColor: "#2563eb",
            padding: 12,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            Back to Dashboard
          </Text>
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

  const basic = [
    { label: "Asset Code", value: assetDetails.code },
    { label: "Model", value: assetDetails.model },
    { label: "Category", value: assetDetails.category },
    { label: "Brand", value: assetDetails.brand },
    { label: "Location", value: assetDetails.location },
    { label: "Price", value: assetDetails.price },
  ];
  const additional = [
    { label: "Supplier", value: assetDetails.supplier },
    { label: "Purchase Date", value: assetDetails.purchaseDate },
    { label: "Last Maintenance", value: assetDetails.lastMaintenance },
    { label: "Next Maintenance", value: assetDetails.nextMaintenance },
  ];

  const statusStyle = getStatusClass(assetDetails.status);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={{ color: "#2563eb", fontWeight: "700" }}>‹ Back</Text>
      </TouchableOpacity>

      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          overflow: "hidden",
          elevation: 2,
        }}
      >
        <View
          style={{
            width: "100%",
            aspectRatio: 16 / 9,
            backgroundColor: "#e5e7eb",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Image
            source={{
              uri: "https://dummyimage.com/600x338/edf2f7/2d3748&text=Asset+Image",
            }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>

        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 8 }}>
            {assetDetails.assetId} - {assetDetails.name}
          </Text>
          <View
            style={{
              alignSelf: "flex-start",
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 9999,
              backgroundColor: statusStyle.bg,
            }}
          >
            <Text style={{ color: statusStyle.color, fontWeight: "700" }}>
              {assetDetails.status}
            </Text>
          </View>

          {/* Basic details */}
          <View style={{ marginTop: 16 }}>
            {basic.map((it) => (
              <View
                key={it.label}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: "#f3f4f6",
                }}
              >
                <Text style={{ color: "#6b7280" }}>{it.label}</Text>
                <Text style={{ fontWeight: "700" }}>{it.value || "N/A"}</Text>
              </View>
            ))}
          </View>

          {/* Additional */}
          <View
            style={{
              backgroundColor: "#f9fafb",
              borderRadius: 12,
              padding: 12,
              marginTop: 16,
            }}
          >
            <Text style={{ fontWeight: "700", marginBottom: 8 }}>
              Additional Information
            </Text>
            {additional.map((it) => (
              <View
                key={it.label}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 4,
                }}
              >
                <Text style={{ color: "#6b7280" }}>{it.label}:</Text>
                <Text style={{ fontWeight: "700" }}>{it.value || "N/A"}</Text>
              </View>
            ))}
          </View>

          {/* Actions (optional: same as web) */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate("TransferAsset")}
              style={{
                flex: 1,
                backgroundColor: "#2563eb",
                padding: 12,
                borderRadius: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                Transfer Asset
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate("MaintenanceRequests")}
              style={{
                flex: 1,
                borderColor: "#2563eb",
                borderWidth: 1,
                padding: 12,
                borderRadius: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#2563eb", fontWeight: "700" }}>
                Maintenance
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// Shared palette & shadows (reuse across screens)
const COLORS = {
  bg: "#ffffff",
  surface: "#ffffff",
  text: "#0f172a",
  textMuted: "#6b7280",
  border: "#e5e7eb",
  borderStrong: "#d1d5db",
  primary: "#2563eb",
  primaryDark: "#1e40af",
  primarySoft: "#dbeafe",
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
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6,
  },
};

const styles = RNStyleSheet.create({
  // Scroll container
  scrollContent: {
    padding: 16,
    gap: 16,
    backgroundColor: COLORS.bg,
  },

  // Back link
  backLink: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 14,
  },

  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },

  // Hero image
  heroImageWrap: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  heroImage: { width: "100%", height: "100%" },

  // Content area
  content: { padding: 16 },

  // Title
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 10,
    letterSpacing: 0.2,
  },

  // Status pill (apply bg via inline override from getStatusClass)
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    ...SHADOWS.sm,
  },
  statusText: {
    fontWeight: "800",
  },

  // Sections
  section: { marginTop: 16 },

  // Detail rows (basic)
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowLabel: { color: COLORS.textMuted, fontSize: 14 },
  rowValue: { fontWeight: "700", color: COLORS.text, fontSize: 14 },

  // Additional box
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

  // Actions
  actionsRow: {
    flexDirection: "row",
    columnGap: 12,
    marginTop: 16,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.md,
  },
  btnOutline: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  btnText: {
    color: "#ffffff",
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  btnOutlineText: {
    color: COLORS.primary,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  // Invalid QR state
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
