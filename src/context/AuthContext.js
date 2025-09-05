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

// --- helpers -------------------------------------------------
const FIRST = (...vals) =>
  vals.find((v) => v !== undefined && v !== null && v !== "");

function extractRoleFrom(obj) {
  if (!obj || typeof obj !== "object") return "";
  // check common keys
  const direct =
    FIRST(
      obj.role,
      obj.userRole,
      obj.accountType,
      obj.employeeType,
      obj.type,
      obj.designation,
      obj.roleName
    ) || "";

  if (direct) return String(direct).toLowerCase();

  // nested possibilities
  const nested =
    FIRST(
      obj?.employee?.role,
      obj?.employee?.employeeType,
      obj?.user?.role,
      obj?.user?.employeeType,
      obj?.permissions?.role
    ) ||
    (Array.isArray(obj?.roles) && obj.roles[0]) ||
    "";

  return nested ? String(nested).toLowerCase() : "";
}

function extractEmailFrom(obj) {
  return (
    FIRST(
      obj?.email,
      obj?.employeeEmail,
      obj?.user?.email,
      obj?.employee?.email,
      obj?.data?.email
    ) || ""
  );
}

function normalizeUserEnvelope(envelope) {
  // pick best candidate object that looks like a "user"
  const candidate =
    FIRST(
      envelope?.user,
      envelope?.data?.user,
      envelope?.employee,
      envelope?.data?.employee,
      envelope?.data
    ) || {};

  const role = extractRoleFrom(envelope) || extractRoleFrom(candidate) || ""; // may still be empty

  const email = extractEmailFrom(candidate) || extractEmailFrom(envelope);

  const user = { ...candidate, role, email };
  const token = envelope?.token;

  return { user, token };
}
// ----------------------------------------------------------------

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // restore session
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
    // 1) call API
    const envelope = await api.login(credentials); // returns server envelope (may include token)
    // 2) normalize
    let { user: u, token } = normalizeUserEnvelope(envelope);

    // save token if present (api.login already stores too, but this is safe)
    if (token) {
      try {
        await AsyncStorage.setItem("auth_token", token);
      } catch {}
    }

    // 3) fallback: if role still empty, try to fetch current user info and derive role
    if (!u?.role) {
      try {
        const cur = await api.get_current_user(); // your web app also calls this endpoint
        // backend अक्सर array देता है; email match करो, वरना first item ले लो
        const list = cur?.data || cur || [];
        const match =
          (Array.isArray(list) &&
            list.find((x) => {
              const xe = extractEmailFrom(x);
              return (
                xe && u?.email && xe.toLowerCase() === u.email.toLowerCase()
              );
            })) ||
          (Array.isArray(list) ? list[0] : null);

        const fallbackRole = extractRoleFrom(match);
        if (fallbackRole) {
          u = { ...(u || {}), ...match, role: fallbackRole };
        }
      } catch (e) {
        // ignore; role may remain blank but app will still be logged in
        console.log("get_current_user fallback failed:", e?.message || e);
      }
    }

    if (!u) throw new Error("Login succeeded but user info missing.");
    if (!u.role) {
      // last resort: block with a crisp message so you notice in QA
      console.log(
        "WARNING: role missing on user. Envelope:",
        JSON.stringify(envelope)
      );
    }

    setUser(u);
    await AsyncStorage.setItem("auth_user", JSON.stringify(u));
    return u;
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
