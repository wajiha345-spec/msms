import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Input }  from '../../components/Inputs';
import { Button } from '../../components/Buttons';
import VariantPicker from '../../components/VariantPicker';
import { crmApi } from '../../api/crm';
import { formatPhone } from '../../utils/format';
import { colors } from '../../theme/colors';

const STATUS_OPTIONS = ['Lead', 'Active', 'Vip', 'Inactive'];

export default function NewCustomerScreen() {
  const navigation = useNavigation<any>();
  const [name,    setName]    = useState('');
  const [phone,   setPhone]   = useState('');
  const [email,   setEmail]   = useState('');
  const [cnic,    setCnic]    = useState('');
  const [address, setAddress] = useState('');
  const [tags,    setTags]    = useState('');
  const [statusLabel, setStatusLabel] = useState('Lead');
  const [source,  setSource]  = useState('');
  const [notes,   setNotes]   = useState('');
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!phone.trim() || phone.length !== 11) e.phone = 'Enter a valid 11-digit phone number';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      await crmApi.createCustomer({
        name:    name.trim(),
        phone:   phone.trim(),
        email:   email.trim() || undefined,
        cnic:    cnic.trim() || undefined,
        address: address.trim() || undefined,
        tags:    tags.trim() ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
        status:  statusLabel.toLowerCase(),
        source:  source.trim() || undefined,
        notes:   notes.trim() || undefined,
      });
      Alert.alert('Customer Added ✓', undefined, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Customer</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Input
          label="Name *"
          placeholder="e.g. Ahmed Khan"
          value={name}
          onChangeText={setName}
          error={errors.name}
        />
        <Input
          label="Phone *"
          placeholder="e.g. 03001234567"
          value={phone}
          onChangeText={(v) => setPhone(formatPhone(v))}
          keyboardType="phone-pad"
          maxLength={11}
          error={errors.phone}
          autoComplete="off"
          importantForAutofill="no"
          textContentType="none"
        />
        <Input
          label="Email (optional)"
          placeholder="e.g. ahmed@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          label="CNIC (optional)"
          placeholder="35202-1234567-1"
          value={cnic}
          onChangeText={setCnic}
          keyboardType="numeric"
          maxLength={15}
        />
        <Input
          label="Address (optional)"
          placeholder="e.g. Model Town, Lahore"
          value={address}
          onChangeText={setAddress}
        />

        <VariantPicker
          label="Status"
          value={statusLabel}
          onChange={setStatusLabel}
          options={STATUS_OPTIONS}
          required
        />

        <Input
          label="Tags (optional, comma-separated)"
          placeholder="e.g. wholesale, repeat buyer"
          value={tags}
          onChangeText={setTags}
        />
        <Input
          label="Source (optional)"
          placeholder="e.g. Walk-in, Referral, Facebook"
          value={source}
          onChangeText={setSource}
        />
        <Input
          label="Notes (optional)"
          placeholder="Anything worth remembering about this customer"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          style={{ height: 80, textAlignVertical: 'top' }}
        />

        <Button label="Add Customer" onPress={handleSubmit} loading={loading} style={{ marginTop: 8 }} />
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { color: colors.primary, fontSize: 15, fontWeight: '500', width: 60 },
  title:   { fontSize: 17, fontWeight: '700', color: colors.text },
  form:    { padding: 16 },
});
