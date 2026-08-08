import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { branchesApi, Branch } from '../../api/branches';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Buttons';
import { colors } from '../../theme/colors';

export default function BranchesListScreen() {
  const navigation = useNavigation<any>();
  const [branches,   setBranches]   = useState<Branch[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchBranches() {
    try {
      const res = await branchesApi.list();
      setBranches(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load branches');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchBranches(); }, []));

  function renderItem({ item }: { item: Branch }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('BranchDetail', { id: item.id })}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          {item.address && <Text style={styles.address}>{item.address}</Text>}
        </View>
        <View style={styles.badges}>
          {item.isMain && <Badge label="Main" type="info" />}
          {!item.isActive && <Badge label="Inactive" type="danger" />}
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
        <Text style={styles.title}>Branches</Text>
        <Button
          label="+ New Branch"
          onPress={() => navigation.navigate('NewBranch')}
          style={{ paddingHorizontal: 14, paddingVertical: 8 }}
        />
      </View>

      <FlatList
        data={branches}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true); fetchBranches();
          }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No branches yet.</Text>
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
  name:    { fontSize: 15, fontWeight: '600', color: colors.text },
  address: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  badges:  { flexDirection: 'row', gap: 6 },
  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: colors.textMuted, fontWeight: '500' },
});
