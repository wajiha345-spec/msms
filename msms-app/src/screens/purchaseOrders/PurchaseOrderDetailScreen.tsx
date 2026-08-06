import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Button } from '../../components/Buttons';
import { Badge } from '../../components/Badge';
import { purchaseOrdersApi, PurchaseOrder, PurchaseOrderStatus } from '../../api/purchaseOrders';
import { colors } from '../../theme/colors';

const STATUS_BADGE: Record<PurchaseOrderStatus, 'default' | 'warning' | 'success' | 'danger'> = {
  DRAFT:              'default',
  PARTIALLY_RECEIVED: 'warning',
  RECEIVED:           'success',
  CANCELLED:          'danger',
};

export default function PurchaseOrderDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params;

  const [order,   setOrder]   = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy,    setBusy]    = useState(false);

  async function fetchOrder() {
    try {
      const res = await purchaseOrdersApi.getOne(id);
      setOrder(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load purchase order');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchOrder(); }, [id]));

  async function handleCancel() {
    Alert.alert('Cancel Purchase Order', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
          setBusy(true);
          try {
            await purchaseOrdersApi.cancel(id);
            fetchOrder();
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.error || 'Could not cancel purchase order');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  if (loading || !order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const total = order.items.reduce((sum, i) => sum + i.quantityOrdered * i.unitPrice, 0);
  const canReceive = order.status === 'DRAFT' || order.status === 'PARTIALLY_RECEIVED';
  const canCancel  = order.status === 'DRAFT' && order.items.every((i) => i.quantityReceived === 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{order.poNo}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.statusRow}>
          <Badge label={order.status.replace('_', ' ')} type={STATUS_BADGE[order.status]} />
          <Text style={styles.date}>{new Date(order.createdAt).toLocaleDateString('en-PK')}</Text>
        </View>

        {(order.supplierName || order.supplierPhone) && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Supplier</Text>
            {order.supplierName && <Text style={styles.supplierName}>{order.supplierName}</Text>}
            {order.supplierPhone && <Text style={styles.supplierPhone}>{order.supplierPhone}</Text>}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Items</Text>
          {order.items.map((item) => {
            const remaining = item.quantityOrdered - item.quantityReceived;
            return (
              <View key={item.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.description}</Text>
                  <Text style={styles.itemMeta}>
                    Received {item.quantityReceived} / {item.quantityOrdered}
                    {remaining > 0 ? ` · ${remaining} remaining` : ' · complete'}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>Rs {(item.quantityOrdered * item.unitPrice).toLocaleString()}</Text>
              </View>
            );
          })}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>Rs {total.toLocaleString()}</Text>
          </View>
        </View>

        {order.notes && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Notes</Text>
            <Text style={styles.notes}>{order.notes}</Text>
          </View>
        )}

        {canReceive && (
          <Button
            label="Receive Goods"
            onPress={() => navigation.navigate('ReceiveGoods', { id })}
            style={{ marginBottom: 10 }}
          />
        )}
        {canCancel && (
          <Button label="Cancel Purchase Order" variant="danger" onPress={handleCancel} loading={busy} />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  scroll:  { padding: 16, paddingBottom: 40 },

  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  date: { fontSize: 12, color: colors.textMuted },

  card: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    marginBottom: 14, borderWidth: 1, borderColor: colors.border,
  },
  cardLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  supplierName:  { fontSize: 15, fontWeight: '600', color: colors.text },
  supplierPhone: { fontSize: 13, color: colors.textMuted, marginTop: 2 },

  itemRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  itemName: { fontSize: 14, fontWeight: '600', color: colors.text },
  itemMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '700', color: colors.text },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10 },
  totalLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  totalValue: { fontSize: 16, fontWeight: '800', color: colors.text },

  notes: { fontSize: 13, color: colors.text, lineHeight: 19 },
});
