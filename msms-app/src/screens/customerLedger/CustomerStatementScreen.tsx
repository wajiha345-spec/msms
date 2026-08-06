import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { customerLedgerApi, CustomerStatement, LedgerTxn } from '../../api/customerLedger';
import { Button } from '../../components/Buttons';
import { colors } from '../../theme/colors';

export default function CustomerStatementScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { phone, name } = route.params;

  const [statement, setStatement] = useState<CustomerStatement | null>(null);
  const [loading,   setLoading]   = useState(true);

  async function fetchStatement() {
    try {
      const res = await customerLedgerApi.getStatement(phone);
      setStatement(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load statement');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchStatement(); }, [phone]));

  function renderItem({ item }: { item: LedgerTxn }) {
    const date = new Date(item.date);
    const isSale = item.type === 'SALE';
    return (
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowRef}>{isSale ? `Sale ${item.ref}` : `Payment (${item.ref})`}</Text>
          <Text style={styles.rowDate}>{date.toLocaleDateString('en-PK')}</Text>
        </View>
        <View style={styles.rowRight}>
          <Text style={[styles.amount, isSale ? styles.debitAmount : styles.creditAmount]}>
            {isSale ? '+' : '-'}Rs {Math.abs(item.amount).toLocaleString()}
          </Text>
          <Text style={styles.balance}>Bal: {item.balance.toLocaleString()}</Text>
        </View>
      </View>
    );
  }

  if (loading || !statement) {
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
        <Text style={styles.title} numberOfLines={1}>{name || phone}</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.summaryStrip}>
        <View style={styles.summaryStat}>
          <Text style={styles.summaryValue}>Rs {statement.totalInvoiced.toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>Invoiced</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.summaryStat}>
          <Text style={styles.summaryValue}>Rs {statement.totalPaid.toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>Paid</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.summaryStat}>
          <Text style={[styles.summaryValue, { color: colors.danger }]}>Rs {statement.outstanding.toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>Outstanding</Text>
        </View>
      </View>

      {statement.outstanding > 0 && (
        <View style={styles.actionRow}>
          <Button
            label="Record Payment"
            onPress={() => navigation.navigate('RecordCustomerPayment', { phone, name })}
          />
        </View>
      )}

      <FlatList
        data={statement.ledger}
        keyExtractor={(item, i) => `${item.type}-${item.saleId}-${i}`}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No transactions yet.</Text>
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

  summaryStrip: {
    flexDirection: 'row', backgroundColor: colors.card,
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  summaryStat:  { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  summaryLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  stripDivider: { width: 1, backgroundColor: colors.border },

  actionRow: { padding: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },

  list: { padding: 12, gap: 8, paddingBottom: 40 },
  row: {
    flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: colors.border,
  },
  rowRef:  { fontSize: 13, fontWeight: '600', color: colors.text },
  rowDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  amount:  { fontSize: 13, fontWeight: '700' },
  debitAmount:  { color: colors.text },
  creditAmount: { color: colors.success },
  balance: { fontSize: 11, color: colors.textMuted, marginTop: 4 },

  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: colors.textMuted },
});
