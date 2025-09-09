// src/components/RoleGate.js
import React, { useEffect, useMemo, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import UnauthorizedScreen from "../screens/UnauthorizedScreen";
import { useAuth } from "../context/AuthContext";

const normalize = (v) => (v ? String(v).trim().toLowerCase() : "");

// Try to pull a role/accountType from AsyncStorage (fallback like the web code)
const readStoredRole = async () => {
  try {
    // 1) flat keys first
    for (const k of ["accountType", "role", "userRole"]) {
      const v = await AsyncStorage.getItem(k);
      if (v) return normalize(v);
    }

    // 2) common container keys that might hold a JSON object
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
        // ignore bad JSON
      }
    }
  } catch {
    // ignore storage errors
  }
  return "";
};

export default function RoleGate({ allow = [], children }) {
  const { user, loading: authLoading } = useAuth?.() || {
    user: null,
    loading: false,
  };

  // Prefer accountType -> role -> userRole (same as web)
  const directRole = useMemo(
    () => normalize(user?.accountType || user?.role || user?.userRole),
    [user]
  );

  const [fallbackRole, setFallbackRole] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (directRole) {
        setFallbackRole(""); // not needed
        return;
      }
      const stored = await readStoredRole();
      if (!cancelled) setFallbackRole(stored);
    })();
    return () => {
      cancelled = true;
    };
  }, [directRole]);

  const role = directRole || fallbackRole;

  const allowedList = useMemo(
    () => (Array.isArray(allow) ? allow : [allow]).map(normalize),
    [allow]
  );

  const isLoading = authLoading || (!directRole && !fallbackRole);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  // No restrictions -> open gate
  if (allowedList.length === 0) return children;

  // Allow if role matched
  if (allowedList.includes(role)) return children;

  // Otherwise block
  return <UnauthorizedScreen />;
}
