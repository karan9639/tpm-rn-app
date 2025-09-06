// src/components/RoleGate.js
import React from "react";
import { View, ActivityIndicator } from "react-native";
import UnauthorizedScreen from "../screens/UnauthorizedScreen";
import { useAuth } from "../context/AuthContext";

export default function RoleGate({ allow = [], children }) {
  const { user, loading } = useAuth?.() || { user: null, loading: false };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  const role = (user?.role || "").toLowerCase();
  const allowed =
    allow.length === 0 || allow.map((s) => s.toLowerCase()).includes(role);
  if (!allowed) return <UnauthorizedScreen />;

  return children;
}
