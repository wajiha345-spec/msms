import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Input }  from '../../components/Inputs';
import { Button } from '../../components/Buttons';
import { settingsApi } from '../../api/settings';
import { colors } from '../../theme/colors';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);

  const [lowStockThreshold, setLowStockThreshold] = useState('2');
  const [shopAddress,       setShopAddress]       = useState('');
  const [shopPhone,         setShopPhone]         = useState('');
  const [invoiceFooterNote, setInvoiceFooterNote] = useState('');
  const [errors,            setErrors]            = useState<Record<string, string>>({});

  async function fetchSettings() {
    try {
      const res = await settingsApi.get();
      const s = res.data.data;
      setLowStockThreshold(String(s.lowStockThreshold));
      setShopAddress(s.shopAddress ?? '');
      setShopPhone(s.shopPhone ?? '');
      setInvoiceFooterNote(s.invoiceFooterNote ?? '');
    } catch {
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchSettings(); }, []));

  function validate() {
    const e: Record<string, string> = {};
    const threshold = Number(lowStockThreshold);
    if (!lowStockThreshold.trim() || isNaN(threshold) || threshold < 0) {
      e.lowStockThreshold = 'Enter a number 0 or greater';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      await settingsApi.update({
        lowStockThreshold: Number(lowStockThreshold),
        shopAddress:       shopAddress.trim(),
        shopPhone:         shopPhone.trim(),
        invoiceFooterNote: invoiceFooterNote.trim(),
      });
      Alert.alert('Settings Saved ✓');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>Inventory Alerts</Text>
        <Input
          label="Low Stock Threshold *"
          placeholder="e.g. 2"
          value={lowStockThreshold}
          onChangeText={setLowStockThreshold}
          keyboardType="numeric"
          error={errors.lowStockThreshold}
        />
        <Text style={styles.hint}>
          You'll get a notification whenever a product's stock drops to this number or below.
        </Text>

        <Text style={styles.sectionLabel}>Shop Contact Info (optional)</Text>
        <Input
          label="Address"
          placeholder="e.g. Main Boulevard, Gulberg III, Lahore"
          value={shopAddress}
          onChangeText={setShopAddress}
        />
        <Input
          label="Phone"
          placeholder="e.g. 03001234567"
          value={shopPhone}
          onChangeText={setShopPhone}
          keyboardType="phone-pad"
        />
        <Text style={styles.hint}>
          Shown on the invoices and quotations you send to customers.
        </Text>

        <Text style={styles.sectionLabel}>Invoice Footer Note (optional)</Text>
        <Input
          label="Footer Note"
          placeholder="e.g. Warranty valid for 7 days with original receipt."
          value={invoiceFooterNote}
          onChangeText={setInvoiceFooterNote}
          multiline
          numberOfLines={3}
          style={{ height: 80, textAlignVertical: 'top' }}
        />

        <Button label="Save Settings" onPress={handleSave} loading={saving} style={{ marginTop: 8 }} />
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
  title:   { fontSize: 17, fontWeight: '700', color: colors.text },
  form:    { padding: 16 },
  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 10, marginTop: 12,
  },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: -8, marginBottom: 14, lineHeight: 17 },
});
