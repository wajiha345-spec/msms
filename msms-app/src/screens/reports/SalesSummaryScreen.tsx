import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, Alert, TouchableOpacity,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Input }  from '../../components/Inputs';
import { Button } from '../../components/Buttons';
import { MetricTile } from '../../components/MetricTile';
import { reportsApi, SalesSummary } from '../../api/reports';
import { formatDateInput, parseDDMMYYYY } from '../../utils/format';
import { colors } from '../../theme/colors';

export default function SalesSummaryScreen() {
  const navigation = useNavigation<any>();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [summary,  setSummary]  = useState<SalesSummary | null>(null);
  const [loading,  setLoading]  = useState(true);

  async function fetchSummary(from?: string, to?: string) {
    setLoading(true);
    try {
      const res = await reportsApi.getSalesSummary(from, to);
      setSummary(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load sales summary');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchSummary(); }, []));

  function handleRun() {
    const from = dateFrom.trim() ? parseDDMMYYYY(dateFrom) : null;
    const to   = dateTo.trim()   ? parseDDMMYYYY(dateTo)   : null;
    if (dateFrom.trim() && !from) { Alert.alert('Invalid date', 'Enter From date as DD/MM/YYYY'); return; }
    if (dateTo.trim() && !to)     { Alert.alert('Invalid date', 'Enter To date as DD/MM/YYYY'); return; }
    fetchSummary(from?.toISOString(), to?.toISOString());
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Sales & Profit</Text>
        <View style={{ width: 60 }} />
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
        <Text style={styles.rangeHint}>
          {loading || !summary ? '' : `${new Date(summary.from).toLocaleDateString('en-GB')} – ${new Date(summary.to).toLocaleDateString('en-GB')}`}
        </Text>
      </View>

      {loading || !summary ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.grid}>
            <MetricTile icon="🧾" label="Sales"     value={String(summary.totals.salesCount)} />
            <MetricTile icon="💰" label="Revenue"   value={`Rs ${summary.totals.revenue.toLocaleString()}`} accent={colors.success} />
            <MetricTile icon="📈" label="Profit"    value={`Rs ${summary.totals.profit.toLocaleString()}`} accent={colors.success} />
            <MetricTile icon="📦" label="Units Sold" value={String(summary.totals.unitsSold)} />
            <MetricTile icon="🛒" label="Purchases" value={String(summary.totals.purchasesCount)} />
            <MetricTile icon="💸" label="Cost"      value={`Rs ${summary.totals.cost.toLocaleString()}`} accent={colors.danger} />
          </View>

          <Text style={styles.sectionLabel}>Top Products by Revenue</Text>
          {summary.topProducts.length === 0 ? (
            <Text style={styles.emptyText}>No sales in this period.</Text>
          ) : summary.topProducts.map((p) => (
            <View key={p.productId} style={styles.productRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>{p.name}</Text>
                <Text style={styles.productSub}>{p.brand} · {p.unitsSold} unit(s)</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.productRevenue}>Rs {p.revenue.toLocaleString()}</Text>
                <Text style={styles.productProfit}>+Rs {p.profit.toLocaleString()} profit</Text>
              </View>
            </View>
          ))}

          <Text style={styles.sectionLabel}>By Day</Text>
          {summary.byDay.length === 0 ? (
            <Text style={styles.emptyText}>No activity in this period.</Text>
          ) : summary.byDay.map((d) => (
            <View key={d.date} style={styles.dayRow}>
              <Text style={styles.dayDate}>{new Date(d.date).toLocaleDateString('en-GB')}</Text>
              <Text style={styles.dayValue}>Rev Rs {d.revenue.toLocaleString()}</Text>
              <Text style={styles.dayValue}>Profit Rs {d.profit.toLocaleString()}</Text>
              <Text style={styles.dayValue}>Cost Rs {d.cost.toLocaleString()}</Text>
            </View>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
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
  title:   { fontSize: 17, fontWeight: '700', color: colors.text },

  filterRow: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: colors.card,
  },
  filterActionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rangeHint: { fontSize: 11, color: colors.textMuted },

  scroll: { padding: 16, paddingBottom: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },

  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 4,
  },
  emptyText: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic', marginBottom: 16 },

  productRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 12, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: colors.border,
  },
  productName: { fontSize: 14, fontWeight: '600', color: colors.text },
  productSub:  { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  productRevenue: { fontSize: 14, fontWeight: '700', color: colors.text },
  productProfit:  { fontSize: 11, color: colors.success, marginTop: 2 },

  dayRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 10, padding: 10,
    marginBottom: 6, borderWidth: 1, borderColor: colors.border,
  },
  dayDate:  { fontSize: 12, fontWeight: '600', color: colors.text, width: 80 },
  dayValue: { fontSize: 11, color: colors.textMuted },
});
