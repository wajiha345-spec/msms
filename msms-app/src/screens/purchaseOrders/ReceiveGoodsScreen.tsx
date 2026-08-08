import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Input }  from '../../components/Inputs';
import { Button } from '../../components/Buttons';
import VariantPicker from '../../components/VariantPicker';
import { PaymentMethodPicker } from '../../components/PaymentMethodPicker';
import { purchaseOrdersApi, PurchaseOrder } from '../../api/purchaseOrders';
import { PaymentFields } from '../../api/payment';
import { colors } from '../../theme/colors';

export default function ReceiveGoodsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params;

  const [order,      setOrder]      = useState<PurchaseOrder | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [paymentType, setPaymentType] = useState<'Cash' | 'Credit'>('Cash');
  const [payment,    setPayment]    = useState<PaymentFields>({});
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  async function fetchOrder() {
    try {
      const res = await purchaseOrdersApi.getOne(id);
      const data = res.data.data;
      setOrder(data);
      const initial: Record<string, string> = {};
      for (const item of data.items) {
        const remaining = item.quantityOrdered - item.quantityReceived;
        if (remaining > 0) initial[item.id] = String(remaining);
      }
      setQuantities(initial);
    } catch {
      Alert.alert('Error', 'Failed to load purchase order');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchOrder(); }, [id]));

  async function handleSubmit() {
    setError('');
    if (!order) return;

    const receipts: { itemId: string; quantity: number }[] = [];
    for (const item of order.items) {
      const remaining = item.quantityOrdered - item.quantityReceived;
      if (remaining <= 0) continue;
      const qty = Number(quantities[item.id] ?? 0);
      if (qty <= 0) continue;
      if (qty > remaining) {
        setError(`"${item.description}": cannot receive more than ${remaining} remaining`);
        return;
      }
      receipts.push({ itemId: item.id, quantity: qty });
    }

    if (receipts.length === 0) { setError('Enter a quantity to receive for at least one line'); return; }

    if (paymentType === 'Cash') {
      if (!payment.paymentMethod) { setError('Select how the goods were paid for'); return; }
      if (payment.paymentMethod !== 'CASH' && !payment.accountId) { setError('Select an account'); return; }
      if (payment.paymentMethod === 'SPLIT') {
        const sum = (payment.cashAmount ?? 0) + (payment.accountAmount ?? 0);
        if (Math.abs(sum - receiptTotal) > 0.01) { setError('Split amounts must add up to the total'); return; }
      }
    }

    setSubmitting(true);
    try {
      await purchaseOrdersApi.receive(id, {
        receipts,
        paymentType: paymentType === 'Credit' ? 'CREDIT' : 'CASH',
        ...(paymentType === 'Credit' ? {} : payment),
      });
      Alert.alert('Goods Received ✓', 'Stock has been updated.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const outstandingItems = order.items.filter((i) => i.quantityOrdered - i.quantityReceived > 0);
  const receiptTotal = outstandingItems.reduce(
    (sum, item) => sum + (Number(quantities[item.id]) || 0) * item.unitPrice, 0
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Receive Goods</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.poLabel}>{order.poNo}</Text>

        {outstandingItems.map((item) => {
          const remaining = item.quantityOrdered - item.quantityReceived;
          return (
            <View key={item.id} style={styles.lineCard}>
              <Text style={styles.lineName}>{item.description}</Text>
              <Text style={styles.lineMeta}>Remaining: {remaining} (of {item.quantityOrdered})</Text>
              <Input
                label="Receive Quantity"
                value={quantities[item.id] ?? ''}
                onChangeText={(v) => setQuantities((prev) => ({ ...prev, [item.id]: v }))}
                keyboardType="numeric"
              />
            </View>
          );
        })}

        <VariantPicker
          label="Payment Type"
          value={paymentType}
          onChange={(v) => setPaymentType(v === 'Credit' ? 'Credit' : 'Cash')}
          options={['Cash', 'Credit']}
          placeholder="Select payment type"
          required
        />
        {paymentType === 'Cash' && (
          <PaymentMethodPicker total={receiptTotal} value={payment} onChange={setPayment} />
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button label="Confirm Receipt" onPress={handleSubmit} loading={submitting} style={{ marginTop: 8 }} />
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  title:   { fontSize: 17, fontWeight: '700', color: colors.text },
  form:    { padding: 16 },
  poLabel: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 16 },

  lineCard: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: colors.border,
  },
  lineName: { fontSize: 14, fontWeight: '600', color: colors.text },
  lineMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2, marginBottom: 10 },

  errorText: { color: colors.danger, fontSize: 12, marginTop: 4, marginBottom: 10, textAlign: 'center' },
});
