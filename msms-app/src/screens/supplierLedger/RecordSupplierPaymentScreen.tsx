import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Input }  from '../../components/Inputs';
import { Button } from '../../components/Buttons';
import { PaymentMethodPicker } from '../../components/PaymentMethodPicker';
import { supplierLedgerApi, SupplierStatement } from '../../api/supplierLedger';
import { PaymentFields } from '../../api/payment';
import { colors } from '../../theme/colors';

type OutstandingPurchase = SupplierStatement['purchases'][number] & { outstanding: number; paid: number; total: number };

export default function RecordSupplierPaymentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { phone, name } = route.params;

  const [loading,  setLoading]  = useState(true);
  const [purchases, setPurchases] = useState<OutstandingPurchase[]>([]);
  const [selected, setSelected] = useState<OutstandingPurchase | null>(null);
  const [amount,   setAmount]   = useState('');
  const [payment,  setPayment]  = useState<PaymentFields>({});
  const [submitting, setSubmitting] = useState(false);
  const [error,    setError]    = useState('');

  async function load() {
    try {
      const res = await supplierLedgerApi.getStatement(phone);
      const statement = res.data.data;
      const paidByPurchase = new Map<string, number>();
      for (const p of statement.payments) {
        paidByPurchase.set(p.purchaseId, (paidByPurchase.get(p.purchaseId) ?? 0) + p.amount);
      }
      const outstandingPurchases = statement.purchases
        .filter((p) => p.paymentType === 'CREDIT')
        .map((p) => {
          const total = p.quantity * p.purchasePrice;
          const paid  = paidByPurchase.get(p.id) ?? 0;
          return { ...p, total, paid, outstanding: total - paid };
        })
        .filter((p) => p.outstanding > 0.01);
      setPurchases(outstandingPurchases);
      if (outstandingPurchases.length === 1) setSelected(outstandingPurchases[0]);
    } catch {
      Alert.alert('Error', 'Failed to load outstanding purchases');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, [phone]));

  async function handleSubmit() {
    setError('');
    if (!selected) { setError('Please select a purchase'); return; }
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    if (amt > selected.outstanding + 0.01) { setError(`Amount exceeds outstanding balance of Rs ${selected.outstanding.toLocaleString()}`); return; }
    if (!payment.paymentMethod) { setError('Select how the payment was made'); return; }
    if (payment.paymentMethod !== 'CASH' && !payment.accountId) { setError('Select an account'); return; }
    if (payment.paymentMethod === 'SPLIT') {
      const sum = (payment.cashAmount ?? 0) + (payment.accountAmount ?? 0);
      if (Math.abs(sum - amt) > 0.01) { setError('Split amounts must add up to the payment amount'); return; }
    }

    setSubmitting(true);
    try {
      await supplierLedgerApi.recordPayment({
        purchaseId: selected.id, amount: amt, method: payment.paymentMethod,
        cashAmount: payment.cashAmount, accountId: payment.accountId, accountAmount: payment.accountAmount,
      });
      Alert.alert('Payment Recorded ✓', undefined, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Record Payment</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={styles.supplierLabel}>{name || phone}</Text>

          <Text style={styles.sectionLabel}>Select Purchase</Text>
          {purchases.map((purchase) => (
            <TouchableOpacity
              key={purchase.id}
              style={[styles.purchaseRow, selected?.id === purchase.id && styles.purchaseRowSelected]}
              onPress={() => setSelected(purchase)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.purchaseName}>{purchase.product.name}</Text>
                <Text style={styles.purchaseMeta}>
                  Total Rs {purchase.total.toLocaleString()} · Paid Rs {purchase.paid.toLocaleString()}
                </Text>
              </View>
              <Text style={styles.purchaseOutstanding}>Rs {purchase.outstanding.toLocaleString()}</Text>
            </TouchableOpacity>
          ))}
          {purchases.length === 0 && (
            <Text style={styles.emptyText}>This supplier has no outstanding credit purchases.</Text>
          )}

          {selected && (
            <>
              <Input
                label={`Amount (Rs) * — outstanding Rs ${selected.outstanding.toLocaleString()}`}
                placeholder="0"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
              <PaymentMethodPicker total={Number(amount) || 0} value={payment} onChange={setPayment} />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <Button label="Record Payment" onPress={handleSubmit} loading={submitting} style={{ marginTop: 8 }} />
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
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
  supplierLabel: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 16 },
  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  purchaseRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 10, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: colors.border,
  },
  purchaseRowSelected: { borderColor: colors.primary, backgroundColor: '#EEF2FF' },
  purchaseName: { fontSize: 14, fontWeight: '600', color: colors.text },
  purchaseMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  purchaseOutstanding: { fontSize: 14, fontWeight: '700', color: colors.danger },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 12 },
  errorText: { color: colors.danger, fontSize: 12, marginTop: -8, marginBottom: 10 },
});
