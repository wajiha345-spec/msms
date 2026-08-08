import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Button } from '../../components/Buttons';
import { Badge } from '../../components/Badge';
import { PaymentMethodPicker } from '../../components/PaymentMethodPicker';
import { salesOrdersApi, SalesOrder, SalesOrderStatus } from '../../api/salesOrders';
import { PaymentFields } from '../../api/payment';
import { colors } from '../../theme/colors';

const STATUS_BADGE: Record<SalesOrderStatus, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
  PENDING:    'default',
  PROCESSING: 'info',
  SHIPPED:    'warning',
  DELIVERED:  'success',
  CANCELLED:  'danger',
};

export default function SalesOrderDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params;

  const [order,   setOrder]   = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy,    setBusy]    = useState(false);
  const [payment, setPayment] = useState<PaymentFields>({});
  const [paymentError, setPaymentError] = useState('');

  async function fetchOrder() {
    try {
      const res = await salesOrdersApi.getOne(id);
      setOrder(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load sales order');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchOrder(); }, [id]));

  async function handleAdvance(status: 'PROCESSING' | 'SHIPPED') {
    setBusy(true);
    try {
      await salesOrdersApi.updateStatus(id, status);
      fetchOrder();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Could not update status');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeliver() {
    setPaymentError('');
    if (!payment.paymentMethod) { setPaymentError('Select how the payment was received'); return; }
    if (payment.paymentMethod !== 'CASH' && !payment.accountId) { setPaymentError('Select an account'); return; }
    if (payment.paymentMethod === 'SPLIT' && order) {
      const orderTotal = order.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
      const sum = (payment.cashAmount ?? 0) + (payment.accountAmount ?? 0);
      if (Math.abs(sum - orderTotal) > 0.01) { setPaymentError('Split amounts must add up to the total'); return; }
    }

    Alert.alert(
      'Mark Delivered',
      'This will create a sale for each line item and deduct stock. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm', onPress: async () => {
            setBusy(true);
            try {
              await salesOrdersApi.deliver(id, payment);
              Alert.alert('Delivered ✓', 'Sales have been created.', [{ text: 'OK', onPress: fetchOrder }]);
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.error || 'Could not mark as delivered');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  async function handleCancel() {
    Alert.alert('Cancel Order', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
          setBusy(true);
          try {
            await salesOrdersApi.cancel(id);
            fetchOrder();
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.error || 'Could not cancel order');
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

  const total = order.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const canCancel = order.status !== 'DELIVERED' && order.status !== 'CANCELLED';
  const isActive  = order.status === 'PENDING' || order.status === 'PROCESSING' || order.status === 'SHIPPED';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{order.soNo}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.statusRow}>
          <Badge label={order.status} type={STATUS_BADGE[order.status]} />
          <Text style={styles.date}>{new Date(order.createdAt).toLocaleDateString('en-PK')}</Text>
        </View>

        {(order.customerName || order.customerPhone) && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Customer</Text>
            {order.customerName && <Text style={styles.customerName}>{order.customerName}</Text>}
            {order.customerPhone && <Text style={styles.customerPhone}>{order.customerPhone}</Text>}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Items</Text>
          {order.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.description}</Text>
                <Text style={styles.itemMeta}>{item.quantity} × Rs {item.unitPrice.toLocaleString()}</Text>
              </View>
              <Text style={styles.itemTotal}>Rs {(item.quantity * item.unitPrice).toLocaleString()}</Text>
            </View>
          ))}
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

        {isActive && (
          <>
            {order.status === 'PENDING' && (
              <Button label="Mark Processing" variant="outline" onPress={() => handleAdvance('PROCESSING')} loading={busy} style={{ marginBottom: 10 }} />
            )}
            {(order.status === 'PENDING' || order.status === 'PROCESSING') && (
              <Button label="Mark Shipped" variant="outline" onPress={() => handleAdvance('SHIPPED')} loading={busy} style={{ marginBottom: 10 }} />
            )}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Payment (on delivery)</Text>
              <PaymentMethodPicker total={total} value={payment} onChange={setPayment} />
              {paymentError ? <Text style={styles.paymentError}>{paymentError}</Text> : null}
            </View>
            <Button label="Mark Delivered" onPress={handleDeliver} loading={busy} style={{ marginBottom: 10 }} />
          </>
        )}
        {canCancel && (
          <Button label="Cancel Order" variant="danger" onPress={handleCancel} loading={busy} />
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
  customerName:  { fontSize: 15, fontWeight: '600', color: colors.text },
  customerPhone: { fontSize: 13, color: colors.textMuted, marginTop: 2 },

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
  paymentError: { color: colors.danger, fontSize: 12, marginTop: -4 },
});
