import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, Alert, TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Input }  from '../../components/Inputs';
import { Button } from '../../components/Buttons';
import { accountingApi, ProfitAndLoss, ProfitAndLossRow } from '../../api/accounting';
import { formatDateInput, parseDDMMYYYY } from '../../utils/format';
import { colors } from '../../theme/colors';

function Section({ title, rows, total, color }: { title: string; rows: ProfitAndLossRow[]; total: number; color: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {rows.length === 0 ? (
        <Text style={styles.emptyText}>No {title.toLowerCase()} in this period.</Text>
      ) : rows.map((r) => (
        <View key={r.accountId} style={styles.row}>
          <Text style={styles.rowName}>{r.code} · {r.name}</Text>
          <Text style={styles.rowValue}>{r.amount.toLocaleString()}</Text>
        </View>
      ))}
      <View style={styles.sectionTotalRow}>
        <Text style={styles.sectionTotalLabel}>Total {title}</Text>
        <Text style={[styles.sectionTotalValue, { color }]}>{total.toLocaleString()}</Text>
      </View>
    </View>
  );
}

export default function ProfitLossScreen() {
  const navigation = useNavigation<any>();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [pl,       setPl]       = useState<ProfitAndLoss | null>(null);
  const [loading,  setLoading]  = useState(true);

  async function fetchReport(from?: string, to?: string) {
    setLoading(true);
    try {
      const res = await accountingApi.getProfitAndLoss({ dateFrom: from, dateTo: to });
      setPl(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load profit & loss report');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchReport(); }, []));

  function handleRun() {
    const from = dateFrom.trim() ? parseDDMMYYYY(dateFrom) : null;
    const to   = dateTo.trim()   ? parseDDMMYYYY(dateTo)   : null;
    if (dateFrom.trim() && !from) { Alert.alert('Invalid date', 'Enter From date as DD/MM/YYYY'); return; }
    if (dateTo.trim() && !to)     { Alert.alert('Invalid date', 'Enter To date as DD/MM/YYYY'); return; }
    fetchReport(from?.toISOString(), to?.toISOString());
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Profit & Loss</Text>
      </View>

      <View style={styles.filterRow}>
        <View style={{ flex: 1 }}>
          <Input label="From" placeholder="DD/MM/YYYY" value={dateFrom} onChangeText={(v) => setDateFrom(formatDateInput(v))} keyboardType="numeric" maxLength={10} />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="To" placeholder="DD/MM/YYYY" value={dateTo} onChangeText={(v) => setDateTo(formatDateInput(v))} keyboardType="numeric" maxLength={10} />
        </View>
      </View>
      <View style={styles.filterActionRow}>
        <Button label="Run Report" onPress={handleRun} style={{ paddingHorizontal: 14, paddingVertical: 8 }} />
      </View>

      {loading || !pl ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Section title="Income"  rows={pl.income}  total={pl.totalIncome}  color={colors.success} />
          <Section title="Expense" rows={pl.expense} total={pl.totalExpense} color={colors.danger} />

          <View style={[styles.netBox, { backgroundColor: pl.netProfit >= 0 ? colors.success + '18' : colors.danger + '18' }]}>
            <Text style={styles.netLabel}>{pl.netProfit >= 0 ? 'Net Profit' : 'Net Loss'}</Text>
            <Text style={[styles.netValue, { color: pl.netProfit >= 0 ? colors.success : colors.danger }]}>
              Rs {Math.abs(pl.netProfit).toLocaleString()}
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { color: colors.primary, fontSize: 15, fontWeight: '500' },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  filterRow: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: colors.card,
  },
  filterActionRow: {
    paddingHorizontal: 16, paddingBottom: 12, alignItems: 'flex-start',
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  scroll: { padding: 16, paddingBottom: 40 },

  section: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    marginBottom: 14, borderWidth: 1, borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: colors.text,
    marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  rowName:  { fontSize: 13, color: colors.text },
  rowValue: { fontSize: 13, color: colors.text },
  emptyText: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },
  sectionTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: 8, marginTop: 6, borderTopWidth: 1, borderTopColor: colors.border,
  },
  sectionTotalLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
  sectionTotalValue: { fontSize: 13, fontWeight: '700' },

  netBox: { borderRadius: 12, padding: 18, alignItems: 'center' },
  netLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  netValue: { fontSize: 24, fontWeight: '800', marginTop: 6 },
});
