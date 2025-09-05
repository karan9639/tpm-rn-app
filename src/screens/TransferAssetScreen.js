// src/screens/TransferAssetScreen.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
} from "react-native";
import {
  hr_location_get_parent_location,
  hr_location_get_location,
  change_asset_location,
} from "../services/api";
import { Feather } from "@expo/vector-icons";

function Row({
  node,
  level,
  expandedIds,
  loadingNodeIds,
  selectedId,
  onToggle,
  onSelect,
}) {
  const isExpanded = expandedIds.has(node.id);
  const isLoading = !!loadingNodeIds[node.id];
  const isLeaf = !node.hasChildren;
  const isSelectedLeaf = isLeaf && selectedId === node.id;

  const handleLabelPress = () => {
    if (node.hasChildren) onToggle(node); // parents only toggle
    else onSelect(node); // leaves select
  };

  return (
    <View style={{ paddingLeft: level * 14 }}>
      <View
        style={[
          styles.row,
          isSelectedLeaf && {
            backgroundColor: "#E8F1FF",
            borderColor: "#BFD7FF",
          },
        ]}
      >
        {/* Chevron toggles expand/collapse for parents */}
        <TouchableOpacity
          onPress={() => node.hasChildren && onToggle(node)}
          activeOpacity={0.8}
          style={styles.chevBox}
        >
          {node.hasChildren ? (
            isLoading ? (
              <ActivityIndicator size="small" />
            ) : isExpanded ? (
              <Feather name="chevron-down" size={18} color="#6B7280" />
            ) : (
              <Feather name="chevron-right" size={18} color="#6B7280" />
            )
          ) : (
            <View style={{ width: 18 }} />
          )}
        </TouchableOpacity>

        {/* Label: parents toggle, leaves select */}
        <TouchableOpacity
          style={[
            styles.labelBox,
            !isLeaf && styles.parentChip, // faint chip for parent rows
          ]}
          activeOpacity={0.8}
          onPress={handleLabelPress}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.labelText,
              isSelectedLeaf && { fontWeight: "700", color: "#111827" },
              !isLeaf && { color: "#374151" },
            ]}
          >
            {node.label}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Children */}
      {isExpanded && !isLoading && node.children?.length > 0 && (
        <View style={{ marginTop: 4 }}>
          {node.children.map((child) => (
            <Row
              key={child.id}
              node={child}
              level={level + 1}
              expandedIds={expandedIds}
              loadingNodeIds={loadingNodeIds}
              selectedId={selectedId}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export default function TransferAssetScreen({ route, navigation }) {
  const asset = route?.params?.asset;

  // tree state
  const [tree, setTree] = useState([]);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [loadingNodeIds, setLoadingNodeIds] = useState({});
  const [loadingTree, setLoadingTree] = useState(false);

  // form state
  const [selected, setSelected] = useState(null); // leaf only
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    navigation?.setOptions?.({ title: "Transfer Asset" });
  }, [navigation]);

  // helper: check if a node has children
  const ensureHasChildren = async (id) => {
    try {
      const res = await hr_location_get_location(id);
      const detail = res?.data?.[0];
      const kids = Array.isArray(detail?.children) ? detail.children : [];
      return { hasChildren: kids.length > 0, rawChildren: kids };
    } catch {
      return { hasChildren: false, rawChildren: [] };
    }
  };

  // load roots
  useEffect(() => {
    if (!asset) return;
    (async () => {
      setLoadingTree(true);
      try {
        const res = await hr_location_get_parent_location();
        const roots = await Promise.all(
          (res?.data || []).map(async (loc) => {
            const chk = await ensureHasChildren(loc._id);
            return {
              id: loc._id,
              label: loc.locationName,
              children: [],
              hasChildren: chk.hasChildren,
            };
          })
        );
        setTree(roots);
        if (roots.length === 0) Alert.alert("Info", "No locations found.");
      } catch (e) {
        Alert.alert("Error", e?.message || "Failed to load locations.");
      } finally {
        setLoadingTree(false);
      }
    })();
  }, [asset]);

  const updateTree = (nodes, id, kids) =>
    nodes.map((n) =>
      n.id === id
        ? { ...n, children: kids }
        : {
            ...n,
            children: n.children?.length
              ? updateTree(n.children, id, kids)
              : n.children,
          }
    );

  const toggleNode = useCallback(
    async (node) => {
      const next = new Set(expandedIds);
      const willExpand = !next.has(node.id);
      if (willExpand) next.add(node.id);
      else next.delete(node.id);
      setExpandedIds(next);

      if (willExpand && node.hasChildren && node.children.length === 0) {
        setLoadingNodeIds((p) => ({ ...p, [node.id]: true }));
        try {
          const res = await hr_location_get_location(node.id);
          const detail = res?.data?.[0];
          const kidsRaw = Array.isArray(detail?.children)
            ? detail.children
            : [];
          const kids = await Promise.all(
            kidsRaw.map(async (c) => {
              const check = await ensureHasChildren(c._id);
              return {
                id: c._id,
                label: c.locationName,
                children: [],
                hasChildren: check.hasChildren,
              };
            })
          );
          setTree((prev) => updateTree(prev, node.id, kids));
        } catch (e) {
          Alert.alert(
            "Error",
            e?.message || `Failed to load children for ${node.label}.`
          );
          next.delete(node.id);
          setExpandedIds(next);
        } finally {
          setLoadingNodeIds((p) => ({ ...p, [node.id]: false }));
        }
      }
    },
    [expandedIds]
  );

  const canSubmit = useMemo(
    () => !!selected && remark.trim().length > 0 && !submitting,
    [selected, remark, submitting]
  );

  const submit = async () => {
    if (!asset) return;
    if (!selected || !remark.trim()) {
      Alert.alert(
        "Validation",
        "Please select a location and provide a remark."
      );
      return;
    }
    setSubmitting(true);
    try {
      const resp = await change_asset_location({
        assetId: asset._id,
        locationId: selected.id,
        remark: remark.trim(),
      });
      Alert.alert(
        "Success",
        resp?.message || `Asset transferred to ${selected.label}.`
      );
      navigation?.replace
        ? navigation.replace("AssetDetails", { assetId: asset._id })
        : navigation.goBack();
    } catch (e) {
      Alert.alert("Error", e?.message || "Failed to transfer asset.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!asset) {
    return (
      <View style={[styles.center, { padding: 16 }]}>
        <Feather name="alert-triangle" size={48} color="#DC2626" />
        <Text style={{ fontSize: 18, fontWeight: "700", marginTop: 8 }}>
          Asset Not Found
        </Text>
        <Text style={{ color: "#6b7280", marginTop: 6, textAlign: "center" }}>
          No asset details were provided. Please navigate from an asset's detail
          page.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.btn, { marginTop: 16 }]}
        >
          <Text style={styles.btnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }}>
      {/* Asset card */}
      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={styles.iconBox}>
            <Feather name="package" size={24} color="#9CA3AF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "700", fontSize: 16 }} numberOfLines={1}>
              {asset?.assetName}
            </Text>
            <Text style={{ color: "#6b7280" }}>Code: {asset?.assetCode}</Text>
            <Text style={{ color: "#6b7280" }}>
              Current: {asset?.assetLocation?.locationName || "N/A"}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <Text style={{ color: "#6b7280", marginRight: 6 }}>Status:</Text>
              <View
                style={[
                  styles.badge,
                  asset?.underMaintenance
                    ? { backgroundColor: "#FEF3C7" }
                    : { backgroundColor: "#DCFCE7" },
                ]}
              >
                <Text
                  style={{
                    color: asset?.underMaintenance ? "#92400E" : "#166534",
                    fontSize: 12,
                    fontWeight: "700",
                  }}
                >
                  {asset?.underMaintenance
                    ? "Under Maintenance"
                    : "Operational"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Location tree */}
      <View style={styles.card}>
        <Text style={{ fontWeight: "700", marginBottom: 8 }}>
          Select New Location
        </Text>
        <View style={styles.treeBox}>
          {loadingTree ? (
            <View style={styles.center}>
              <ActivityIndicator />
              <Text style={{ color: "#6b7280", marginTop: 6 }}>
                Loading locations...
              </Text>
            </View>
          ) : tree.length > 0 ? (
            tree.map((n) => (
              <Row
                key={n.id}
                node={n}
                level={0}
                expandedIds={expandedIds}
                loadingNodeIds={loadingNodeIds}
                selectedId={selected?.id}
                onToggle={toggleNode}
                onSelect={setSelected} // will only be called for leaves
              />
            ))
          ) : (
            <Text
              style={{
                color: "#6b7280",
                textAlign: "center",
                paddingVertical: 10,
              }}
            >
              No locations available.
            </Text>
          )}
        </View>

        {selected && (
          <View style={styles.selectedBox}>
            <Feather name="check-circle" size={16} color="#1D4ED8" />
            <Text style={{ color: "#1D4ED8", marginLeft: 6 }}>
              <Text style={{ fontWeight: "700" }}>Selected: </Text>
              {selected.label}
            </Text>
          </View>
        )}
      </View>

      {/* Remark */}
      <View style={styles.card}>
        <Text style={{ fontWeight: "700", marginBottom: 6 }}>Remark *</Text>
        <TextInput
          placeholder="Enter reason for transfer..."
          value={remark}
          onChangeText={setRemark}
          style={styles.textArea}
          multiline
        />
        <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 6 }}>
          Please provide a reason for this asset transfer.
        </Text>
      </View>

      {/* Submit */}
      <TouchableOpacity
        onPress={submit}
        disabled={!canSubmit}
        style={[styles.primaryBtn, !canSubmit && { opacity: 0.5 }]}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Feather
              name="send"
              size={18}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={{ color: "#fff", fontWeight: "700" }}>
              Transfer Asset
            </Text>
          </>
        )}
      </TouchableOpacity>

      <View style={{ height: 18 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  treeBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 6,
    maxHeight: 360,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fff",
  },
  chevBox: { width: 26, paddingVertical: 10, alignItems: "center" },
  labelBox: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  parentChip: { backgroundColor: "#F3F4F6" }, // subtle chip for parents
  labelText: { color: "#111827", fontWeight: "500" },
  selectedBox: {
    marginTop: 8,
    padding: 8,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    flexDirection: "row",
    alignItems: "center",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    minHeight: 110,
    textAlignVertical: "top",
    backgroundColor: "#fff",
  },
  primaryBtn: {
    marginHorizontal: 12,
    marginTop: 4,
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  btn: {
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },
  center: { alignItems: "center", justifyContent: "center" },
});
