import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { crmApi, FollowUp } from '../../api/crm';
import { Badge } from '../../components/Badge';
import { colors } from '../../theme/colors';

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB');
}

function isOverdue(d: string | null | undefined) {
  if (!d) return false;
  return new Date(d).getTime() < Date.now();
}

export default function FollowUpsScreen() {
  const navigation = useNavigation<any>();
  const [followUps,  setFollowUps]  = useState<FollowUp[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId,     setBusyId]     = useState<string | null>(null);

  async function fetchFollowUps() {
    try {
      const res = await crmApi.listFollowUps();
      setFollowUps(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load follow-ups');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchFollowUps(); }, []));

  async function handleMarkDone(id: string) {
    setBusyId(id);
    try {
      await crmApi.updateInteraction(id, { completed: true });
      fetchFollowUps();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Could not update');
    } finally {
      setBusyId(null);
    }
  }

  function renderItem({ item }: { item: FollowUp }) {
    const overdue = isOverdue(item.followUpDate);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('CustomerProfile', { id: item.customer.id })}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.customer.name}</Text>
          <Text style={styles.phone}>{item.customer.phone}</Text>
          <Text style={styles.text} numberOfLines={2}>{item.text}</Text>
          <Badge label={`Due ${fmtDate(item.followUpDate)}`} type={overdue ? 'danger' : 'warning'} />
        </View>
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => handleMarkDone(item.id)}
          disabled={busyId === item.id}
        >
          <Text style={styles.doneBtnText}>{busyId === item.id ? '…' : '✓ Done'}</Text>
        </TouchableOpacity>
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
        <Text style={styles.title}>Follow-ups</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={followUps}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFollowUps(); }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No upcoming follow-ups.</Text>
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
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { color: colors.primary, fontSize: 15, fontWeight: '500', width: 60 },
  title:   { fontSize: 17, fontWeight: '700', color: colors.text },

  list: { padding: 12, gap: 10, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  name:  { fontSize: 15, fontWeight: '600', color: colors.text },
  phone: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  text:  { fontSize: 13, color: colors.text, marginTop: 6, marginBottom: 8 },

  doneBtn: {
    backgroundColor: colors.background, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  doneBtnText: { fontSize: 12, fontWeight: '600', color: colors.success },

  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: colors.textMuted, fontWeight: '500' },
});
