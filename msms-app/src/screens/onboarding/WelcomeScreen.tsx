import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';

export default function WelcomeScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <View style={styles.logoBox}>
        <Text style={styles.logoText}>MSMS</Text>
        <Text style={styles.logoSub}>Mobile Shop Management System</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.trialBtn}
          onPress={() => navigation.navigate('TrialSignup')}
          activeOpacity={0.85}
        >
          <Text style={styles.trialBtnText}>🎁 Try Free for 5 Days</Text>
          <Text style={styles.trialBtnSub}>All PRO features, no license key needed</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('Setup')}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryBtnText}>Create Account</Text>
          <Text style={styles.secondaryBtnSub}>I have a license key</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryBtnText}>Login</Text>
          <Text style={styles.secondaryBtnSub}>I already have an account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.background,
    justifyContent: 'center', padding: 24,
  },
  logoBox:   { alignItems: 'center', marginBottom: 48 },
  logoText:  { fontSize: 40, fontWeight: '800', color: colors.primary, letterSpacing: -1 },
  logoSub:   { fontSize: 14, color: colors.textMuted, marginTop: 6, textAlign: 'center' },

  actions: { gap: 14 },

  trialBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 18, paddingHorizontal: 20, alignItems: 'center',
  },
  trialBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  trialBtnSub:  { fontSize: 12, color: '#ffffffcc', marginTop: 4 },

  secondaryBtn: {
    backgroundColor: colors.card, borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '700', color: colors.text },
  secondaryBtnSub:  { fontSize: 12, color: colors.textMuted, marginTop: 4 },
});
