import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Button } from '../../components/Buttons';
import { Badge } from '../../components/Badge';
import VariantPicker from '../../components/VariantPicker';
import { usersApi, TeamMember, ASSIGNABLE_ROLES, AssignableRole } from '../../api/users';
import { colors } from '../../theme/colors';

const ROLE_OPTIONS = ASSIGNABLE_ROLES.map((r) => r.charAt(0).toUpperCase() + r.slice(1));

export default function TeamMemberDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params;

  const [member,   setMember]   = useState<TeamMember | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [roleLabel, setRoleLabel] = useState('');
  const [busy,     setBusy]     = useState(false);

  async function fetchMember() {
    try {
      const res = await usersApi.list();
      const found = res.data.data.find((u) => u.id === id);
      if (!found) throw new Error('not found');
      setMember(found);
      setRoleLabel(found.role.charAt(0).toUpperCase() + found.role.slice(1));
    } catch {
      Alert.alert('Error', 'Failed to load team member');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchMember(); }, [id]));

  async function handleSaveRole() {
    if (!member) return;
    const role = roleLabel.toLowerCase() as AssignableRole;
    if (role === member.role) return;
    setBusy(true);
    try {
      await usersApi.updateRole(id, role);
      Alert.alert('Role Updated ✓');
      fetchMember();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Could not update role');
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleActive() {
    if (!member) return;
    const nextActive = !member.isActive;
    Alert.alert(
      nextActive ? 'Reactivate Member' : 'Deactivate Member',
      nextActive
        ? 'This will restore their access.'
        : 'This will immediately block their access to Business Management features.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: nextActive ? 'Reactivate' : 'Deactivate',
          style: nextActive ? 'default' : 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await usersApi.setActive(id, nextActive);
              fetchMember();
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.error || 'Could not update status');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  if (loading || !member) {
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
        <Text style={styles.title} numberOfLines={1}>{member.username}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.statusRow}>
          <Badge label={member.isActive ? 'Active' : 'Inactive'} type={member.isActive ? 'success' : 'danger'} />
          {member.email && <Text style={styles.email}>{member.email}</Text>}
        </View>

        <VariantPicker
          label="Role"
          value={roleLabel}
          onChange={setRoleLabel}
          options={ROLE_OPTIONS}
          placeholder="Select a role"
          required
        />
        <Button
          label="Save Role"
          variant="outline"
          onPress={handleSaveRole}
          loading={busy}
          disabled={roleLabel.toLowerCase() === member.role}
          style={{ marginBottom: 20 }}
        />

        <Button
          label={member.isActive ? 'Deactivate Member' : 'Reactivate Member'}
          variant={member.isActive ? 'danger' : 'primary'}
          onPress={handleToggleActive}
          loading={busy}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
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
  title:   { fontSize: 17, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'center' },
  scroll:  { padding: 16, paddingBottom: 40 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  email: { fontSize: 13, color: colors.textMuted },
});
