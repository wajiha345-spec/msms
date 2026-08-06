import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Input }  from '../../components/Inputs';
import { Button } from '../../components/Buttons';
import { AccountPicker } from '../../components/AccountPicker';
import { cashBankApi, Reconciliation } from '../../api/cashBank';
import { Account } from '../../api/accounting';
import { formatDateInput, parseDDMMYYYY } from '../../utils/format';
import { colors } from '../../theme/colors';

export default function ReconciliationScreen() {
  const navigation = useNavigation<any>();
  const [account,  setAccount]  = useState<Account | null>(null);
  const [history,  setHistory]  = useState<Reconciliation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [statementDate,    setStatementDate]    = useState('');
  const [statementBalance, setStatementBalance] = useState('');
  const [note,             setNote]             = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors,     setErrors]     = useState<Record<string, string>>({});

  async function loadHistory(acc: Account) {
    setLoadingHistory(true);
    try {
      const res = await cashBankApi.listReconciliations(acc.id);
      setHistory(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load reconciliation history');
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => { if (account) loadHistory(account); }, [account?.id]);

  function validate() {
    const e: Record<string, string> = {};
    if (!account) e.account = 'Please select an account';
    if (!statementDate.trim()) e.statementDate = 'Statement date is required';
    else if (!parseDDMMYYYY(statementDate)) e.statementDate = 'Enter a valid date (DD/MM/YYYY)';
    if (!statementBalance.trim() || isNaN(Number(statementBalance))) e.statementBalance = 'Enter a valid balance';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const date = parseDDMMYYYY(statementDate)!;
      const res = await cashBankApi.createReconciliation({
        accountId:        account!.id,
        statementDate:    date.toISOString(),
        statementBalance: Number(statementBalance),
        note:             note.trim() || undefined,
      });
      const r = res.data.data;
      const isBalanced = Math.abs(r.difference) < 0.01;
      Alert.alert(
        isBalanced ? 'Reconciled ✓' : 'Reconciliation Recorded — Difference Found',
        `Book balance: Rs ${r.bookBalance.toLocaleString()}\nStatement balance: Rs ${r.statementBalance.toLocaleString()}\nDifference: Rs ${r.difference.toLocaleString()}`,
      );
      setStatementDate('');
      setStatementBalance('');
      setNote('');
      loadHistory(account!);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Something went wrong');
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
        <Text style={styles.title}>Reconciliation</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <AccountPicker
          label="Account"
          value={account}
          onChange={setAccount}
          filterType="ASSET"
        />
        {errors.account && <Text style={styles.errorText}>{errors.account}</Text>}

        {account && (
          <>
            <Text style={styles.sectionLabel}>New Reconciliation</Text>
            <Input
              label="Statement Date *"
              placeholder="DD/MM/YYYY"
              value={statementDate}
              onChangeText={(v) => setStatementDate(formatDateInput(v))}
              keyboardType="numeric"
              maxLength={10}
              error={errors.statementDate}
            />
            <Input
              label="Statement Balance (Rs) *"
              placeholder="Balance shown on your bank statement"
              value={statementBalance}
              onChangeText={setStatementBalance}
              keyboardType="numeric"
              error={errors.statementBalance}
            />
            <Input
              label="Note (optional)"
              placeholder="e.g. August bank statement"
              value={note}
              onChangeText={setNote}
            />
            <Button label="Create Reconciliation" onPress={handleSubmit} loading={submitting} style={{ marginTop: 8, marginBottom: 20 }} />

            <Text style={styles.sectionLabel}>History</Text>
            {loadingHistory ? (
              <ActivityIndicator color={colors.primary} />
            ) : history.length === 0 ? (
              <Text style={styles.emptyText}>No reconciliations recorded yet for this account.</Text>
            ) : (
              history.map((r) => {
                const isBalanced = Math.abs(r.difference) < 0.01;
                return (
                  <View key={r.id} style={styles.historyRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyDate}>{new Date(r.statementDate).toLocaleDateString('en-PK')}</Text>
                      <Text style={styles.historyMeta}>
                        Statement Rs {r.statementBalance.toLocaleString()} · Book Rs {r.bookBalance.toLocaleString()}
                      </Text>
                      {r.note ? <Text style={styles.historyNote}>{r.note}</Text> : null}
                    </View>
                    <Text style={[styles.historyDiff, { color: isBalanced ? colors.success : colors.danger }]}>
                      {isBalanced ? '✓ Matched' : `Δ ${r.difference.toLocaleString()}`}
                    </Text>
                  </View>
                );
              })
            )}
          </>
        )}
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
  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 10, marginTop: 4,
  },
  emptyText: { fontSize: 13, color: colors.textMuted },
  historyRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 10, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: colors.border,
  },
  historyDate: { fontSize: 13, fontWeight: '600', color: colors.text },
  historyMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  historyNote: { fontSize: 11, color: colors.textMuted, marginTop: 2, fontStyle: 'italic' },
  historyDiff: { fontSize: 13, fontWeight: '700' },
});
