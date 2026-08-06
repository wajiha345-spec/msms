import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { salesOrdersApi, SalesOrder, SalesOrderStatus } from '../../api/salesOrders';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Buttons';
import { colors } from '../../theme/colors';

const STATUS_BADGE: Record<SalesOrderStatus, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
  PENDING:    'default',
  PROCESSING: 'info',
  SHIPPED:    'warning',
  DELIVERED:  'success',
  CANCELLED:  'danger',
};

export default function SalesOrdersListScreen() {
  const navigation = useNavigation<any>();
  const [orders,     setOrders]     = useState<SalesOrder[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchOrders() {
    try {
      const res = await salesOrdersApi.list();
      setOrders(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load sales orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchOrders(); }, []));

  function renderItem({ item }: { item: SalesOrder }) {
    const date = new Date(item.createdAt);
    const total = item.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('SalesOrderDetail', { id: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.soNo}>{item.soNo}</Text>
            <Text style={styles.customer}>{item.customerName || 'Walk-in Customer'}</Text>
          </View>
          <Badge label={item.status} type={STATUS_BADGE[item.status]} />
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

  const pendingCount = orders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status)).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sales Orders</Text>
        <Button
          label="+ New Order"
          onPress={() => navigation.navigate('NewSalesOrder')}
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
            <Text style={styles.emptyText}>No sales orders yet.</Text>
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
  soNo:     { fontSize: 15, fontWeight: '600', color: colors.text },
  customer: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  meta:  { fontSize: 12, color: colors.textMuted },
  total: { fontSize: 14, fontWeight: '700', color: colors.text },
  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: colors.textMuted, fontWeight: '500' },
});
