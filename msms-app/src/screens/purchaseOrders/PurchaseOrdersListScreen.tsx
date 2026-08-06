import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { purchaseOrdersApi, PurchaseOrder, PurchaseOrderStatus } from '../../api/purchaseOrders';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Buttons';
import { colors } from '../../theme/colors';

const STATUS_BADGE: Record<PurchaseOrderStatus, 'default' | 'warning' | 'success' | 'danger'> = {
  DRAFT:              'default',
  PARTIALLY_RECEIVED: 'warning',
  RECEIVED:           'success',
  CANCELLED:          'danger',
};

export default function PurchaseOrdersListScreen() {
  const navigation = useNavigation<any>();
  const [orders,     setOrders]     = useState<PurchaseOrder[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchOrders() {
    try {
      const res = await purchaseOrdersApi.list();
      setOrders(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load purchase orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchOrders(); }, []));

  function renderItem({ item }: { item: PurchaseOrder }) {
    const date = new Date(item.createdAt);
    const total = item.items.reduce((sum, i) => sum + i.quantityOrdered * i.unitPrice, 0);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('PurchaseOrderDetail', { id: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.poNo}>{item.poNo}</Text>
            <Text style={styles.supplier}>{item.supplierName || 'No supplier specified'}</Text>
          </View>
          <Badge label={item.status.replace('_', ' ')} type={STATUS_BADGE[item.status]} />
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.meta}>{item.items.length} item(s) · {date.toLocaleDateString('en-PK')}</Text>
          <Text style={styles.total}>Rs {total.toLocaleString()}</Text>
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

  const pendingCount = orders.filter((o) => o.status === 'DRAFT' || o.status === 'PARTIALLY_RECEIVED').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Purchase Orders</Text>
        <Button
          label="+ New PO"
          onPress={() => navigation.navigate('NewPurchaseOrder')}
          style={{ paddingHorizontal: 14, paddingVertical: 8 }}
        />
      </View>

      <View style={styles.summaryStrip}>
        <View style={styles.summaryStat}>
          <Text style={styles.summaryValue}>{pendingCount}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.summaryStat}>
          <Text style={styles.summaryValue}>{orders.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true); fetchOrders();
          }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No purchase orders yet.</Text>
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  summaryStrip: {
    flexDirection: 'row', backgroundColor: colors.card,
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  summaryStat:  { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 15, fontWeight: '700', color: colors.text },
  summaryLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  stripDivider: { width: 1, backgroundColor: colors.border },

  list:  { padding: 12, gap: 10, paddingBottom: 40 },
  card: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  poNo:     { fontSize: 15, fontWeight: '600', color: colors.text },
  supplier: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  meta:  { fontSize: 12, color: colors.textMuted },
  total: { fontSize: 14, fontWeight: '700', color: colors.text },
  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: colors.textMuted, fontWeight: '500' },
});
