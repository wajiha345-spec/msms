import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { accountingApi, TrialBalance, TrialBalanceRow } from '../../api/accounting';
import { colors } from '../../theme/colors';

export default function TrialBalanceScreen() {
  const [trialBalance, setTrialBalance] = useState<TrialBalance | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchTrialBalance() {
    try {
      const res = await accountingApi.getTrialBalance();
      setTrialBalance(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load trial balance');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchTrialBalance(); }, []));

  function renderItem({ item }: { item: TrialBalanceRow }) {
    return (
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowName}>{item.code} · {item.name}</Text>
          <Text style={styles.rowType}>{item.type}</Text>
        </View>
        <Text style={styles.amount}>{item.debit > 0 ? item.debit.toLocaleString() : ''}</Text>
        <Text style={styles.amount}>{item.credit > 0 ? item.credit.toLocaleString() : ''}</Text>
      </View>
    );
  }

  if (loading || !trialBalance) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isBalanced = Math.abs(trialBalance.totalDebit - trialBalance.totalCredit) < 0.01;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Trial Balance</Text>
      </View>

      <View style={styles.columnHeader}>
        <Text style={[styles.columnLabel, { flex: 1 }]}>Account</Text>
        <Text style={styles.columnLabel}>Debit</Text>
        <Text style={styles.columnLabel}>Credit</Text>
      </View>

      <FlatList
        data={trialBalance.rows}
        keyExtractor={(item) => item.accountId}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No accounts yet.</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { flex: 1 }]}>Total</Text>
            <Text style={styles.totalAmount}>{trialBalance.totalDebit.toLocaleString()}</Text>
            <Text style={styles.totalAmount}>{trialBalance.totalCredit.toLocaleString()}</Text>
          </View>
        }
      />

      <View style={[styles.statusStrip, { backgroundColor: isBalanced ? colors.success + '18' : colors.danger + '18' }]}>
        <Text style={[styles.statusText, { color: isBalanced ? colors.success : colors.danger }]}>
          {isBalanced ? '✓ Books are balanced' : '⚠ Books are not balanced'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },

  columnHeader: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  columnLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, width: 90, textAlign: 'right',
  },

  list: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rowName: { fontSize: 13, fontWeight: '600', color: colors.text },
  rowType: { fontSize: 10, color: colors.textMuted, marginTop: 1 },
  amount:  { fontSize: 13, color: colors.text, width: 90, textAlign: 'right' },

  totalRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 4, marginTop: 4,
    borderTopWidth: 2, borderTopColor: colors.text,
  },
  totalLabel:  { fontSize: 14, fontWeight: '700', color: colors.text },
  totalAmount: { fontSize: 14, fontWeight: '700', color: colors.text, width: 90, textAlign: 'right' },

  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: colors.textMuted },

  statusStrip: { paddingVertical: 12, alignItems: 'center' },
  statusText:  { fontSize: 13, fontWeight: '700' },
});
