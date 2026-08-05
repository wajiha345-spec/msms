import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';

export default function ForgotPasswordScreen() {
  const { forgotPassword, resetPassword } = useAuth();
  const navigation = useNavigation<any>();

  const [step, setStep]           = useState<'request' | 'reset'>('request');
  const [username, setUsername]   = useState('');
  const [maskedEmail, setMaskedEmail] = useState<string | undefined>();
  const [otp, setOtp]             = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]     = useState(false);

  async function handleRequestCode() {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter your username');
      return;
    }
    setLoading(true);
    try {
      const { maskedEmail } = await forgotPassword(username.trim());
      setMaskedEmail(maskedEmail);
      setStep('reset');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!otp.trim() || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(username.trim(), otp.trim(), newPassword);
      Alert.alert('Success', 'Your password has been reset. Please log in.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Reset Password</Text>

        {step === 'request' ? (
          <>
            <Text style={styles.subtitle}>
              Enter your username. If your account has an email on file, we'll send it a reset code.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor={colors.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.button}
              onPress={handleRequestCode}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.buttonText}>Send Reset Code</Text>
              }
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>
              {maskedEmail
                ? `Enter the code we sent to ${maskedEmail}, along with your new password.`
                : `If ${username} has an email on file, a code was sent to it. Enter it below along with your new password.`}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="6-digit code"
              placeholderTextColor={colors.textMuted}
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
            />
            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor={colors.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor={colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            <TouchableOpacity
              style={styles.button}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.buttonText}>Reset Password</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => setStep('request')}
            >
              <Text style={styles.linkText}>Didn't get a code? Try again</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.linkText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 28,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 22,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    marginBottom: 14,
    backgroundColor: colors.background,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
