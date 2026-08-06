import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { quotationsApi, Quotation, QuotationStatus } from '../../api/quotations';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Buttons';
import { colors } from '../../theme/colors';

const STATUS_BADGE: Record<QuotationStatus, 'default' | 'success' | 'danger'> = {
  DRAFT:     'default',
  CONVERTED: 'success',
  CANCELLED: 'danger',
};

export default function QuotationsListScreen() {
  const navigation = useNavigation<any>();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchQuotations() {
    try {
      const res = await quotationsApi.list();
      setQuotations(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load quotations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchQuotations(); }, []));

  function renderItem({ item }: { item: Quotation }) {
    const date = new Date(item.createdAt);
    const total = item.items.reduce((sum, i) => sum + i.lineTotal, 0);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('QuotationDetail', { id: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.quoteNo}>{item.quoteNo}</Text>
            <Text style={styles.customer}>{item.customerName || 'Walk-in Customer'}</Text>
          </View>
          <Badge label={item.status} type={STATUS_BADGE[item.status]} />
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.meta}>{item.items.length} item(s) · {date.toLocaleDateString('en-PK')}</Text>
          <Text style={styles.total}>Rs {total.toLocaleString()}</Text>
        </View>
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quotations</Text>
        <Button
          label="+ New Quote"
          onPress={() => navigation.navigate('NewQuotation')}
          style={{ paddingHorizontal: 14, paddingVertical: 8 }}
        />
      </View>

      <FlatList
        data={quotations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true); fetchQuotations();
          }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No quotations yet.</Text>
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  list:  { padding: 12, gap: 10, paddingBottom: 40 },
  card: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  quoteNo:  { fontSize: 15, fontWeight: '600', color: colors.text },
  customer: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  meta:  { fontSize: 12, color: colors.textMuted },
  total: { fontSize: 14, fontWeight: '700', color: colors.text },
  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: colors.textMuted, fontWeight: '500' },
});
