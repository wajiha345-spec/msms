import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { productsApi, Product } from "../../api/products";
import { Badge } from "../../components/Badge";
import { colors } from "../../theme/colors";

export default function ProductListScreen() {
  const navigation = useNavigation<any>();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "new" | "used">("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchProducts(q?: string, cond?: string) {
    try {
      const res = await productsApi.list(
        q || undefined,
        cond === "all" ? undefined : cond,
      );
      setProducts(res.data.data);
    } catch {
      Alert.alert("Error", "Failed to load products");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Reload every time this screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchProducts(search, filter);
    }, [search, filter]),
  );

  function onRefresh() {
    setRefreshing(true);
    fetchProducts(search, filter);
  }

  function showItemMenu(item: Product) {
    Alert.alert(item.name, "What would you like to do?", [
      {
        text: "Edit Product",
        onPress: () => navigation.navigate("AddProduct", { id: item.id }),
      },
      {
        text: "Delete Product",
        style: "destructive",
        onPress: () => confirmDeleteFromList(item),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function confirmDeleteFromList(item: Product) {
    Alert.alert(
      "Delete Product",
      `Delete "${item.name}"?\n\nIf it has sales history it will be hidden, not permanently removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await productsApi.delete(item.id);
              // Remove from local state immediately — no need to refetch
              setProducts((prev) => prev.filter((p) => p.id !== item.id));
            } catch (e: any) {
              Alert.alert("Error", e?.response?.data?.error || "Delete failed");
            }
          },
        },
      ],
    );
  }

  function renderItem({ item }: { item: Product }) {
    const stockBadge =
      item.stock === 0 ? "danger" : item.stock <= 2 ? "warning" : "success";

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("ProductDetail", { id: item.id })}
        onLongPress={() => showItemMenu(item)}
        delayLongPress={400}
        activeOpacity={0.75}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.brand}>{item.brand}</Text>
          </View>
          <View style={styles.priceCol}>
            <Text style={styles.price}>
              Rs {item.salePrice.toLocaleString()}
            </Text>
            <Text style={styles.cost}>
              Cost: Rs {item.purchasePrice.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.cardBottom}>
          <Badge
            label={item.condition === "new" ? "New" : "Used"}
            type={item.condition === "new" ? "info" : "warning"}
          />
          {item.isSecondhand && <Badge label="2nd Hand" type="warning" />}
          {item.imei && <Text style={styles.imei}>IMEI: {item.imei}</Text>}
          <Badge label={`Stock: ${item.stock}`} type={stockBadge} />
        </View>

        {/* Quick action row at the bottom of each card */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate("AddProduct", { id: item.id })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.actionEdit}>✏️ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => confirmDeleteFromList(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.actionDelete}>🗑 Delete</Text>
          </TouchableOpacity>
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Inventory</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate("AddProduct")}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, brand or IMEI..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={(t) => {
            setSearch(t);
            fetchProducts(t, filter);
          }}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(["all", "new", "used"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => {
              setFilter(f);
              fetchProducts(search, f);
            }}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === f && styles.filterTabTextActive,
              ]}
            >
              {f === "all" ? "All" : f === "new" ? "New" : "Used"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No products found.</Text>
            <Text style={styles.emptyHint}>
              Tap "+ Add" to add your first product.
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
  searchRow: { padding: 12, backgroundColor: colors.card },
  searchInput: {
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 11,
    fontSize: 14,
    color: colors.text,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: colors.card,
    gap: 8,
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
  cardTop: { flexDirection: "row", marginBottom: 10 },
  productName: { fontSize: 15, fontWeight: "600", color: colors.text },
  brand: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  priceCol: { alignItems: "flex-end" },
  price: { fontSize: 15, fontWeight: "700", color: colors.text },
  cost: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cardBottom: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    alignItems: "center",
  },
  imei: { fontSize: 11, color: colors.textMuted, fontStyle: "italic" },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 16, color: colors.textMuted, fontWeight: "500" },
  emptyHint: { fontSize: 13, color: colors.textMuted, marginTop: 6 },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: { paddingHorizontal: 4 },
  actionEdit: { fontSize: 13, color: colors.primary, fontWeight: "500" },
  actionDelete: { fontSize: 13, color: colors.danger, fontWeight: "500" },
});
