import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Input }  from '../../components/Inputs';
import { Button } from '../../components/Buttons';
import { ProductPicker } from '../../components/ProductPicker';
import { Product } from '../../api/products';
import { quotationsApi } from '../../api/quotations';
import { formatPhone, formatDateInput, parseDDMMYYYY } from '../../utils/format';
import { colors } from '../../theme/colors';

interface DraftLine {
  key:         string;
  product:     Product | null;
  manualMode:  boolean;
  description: string;
  quantity:    string;
  unitPrice:   string;
}

function newLine(): DraftLine {
  return { key: String(Math.random()), product: null, manualMode: false, description: '', quantity: '1', unitPrice: '' };
}

export default function NewQuotationScreen() {
  const navigation = useNavigation<any>();
  const [customerName,  setCustomerName]  = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [validUntil,    setValidUntil]    = useState('');
  const [notes,         setNotes]         = useState('');
  const [lines,         setLines]         = useState<DraftLine[]>([newLine()]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  }

  function handleProductChange(key: string, product: Product) {
    updateLine(key, { product, manualMode: false, description: product.name, unitPrice: String(product.salePrice) });
  }

  function handleManualEntry(key: string, prefill: string) {
    updateLine(key, { product: null, manualMode: true, description: prefill });
  }

  const total = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);

  async function handleSubmit() {
    setError('');
    if (lines.some((l) => !l.description.trim())) { setError('Every line needs a description or product'); return; }
    if (lines.some((l) => !l.quantity || Number(l.quantity) <= 0)) { setError('Every line needs a valid quantity'); return; }
    if (lines.some((l) => !l.unitPrice || Number(l.unitPrice) <= 0)) { setError('Every line needs a valid price'); return; }

    const validDate = validUntil.trim() ? parseDDMMYYYY(validUntil) : null;
    if (validUntil.trim() && !validDate) { setError('Enter a valid "Valid Until" date (DD/MM/YYYY)'); return; }

    setLoading(true);
    try {
      await quotationsApi.create({
        customerName:  customerName.trim()  || undefined,
        customerPhone: customerPhone.trim() || undefined,
        validUntil:    validDate ? validDate.toISOString() : undefined,
        notes:         notes.trim() || undefined,
        items: lines.map((l) => ({
          productId:   l.product?.id,
          description: l.description.trim(),
          quantity:    Number(l.quantity),
          unitPrice:   Number(l.unitPrice),
        })),
      });
      Alert.alert('Quotation Created ✓', undefined, [{ text: 'OK', onPress: () => navigation.goBack() }]);
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
        <Text style={styles.title}>New Quotation</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>Customer Info (optional)</Text>
        <Input
          label="Customer Name"
          placeholder="e.g. Bilal Ahmed"
          value={customerName}
          onChangeText={setCustomerName}
        />
        <Input
          label="Customer Phone"
          placeholder="03001234567"
          value={customerPhone}
          onChangeText={(v: string) => setCustomerPhone(formatPhone(v))}
          keyboardType="phone-pad"
          maxLength={11}
          autoComplete="off"
          importantForAutofill="no"
          textContentType="none"
        />
        <Input
          label="Valid Until"
          placeholder="DD/MM/YYYY"
          value={validUntil}
          onChangeText={(v) => setValidUntil(formatDateInput(v))}
          keyboardType="numeric"
          maxLength={10}
        />

        <Text style={styles.sectionLabel}>Line Items</Text>
        {lines.map((line, i) => (
          <View key={line.key} style={styles.lineCard}>
            <View style={styles.lineHeader}>
              <Text style={styles.lineIndex}>Line {i + 1}</Text>
              {lines.length > 1 && (
                <TouchableOpacity onPress={() => removeLine(line.key)}>
                  <Text style={styles.removeBtn}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>

            {!line.manualMode ? (
              <ProductPicker
                label="Product"
                value={line.product}
                onChange={(p) => handleProductChange(line.key, p)}
                onManualEntry={(prefill) => handleManualEntry(line.key, prefill)}
              />
            ) : (
              <>
                <Input
                  label="Description *"
                  placeholder="e.g. Screen protector"
                  value={line.description}
                  onChangeText={(v) => updateLine(line.key, { description: v })}
                />
                <TouchableOpacity onPress={() => updateLine(line.key, { manualMode: false, description: '' })}>
                  <Text style={styles.pickFromList}>← Pick from inventory instead</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.amountRow}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Quantity"
                  value={line.quantity}
                  onChangeText={(v) => updateLine(line.key, { quantity: v })}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Unit Price (Rs)"
                  value={line.unitPrice}
                  onChangeText={(v) => updateLine(line.key, { unitPrice: v })}
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
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>Rs {total.toLocaleString()}</Text>
        </View>

        <Input
          label="Notes (optional)"
          placeholder="Terms, delivery info, etc."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          style={{ height: 80, textAlignVertical: 'top' }}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button label="Create Quotation" onPress={handleSubmit} loading={loading} style={{ marginTop: 8 }} />
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
    marginBottom: 10, marginTop: 8,
  },
  lineCard: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: colors.border,
  },
  lineHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  },
  lineIndex: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  removeBtn: { fontSize: 12, color: colors.danger, fontWeight: '600' },
  pickFromList: { fontSize: 12, color: colors.primary, fontWeight: '500', marginTop: -6, marginBottom: 10 },
  amountRow: { flexDirection: 'row', gap: 10 },
  addLineBtn: { alignItems: 'center', paddingVertical: 10, marginBottom: 14 },
  addLineText: { color: colors.primary, fontSize: 14, fontWeight: '600' },

  summaryBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 12,
    padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  summaryLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 18, fontWeight: '800', color: colors.text },

  errorText: { color: colors.danger, fontSize: 12, marginBottom: 10, textAlign: 'center' },
});
