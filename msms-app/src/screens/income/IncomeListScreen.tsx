import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { incomeApi, Income } from '../../api/income';
import { Button } from '../../components/Buttons';
import { colors } from '../../theme/colors';

export default function IncomeListScreen() {
  const navigation = useNavigation<any>();
  const [incomes,    setIncomes]    = useState<Income[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchIncomes() {
    try {
      const res = await incomeApi.list();
      setIncomes(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load income');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchIncomes(); }, []));

  function renderItem({ item }: { item: Income }) {
    const date = new Date(item.date);
    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.category}>{item.category.name}</Text>
          {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
          <Text style={styles.meta}>
            {item.receivedIntoAccount.name} · {date.toLocaleDateString('en-PK')}
          </Text>
        </View>
        <Text style={styles.amount}>Rs {item.amount.toLocaleString()}</Text>
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

  const today = new Date().toDateString();
  const todayIncomes = incomes.filter((i) => new Date(i.date).toDateString() === today);
  const todayTotal = todayIncomes.reduce((sum, i) => sum + i.amount, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Income</Text>
        <Button
          label="+ New Income"
          onPress={() => navigation.navigate('NewIncome')}
          style={{ paddingHorizontal: 14, paddingVertical: 8 }}
        />
      </View>

      <View style={styles.todayStrip}>
        <View style={styles.todayStat}>
          <Text style={styles.todayValue}>{todayIncomes.length}</Text>
          <Text style={styles.todayLabel}>Today's entries</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.todayStat}>
          <Text style={styles.todayValue}>Rs {todayTotal.toLocaleString()}</Text>
          <Text style={styles.todayLabel}>Total received</Text>
        </View>
        <View style={styles.stripDivider} />
        <Button
          label="Reports"
          variant="outline"
          onPress={() => navigation.navigate('IncomeReport')}
          style={{ paddingHorizontal: 12, paddingVertical: 6 }}
        />
      </View>

      <FlatList
        data={incomes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true); fetchIncomes();
          }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No income recorded yet.</Text>
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
  todayStrip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card,
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  todayStat:    { flex: 1, alignItems: 'center' },
  todayValue:   { fontSize: 15, fontWeight: '700', color: colors.text },
  todayLabel:   { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  stripDivider: { width: 1, height: 28, backgroundColor: colors.border, marginHorizontal: 8 },
  list: { padding: 12, gap: 10, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  category: { fontSize: 15, fontWeight: '600', color: colors.text },
  desc:     { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  meta:     { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  amount:   { fontSize: 15, fontWeight: '700', color: colors.success },
  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: colors.textMuted, fontWeight: '500' },
});
