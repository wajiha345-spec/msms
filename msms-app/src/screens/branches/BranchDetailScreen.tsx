import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Input }  from '../../components/Inputs';
import { Button } from '../../components/Buttons';
import { Badge }  from '../../components/Badge';
import { branchesApi, Branch } from '../../api/branches';
import { colors } from '../../theme/colors';

export default function BranchDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params;

  const [branch,  setBranch]  = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [name,    setName]    = useState('');
  const [busy,    setBusy]    = useState(false);

  async function fetchBranch() {
    try {
      const res = await branchesApi.list();
      const found = res.data.data.find((b) => b.id === id);
      if (!found) throw new Error('not found');
      setBranch(found);
      setName(found.name);
    } catch {
      Alert.alert('Error', 'Failed to load branch');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchBranch(); }, [id]));

  async function handleRename() {
    if (!branch || !name.trim() || name.trim() === branch.name) return;
    setBusy(true);
    try {
      await branchesApi.rename(id, name.trim());
      Alert.alert('Branch Renamed ✓');
      fetchBranch();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Could not rename branch');
    } finally {
      setBusy(false);
    }
  }

  function handleDeactivate() {
    if (!branch) return;
    Alert.alert(
      'Deactivate Branch',
      'This branch will no longer be selectable for new sales or purchases.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await branchesApi.deactivate(id);
              fetchBranch();
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.error || 'Could not deactivate branch');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  if (loading || !branch) {
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
        <Text style={styles.title} numberOfLines={1}>{branch.name}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.statusRow}>
          {branch.isMain && <Badge label="Main Branch" type="info" />}
          <Badge label={branch.isActive ? 'Active' : 'Inactive'} type={branch.isActive ? 'success' : 'danger'} />
        </View>

        <Input
          label="Branch Name"
          value={name}
          onChangeText={setName}
        />
        <Button
          label="Save Name"
          variant="outline"
          onPress={handleRename}
          loading={busy}
          disabled={!name.trim() || name.trim() === branch.name}
          style={{ marginBottom: 24 }}
        />

        <Button
          label="View Branch Report"
          onPress={() => navigation.navigate('BranchReport', { id: branch.id })}
          style={{ marginBottom: 12 }}
        />
        <Button
          label="Assign Products"
          variant="outline"
          onPress={() => navigation.navigate('AssignProducts', { branchId: branch.id })}
          style={{ marginBottom: 24 }}
        />

        {!branch.isMain && (
          <Button
            label={branch.isActive ? 'Deactivate Branch' : 'Branch Deactivated'}
            variant="danger"
            onPress={handleDeactivate}
            loading={busy}
            disabled={!branch.isActive}
          />
        )}
        {branch.isMain && (
          <Text style={styles.mainNote}>The Main Branch can't be deactivated.</Text>
        )}

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

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  mainNote:  { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
});
