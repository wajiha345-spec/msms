import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Input } from '../../components/Inputs';
import { Button } from '../../components/Buttons';
import { PhotoPicker } from '../../components/PhotoPicker';
import { useAuth } from '../../context/AuthContext';
import { licenseInstallmentsApi } from '../../api/licenseInstallments';
import { colors } from '../../theme/colors';

const INSTALLMENT_AMOUNT = 45000;

// Handles both starting a brand-new installment plan (installmentNumber = 1)
// and submitting proof for a later installment (2 or 3) that's now due or
// overdue. Reachable from the locked account screen and from BillingStatusScreen.
export default function InstallmentPaymentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const installmentNumber: number = route.params?.installmentNumber ?? 1;
  const { refreshInstallmentStatus } = useAuth();

  const [transactionId, setTransactionId] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!transactionId.trim()) {
      Alert.alert('Missing Info', 'Please enter your transaction ID');
      return;
    }
    if (!photoUri) {
      Alert.alert('Missing Info', 'Please attach a screenshot of your payment');
      return;
    }
    setSubmitting(true);
    try {
      if (installmentNumber === 1) {
        await licenseInstallmentsApi.start(transactionId.trim(), photoUri);
      } else {
        await licenseInstallmentsApi.submitInstallment(installmentNumber, transactionId.trim(), photoUri);
      }
      await refreshInstallmentStatus();
      Alert.alert(
        'Payment Submitted ✓',
        "We've received your payment details and will verify them shortly. You'll be notified once approved.",
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pay Installment #{installmentNumber}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount Due</Text>
          <Text style={styles.amountValue}>Rs {INSTALLMENT_AMOUNT.toLocaleString()}</Text>
          <Text style={styles.amountHint}>
            {installmentNumber === 1
              ? "This is installment 1 of 3 — pay this to unlock full access immediately."
              : `This is installment ${installmentNumber} of 3.`}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Details</Text>
          <Text style={styles.cardSub}>
            Pay via JazzCash, Easypaisa, or bank transfer, then enter your transaction ID and attach a
            screenshot of the payment confirmation below.
          </Text>

          <Input
            label="Transaction ID"
            placeholder="e.g. 123456789012"
            value={transactionId}
            onChangeText={setTransactionId}
            autoCapitalize="none"
          />

          <PhotoPicker
            label="Payment Screenshot"
            uri={photoUri}
            onPick={setPhotoUri}
            onClear={() => setPhotoUri(undefined)}
          />

          <Button
            label={submitting ? 'Submitting…' : 'Submit Payment →'}
            onPress={handleSubmit}
            loading={submitting}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 14,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { color: colors.primary, fontSize: 15, fontWeight: '500', width: 60 },
  title:   { fontSize: 17, fontWeight: '700', color: colors.text },

  scroll: { padding: 16, paddingBottom: 48 },

  amountCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: colors.border, marginBottom: 16, alignItems: 'center',
  },
  amountLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  amountValue: { fontSize: 30, fontWeight: '800', color: colors.primary, marginTop: 4 },
  amountHint:  { fontSize: 12, color: colors.textMuted, marginTop: 8, textAlign: 'center' },

  card: {
    backgroundColor: colors.card, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: colors.border,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6 },
  cardSub:   { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginBottom: 16 },
});
