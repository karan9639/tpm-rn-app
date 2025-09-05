// src/context/AuthContext.js
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { name, email, role, ... }
  const [isLoading, setIsLoading] = useState(true);

  // Restore session
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("auth_user");
        if (stored) setUser(JSON.parse(stored));
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  const login = async (credentials) => {
    const envelope = await api.login(credentials); // web: authAPI.login
    // try to extract a user + role from backend envelope
    const extracted =
      envelope?.user ||
      envelope?.data?.user ||
      envelope?.employee ||
      envelope?.data?.employee ||
      envelope?.data ||
      null;

    const role = (extracted?.role || envelope?.role || "").toLowerCase();
    const finalUser = extracted
      ? { ...extracted, role }
      : role
      ? { role }
      : null;
    if (!finalUser) throw new Error("Login succeeded but user info missing.");

    setUser(finalUser);
    await AsyncStorage.setItem("auth_user", JSON.stringify(finalUser));
    return finalUser;
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {}
    await AsyncStorage.multiRemove(["auth_user", "auth_token"]);
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, isLoading, isAuthenticated: !!user, login, logout }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
