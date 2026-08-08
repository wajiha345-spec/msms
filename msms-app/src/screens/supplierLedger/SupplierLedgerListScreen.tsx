import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supplierLedgerApi, Supplier, AgingReport } from '../../api/supplierLedger';
import { colors } from '../../theme/colors';

export default function SupplierLedgerListScreen() {
  const navigation = useNavigation<any>();
  const [suppliers,  setSuppliers]  = useState<Supplier[]>([]);
  const [aging,       setAging]      = useState<AgingReport | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchData() {
    try {
      const [suppliersRes, agingRes] = await Promise.all([
        supplierLedgerApi.listSuppliers(),
        supplierLedgerApi.getAging(),
      ]);
      setSuppliers(suppliersRes.data.data);
      setAging(agingRes.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load supplier ledger');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  function renderItem({ item }: { item: Supplier }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('SupplierStatement', { phone: item.supplierPhone, name: item.supplierName })}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.supplierName || 'Unknown'}</Text>
          <Text style={styles.phone}>{item.supplierPhone}</Text>
          <Text style={styles.meta}>{item.purchasesCount} credit purchase(s)</Text>
        </View>
        <Text style={styles.outstanding}>Rs {item.outstanding.toLocaleString()}</Text>
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

  const totalOutstanding = suppliers.reduce((sum, s) => sum + s.outstanding, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Supplier Ledger</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.summaryStrip}>
        <View style={styles.summaryStat}>
          <Text style={styles.summaryValue}>{suppliers.length}</Text>
          <Text style={styles.summaryLabel}>Suppliers owed</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.summaryStat}>
          <Text style={styles.summaryValue}>Rs {totalOutstanding.toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>Total outstanding</Text>
        </View>
      </View>

      {aging && (
        <View style={styles.agingStrip}>
          {aging.buckets.map((b) => (
            <View key={b.label} style={styles.agingBucket}>
              <Text style={[styles.agingValue, b.total > 0 && b.label !== 'Current' && styles.agingOverdue]}>
                Rs {b.total.toLocaleString()}
              </Text>
              <Text style={styles.agingLabel}>{b.label}</Text>
            </View>
          ))}
        </View>
      )}

      <FlatList
        data={suppliers}
        keyExtractor={(item) => item.supplierPhone}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true); fetchData();
          }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No outstanding supplier balances.</Text>
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

  agingStrip: {
    flexDirection: 'row', backgroundColor: colors.card,
    paddingVertical: 10, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  agingBucket: { flex: 1, alignItems: 'center' },
  agingValue:  { fontSize: 12, fontWeight: '700', color: colors.text },
  agingOverdue: { color: colors.danger },
  agingLabel:  { fontSize: 9, color: colors.textMuted, marginTop: 2, textAlign: 'center' },

  list: { padding: 12, gap: 10, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  name:  { fontSize: 15, fontWeight: '600', color: colors.text },
  phone: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  meta:  { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  outstanding: { fontSize: 15, fontWeight: '700', color: colors.danger },

  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: colors.textMuted, fontWeight: '500' },
});
