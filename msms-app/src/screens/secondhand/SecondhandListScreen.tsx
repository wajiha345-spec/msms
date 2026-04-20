import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { secondhandApi, SecondhandRecord } from "../../api/secondhand";
import { Badge } from "../../components/Badge";
import { colors } from "../../theme/colors";

export default function SecondhandListScreen() {
  const navigation = useNavigation<any>();
  const [records, setRecords] = useState<SecondhandRecord[]>([]);
  const [filter, setFilter] = useState<"all" | "instock" | "sold">("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchRecords() {
    try {
      const isSold =
        filter === "instock" ? false : filter === "sold" ? true : undefined;
      const res = await secondhandApi.list(isSold);
      setRecords(res.data.data);
    } catch {
      Alert.alert("Error", "Failed to load secondhand records");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchRecords();
    }, [filter]),
  );

  function renderItem({ item }: { item: SecondhandRecord }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("SecondhandDetail", { id: item.id })}
        activeOpacity={0.75}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.phoneName}>{item.mobileName}</Text>
            <Text style={styles.brand}>{item.brand}</Text>
            {item.imei && <Text style={styles.imei}>IMEI: {item.imei}</Text>}
          </View>
          <View style={styles.right}>
            <Text style={styles.price}>
              Rs {item.purchasePrice.toLocaleString()}
            </Text>
            <Badge
              label={item.isSold ? "Sold" : "In Stock"}
              type={item.isSold ? "default" : "success"}
            />
          </View>
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.seller}>👤 {item.sellerName}</Text>
          <Text style={styles.date}>
            {new Date(item.createdAt).toLocaleDateString("en-PK")}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Secondhand</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate("AddSecondhand")}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[
          styles.addBtn,
          { backgroundColor: colors.info ?? "#3B82F6", marginRight: 8 },
        ]}
        onPress={() => navigation.navigate("ImeiSearch")}
      >
        <Text style={styles.addBtnText}>🔍 IMEI</Text>
      </TouchableOpacity>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(["all", "instock", "sold"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => {
              setFilter(f);
            }}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === f && styles.filterTabTextActive,
              ]}
            >
              {f === "all" ? "All" : f === "instock" ? "In Stock" : "Sold"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchRecords();
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No records found.</Text>
            <Text style={styles.emptyHint}>
              Tap "+ Add" to record a secondhand intake.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  filterRow: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: { fontSize: 13, color: colors.textMuted, fontWeight: "500" },
  filterTabTextActive: { color: "#fff" },
  list: { padding: 12, gap: 10, paddingBottom: 40 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: { flexDirection: "row", marginBottom: 8 },
  phoneName: { fontSize: 15, fontWeight: "600", color: colors.text },
  brand: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  imei: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: "monospace",
    marginTop: 2,
  },
  right: { alignItems: "flex-end", gap: 6 },
  price: { fontSize: 15, fontWeight: "700", color: colors.text },
  cardBottom: { flexDirection: "row", justifyContent: "space-between" },
  seller: { fontSize: 12, color: colors.textMuted },
  date: { fontSize: 12, color: colors.textMuted },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 16, color: colors.textMuted, fontWeight: "500" },
  emptyHint: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
});
