// src/screens/UnauthorizedScreen.js
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";

const normalize = (v) => (v ? String(v).trim().toLowerCase() : "");

async function readStoredRole() {
  try {
    // 1) Flat keys first
    for (const k of ["accountType", "role", "userRole"]) {
      const v = await AsyncStorage.getItem(k);
      if (v) return normalize(v);
    }
    // 2) Common JSON containers
    for (const k of ["auth", "user", "loginData", "profile"]) {
      const raw = await AsyncStorage.getItem(k);
      if (!raw) continue;
      try {
        const obj = JSON.parse(raw);
        const fromObj =
          obj?.accountType ||
          obj?.role ||
          obj?.user?.accountType ||
          obj?.user?.role ||
          obj?.data?.accountType ||
          obj?.data?.role;
        if (fromObj) return normalize(fromObj);
      } catch {
        // ignore parse errors
      }
    }
  } catch {
    // ignore storage errors
  }
  return "";
}

export default function UnauthorizedScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();

  // role from route params (like web's location.state.role)
  const roleFromParams = normalize(route?.params?.role);

  // prefer accountType -> role -> userRole (same as web)
  const roleFromAuth = useMemo(
    () => normalize(user?.accountType || user?.role || user?.userRole),
    [user]
  );

  const [roleFromStorage, setRoleFromStorage] = useState("");
  const [loading, setLoading] = useState(false);

  // Only read storage if nothing else is present
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (roleFromParams || roleFromAuth) return;
      setLoading(true);
      const stored = await readStoredRole();
      if (!cancelled) {
        setRoleFromStorage(stored);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roleFromParams, roleFromAuth]);

  const role = roleFromParams || roleFromAuth || roleFromStorage || "unknown";

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <View style={{ alignItems: "center", maxWidth: 360, width: "100%" }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 999,
            backgroundColor: "#FEE2E2",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Feather name="shield-off" size={28} color="#DC2626" />
        </View>

        <Text
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: "#1F2937",
            marginBottom: 8,
          }}
        >
          Access Denied
        </Text>

        <Text
          style={{
            color: "#4B5563",
            textAlign: "center",
            marginBottom: 20,
            lineHeight: 20,
          }}
        >
          You don't have permission to access this page. Your current role is{" "}
          <Text style={{ fontWeight: "700" }}>{String(role)}</Text>.
        </Text>

        {loading ? (
          <ActivityIndicator />
        ) : (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                backgroundColor: "#E5E7EB",
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
              }}
            >
              <Feather
                name="arrow-left"
                size={18}
                color="#374151"
                style={{ marginRight: 6 }}
              />
              <Text style={{ color: "#374151", fontWeight: "700" }}>
                Go Back
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate("Dashboard")}
              style={{
                backgroundColor: "#2563EB",
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "800" }}>
                Dashboard
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
