import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator, TouchableOpacity, Alert,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { inventoryApi, LowStockProduct } from '../../api/inventory';
import { Input } from '../../components/Inputs';
import { Button } from '../../components/Buttons';
import { Badge } from '../../components/Badge';
import { colors } from '../../theme/colors';

export default function LowStockScreen() {
  const navigation = useNavigation<any>();
  const [products,   setProducts]   = useState<LowStockProduct[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing,    setEditing]    = useState<LowStockProduct | null>(null);
  const [thresholdInput, setThresholdInput] = useState('');
  const [saving,      setSaving]      = useState(false);

  async function fetchProducts() {
    try {
      const res = await inventoryApi.listLowStock();
      setProducts(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load low stock products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchProducts(); }, []));

  function openEdit(p: LowStockProduct) {
    setEditing(p);
    setThresholdInput(p.reorderPoint != null ? String(p.reorderPoint) : '');
  }

  async function handleSaveThreshold() {
    if (!editing) return;
    const trimmed = thresholdInput.trim();
    if (trimmed && (isNaN(Number(trimmed)) || Number(trimmed) < 0)) {
      Alert.alert('Invalid value', 'Enter a number 0 or greater, or leave blank to use the shop default.');
      return;
    }
    setSaving(true);
    try {
      await inventoryApi.setReorderPoint(editing.id, trimmed ? Number(trimmed) : null);
      setEditing(null);
      fetchProducts();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Could not save');
    } finally {
      setSaving(false);
    }
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Low Stock</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProducts(); }} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openEdit(item)} activeOpacity={0.7}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sub}>
                {item.brand}{item.branch ? ` · ${item.branch.name}` : ''} · threshold {item.effectiveThreshold}
                {item.reorderPoint == null ? ' (shop default)' : ' (custom)'}
              </Text>
            </View>
            <Badge label={`${item.stock} left`} type="danger" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No products are low on stock.</Text>
          </View>
        }
      />

      <Modal visible={!!editing} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing?.name}</Text>
            <Text style={styles.modalSub}>Set a custom reorder point for this product, or leave blank to use the shop default.</Text>
            <Input
              label="Custom Reorder Point"
              placeholder="Leave blank for shop default"
              value={thresholdInput}
              onChangeText={setThresholdInput}
              keyboardType="numeric"
            />
            <View style={styles.modalBtnRow}>
              <Button label="Cancel" variant="outline" onPress={() => setEditing(null)} style={{ flex: 1 }} />
              <Button label="Save" onPress={handleSaveThreshold} loading={saving} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { color: colors.primary, fontSize: 15, fontWeight: '500', width: 60 },
  title:   { fontSize: 17, fontWeight: '700', color: colors.text },

  list: { padding: 12, gap: 10, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  sub:  { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: colors.textMuted, fontWeight: '500' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 34,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  modalSub:   { fontSize: 12, color: colors.textMuted, marginBottom: 14, lineHeight: 17 },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
});
