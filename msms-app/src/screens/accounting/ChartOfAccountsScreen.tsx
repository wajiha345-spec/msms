import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { accountingApi, Account } from '../../api/accounting';
import { Button } from '../../components/Buttons';
import { colors } from '../../theme/colors';

const TYPE_COLORS: Record<string, string> = {
  ASSET:     colors.info,
  LIABILITY: colors.warning,
  EQUITY:    colors.primary,
  INCOME:    colors.success,
  EXPENSE:   colors.danger,
};

export default function ChartOfAccountsScreen() {
  const navigation = useNavigation<any>();
  const [accounts,   setAccounts]   = useState<Account[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchAccounts() {
    try {
      const res = await accountingApi.listAccounts();
      setAccounts(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load accounts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchAccounts(); }, []));

  function renderItem({ item }: { item: Account }) {
    return (
      <TouchableOpacity
        style={[styles.card, !item.isActive && styles.cardInactive]}
        onPress={() => navigation.navigate('GeneralLedger', { accountId: item.id, accountName: item.name })}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.code} · {item.name}</Text>
          <Text style={styles.sub}>
            Opening balance: Rs {item.openingBalance.toLocaleString()}
            {!item.isActive ? ' · Inactive' : ''}
          </Text>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: (TYPE_COLORS[item.type] || colors.textMuted) + '18' }]}>
          <Text style={[styles.typeText, { color: TYPE_COLORS[item.type] || colors.textMuted }]}>{item.type}</Text>
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Chart of Accounts</Text>
        <Button
          label="+ New Account"
          onPress={() => navigation.navigate('NewAccount')}
          style={{ paddingHorizontal: 14, paddingVertical: 8 }}
        />
      </View>

      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true); fetchAccounts();
          }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No accounts yet.</Text>
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
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  cardInactive: { opacity: 0.5 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  sub:  { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 10 },
  typeText:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: colors.textMuted, fontWeight: '500' },
});
