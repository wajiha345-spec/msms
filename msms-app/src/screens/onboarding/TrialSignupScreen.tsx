import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Input } from '../../components/Inputs';
import { Button } from '../../components/Buttons';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';

export default function TrialSignupScreen() {
  const navigation  = useNavigation<any>();
  const { startTrial } = useAuth();

  const [shopName, setShopName] = useState('');
  const [email,    setEmail]    = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleStart() {
    const errs: Record<string, string> = {};
    if (!shopName.trim())      errs.shopName = 'Shop name is required';
    if (!email.trim())         errs.email    = 'Email is required';
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = 'Enter a valid email address';
    if (!username.trim())      errs.username = 'Username is required';
    if (username.trim().length < 3) errs.username = 'At least 3 characters';
    if (!password)             errs.password = 'Password is required';
    if (password.length < 6)   errs.password = 'At least 6 characters';
    if (password !== confirm)  errs.confirm  = 'Passwords do not match';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);
    try {
      await startTrial({
        shopName: shopName.trim(),
        username: username.trim(),
        password,
        email:    email.trim(),
      });
      // AuthContext stores token → RootNavigator renders Main automatically
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? 'Could not start your trial. Please try again.';
      Alert.alert('Trial Signup Failed', msg);
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
          <Text style={styles.logoSub}>Mobile Shop Management System</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.trialBadge}>
            <Text style={styles.trialBadgeText}>🎁 Free 48-Hour Trial — All PRO Features</Text>
          </View>
          <Text style={styles.cardTitle}>Start Your Free Trial</Text>
          <Text style={styles.cardSub}>
            No license key needed. Your account unlocks instantly and stays active for 48 hours.
          </Text>

          <Input
            label="Shop Name *"
            placeholder="e.g. Al-Hamd Mobile"
            value={shopName}
            onChangeText={(v: string) => { setShopName(v); setErrors({}); }}
            error={errors.shopName}
          />
          <Input
            label="Email *"
            placeholder="you@example.com"
            value={email}
            onChangeText={(v: string) => { setEmail(v); setErrors({}); }}
            autoCapitalize="none"
            keyboardType="email-address"
            error={errors.email}
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
            label="Start Free Trial →"
            onPress={handleStart}
            loading={submitting}
            style={{ marginTop: 4 }}
          />
        </View>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.navigate('Setup')}
        >
          <Text style={styles.loginLinkText}>Already have a license key? <Text style={styles.loginLinkBold}>Activate it</Text></Text>
        </TouchableOpacity>

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

  card: {
    backgroundColor: colors.card, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: colors.border, marginBottom: 20,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 6 },
  cardSub:   { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginBottom: 20 },

  trialBadge: {
    backgroundColor: '#eff6ff', borderRadius: 8, paddingVertical: 7,
    paddingHorizontal: 12, alignSelf: 'flex-start', marginBottom: 16,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  trialBadgeText: { fontSize: 13, fontWeight: '600', color: colors.primary },

  loginLink: { alignItems: 'center', paddingVertical: 8 },
  loginLinkText: { fontSize: 14, color: colors.textMuted },
  loginLinkBold: { color: colors.primary, fontWeight: '600' },
});
