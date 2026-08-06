import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { accountingApi, GeneralLedger, LedgerEntry } from '../../api/accounting';
import { colors } from '../../theme/colors';

export default function GeneralLedgerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { accountId, accountName } = route.params;

  const [ledger,  setLedger]  = useState<GeneralLedger | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchLedger() {
    try {
      const res = await accountingApi.getLedger(accountId);
      setLedger(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load ledger');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchLedger(); }, [accountId]));

  function renderItem({ item }: { item: LedgerEntry }) {
    const date = new Date(item.date);
    return (
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowEntryNo}>{item.entryNo}</Text>
          <Text style={styles.rowMemo}>{item.description || item.memo || '—'}</Text>
          <Text style={styles.rowDate}>{date.toLocaleDateString('en-PK')}</Text>
        </View>
        <View style={styles.rowRight}>
          {item.debit > 0 && <Text style={styles.debit}>Dr {item.debit.toLocaleString()}</Text>}
          {item.credit > 0 && <Text style={styles.credit}>Cr {item.credit.toLocaleString()}</Text>}
          <Text style={styles.balance}>Bal: {item.balance.toLocaleString()}</Text>
        </View>
      </View>
    );
  }

  if (loading || !ledger) {
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
        <Text style={styles.title} numberOfLines={1}>{accountName || ledger.account.name}</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.summaryStrip}>
        <View style={styles.summaryStat}>
          <Text style={styles.summaryValue}>Rs {ledger.account.openingBalance.toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>Opening</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.summaryStat}>
          <Text style={styles.summaryValue}>Rs {ledger.closingBalance.toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>Closing</Text>
        </View>
      </View>

      <FlatList
        data={ledger.entries}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No transactions posted to this account yet.</Text>
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
  summaryStat:    { flex: 1, alignItems: 'center' },
  summaryValue:   { fontSize: 15, fontWeight: '700', color: colors.text },
  summaryLabel:   { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  stripDivider:   { width: 1, backgroundColor: colors.border },

  list: { padding: 12, gap: 8, paddingBottom: 40 },
  row: {
    flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: colors.border,
  },
  rowEntryNo: { fontSize: 13, fontWeight: '600', color: colors.text },
  rowMemo:    { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  rowDate:    { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  rowRight:   { alignItems: 'flex-end' },
  debit:      { fontSize: 12, color: colors.text, fontWeight: '600' },
  credit:     { fontSize: 12, color: colors.text, fontWeight: '600' },
  balance:    { fontSize: 11, color: colors.textMuted, marginTop: 4 },

  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
});
