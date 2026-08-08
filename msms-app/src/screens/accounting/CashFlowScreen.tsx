import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, Alert, TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Input }  from '../../components/Inputs';
import { Button } from '../../components/Buttons';
import { MetricTile } from '../../components/MetricTile';
import { accountingApi, CashFlowReport } from '../../api/accounting';
import { formatDateInput, parseDDMMYYYY } from '../../utils/format';
import { colors } from '../../theme/colors';

export default function CashFlowScreen() {
  const navigation = useNavigation<any>();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [report,   setReport]   = useState<CashFlowReport | null>(null);
  const [loading,  setLoading]  = useState(true);

  async function fetchReport(from?: string, to?: string) {
    setLoading(true);
    try {
      const res = await accountingApi.getCashFlow({ dateFrom: from, dateTo: to });
      setReport(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load cash flow report');
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
        <Text style={styles.title}>Cash Flow</Text>
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

      {loading || !report ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.summaryStrip}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>Rs {report.openingBalance.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Opening</Text>
            </View>
            <View style={styles.stripDivider} />
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryValue, { color: report.netChange >= 0 ? colors.success : colors.danger }]}>
                {report.netChange >= 0 ? '+' : ''}Rs {report.netChange.toLocaleString()}
              </Text>
              <Text style={styles.summaryLabel}>Net Change</Text>
            </View>
            <View style={styles.stripDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>Rs {report.closingBalance.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Closing</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>By Category</Text>
          <View style={styles.grid}>
            {report.categories.map((c) => (
              <MetricTile
                key={c.category}
                icon={c.net >= 0 ? '📥' : '📤'}
                label={c.category}
                value={`${c.net >= 0 ? '+' : ''}Rs ${c.net.toLocaleString()}`}
                sub={`In Rs ${c.inflow.toLocaleString()} · Out Rs ${c.outflow.toLocaleString()}`}
                accent={c.net >= 0 ? colors.success : colors.danger}
              />
            ))}
          </View>
          {report.categories.length === 0 && (
            <Text style={styles.emptyText}>No cash movement in this period.</Text>
          )}
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

  summaryStrip: {
    flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12,
    paddingVertical: 14, marginBottom: 20,
    borderWidth: 1, borderColor: colors.border,
  },
  summaryStat:  { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  summaryLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  stripDivider: { width: 1, backgroundColor: colors.border },

  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 20 },
});
