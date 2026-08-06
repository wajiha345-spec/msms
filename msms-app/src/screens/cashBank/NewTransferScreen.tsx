import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Input }  from '../../components/Inputs';
import { Button } from '../../components/Buttons';
import { AccountPicker } from '../../components/AccountPicker';
import { cashBankApi } from '../../api/cashBank';
import { Account } from '../../api/accounting';
import { colors } from '../../theme/colors';

export default function NewTransferScreen() {
  const navigation = useNavigation<any>();
  const [fromAccount, setFromAccount] = useState<Account | null>(null);
  const [toAccount,   setToAccount]   = useState<Account | null>(null);
  const [amount,      setAmount]      = useState('');
  const [memo,        setMemo]        = useState('');
  const [loading,     setLoading]     = useState(false);
  const [errors,      setErrors]      = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!fromAccount) e.fromAccount = 'Please select the source account';
    if (!toAccount)   e.toAccount = 'Please select the destination account';
    if (fromAccount && toAccount && fromAccount.id === toAccount.id) {
      e.toAccount = 'From and To accounts must be different';
    }
    if (!amount || Number(amount) <= 0) e.amount = 'Enter a valid amount';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      await cashBankApi.recordTransfer({
        fromAccountId: fromAccount!.id,
        toAccountId:   toAccount!.id,
        amount:        Number(amount),
        memo:          memo.trim() || undefined,
      });
      Alert.alert('Transfer Recorded ✓', undefined, [{ text: 'OK', onPress: () => navigation.goBack() }]);
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
        <Text style={styles.title}>New Transfer</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <AccountPicker
          label="From Account"
          value={fromAccount}
          onChange={setFromAccount}
          filterType="ASSET"
        />
        {errors.fromAccount && <Text style={styles.errorText}>{errors.fromAccount}</Text>}

        <AccountPicker
          label="To Account"
          value={toAccount}
          onChange={setToAccount}
          filterType="ASSET"
        />
        {errors.toAccount && <Text style={styles.errorText}>{errors.toAccount}</Text>}

        <Input
          label="Amount (Rs) *"
          placeholder="0"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          error={errors.amount}
        />
        <Input
          label="Memo (optional)"
          placeholder="e.g. Moved cash to bank"
          value={memo}
          onChangeText={setMemo}
        />

        <Button label="Record Transfer" onPress={handleSubmit} loading={loading} style={{ marginTop: 8 }} />
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
  errorText: { color: colors.danger, fontSize: 12, marginTop: -10, marginBottom: 10 },
});
