import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, Alert, TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { accountingApi, BalanceSheet, BalanceSheetRow } from '../../api/accounting';
import { colors } from '../../theme/colors';

function Section({ title, rows, total }: { title: string; rows: BalanceSheetRow[]; total: number }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {rows.map((r) => (
        <View key={r.accountId} style={styles.row}>
          <Text style={styles.rowName}>{r.code} · {r.name}</Text>
          <Text style={styles.rowValue}>{r.balance.toLocaleString()}</Text>
        </View>
      ))}
      <View style={styles.sectionTotalRow}>
        <Text style={styles.sectionTotalLabel}>Total {title}</Text>
        <Text style={styles.sectionTotalValue}>{total.toLocaleString()}</Text>
      </View>
    </View>
  );
}

export default function BalanceSheetScreen() {
  const navigation = useNavigation<any>();
  const [sheet,   setSheet]   = useState<BalanceSheet | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchSheet() {
    try {
      const res = await accountingApi.getBalanceSheet();
      setSheet(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load balance sheet');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchSheet(); }, []));

  if (loading || !sheet) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const equityWithEarnings = [
    ...sheet.equity,
    { accountId: '__current_earnings', code: '', name: 'Current Period Earnings', balance: sheet.currentPeriodEarnings },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnRow}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Balance Sheet</Text>
        <Text style={styles.subtitle}>As of today</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Section title="Assets"      rows={sheet.assets}      total={sheet.totalAssets} />
        <Section title="Liabilities" rows={sheet.liabilities} total={sheet.totalLiabilities} />
        <Section title="Equity"      rows={equityWithEarnings} total={sheet.totalEquity} />

        <View style={[styles.statusStrip, { backgroundColor: sheet.isBalanced ? colors.success + '18' : colors.danger + '18' }]}>
          <Text style={[styles.statusText, { color: sheet.isBalanced ? colors.success : colors.danger }]}>
            {sheet.isBalanced ? '✓ Assets = Liabilities + Equity' : '⚠ Balance sheet does not balance'}
          </Text>
        </View>
      </ScrollView>
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
  backBtnRow: { marginBottom: 8 },
  backBtn:  { color: colors.primary, fontSize: 15, fontWeight: '500' },
  title:    { fontSize: 20, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
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
  sectionTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: 8, marginTop: 6, borderTopWidth: 1, borderTopColor: colors.border,
  },
  sectionTotalLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
  sectionTotalValue: { fontSize: 13, fontWeight: '700', color: colors.text },

  statusStrip: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  statusText:  { fontSize: 13, fontWeight: '700' },
});
