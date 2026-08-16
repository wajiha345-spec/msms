import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { branchesApi, BranchReport } from '../../api/branches';
import { MetricTile } from '../../components/MetricTile';
import { colors } from '../../theme/colors';

export default function BranchReportScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params;

  const [report,  setReport]  = useState<BranchReport | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchReport() {
    try {
      const res = await branchesApi.getReport(id);
      setReport(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load branch report');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchReport(); }, [id]));

  if (loading || !report) {
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
        <Text style={styles.title} numberOfLines={1}>{report.branch.name}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionLabel}>Sales</Text>
        <View style={styles.grid}>
          <MetricTile icon="receipt-outline" label="Sales" value={String(report.salesCount)} />
          <MetricTile icon="cash-outline" label="Revenue" value={`Rs ${report.totalRevenue.toLocaleString()}`} accent={colors.success} />
          <MetricTile icon="trending-up-outline" label="Profit" value={`Rs ${report.totalProfit.toLocaleString()}`} accent={colors.success} />
        </View>

        <Text style={styles.sectionLabel}>Purchases</Text>
        <View style={styles.grid}>
          <MetricTile icon="cube-outline" label="Purchases" value={String(report.purchasesCount)} />
          <MetricTile icon="arrow-down-circle-outline" label="Total Cost" value={`Rs ${report.totalPurchaseCost.toLocaleString()}`} accent={colors.danger} />
        </View>

        <Text style={styles.sectionLabel}>Inventory</Text>
        <View style={styles.grid}>
          <MetricTile icon="layers-outline" label="Products" value={String(report.productCount)} />
          <MetricTile icon="bar-chart-outline" label="Total Stock" value={String(report.totalStock)} />
        </View>

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

  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 4,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
});
