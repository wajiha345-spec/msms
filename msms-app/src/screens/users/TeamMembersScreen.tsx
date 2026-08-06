import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { usersApi, TeamMember } from '../../api/users';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Buttons';
import { colors } from '../../theme/colors';

function roleLabel(role: string) {
  if (role === 'admin') return 'Owner';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default function TeamMembersScreen() {
  const navigation = useNavigation<any>();
  const [users,      setUsers]      = useState<TeamMember[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchUsers() {
    try {
      const res = await usersApi.list();
      setUsers(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load team members');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchUsers(); }, []));

  function renderItem({ item }: { item: TeamMember }) {
    const isOwner = item.role === 'admin';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => !isOwner && navigation.navigate('TeamMemberDetail', { id: item.id })}
        activeOpacity={isOwner ? 1 : 0.7}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.username}>{item.username}</Text>
          {item.email && <Text style={styles.email}>{item.email}</Text>}
        </View>
        <View style={styles.badges}>
          <Badge label={roleLabel(item.role)} type={isOwner ? 'info' : 'default'} />
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
        <Text style={styles.title}>Team Members</Text>
        <Button
          label="+ Add Member"
          onPress={() => navigation.navigate('NewTeamMember')}
          style={{ paddingHorizontal: 14, paddingVertical: 8 }}
        />
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true); fetchUsers();
          }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No team members yet.</Text>
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
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  username: { fontSize: 15, fontWeight: '600', color: colors.text },
  email:    { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  badges:   { flexDirection: 'row', gap: 6 },
  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: colors.textMuted, fontWeight: '500' },
});
