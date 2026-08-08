import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { cashBankApi, CashBankAccount } from '../../api/cashBank';
import { Button } from '../../components/Buttons';
import { colors } from '../../theme/colors';

export default function CashBankListScreen() {
  const navigation = useNavigation<any>();
  const [accounts,   setAccounts]   = useState<CashBankAccount[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchAccounts() {
    try {
      const res = await cashBankApi.listAccounts();
      setAccounts(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load Cash & Bank accounts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchAccounts(); }, []));

  function renderItem({ item }: { item: CashBankAccount }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('GeneralLedger', { accountId: item.id, accountName: item.name })}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.code} · {item.name}</Text>
        </View>
        <Text style={styles.balance}>Rs {item.balance.toLocaleString()}</Text>
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

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Cash & Bank</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.summaryStrip}>
        <View style={styles.summaryStat}>
          <Text style={styles.summaryValue}>{accounts.length}</Text>
          <Text style={styles.summaryLabel}>Accounts</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.summaryStat}>
          <Text style={styles.summaryValue}>Rs {totalBalance.toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>Total balance</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Button label="Deposit" onPress={() => navigation.navigate('NewDeposit')} style={styles.actionBtn} />
        <Button label="Withdraw" variant="outline" onPress={() => navigation.navigate('NewWithdrawal')} style={styles.actionBtn} />
        <Button label="Transfer" variant="outline" onPress={() => navigation.navigate('NewTransfer')} style={styles.actionBtn} />
      </View>
      <View style={styles.actionRow}>
        <Button label="Reconcile" variant="outline" onPress={() => navigation.navigate('Reconciliation')} style={{ flex: 1 }} />
      </View>

      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true); fetchAccounts();
          }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No Cash/Bank accounts yet. Add one from Chart of Accounts.</Text>
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
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { color: colors.primary, fontSize: 15, fontWeight: '500', width: 60 },
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

  actionRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 10,
    backgroundColor: colors.card,
  },
  actionBtn: { flex: 1, paddingHorizontal: 8 },

  list: { padding: 12, gap: 10, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  name:    { fontSize: 15, fontWeight: '600', color: colors.text },
  balance: { fontSize: 15, fontWeight: '700', color: colors.text },

  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
});
