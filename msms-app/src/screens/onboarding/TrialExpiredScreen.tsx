import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, Linking,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Input } from '../../components/Inputs';
import { Button } from '../../components/Buttons';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';

const WEBSITE_URL = 'https://msms-app.site';

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB');
}

function openWebsite() {
  Linking.openURL(WEBSITE_URL).catch(() => {});
}

// Doubles as the "trial expired" lock screen and the "installment payment
// overdue" lock screen — RootNavigator routes here for either state.
// Installment payments (both starting a new plan and paying installment
// #2/#3) are handled entirely on the website now, not in the app — this
// screen only ever points the user there, it never collects payment proof
// itself. Unlock happens the same way either state resolves: an admin
// approves the payment from an emailed link, and AuthContext's background
// poll (refreshInstallmentStatus / re-checking the JWT) picks it up within
// about a minute, no re-login required.
export default function TrialExpiredScreen() {
  const { upgradeAccount, logout, isInstallmentOverdue, installmentPlan } = useAuth();

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

  const installment1 = installmentPlan?.installments.find((i) => i.installmentNumber === 1);
  const awaitingFirstApproval = installment1?.status === 'SUBMITTED';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">

        <View style={styles.logoBox}>
          <Text style={styles.logoText}>MSMS</Text>
        </View>

        {isInstallmentOverdue && installmentPlan?.overdueInstallment ? (
          <View style={styles.card}>
            <View style={styles.lockBadge}>
              <Text style={styles.lockBadgeText}>🔒 Installment Overdue</Text>
            </View>
            <Text style={styles.cardTitle}>
              Installment #{installmentPlan.overdueInstallment.installmentNumber} Is Overdue
            </Text>
            <Text style={styles.cardSub}>
              Your installment is due on {fmtDate(installmentPlan.overdueInstallment.dueDate)}.
              Please visit {WEBSITE_URL} and pay the next installment to reactivate the app
              now. All your data is safe and untouched — as soon as we approve your payment,
              the app unlocks automatically.
            </Text>
            <Button label="Visit msms-app.site →" onPress={openWebsite} />
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.lockBadge}>
                <Text style={styles.lockBadgeText}>🔒 Trial Ended</Text>
              </View>
              <Text style={styles.cardTitle}>Your 5-Day Trial Has Ended</Text>
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

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {awaitingFirstApproval ? (
              <View style={styles.installmentCard}>
                <Text style={styles.installmentTitle}>⏳ Payment Under Review</Text>
                <Text style={styles.installmentSub}>
                  We received your first installment payment and are verifying it. You'll be unlocked
                  automatically as soon as it's approved — usually within a few hours.
                </Text>
              </View>
            ) : (
              <View style={styles.installmentCard}>
                <Text style={styles.installmentTitle}>Can't pay in full right now?</Text>
                <Text style={styles.installmentSub}>
                  Pay in 3 installments of Rs 45,000 instead — visit {WEBSITE_URL} to set one
                  up. Your first payment unlocks full access as soon as it's approved.
                </Text>
                <TouchableOpacity style={styles.installmentBtn} onPress={openWebsite}>
                  <Text style={styles.installmentBtnText}>Visit msms-app.site →</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

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

  dividerRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 12, color: colors.textMuted, marginHorizontal: 10, fontWeight: '600' },

  installmentCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: colors.border, marginBottom: 20,
  },
  installmentTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6 },
  installmentSub:   { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginBottom: 16 },
  installmentBtn: {
    borderWidth: 1, borderColor: colors.primary, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  installmentBtnText: { color: colors.primary, fontWeight: '600', fontSize: 14 },

  logoutLink: { alignItems: 'center', paddingVertical: 8 },
  logoutLinkText: { fontSize: 14, color: colors.textMuted },
});
