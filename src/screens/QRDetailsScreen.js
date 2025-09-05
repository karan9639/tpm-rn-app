// src/screens/QRDetailsScreen.js
import React from "react";
import { View, Text, ScrollView, Image, TouchableOpacity } from "react-native";

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
