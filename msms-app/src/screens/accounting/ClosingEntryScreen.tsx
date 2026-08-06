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
import { accountingApi, ClosingEntry, ProfitAndLoss, Account } from '../../api/accounting';
import { formatDateInput, parseDDMMYYYY } from '../../utils/format';
import { colors } from '../../theme/colors';

export default function ClosingEntryScreen() {
  const navigation = useNavigation<any>();
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd,   setPeriodEnd]   = useState('');
  const [equityAccount, setEquityAccount] = useState<Account | null>(null);
  const [memo, setMemo] = useState('');

  const [preview,    setPreview]    = useState<ProfitAndLoss | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors,     setErrors]     = useState<Record<string, string>>({});

  const [history,        setHistory]        = useState<ClosingEntry[]>([]);
  const [loadingHistory, setLoadingHistory]  = useState(true);

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const res = await accountingApi.listClosingEntries();
      setHistory(res.data.data);
    } catch {
      Alert.alert('Error', 'Failed to load closing entry history');
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => { loadHistory(); }, []);

  function validateDates() {
    const e: Record<string, string> = {};
    if (!periodStart.trim()) e.periodStart = 'Period start is required';
    else if (!parseDDMMYYYY(periodStart)) e.periodStart = 'Enter a valid date (DD/MM/YYYY)';
    if (!periodEnd.trim()) e.periodEnd = 'Period end is required';
    else if (!parseDDMMYYYY(periodEnd)) e.periodEnd = 'Enter a valid date (DD/MM/YYYY)';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handlePreview() {
    if (!validateDates()) return;
    setPreviewing(true);
    try {
      const start = parseDDMMYYYY(periodStart)!;
      const end   = parseDDMMYYYY(periodEnd)!;
      const res = await accountingApi.getProfitAndLoss({ dateFrom: start.toISOString(), dateTo: end.toISOString() });
      setPreview(res.data.data);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Could not preview period');
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSubmit() {
    if (!validateDates()) return;
    if (!equityAccount) { setErrors((prev) => ({ ...prev, equityAccount: 'Select an equity account' })); return; }
    if (!preview) { Alert.alert('Preview first', 'Tap "Preview Period" to see the net profit/loss before closing.'); return; }

    setSubmitting(true);
    try {
      const start = parseDDMMYYYY(periodStart)!;
      const end   = parseDDMMYYYY(periodEnd)!;
      await accountingApi.createClosingEntry({
        periodStart:     start.toISOString(),
        periodEnd:       end.toISOString(),
        equityAccountId: equityAccount.id,
        memo:            memo.trim() || undefined,
      });
      Alert.alert('Period Closed ✓', undefined, [{ text: 'OK', onPress: () => {
        setPeriodStart(''); setPeriodEnd(''); setEquityAccount(null); setMemo(''); setPreview(null);
        loadHistory();
      } }]);
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
        <Text style={styles.title}>Closing Entry</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Input
          label="Period Start *"
          placeholder="DD/MM/YYYY"
          value={periodStart}
          onChangeText={(v) => { setPeriodStart(formatDateInput(v)); setPreview(null); }}
          keyboardType="numeric"
          maxLength={10}
          error={errors.periodStart}
        />
        <Input
          label="Period End *"
          placeholder="DD/MM/YYYY"
          value={periodEnd}
          onChangeText={(v) => { setPeriodEnd(formatDateInput(v)); setPreview(null); }}
          keyboardType="numeric"
          maxLength={10}
          error={errors.periodEnd}
        />

        <Button label="Preview Period" variant="outline" onPress={handlePreview} loading={previewing} style={{ marginBottom: 16 }} />

        {preview && (
          <View style={[styles.previewBox, { borderColor: preview.netProfit >= 0 ? colors.success : colors.danger }]}>
            <Text style={styles.previewLabel}>{preview.netProfit >= 0 ? 'Net Profit' : 'Net Loss'} for this period</Text>
            <Text style={[styles.previewValue, { color: preview.netProfit >= 0 ? colors.success : colors.danger }]}>
              Rs {Math.abs(preview.netProfit).toLocaleString()}
            </Text>
            <Text style={styles.previewMeta}>
              Income Rs {preview.totalIncome.toLocaleString()} · Expense Rs {preview.totalExpense.toLocaleString()}
            </Text>
          </View>
        )}

        <AccountPicker
          label="Transfer Net Profit/Loss To"
          value={equityAccount}
          onChange={setEquityAccount}
          filterType="EQUITY"
        />
        {errors.equityAccount && <Text style={styles.errorText}>{errors.equityAccount}</Text>}

        <Input
          label="Memo (optional)"
          placeholder="e.g. Year-end close FY2026"
          value={memo}
          onChangeText={setMemo}
        />

        <Button label="Close Period" onPress={handleSubmit} loading={submitting} style={{ marginTop: 8, marginBottom: 20 }} />

        <Text style={styles.sectionLabel}>History</Text>
        {loadingHistory ? (
          <ActivityIndicator color={colors.primary} />
        ) : history.length === 0 ? (
          <Text style={styles.emptyText}>No periods closed yet.</Text>
        ) : (
          history.map((c) => (
            <View key={c.id} style={styles.historyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyDate}>
                  {new Date(c.periodStart).toLocaleDateString('en-PK')} – {new Date(c.periodEnd).toLocaleDateString('en-PK')}
                </Text>
                <Text style={styles.historyMeta}>→ {c.equityAccount.code} {c.equityAccount.name} · {c.journalEntry.entryNo}</Text>
              </View>
              <Text style={[styles.historyNet, { color: c.netIncome >= 0 ? colors.success : colors.danger }]}>
                {c.netIncome >= 0 ? '+' : ''}Rs {c.netIncome.toLocaleString()}
              </Text>
            </View>
          ))
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

  previewBox: {
    borderRadius: 12, padding: 16, marginBottom: 16,
    borderWidth: 1.5, alignItems: 'center', backgroundColor: colors.card,
  },
  previewLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  previewValue: { fontSize: 22, fontWeight: '800', marginTop: 6 },
  previewMeta:  { fontSize: 12, color: colors.textMuted, marginTop: 6 },

  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  emptyText: { fontSize: 13, color: colors.textMuted },
  historyRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 10, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: colors.border,
  },
  historyDate: { fontSize: 13, fontWeight: '600', color: colors.text },
  historyMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  historyNet:  { fontSize: 13, fontWeight: '700' },
});
