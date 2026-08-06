import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator, Alert, Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { expensesApi, Expense } from '../../api/expenses';
import { Button } from '../../components/Buttons';
import { colors } from '../../theme/colors';

export default function ExpensesListScreen() {
  const navigation = useNavigation<any>();
  const [expenses,   setExpenses]   = useState<Expense[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchExpenses() {
    try {
      const res = await expensesApi.list();
      setExpenses(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load expenses');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchExpenses(); }, []));

  function renderItem({ item }: { item: Expense }) {
    const date = new Date(item.date);
    return (
      <View style={styles.card}>
        {item.billPhotoUrl && (
          <Image source={{ uri: item.billPhotoUrl }} style={styles.thumb} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.category}>{item.category.name}</Text>
          {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
          <Text style={styles.meta}>
            {item.paidFromAccount.name} · {date.toLocaleDateString('en-PK')}
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
  const todayExpenses = expenses.filter((e) => new Date(e.date).toDateString() === today);
  const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Expenses</Text>
        <Button
          label="+ New Expense"
          onPress={() => navigation.navigate('NewExpense')}
          style={{ paddingHorizontal: 14, paddingVertical: 8 }}
        />
      </View>

      <View style={styles.todayStrip}>
        <View style={styles.todayStat}>
          <Text style={styles.todayValue}>{todayExpenses.length}</Text>
          <Text style={styles.todayLabel}>Today's expenses</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.todayStat}>
          <Text style={styles.todayValue}>Rs {todayTotal.toLocaleString()}</Text>
          <Text style={styles.todayLabel}>Total spent</Text>
        </View>
        <View style={styles.stripDivider} />
        <Button
          label="Reports"
          variant="outline"
          onPress={() => navigation.navigate('ExpenseReport')}
          style={{ paddingHorizontal: 12, paddingVertical: 6 }}
        />
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true); fetchExpenses();
          }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No expenses recorded yet.</Text>
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
  thumb: { width: 44, height: 44, borderRadius: 8, marginRight: 12 },
  category: { fontSize: 15, fontWeight: '600', color: colors.text },
  desc:     { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  meta:     { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  amount:   { fontSize: 15, fontWeight: '700', color: colors.danger },
  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: colors.textMuted, fontWeight: '500' },
});
