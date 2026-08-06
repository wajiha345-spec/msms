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
import { accountingApi, Account } from '../../api/accounting';
import { colors } from '../../theme/colors';

interface DraftLine {
  key:     string;
  account: Account | null;
  debit:   string;
  credit:  string;
}

function newLine(): DraftLine {
  return { key: String(Math.random()), account: null, debit: '', credit: '' };
}

export default function NewJournalEntryScreen() {
  const navigation = useNavigation<any>();
  const [memo,    setMemo]    = useState('');
  const [lines,   setLines]   = useState<DraftLine[]>([newLine(), newLine()]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length > 2 ? prev.filter((l) => l.key !== key) : prev));
  }

  const totalDebit  = lines.reduce((sum, l) => sum + (Number(l.debit)  || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isBalanced  = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.01;

  async function handleSubmit() {
    setError('');
    if (!isBalanced) {
      setError('Debit and credit totals must be equal and greater than zero');
      return;
    }
    if (lines.some((l) => !l.account)) {
      setError('Every line needs an account selected');
      return;
    }

    setLoading(true);
    try {
      await accountingApi.createJournalEntry({
        memo: memo.trim() || undefined,
        lines: lines.map((l) => ({
          accountId: l.account!.id,
          debit:     Number(l.debit)  || 0,
          credit:    Number(l.credit) || 0,
        })),
      });
      Alert.alert('Journal Entry Posted ✓', undefined, [{ text: 'OK', onPress: () => navigation.goBack() }]);
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
        <Text style={styles.title}>New Journal Entry</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Input
          label="Memo (optional)"
          placeholder="e.g. Owner capital injection"
          value={memo}
          onChangeText={setMemo}
        />

        <Text style={styles.sectionLabel}>Lines</Text>
        {lines.map((line, i) => (
          <View key={line.key} style={styles.lineCard}>
            <View style={styles.lineHeader}>
              <Text style={styles.lineIndex}>Line {i + 1}</Text>
              {lines.length > 2 && (
                <TouchableOpacity onPress={() => removeLine(line.key)}>
                  <Text style={styles.removeBtn}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
            <AccountPicker
              value={line.account}
              onChange={(account) => updateLine(line.key, { account })}
            />
            <View style={styles.amountRow}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Debit"
                  placeholder="0"
                  value={line.debit}
                  onChangeText={(v) => updateLine(line.key, { debit: v, credit: v ? '' : line.credit })}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Credit"
                  placeholder="0"
                  value={line.credit}
                  onChangeText={(v) => updateLine(line.key, { credit: v, debit: v ? '' : line.debit })}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addLineBtn} onPress={() => setLines((p) => [...p, newLine()])}>
          <Text style={styles.addLineText}>+ Add another line</Text>
        </TouchableOpacity>

        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Debit</Text>
            <Text style={styles.summaryValue}>Rs {totalDebit.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Credit</Text>
            <Text style={styles.summaryValue}>Rs {totalCredit.toLocaleString()}</Text>
          </View>
          <Text style={[styles.balanceStatus, { color: isBalanced ? colors.success : colors.danger }]}>
            {isBalanced ? '✓ Balanced' : 'Not balanced yet'}
          </Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          label="Post Journal Entry"
          onPress={handleSubmit}
          loading={loading}
          disabled={!isBalanced}
          style={{ marginTop: 8 }}
        />
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
  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 10, marginTop: 4,
  },
  lineCard: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: colors.border,
  },
  lineHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  },
  lineIndex:  { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  removeBtn:  { fontSize: 12, color: colors.danger, fontWeight: '600' },
  amountRow:  { flexDirection: 'row', gap: 10 },
  addLineBtn: { alignItems: 'center', paddingVertical: 10, marginBottom: 14 },
  addLineText: { color: colors.primary, fontSize: 14, fontWeight: '600' },

  summaryBox: {
    backgroundColor: colors.card, borderRadius: 12,
    padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: 13, color: colors.textMuted },
  summaryValue: { fontSize: 13, fontWeight: '600', color: colors.text },
  balanceStatus: { fontSize: 13, fontWeight: '700', marginTop: 6, textAlign: 'center' },

  errorText: { color: colors.danger, fontSize: 12, marginBottom: 10, textAlign: 'center' },
});
