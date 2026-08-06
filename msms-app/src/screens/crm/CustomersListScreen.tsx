import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, StyleSheet,
  RefreshControl, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { crmApi, Customer } from '../../api/crm';
import { Badge } from '../../components/Badge';
import { colors } from '../../theme/colors';

const FILTERS = ['all', 'lead', 'active', 'vip', 'inactive'] as const;
type Filter = (typeof FILTERS)[number];

function statusBadgeType(status: string): 'success' | 'info' | 'warning' | 'default' {
  if (status === 'vip')      return 'info';
  if (status === 'active')   return 'success';
  if (status === 'lead')     return 'warning';
  return 'default';
}

export default function CustomersListScreen() {
  const navigation = useNavigation<any>();
  const [customers,  setCustomers]  = useState<Customer[]>([]);
  const [search,     setSearch]     = useState('');
  const [filter,     setFilter]     = useState<Filter>('all');
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchCustomers(q = search, f = filter) {
    try {
      const res = await crmApi.listCustomers({
        search: q || undefined,
        status: f === 'all' ? undefined : f,
      });
      setCustomers(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load customers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchCustomers(); }, []));

  function renderItem({ item }: { item: Customer }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('CustomerProfile', { id: item.id })}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.phone}>{item.phone}</Text>
          {item.tags.length > 0 && (
            <Text style={styles.tags} numberOfLines={1}>{item.tags.join(' · ')}</Text>
          )}
        </View>
        <Badge label={item.status.charAt(0).toUpperCase() + item.status.slice(1)} type={statusBadgeType(item.status)} />
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
        <Text style={styles.title}>Customers</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('NewCustomer')}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or phone…"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={(t) => { setSearch(t); fetchCustomers(t, filter); }}
          clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => { setFilter(f); fetchCustomers(search, f); }}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.followUpsLink} onPress={() => navigation.navigate('FollowUps')}>
        <Text style={styles.followUpsLinkText}>📅 View upcoming follow-ups</Text>
        <Text style={styles.followUpsArrow}>›</Text>
      </TouchableOpacity>

      <FlatList
        data={customers}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCustomers(); }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No customers found.</Text>
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
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  searchRow: { padding: 12, backgroundColor: colors.card },
  searchInput: {
    backgroundColor: colors.background, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    padding: 11, fontSize: 14, color: colors.text,
  },

  filterRow: {
    flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 10,
    backgroundColor: colors.card, gap: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
  },
  filterTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterTabText: { fontSize: 12, color: colors.text, fontWeight: '500' },
  filterTabTextActive: { color: '#fff' },

  followUpsLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#EEF2FF', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  followUpsLinkText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  followUpsArrow:     { fontSize: 18, color: colors.primary },

  list: { padding: 12, gap: 10, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  name:  { fontSize: 15, fontWeight: '600', color: colors.text },
  phone: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  tags:  { fontSize: 11, color: colors.primary, marginTop: 3 },

  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: colors.textMuted, fontWeight: '500' },
});
