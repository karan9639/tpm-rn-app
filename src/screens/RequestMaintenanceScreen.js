import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import * as api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function RequestMaintenanceScreen({ route, navigation }) {
  const { assetId, assetName } = route.params || {};
  const { user } = useAuth();
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!desc.trim()) return Alert.alert("Please enter description");
    setLoading(true);
    try {
      await api.create_maintenance_request(assetId, { description: desc });
      Alert.alert("Success", "Maintenance request raised.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>
        Request Maintenance
      </Text>
      <Text style={{ color: "#6b7280", marginBottom: 12 }}>{assetName}</Text>
      <TextInput
        placeholder="Describe the issue…"
        value={desc}
        onChangeText={setDesc}
        style={styles.input}
        multiline
      />
      <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
        <Text style={styles.btnText}>
          {loading ? "Submitting..." : "Submit"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 12,
    minHeight: 120,
    textAlignVertical: "top",
    backgroundColor: "#fff",
  },
  btn: {
    marginTop: 12,
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },
});
