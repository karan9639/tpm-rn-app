import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError("");
    if (!email || !password) {
      setError("Enter email and password");
      return;
    }
    setLoading(true);
    try {
      await login({ email, password });
    } catch (e) {
      setError(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* decorative blobs (no extra libs) */}
      <View style={styles.blobA} />
      <View style={styles.blobB} />

      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>TPM APP</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        {!!error && (
          <View style={styles.errorWrap}>
            <Ionicons name="alert-circle" size={16} color="#b91c1c" />
            <Text style={styles.errorText} numberOfLines={2}>
              {error}
            </Text>
          </View>
        )}

        {/* Email */}
        <View style={styles.field}>
          <View style={styles.leadingIcon}>
            <Ionicons name="mail-outline" size={18} color="#64748b" />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            returnKeyType="next"
          />
        </View>

        {/* Password */}
        <View style={styles.field}>
          <View style={styles.leadingIcon}>
            <Ionicons name="lock-closed-outline" size={18} color="#64748b" />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#94a3b8"
            secureTextEntry={!show}
            value={password}
            onChangeText={setPassword}
            returnKeyType="done"
          />
          <TouchableOpacity
            onPress={() => setShow((s) => !s)}
            style={styles.trailingIcon}
            accessibilityLabel={show ? "Hide password" : "Show password"}
          >
            <Ionicons
              name={show ? "eye-off-outline" : "eye-outline"}
              size={18}
              color="#475569"
            />
          </TouchableOpacity>
        </View>

        {/* Login button */}
        <TouchableOpacity
          onPress={onSubmit}
          style={[styles.btn, loading && styles.btnDisabled]}
          activeOpacity={0.9}
          disabled={loading}
        >
          {loading ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.btnText}> Signing in…</Text>
            </>
          ) : (
            <>
              <Ionicons name="log-in-outline" size={18} color="#fff" />
              <Text style={styles.btnText}> Login</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Secondary row (optional links) */}
        {/* <View style={styles.footerRow}>
          <Text style={styles.footerHint}>Forgot password?</Text>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Reset</Text>
          </TouchableOpacity>
        </View> */}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Screen & background
  screen: {
    flex: 1,
    backgroundColor: "#EEF2FF", // indigo-50
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  blobA: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#c7d2fe", // indigo-200
    opacity: 0.35,
    top: -40,
    right: -40,
  },
  blobB: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#a7f3d0", // emerald-200
    opacity: 0.25,
    bottom: -30,
    left: -30,
  },

  // Card
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    // subtle border + soft shadow
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 3,
  },

  // Header
  header: { marginBottom: 14 },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0f172a", // slate-900
    textAlign: "center",
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    textAlign: "center",
    color: "#64748b", // slate-500
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // Error banner
  errorWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2", // red-50
    borderWidth: 1,
    borderColor: "#fecaca", // red-200
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  errorText: { marginLeft: 8, color: "#b91c1c", fontWeight: "700" },

  // Field (icon + input + optional trailing icon)
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  leadingIcon: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  trailingIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9", // slate-100
    marginLeft: 6,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: "#0f172a",
    paddingHorizontal: 8,
  },

  // Button
  btn: {
    marginTop: 6,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#2563eb", // blue-600
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    // lift
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 3,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: {
    color: "#fff",
    fontWeight: "800",
    letterSpacing: 0.4,
    fontSize: 15,
  },

  // Footer
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 14,
  },
  footerHint: { color: "#64748b", fontWeight: "600" },
  footerLink: {
    color: "#2563eb",
    fontWeight: "800",
    marginLeft: 6,
    textDecorationLine: "underline",
  },
});
