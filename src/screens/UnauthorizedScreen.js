import React from "react";
import { View, Text } from "react-native";
export default function UnauthorizedScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 6 }}>
        Unauthorized
      </Text>
      <Text style={{ color: "#6b7280", textAlign: "center" }}>
        You do not have permission to view this page.
      </Text>
    </View>
  );
}
