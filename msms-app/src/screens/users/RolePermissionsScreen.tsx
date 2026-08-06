import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  Switch, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import VariantPicker from '../../components/VariantPicker';
import {
  usersApi, RolePermissionRow,
  ASSIGNABLE_ROLES, AssignableRole,
  PERMISSIONS, PERMISSION_LABELS, Permission,
} from '../../api/users';
import { colors } from '../../theme/colors';

const ROLE_OPTIONS = ASSIGNABLE_ROLES.map((r) => r.charAt(0).toUpperCase() + r.slice(1));

export default function RolePermissionsScreen() {
  const [roleLabel,    setRoleLabel]    = useState(ROLE_OPTIONS[0]);
  const [rows,         setRows]         = useState<RolePermissionRow[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [savingKey,    setSavingKey]    = useState<string | null>(null);

  async function fetchPermissions() {
    try {
      const res = await usersApi.listPermissions();
      setRows(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchPermissions(); }, []));

  const selectedRole = roleLabel.toLowerCase() as AssignableRole;

  function isAllowed(permission: Permission) {
    return rows.find((r) => r.role === selectedRole && r.permission === permission)?.allowed ?? false;
  }

  async function handleToggle(permission: Permission, value: boolean) {
    const key = `${selectedRole}:${permission}`;
    setSavingKey(key);
    // optimistic update
    setRows((prev) => {
      const existing = prev.find((r) => r.role === selectedRole && r.permission === permission);
      if (existing) {
        return prev.map((r) => (r === existing ? { ...r, allowed: value } : r));
      }
      return [...prev, { id: key, role: selectedRole, permission, allowed: value }];
    });
    try {
      await usersApi.updatePermission(selectedRole, permission, value);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Could not update permission');
      fetchPermissions();
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Role Permissions</Text>
        <Text style={styles.subtitle}>Choose what each role can access</Text>
      </View>

      <View style={styles.pickerRow}>
        <VariantPicker
          label="Role"
          value={roleLabel}
          onChange={(v) => setRoleLabel(v || ROLE_OPTIONS[0])}
          options={ROLE_OPTIONS}
          required
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {PERMISSIONS.map((permission) => {
            const key = `${selectedRole}:${permission}`;
            return (
              <View key={permission} style={styles.row}>
                <Text style={styles.rowLabel}>{PERMISSION_LABELS[permission]}</Text>
                <Switch
                  value={isAllowed(permission)}
                  onValueChange={(v) => handleToggle(permission, v)}
                  disabled={savingKey === key}
                  trackColor={{ false: colors.border, true: colors.primary + '88' }}
                  thumbColor={isAllowed(permission) ? colors.primary : '#f4f3f4'}
                />
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title:    { fontSize: 20, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  pickerRow: { padding: 16, paddingBottom: 0, backgroundColor: colors.card },
  scroll: { padding: 16, paddingBottom: 40 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  rowLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
});
