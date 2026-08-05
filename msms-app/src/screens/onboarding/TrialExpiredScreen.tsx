import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Input } from '../../components/Inputs';
import { Button } from '../../components/Buttons';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';

export default function TrialExpiredScreen() {
  const { upgradeAccount, logout } = useAuth();

  const [licenseKey, setLicenseKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  async function handleUpgrade() {
    const key = licenseKey.trim();
    if (!key) { setError('Please enter your license key'); return; }
    setError('');
    setSubmitting(true);
    try {
      await upgradeAccount(key);
      // AuthContext refreshes user.plan → RootNavigator unlocks Main automatically
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? 'Could not activate this license key. Please try again.';
      Alert.alert('Activation Failed', msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">

        <View style={styles.logoBox}>
          <Text style={styles.logoText}>MSMS</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.lockBadge}>
            <Text style={styles.lockBadgeText}>🔒 Trial Ended</Text>
          </View>
          <Text style={styles.cardTitle}>Your 48-Hour Trial Has Ended</Text>
          <Text style={styles.cardSub}>
            Enter a license key to unlock your account. All the data you saved during your trial
            (products, sales, and more) will stay exactly as you left it.
          </Text>

          <Input
            label="License Key"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={licenseKey}
            onChangeText={(v: string) => { setLicenseKey(v); setError(''); }}
            autoCapitalize="none"
            error={error}
          />
          <Button
            label={submitting ? 'Activating…' : 'Unlock My Account →'}
            onPress={handleUpgrade}
            loading={submitting}
          />
        </View>

        <TouchableOpacity style={styles.logoutLink} onPress={logout}>
          <Text style={styles.logoutLinkText}>Log out</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 0 },
  scroll:    { padding: 24, paddingTop: 80, paddingBottom: 48 },
  logoBox:   { alignItems: 'center', marginBottom: 36 },
  logoText:  { fontSize: 36, fontWeight: '800', color: colors.primary, letterSpacing: -1 },

  card: {
    backgroundColor: colors.card, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: colors.border, marginBottom: 20,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 6 },
  cardSub:   { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginBottom: 20 },

  lockBadge: {
    backgroundColor: '#fef2f2', borderRadius: 8, paddingVertical: 7,
    paddingHorizontal: 12, alignSelf: 'flex-start', marginBottom: 16,
    borderWidth: 1, borderColor: '#fecaca',
  },
  lockBadgeText: { fontSize: 13, fontWeight: '600', color: colors.danger },

  logoutLink: { alignItems: 'center', paddingVertical: 8 },
  logoutLinkText: { fontSize: 14, color: colors.textMuted },
});
