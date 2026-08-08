import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator, TouchableOpacity, Alert, Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { saleInstallmentsApi, SaleInstallment } from '../../api/saleInstallments';
import { PaymentMethodPicker } from '../../components/PaymentMethodPicker';
import { Button } from '../../components/Buttons';
import { PaymentFields } from '../../api/payment';
import { colors } from '../../theme/colors';

function ordinal(n: number) {
  return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB');
}

export default function DueInstallmentsScreen() {
  const navigation = useNavigation<any>();
  const [installments, setInstallments] = useState<SaleInstallment[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [markingId, setMarkingId] = useState<string | null>(null);
  const [payment,   setPayment]   = useState<PaymentFields>({});
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  async function load() {
    try {
      const res = await saleInstallmentsApi.listDue();
      setInstallments(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load installments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  function openMarkPaid(id: string) {
    setMarkingId(id);
    setPayment({});
    setModalError('');
  }

  async function confirmMarkPaid() {
    if (!markingId) return;
    const installment = installments.find((i) => i.id === markingId);
    if (!installment) return;

    setModalError('');
    if (!payment.paymentMethod) { setModalError('Select how the payment was received'); return; }
    if (payment.paymentMethod !== 'CASH' && !payment.accountId) { setModalError('Select an account'); return; }
    if (payment.paymentMethod === 'SPLIT') {
      const sum = (payment.cashAmount ?? 0) + (payment.accountAmount ?? 0);
      if (Math.abs(sum - installment.amount) > 0.01) { setModalError('Split amounts must add up to the installment amount'); return; }
    }

    setSubmitting(true);
    try {
      await saleInstallmentsApi.markPaid(markingId, payment);
      setMarkingId(null);
      load();
    } catch (e: any) {
      setModalError(e?.response?.data?.error || 'Something went wrong');
    } finally {
      setSubmitting(false);
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
        <Text style={styles.title}>Due Installments</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={installments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
        }
        renderItem={({ item }) => {
          const paid = item.status === 'PAID';
          return (
            <View style={[styles.card, paid && styles.cardPaid]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.customer, paid && styles.textPaid]}>
                  {item.sale.customerName || item.sale.customerPhone || item.sale.invoiceNo}
                </Text>
                <Text style={[styles.meta, paid && styles.textPaid]}>
                  {item.sale.invoiceNo} · {ordinal(item.installmentNumber)} installment · Rs {item.amount.toLocaleString()} · due {fmtDate(item.dueDate)}
                </Text>
              </View>
              {paid ? (
                <Text style={styles.paidBadge}>✓ Paid</Text>
              ) : (
                <TouchableOpacity style={styles.markBtn} onPress={() => openMarkPaid(item.id)} activeOpacity={0.7}>
                  <Text style={styles.markBtnText}>Mark Paid</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No installment sales yet.</Text>
          </View>
        }
      />

      <Modal visible={!!markingId} transparent animationType="fade" onRequestClose={() => setMarkingId(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Mark Installment Paid</Text>
            <PaymentMethodPicker
              total={installments.find((i) => i.id === markingId)?.amount ?? 0}
              value={payment}
              onChange={setPayment}
            />
            {modalError ? <Text style={styles.modalError}>{modalError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setMarkingId(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Button label="Confirm" onPress={confirmMarkPaid} loading={submitting} />
              </View>
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
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { color: colors.primary, fontSize: 15, fontWeight: '500', width: 60 },
  title:   { fontSize: 17, fontWeight: '700', color: colors.text },
  list:    { padding: 12, paddingBottom: 40 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border, marginBottom: 10,
  },
  cardPaid: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  customer: { fontSize: 14, fontWeight: '600', color: colors.text },
  meta:     { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  textPaid: { textDecorationLine: 'line-through', color: colors.textMuted },
  paidBadge: { fontSize: 13, fontWeight: '700', color: colors.success },
  markBtn: {
    backgroundColor: colors.primary, borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 12,
  },
  markBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: colors.textMuted, fontWeight: '500' },

  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', padding: 20,
  },
  modalCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 18,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 14 },
  modalError: { color: colors.danger, fontSize: 12, marginTop: -4, marginBottom: 10 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 6, alignItems: 'center' },
  modalCancel: { paddingVertical: 12, paddingHorizontal: 14 },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
});
