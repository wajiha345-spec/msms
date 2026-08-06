import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Input }  from '../../components/Inputs';
import { Button } from '../../components/Buttons';
import { Badge }  from '../../components/Badge';
import { MetricTile } from '../../components/MetricTile';
import VariantPicker from '../../components/VariantPicker';
import { crmApi, CustomerProfile, CustomerInteraction } from '../../api/crm';
import { formatDateInput, parseDDMMYYYY } from '../../utils/format';
import { colors } from '../../theme/colors';

const STATUS_OPTIONS = ['Lead', 'Active', 'Vip', 'Inactive'];
const TYPE_OPTIONS    = ['Note', 'Call', 'Visit', 'Follow_up'];

function statusBadgeType(status: string): 'success' | 'info' | 'warning' | 'default' {
  if (status === 'vip')      return 'info';
  if (status === 'active')   return 'success';
  if (status === 'lead')     return 'warning';
  return 'default';
}

function typeIcon(type: string) {
  if (type === 'CALL')       return '📞';
  if (type === 'VISIT')      return '🏬';
  if (type === 'FOLLOW_UP')  return '⏰';
  return '📝';
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB');
}

export default function CustomerProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params;

  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLabel, setStatusLabel] = useState('');
  const [busy, setBusy] = useState(false);

  const [formOpen,   setFormOpen]   = useState(false);
  const [typeLabel,  setTypeLabel]  = useState('Note');
  const [text,       setText]       = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [errors,     setErrors]     = useState<Record<string, string>>({});

  async function fetchProfile() {
    try {
      const res = await crmApi.getProfile(id);
      setProfile(res.data.data);
      setStatusLabel(res.data.data.customer.status.charAt(0).toUpperCase() + res.data.data.customer.status.slice(1));
    } catch {
      Alert.alert('Error', 'Failed to load customer profile');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchProfile(); }, [id]));

  async function handleSaveStatus() {
    if (!profile || statusLabel.toLowerCase() === profile.customer.status) return;
    setBusy(true);
    try {
      await crmApi.updateCustomer(id, { status: statusLabel.toLowerCase() });
      fetchProfile();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Could not update status');
    } finally {
      setBusy(false);
    }
  }

  function validateInteraction() {
    const e: Record<string, string> = {};
    if (!text.trim()) e.text = 'Please enter a note';
    if (typeLabel === 'Follow_up') {
      if (!followUpDate.trim()) e.followUpDate = 'Follow-up date is required';
      else if (!parseDDMMYYYY(followUpDate)) e.followUpDate = 'Enter a valid date (DD/MM/YYYY)';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleAddInteraction() {
    if (!validateInteraction()) return;
    setBusy(true);
    try {
      const type = typeLabel.toUpperCase() as CustomerInteraction['type'];
      const due = type === 'FOLLOW_UP' ? parseDDMMYYYY(followUpDate) : null;
      await crmApi.addInteraction(id, {
        type,
        text: text.trim(),
        followUpDate: due ? due.toISOString() : undefined,
      });
      setText(''); setFollowUpDate(''); setTypeLabel('Note'); setFormOpen(false);
      fetchProfile();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Could not add interaction');
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleComplete(interaction: CustomerInteraction) {
    setBusy(true);
    try {
      await crmApi.updateInteraction(interaction.id, { completed: !interaction.completed });
      fetchProfile();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Could not update');
    } finally {
      setBusy(false);
    }
  }

  function handleDeleteInteraction(interactionId: string) {
    Alert.alert('Delete Entry', 'Remove this note/interaction?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await crmApi.deleteInteraction(interactionId);
            fetchProfile();
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.error || 'Could not delete');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  if (loading || !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const { customer, interactions, stats } = profile;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{customer.name}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.contactCard}>
          <Text style={styles.phone}>{customer.phone}</Text>
          {customer.email && <Text style={styles.contactLine}>✉️ {customer.email}</Text>}
          {customer.address && <Text style={styles.contactLine}>📍 {customer.address}</Text>}
          {customer.tags.length > 0 && (
            <View style={styles.tagRow}>
              {customer.tags.map((t) => <Badge key={t} label={t} type="default" />)}
            </View>
          )}
        </View>

        <VariantPicker
          label="Status"
          value={statusLabel}
          onChange={setStatusLabel}
          options={STATUS_OPTIONS}
          required
        />
        <Button
          label="Save Status"
          variant="outline"
          onPress={handleSaveStatus}
          loading={busy}
          disabled={statusLabel.toLowerCase() === customer.status}
          style={{ marginBottom: 20 }}
        />

        <Text style={styles.sectionLabel}>Activity Summary</Text>
        <View style={styles.grid}>
          <MetricTile icon="🧾" label="Sales" value={String(stats.salesCount)} />
          <MetricTile icon="💰" label="Total Spent" value={`Rs ${stats.totalSpent.toLocaleString()}`} accent={colors.success} />
          <MetricTile icon="⚠️" label="Outstanding" value={`Rs ${stats.outstanding.toLocaleString()}`} accent={stats.outstanding > 0 ? colors.danger : colors.success} />
          <MetricTile icon="📋" label="Quotations" value={String(stats.quotationsCount)} />
          <MetricTile icon="📤" label="Sales Orders" value={String(stats.salesOrdersCount)} />
          <MetricTile icon="🗓️" label="Last Purchase" value={fmtDate(stats.lastPurchaseAt)} />
        </View>

        <View style={styles.timelineHeader}>
          <Text style={styles.sectionLabel}>Notes & Interactions</Text>
          <TouchableOpacity onPress={() => setFormOpen((v) => !v)}>
            <Text style={styles.addLink}>{formOpen ? 'Cancel' : '+ Add'}</Text>
          </TouchableOpacity>
        </View>

        {formOpen && (
          <View style={styles.formCard}>
            <VariantPicker
              label="Type"
              value={typeLabel}
              onChange={setTypeLabel}
              options={TYPE_OPTIONS}
              required
            />
            <Input
              label="Note *"
              placeholder="What happened, or what to remember"
              value={text}
              onChangeText={setText}
              multiline
              numberOfLines={3}
              style={{ height: 70, textAlignVertical: 'top' }}
              error={errors.text}
            />
            {typeLabel === 'Follow_up' && (
              <Input
                label="Follow-up Date *"
                placeholder="DD/MM/YYYY"
                value={followUpDate}
                onChangeText={(v) => setFollowUpDate(formatDateInput(v))}
                keyboardType="numeric"
                maxLength={10}
                error={errors.followUpDate}
              />
            )}
            <Button label="Save" onPress={handleAddInteraction} loading={busy} />
          </View>
        )}

        {interactions.map((it) => (
          <View key={it.id} style={styles.interactionCard}>
            <View style={styles.interactionHeader}>
              <Text style={styles.interactionIcon}>{typeIcon(it.type)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.interactionText}>{it.text}</Text>
                <Text style={styles.interactionMeta}>
                  {it.createdBy.username} · {fmtDate(it.createdAt)}
                  {it.type === 'FOLLOW_UP' && it.followUpDate ? ` · Due ${fmtDate(it.followUpDate)}` : ''}
                </Text>
              </View>
            </View>
            <View style={styles.interactionActions}>
              {it.type === 'FOLLOW_UP' && (
                <TouchableOpacity onPress={() => handleToggleComplete(it)}>
                  <Badge label={it.completed ? 'Done' : 'Mark Done'} type={it.completed ? 'success' : 'warning'} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => handleDeleteInteraction(it.id)}>
                <Text style={styles.deleteLink}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {interactions.length === 0 && !formOpen && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No notes or interactions yet.</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
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

  contactCard: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border, marginBottom: 16,
  },
  phone:       { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  contactLine: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  tagRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },

  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 4,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },

  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addLink: { fontSize: 13, fontWeight: '600', color: colors.primary },

  formCard: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border, marginBottom: 14,
  },

  interactionCard: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border, marginBottom: 10,
  },
  interactionHeader: { flexDirection: 'row', gap: 10 },
  interactionIcon:   { fontSize: 20 },
  interactionText:   { fontSize: 14, color: colors.text, fontWeight: '500' },
  interactionMeta:   { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  interactionActions: {
    flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center',
    gap: 14, marginTop: 10,
  },
  deleteLink: { fontSize: 12, color: colors.danger, fontWeight: '500' },

  empty:     { alignItems: 'center', paddingTop: 20 },
  emptyText: { fontSize: 13, color: colors.textMuted },
});
