import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { expensesApi, ExpenseSummary } from '../../api/expenses';
import { MetricTile } from '../../components/MetricTile';
import { colors } from '../../theme/colors';

export default function ExpenseReportScreen() {
  const navigation = useNavigation<any>();
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchSummary() {
    try {
      const res = await expensesApi.getSummary();
      setSummary(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load expense report');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchSummary(); }, []));

  if (loading || !summary) {
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
        <Text style={styles.title}>Expense Report</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total Expenses</Text>
          <Text style={styles.totalValue}>Rs {summary.grandTotal.toLocaleString()}</Text>
        </View>

        <Text style={styles.sectionLabel}>By Category</Text>
        <View style={styles.grid}>
          {summary.byCategory.map((row) => (
            <MetricTile
              key={row.categoryId}
              icon="🧾"
              label={row.categoryName}
              value={`Rs ${row.total.toLocaleString()}`}
              accent={colors.danger}
            />
          ))}
        </View>

        {summary.byCategory.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No expenses recorded yet.</Text>
          </View>
        )}
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
  title:   { fontSize: 17, fontWeight: '700', color: colors.text },
  scroll:  { padding: 16, paddingBottom: 40 },

  totalBox: {
    backgroundColor: colors.card, borderRadius: 12, padding: 18,
    alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: colors.border,
  },
  totalLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  totalValue: { fontSize: 26, fontWeight: '800', color: colors.danger, marginTop: 6 },

  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  empty:     { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14, color: colors.textMuted },
});
