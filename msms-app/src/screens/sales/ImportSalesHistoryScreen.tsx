import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { salesApi } from '../../api/sales';
import { parseSalesHistoryCSV, SalesHistoryCsvRow } from '../../utils/salesHistoryCsvParser';
import { parseDDMMYYYY } from '../../utils/format';
import { colors } from '../../theme/colors';

const TEMPLATE = `date,productName,brand,quantity,salePrice,purchasePrice,customerName,customerPhone,customerCnic,paymentType,dueDate,paid
15/01/2026,Vivo Y05,Vivo,1,22000,18000,Ali Raza,03001234567,,Cash,,
20/02/2026,Samsung Galaxy A15,Samsung,1,38000,32000,Bilal Khan,03211234567,3520112345671,Installment,20/05/2026,no`;

type Step = 'paste' | 'preview' | 'done';

export default function ImportSalesHistoryScreen() {
  const navigation = useNavigation<any>();
  const [step,        setStep]        = useState<Step>('paste');
  const [csvText,     setCsvText]     = useState('');
  const [rows,        setRows]        = useState<SalesHistoryCsvRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importing,   setImporting]   = useState(false);
  const [result,      setResult]      = useState<{ created: number; errors: any[] } | null>(null);

  function handlePreview() {
    if (!csvText.trim()) {
      Alert.alert('Empty', 'Paste your CSV data first.');
      return;
    }
    const { rows: parsed, errors } = parseSalesHistoryCSV(csvText);
    setRows(parsed);
    setParseErrors(errors);
    if (parsed.length === 0 && errors.length > 0) {
      Alert.alert('CSV Error', errors[0]);
      return;
    }
    setStep('preview');
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setImporting(true);
    try {
      const payload = rows.map(r => ({
        date:          (parseDDMMYYYY(r.date) as Date).toISOString(),
        productName:   r.productName,
        brand:         r.brand || undefined,
        quantity:      Number(r.quantity || 1),
        salePrice:     Number(r.salePrice),
        purchasePrice: r.purchasePrice ? Number(r.purchasePrice) : undefined,
        customerName:  r.customerName  || undefined,
        customerPhone: r.customerPhone || undefined,
        customerCnic:  r.customerCnic  || undefined,
        paymentType:   r.paymentType as 'CASH' | 'INSTALLMENT',
        installmentDueDate: r.paymentType === 'INSTALLMENT' ? (parseDDMMYYYY(r.dueDate) as Date).toISOString() : undefined,
        installmentPaid:    ['yes', 'true', '1'].includes(r.paid.toLowerCase()),
      }));

      const res = await salesApi.importHistory(payload);
      setResult(res.data.data);
      setStep('done');
    } catch (e: any) {
      Alert.alert('Import Failed', e?.response?.data?.error || 'Something went wrong');
    } finally {
      setImporting(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('MoreTab', { screen: 'MoreMenu' })}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Import Sales History</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* ── Step 1: Paste ── */}
      {step === 'paste' && (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>📋 How to import</Text>
            <Text style={styles.infoText}>
              Use this to bring in past sales/customer records from a previous app or spreadsheet.{'\n\n'}
              1. Open Excel or Google Sheets{'\n'}
              2. Add columns: <Text style={styles.mono}>date, productName, brand, quantity, salePrice, purchasePrice, customerName, customerPhone, customerCnic, paymentType, dueDate, paid</Text>{'\n'}
              3. Dates use DD/MM/YYYY{'\n'}
              4. paymentType is "Cash" or "Installment" (dueDate required for Installment){'\n'}
              5. Copy all rows (including header), paste below and tap Preview
            </Text>
          </View>

          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              Note: imported sales do not affect current stock counts — they're historical records only.
              If a product name doesn't match anything in your inventory yet, it will be added automatically with 0 stock.
            </Text>
          </View>

          <Text style={styles.label}>Template (copy this to get started):</Text>
          <TouchableOpacity
            style={styles.templateBox}
            onPress={() => setCsvText(TEMPLATE)}
            activeOpacity={0.7}
          >
            <Text style={styles.templateText}>{TEMPLATE}</Text>
            <Text style={styles.templateHint}>Tap to load example data</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Paste your CSV here:</Text>
          <TextInput
            style={styles.csvInput}
            multiline
            value={csvText}
            onChangeText={setCsvText}
            placeholder="date,productName,brand,quantity,salePrice,...&#10;15/01/2026,Vivo Y05,Vivo,1,22000,..."
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            autoCapitalize="none"
          />

          <TouchableOpacity style={styles.primaryBtn} onPress={handlePreview}>
            <Text style={styles.primaryBtnTxt}>Preview →</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── Step 2: Preview ── */}
      {step === 'preview' && (
        <View style={styles.flex}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewCount}>
              {rows.length} sale{rows.length !== 1 ? 's' : ''} ready to import
              {parseErrors.length > 0 && `  •  ${parseErrors.length} row${parseErrors.length !== 1 ? 's' : ''} skipped`}
            </Text>
            {parseErrors.length > 0 && (
              <TouchableOpacity onPress={() =>
                Alert.alert('Skipped Rows', parseErrors.join('\n\n'))
              }>
                <Text style={styles.errLink}>View errors</Text>
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={rows}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={{ padding: 12 }}
            ListHeaderComponent={
              <View style={styles.tableHeader}>
                <Text style={[styles.col, styles.colDate]}>Date</Text>
                <Text style={[styles.col, styles.colName]}>Product</Text>
                <Text style={[styles.col, styles.colPrice]}>Sale Rs</Text>
                <Text style={[styles.col, styles.colType]}>Type</Text>
              </View>
            }
            renderItem={({ item, index }) => (
              <View style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
                <Text style={[styles.col, styles.colDate]} numberOfLines={1}>{item.date}</Text>
                <Text style={[styles.col, styles.colName]} numberOfLines={1}>{item.productName}</Text>
                <Text style={[styles.col, styles.colPrice]}>{item.salePrice}</Text>
                <Text style={[styles.col, styles.colType]} numberOfLines={1}>{item.paymentType === 'INSTALLMENT' ? 'Instl.' : 'Cash'}</Text>
              </View>
            )}
          />

          <View style={styles.previewFooter}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep('paste')}>
              <Text style={styles.secondaryBtnTxt}>← Edit CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, styles.importBtn, importing && { opacity: 0.6 }]}
              onPress={handleImport}
              disabled={importing}
            >
              {importing
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnTxt}>Import {rows.length} Sales</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Step 3: Done ── */}
      {step === 'done' && result && (
        <View style={styles.doneBox}>
          <Text style={styles.doneIcon}>✅</Text>
          <Text style={styles.doneTitle}>{result.created} sales imported!</Text>

          {result.errors.length > 0 && (
            <View style={styles.doneErrors}>
              <Text style={styles.doneErrorTitle}>
                {result.errors.length} rows had errors:
              </Text>
              {result.errors.map((e, i) => (
                <Text key={i} style={styles.doneErrorRow}>
                  Row {e.row} ({e.name}): {e.error}
                </Text>
              ))}
            </View>
          )}

          <Text style={styles.doneNote}>
            Unpaid installment sales with a due date today or earlier will now show up as alerts on your dashboard.
          </Text>

          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 24 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.primaryBtnTxt}>Done →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex:      { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 14,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { color: colors.primary, fontSize: 15, fontWeight: '500', width: 60 },
  title:   { fontSize: 17, fontWeight: '700', color: colors.text },
  body:    { padding: 16, paddingBottom: 40 },

  infoBox: {
    backgroundColor: '#eff6ff', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#bfdbfe', marginBottom: 12,
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#1e40af', marginBottom: 6 },
  infoText:  { fontSize: 13, color: '#1e40af', lineHeight: 20 },
  mono:      { fontFamily: 'monospace', fontSize: 12 },

  noteBox: {
    backgroundColor: '#fffbeb', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#fde68a', marginBottom: 16,
  },
  noteText: { fontSize: 12, color: '#92400e', lineHeight: 18 },

  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },

  templateBox: {
    backgroundColor: colors.card, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: colors.border, marginBottom: 16,
  },
  templateText: { fontFamily: 'monospace', fontSize: 11, color: colors.textMuted, lineHeight: 18 },
  templateHint: { fontSize: 11, color: colors.primary, marginTop: 6, fontWeight: '600' },

  csvInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    padding: 14, fontSize: 13, fontFamily: 'monospace',
    color: colors.text, backgroundColor: colors.card,
    minHeight: 200, textAlignVertical: 'top', marginBottom: 16,
  },

  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  primaryBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  importBtn:     { flex: 1, marginLeft: 10 },

  secondaryBtn: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    padding: 16, alignItems: 'center', flex: 0.4,
  },
  secondaryBtnTxt: { color: colors.text, fontSize: 14, fontWeight: '600' },

  previewHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  previewCount: { fontSize: 13, fontWeight: '600', color: colors.text },
  errLink:      { fontSize: 13, color: colors.danger, fontWeight: '600' },

  tableHeader: {
    flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 4,
  },
  tableRow:    { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4 },
  tableRowAlt: { backgroundColor: colors.card, borderRadius: 6 },
  col:         { fontSize: 13, color: colors.text },
  colDate:     { flex: 2, paddingRight: 6 },
  colName:     { flex: 3, paddingRight: 6 },
  colPrice:    { flex: 2, textAlign: 'right', paddingRight: 6 },
  colType:     { width: 50, textAlign: 'right' },

  previewFooter: {
    flexDirection: 'row', padding: 12,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.card,
  },

  doneBox: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  doneIcon:  { fontSize: 64, marginBottom: 16 },
  doneTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 12, textAlign: 'center' },
  doneNote:  { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginTop: 12 },
  doneErrors: {
    backgroundColor: '#fef2f2', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#fecaca', width: '100%', marginTop: 4,
  },
  doneErrorTitle: { fontSize: 13, fontWeight: '700', color: colors.danger, marginBottom: 6 },
  doneErrorRow:   { fontSize: 12, color: colors.danger, marginBottom: 4, lineHeight: 18 },
});
