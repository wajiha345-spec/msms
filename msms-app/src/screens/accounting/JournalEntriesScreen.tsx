import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator, Alert, TouchableOpacity,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { accountingApi, JournalEntry } from '../../api/accounting';
import { Button } from '../../components/Buttons';
import { colors } from '../../theme/colors';

export default function JournalEntriesScreen() {
  const navigation = useNavigation<any>();
  const [entries,    setEntries]    = useState<JournalEntry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchEntries() {
    try {
      const res = await accountingApi.listJournalEntries();
      setEntries(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load journal entries');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchEntries(); }, []));

  function renderItem({ item }: { item: JournalEntry }) {
    const date = new Date(item.date);
    const total = item.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.entryNo}>{item.entryNo}</Text>
            {item.memo ? <Text style={styles.memo}>{item.memo}</Text> : null}
          </View>
          <Text style={styles.total}>Rs {total.toLocaleString()}</Text>
        </View>
        {item.lines.map((line, i) => (
          <View key={line.id || i} style={styles.lineRow}>
            <Text style={styles.lineAccount}>{line.account?.code} {line.account?.name}</Text>
            <Text style={styles.lineAmount}>
              {line.debit ? `Dr ${line.debit.toLocaleString()}` : `Cr ${(line.credit || 0).toLocaleString()}`}
            </Text>
          </View>
        ))}
        <Text style={styles.meta}>
          {date.toLocaleDateString('en-PK')} · {item.sourceType === 'MANUAL' ? 'Manual' : item.sourceModule || 'System'} · {item.createdBy.username}
        </Text>
      </View>
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Journal Entries</Text>
        <Button
          label="+ New Entry"
          onPress={() => navigation.navigate('NewJournalEntry')}
          style={{ paddingHorizontal: 14, paddingVertical: 8 }}
        />
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true); fetchEntries();
          }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No journal entries yet.</Text>
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
  backBtn: { color: colors.primary, fontSize: 15, fontWeight: '500' },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  list:  { padding: 12, gap: 10, paddingBottom: 40 },
  card: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', marginBottom: 8 },
  entryNo: { fontSize: 14, fontWeight: '700', color: colors.text },
  memo:    { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  total:   { fontSize: 15, fontWeight: '700', color: colors.text },
  lineRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 3,
  },
  lineAccount: { fontSize: 12, color: colors.text },
  lineAmount:  { fontSize: 12, color: colors.textMuted },
  meta: { fontSize: 11, color: colors.textMuted, marginTop: 8 },
  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: colors.textMuted, fontWeight: '500' },
});
