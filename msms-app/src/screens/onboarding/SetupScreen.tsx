import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Input } from '../../components/Inputs';
import { Button } from '../../components/Buttons';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';

export default function SetupScreen() {
  const navigation   = useNavigation<any>();
  const { setupShop } = useAuth();

  const [step, setStep]             = useState<1 | 2>(1);
  const [licenseKey, setLicenseKey] = useState('');
  const [planInfo, setPlanInfo]     = useState<{ plan: string; customerName: string } | null>(null);
  const [shopName, setShopName]     = useState('');
  const [username, setUsername]     = useState('');
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors]         = useState<Record<string, string>>({});

  // ── Step 1: Validate license key ─────────────────────────────────────────
  async function handleValidateKey() {
    const key = licenseKey.trim();
    if (!key) { setErrors({ key: 'Please enter your license key' }); return; }
    setErrors({});
    setValidating(true);
    try {
      const { apiClient } = await import('../../api/client');
      const res = await apiClient.get(`/licenses/validate/${key}`);
      setPlanInfo(res.data.data);
      setStep(2);
    } catch (e: any) {
      const msg = e?.response?.data?.error
        ?? (e?.message ? `Network error: ${e.message}` : 'Invalid or already-used license key.');
      setErrors({ key: msg });
    } finally {
      setValidating(false);
    }
  }

  // ── Step 2: Create account ────────────────────────────────────────────────
  async function handleSetup() {
    const errs: Record<string, string> = {};
    if (!shopName.trim())      errs.shopName  = 'Shop name is required';
    if (!username.trim())      errs.username  = 'Username is required';
    if (username.trim().length < 3) errs.username = 'At least 3 characters';
    if (!password)             errs.password  = 'Password is required';
    if (password.length < 6)   errs.password  = 'At least 6 characters';
    if (password !== confirm)  errs.confirm   = 'Passwords do not match';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);
    try {
      await setupShop({
        licenseKey: licenseKey.trim(),
        shopName:   shopName.trim(),
        username:   username.trim(),
        password,
      });
      // AuthContext stores token → RootNavigator renders Main automatically
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? 'Setup failed. Please try again.';
      Alert.alert('Setup Failed', msg);
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

        {/* Logo / header */}
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>MSMS</Text>
          <Text style={styles.logoSub}>Mobile Shop Management System</Text>
        </View>

        {/* Step indicator */}
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
            <Text style={[styles.stepDotText, step >= 1 && styles.stepDotTextActive]}>1</Text>
          </View>
          <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
          <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]}>
            <Text style={[styles.stepDotText, step >= 2 && styles.stepDotTextActive]}>2</Text>
          </View>
        </View>
        <View style={styles.stepLabels}>
          <Text style={[styles.stepLabel, step === 1 && styles.stepLabelActive]}>License Key</Text>
          <Text style={[styles.stepLabel, step === 2 && styles.stepLabelActive]}>Create Account</Text>
        </View>

        {/* ── Step 1 ── */}
        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Enter Your License Key</Text>
            <Text style={styles.cardSub}>
              Your license key was emailed to you after payment. Check your inbox (and spam folder).
            </Text>
            <Input
              label="License Key"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={licenseKey}
              onChangeText={(v: string) => { setLicenseKey(v); setErrors({}); }}
              autoCapitalize="none"
              error={errors.key}
            />
            <Button
              label={validating ? 'Validating…' : 'Validate Key →'}
              onPress={handleValidateKey}
              loading={validating}
            />
          </View>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && planInfo && (
          <View style={styles.card}>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>✓ {planInfo.plan} Plan — Key Verified</Text>
            </View>
            <Text style={styles.cardTitle}>Set Up Your Shop</Text>
            <Text style={styles.cardSub}>
              This information will appear in your app and on invoices.
            </Text>
            <Input
              label="Shop Name *"
              placeholder="e.g. Al-Hamd Mobile"
              value={shopName}
              onChangeText={(v: string) => { setShopName(v); setErrors({}); }}
              error={errors.shopName}
            />
            <Input
              label="Username *"
              placeholder="e.g. ahmed_khan"
              value={username}
              onChangeText={(v: string) => { setUsername(v); setErrors({}); }}
              autoCapitalize="none"
              error={errors.username}
            />
            <Input
              label="Password *"
              placeholder="Min 6 characters"
              value={password}
              onChangeText={(v: string) => { setPassword(v); setErrors({}); }}
              secureTextEntry
              error={errors.password}
            />
            <Input
              label="Confirm Password *"
              placeholder="Re-enter password"
              value={confirm}
              onChangeText={(v: string) => { setConfirm(v); setErrors({}); }}
              secureTextEntry
              error={errors.confirm}
            />
            <Button
              label="Activate & Get Started"
              onPress={handleSetup}
              loading={submitting}
              style={{ marginTop: 4 }}
            />
            <TouchableOpacity style={styles.backBtn} onPress={() => { setStep(1); setErrors({}); }}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Already have an account? */}
        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginLinkText}>Already have an account? <Text style={styles.loginLinkBold}>Log in</Text></Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 0 },
  scroll:    { padding: 24, paddingTop: 60, paddingBottom: 48 },
  logoBox:   { alignItems: 'center', marginBottom: 36 },
  logoText:  { fontSize: 36, fontWeight: '800', color: colors.primary, letterSpacing: -1 },
  logoSub:   { fontSize: 13, color: colors.textMuted, marginTop: 4 },

  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  stepDot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive:     { backgroundColor: colors.primary },
  stepDotText:       { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  stepDotTextActive: { color: '#fff' },
  stepLine:          { width: 64, height: 2, backgroundColor: colors.border, marginHorizontal: 6 },
  stepLineActive:    { backgroundColor: colors.primary },
  stepLabels: {
    flexDirection: 'row', justifyContent: 'center', gap: 60, marginBottom: 28,
  },
  stepLabel:       { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  stepLabelActive: { color: colors.primary, fontWeight: '700' },

  card: {
    backgroundColor: colors.card, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: colors.border, marginBottom: 20,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 6 },
  cardSub:   { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginBottom: 20 },

  planBadge: {
    backgroundColor: '#f0fdf4', borderRadius: 8, paddingVertical: 7,
    paddingHorizontal: 12, alignSelf: 'flex-start', marginBottom: 16,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  planBadgeText: { fontSize: 13, fontWeight: '600', color: colors.success },

  backBtn:     { alignItems: 'center', marginTop: 12 },
  backBtnText: { color: colors.textMuted, fontSize: 14 },

  loginLink: { alignItems: 'center', paddingVertical: 8 },
  loginLinkText: { fontSize: 14, color: colors.textMuted },
  loginLinkBold: { color: colors.primary, fontWeight: '600' },
});
