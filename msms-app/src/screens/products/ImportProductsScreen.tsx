import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { productsApi } from '../../api/products';
import { parseCSV, CsvRow } from '../../utils/csvParser';
import { colors } from '../../theme/colors';

const TEMPLATE = `name,brand,category,barcode,purchasePrice,salePrice,stock
Vivo Y05,Vivo,phone,6935117800123,18000,22000,5
Vivo Y19s,Vivo,phone,6935117801456,25000,30000,3
Samsung Galaxy A15,Samsung,phone,8806095076123,32000,38000,10`;

type Step = 'paste' | 'preview' | 'done';

export default function ImportProductsScreen() {
  const navigation = useNavigation<any>();
  const [step,       setStep]       = useState<Step>('paste');
  const [csvText,    setCsvText]    = useState('');
  const [rows,       setRows]       = useState<CsvRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importing,  setImporting]  = useState(false);
  const [result,     setResult]     = useState<{ created: number; errors: any[] } | null>(null);

  function handlePreview() {
    if (!csvText.trim()) {
      Alert.alert('Empty', 'Paste your CSV data first.');
      return;
    }
    const { rows: parsed, errors } = parseCSV(csvText);
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
        name:          r.name,
        brand:         r.brand,
        category:      r.category  || 'phone',
        condition:     (r.condition === 'used' ? 'used' : 'new') as 'new' | 'used',
        barcode:       r.barcode   || undefined,
        imei:          r.imei      || undefined,
        purchasePrice: Number(r.purchasePrice),
        salePrice:     Number(r.salePrice),
        stock:         Number(r.stock || 0),
      }));

      const res = await productsApi.import(payload);
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Import Products</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* ── Step 1: Paste ── */}
      {step === 'paste' && (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>📋 How to import</Text>
            <Text style={styles.infoText}>
              1. Open Excel or Google Sheets{'\n'}
              2. Add columns: <Text style={styles.mono}>name, brand, category, barcode, purchasePrice, salePrice, stock</Text>{'\n'}
              3. Fill in your products{'\n'}
              4. Copy all rows (including header){'\n'}
              5. Paste below and tap Preview
            </Text>
          </View>

          {/* Template */}
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
            placeholder="name,brand,category,barcode,purchasePrice,salePrice,stock&#10;Vivo Y05,Vivo,phone,6935117800123,18000,22000,5"
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
              {rows.length} product{rows.length !== 1 ? 's' : ''} ready to import
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
                <Text style={[styles.col, styles.colName]}>Name</Text>
                <Text style={[styles.col, styles.colBrand]}>Brand</Text>
                <Text style={[styles.col, styles.colPrice]}>Sale Rs</Text>
                <Text style={[styles.col, styles.colStock]}>Stock</Text>
              </View>
            }
            renderItem={({ item, index }) => (
              <View style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
                <Text style={[styles.col, styles.colName]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.col, styles.colBrand]} numberOfLines={1}>{item.brand}</Text>
                <Text style={[styles.col, styles.colPrice]}>{item.salePrice}</Text>
                <Text style={[styles.col, styles.colStock]}>{item.stock || '0'}</Text>
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
                : <Text style={styles.primaryBtnTxt}>Import {rows.length} Products</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Step 3: Done ── */}
      {step === 'done' && result && (
        <View style={styles.doneBox}>
          <Text style={styles.doneIcon}>✅</Text>
          <Text style={styles.doneTitle}>{result.created} products imported!</Text>

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
            All imported products with barcodes were also added to the shared catalog — future scans of those barcodes will auto-fill instantly.
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
    borderWidth: 1, borderColor: '#bfdbfe', marginBottom: 16,
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#1e40af', marginBottom: 6 },
  infoText:  { fontSize: 13, color: '#1e40af', lineHeight: 20 },
  mono:      { fontFamily: 'monospace', fontSize: 12 },

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
  colName:     { flex: 3, paddingRight: 6 },
  colBrand:    { flex: 2, paddingRight: 6 },
  colPrice:    { flex: 2, textAlign: 'right', paddingRight: 6 },
  colStock:    { width: 44, textAlign: 'right' },

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
