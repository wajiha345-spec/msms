import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { openUrl } from '../../utils/openUrl';
import { Button } from '../../components/Buttons';
import { Badge } from '../../components/Badge';
import { PaymentMethodPicker } from '../../components/PaymentMethodPicker';
import { quotationsApi, Quotation, QuotationStatus } from '../../api/quotations';
import { PaymentFields } from '../../api/payment';
import { colors } from '../../theme/colors';

const STATUS_BADGE: Record<QuotationStatus, 'default' | 'success' | 'danger'> = {
  DRAFT:     'default',
  CONVERTED: 'success',
  CANCELLED: 'danger',
};

export default function QuotationDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params;

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [busy,      setBusy]      = useState(false);
  const [payment,      setPayment]      = useState<PaymentFields>({});
  const [paymentError, setPaymentError] = useState('');

  async function fetchQuotation() {
    try {
      const res = await quotationsApi.getOne(id);
      setQuotation(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load quotation');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchQuotation(); }, [id]));

  function openView() {
    const url = quotationsApi.getViewUrl(id);
    openUrl(url).catch(() =>
      Alert.alert('Error', 'Could not open quotation. Make sure you are connected.')
    );
  }

  async function handleConvert() {
    setPaymentError('');
    if (!payment.paymentMethod) { setPaymentError('Select how the payment was received'); return; }
    if (payment.paymentMethod !== 'CASH' && !payment.accountId) { setPaymentError('Select an account'); return; }
    if (payment.paymentMethod === 'SPLIT' && quotation) {
      const quoteTotal = quotation.items.reduce((sum, i) => sum + i.lineTotal, 0);
      const sum = (payment.cashAmount ?? 0) + (payment.accountAmount ?? 0);
      if (Math.abs(sum - quoteTotal) > 0.01) { setPaymentError('Split amounts must add up to the total'); return; }
    }

    Alert.alert(
      'Convert to Sale',
      'This will create a sale for each line item and deduct stock. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Convert', onPress: async () => {
            setBusy(true);
            try {
              await quotationsApi.convert(id, payment);
              Alert.alert('Converted ✓', 'Sales have been created.', [{ text: 'OK', onPress: fetchQuotation }]);
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.error || 'Could not convert quotation');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  async function handleCancel() {
    Alert.alert('Cancel Quotation', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
          setBusy(true);
          try {
            await quotationsApi.cancel(id);
            fetchQuotation();
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.error || 'Could not cancel quotation');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  if (loading || !quotation) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const total = quotation.items.reduce((sum, i) => sum + i.lineTotal, 0);
  const allLinked = quotation.items.every((i) => !!i.productId);
  const canConvert = quotation.status === 'DRAFT' && allLinked;
  const canCancel  = quotation.status === 'DRAFT';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{quotation.quoteNo}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.statusRow}>
          <Badge label={quotation.status} type={STATUS_BADGE[quotation.status]} />
          <Text style={styles.date}>{new Date(quotation.createdAt).toLocaleDateString('en-PK')}</Text>
        </View>

        {(quotation.customerName || quotation.customerPhone) && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Customer</Text>
            {quotation.customerName && <Text style={styles.customerName}>{quotation.customerName}</Text>}
            {quotation.customerPhone && <Text style={styles.customerPhone}>{quotation.customerPhone}</Text>}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Items</Text>
          {quotation.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.description}</Text>
                <Text style={styles.itemMeta}>
                  {item.quantity} × Rs {item.unitPrice.toLocaleString()}
                  {!item.productId && '  ·  not linked to inventory'}
                </Text>
              </View>
              <Text style={styles.itemTotal}>Rs {item.lineTotal.toLocaleString()}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>Rs {total.toLocaleString()}</Text>
          </View>
        </View>

        {quotation.notes && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Notes</Text>
            <Text style={styles.notes}>{quotation.notes}</Text>
          </View>
        )}

        {!allLinked && quotation.status === 'DRAFT' && (
          <Text style={styles.warningText}>
            One or more lines aren't linked to inventory yet — link them (edit the quote) before converting to a sale.
          </Text>
        )}

        <Button label="View / Share PDF" variant="outline" onPress={openView} style={{ marginBottom: 10 }} />

        {canConvert && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Payment (on conversion)</Text>
              <PaymentMethodPicker total={total} value={payment} onChange={setPayment} />
              {paymentError ? <Text style={styles.paymentError}>{paymentError}</Text> : null}
            </View>
            <Button label="Convert to Sale" onPress={handleConvert} loading={busy} style={{ marginBottom: 10 }} />
          </>
        )}
        {canCancel && (
          <Button label="Cancel Quotation" variant="danger" onPress={handleCancel} loading={busy} />
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

  warningText: {
    fontSize: 12, color: colors.warning, marginBottom: 14,
    backgroundColor: '#EDE6FB', padding: 10, borderRadius: 8,
    borderWidth: 1, borderColor: '#C9BEF2',
  },
  paymentError: { color: colors.danger, fontSize: 12, marginTop: -4 },
});
