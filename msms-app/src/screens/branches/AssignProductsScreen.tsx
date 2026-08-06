import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, StyleSheet,
  ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { branchesApi, AssignableProduct, Branch } from '../../api/branches';
import { Badge } from '../../components/Badge';
import { colors } from '../../theme/colors';

export default function AssignProductsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { branchId } = route.params;

  const [branch,   setBranch]   = useState<Branch | null>(null);
  const [products, setProducts] = useState<AssignableProduct[]>([]);
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [busyId,   setBusyId]   = useState<string | null>(null);

  async function load() {
    try {
      const [branchesRes, productsRes] = await Promise.all([
        branchesApi.list(),
        branchesApi.listProductsForAssignment(),
      ]);
      setBranch(branchesRes.data.data.find((b) => b.id === branchId) ?? null);
      setProducts(productsRes.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, [branchId]));

  function handleAssign(product: AssignableProduct) {
    if (product.branch?.id === branchId) return;
    Alert.alert(
      'Assign Product',
      `Move "${product.name}" (${product.brand}) to ${branch?.name ?? 'this branch'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign',
          onPress: async () => {
            setBusyId(product.id);
            try {
              await branchesApi.assignProduct(product.id, branchId);
              load();
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.error || 'Could not assign product');
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  }

  const filtered = products.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
  });

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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>Assign to {branch?.name ?? 'Branch'}</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or brand…"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isHere = item.branch?.id === branchId;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleAssign(item)}
              disabled={isHere || busyId === item.id}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.sub}>{item.brand} · Stock: {item.stock}</Text>
              </View>
              {isHere ? (
                <Badge label="Here" type="info" />
              ) : (
                <Badge label={item.branch?.name ?? 'Main Branch'} type="default" />
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { color: colors.primary, fontSize: 15, fontWeight: '500', width: 60 },
  title:   { fontSize: 17, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'center' },

  searchRow: { padding: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchInput: {
    backgroundColor: colors.background, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    padding: 11, fontSize: 14, color: colors.text,
  },

  list: { padding: 12, gap: 10, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  sub:  { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: colors.textMuted },
});
