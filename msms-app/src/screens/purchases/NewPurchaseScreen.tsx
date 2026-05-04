import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Input }         from '../../components/Inputs';
import { Button }        from '../../components/Buttons';
import { ProductPicker } from '../../components/ProductPicker';
import { Product, productsApi } from '../../api/products';
import { purchasesApi }  from '../../api/purchases';
import { colors }        from '../../theme/colors';

export default function NewPurchaseScreen() {
  const navigation = useNavigation<any>();

  // ── Picker mode (existing product) ────────────────────────────────────────
  const [product,       setProduct]       = useState<Product | null>(null);

  // ── Manual mode (product not in system) ───────────────────────────────────
  const [manualMode,    setManualMode]    = useState(false);
  const [manualName,    setManualName]    = useState('');
  const [manualBrand,   setManualBrand]   = useState('');
  const [manualSalePrice, setManualSalePrice] = useState('');

  // ── Shared fields ──────────────────────────────────────────────────────────
  const [quantity,      setQuantity]      = useState('1');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [supplierName,  setSupplierName]  = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [loading,       setLoading]       = useState(false);
  const [errors,        setErrors]        = useState<Record<string, string>>({});

  // Auto-fill purchase price when picking existing product
  function handleProductChange(p: Product) {
    setProduct(p);
    setManualMode(false);
    setPurchasePrice(String(p.purchasePrice));
  }

  // Switch to manual entry mode
  function handleManualEntry(prefill: string) {
    setManualMode(true);
    setProduct(null);
    setManualName(prefill);
    setPurchasePrice('');
  }

  function clearManual() {
    setManualMode(false);
    setManualName('');
    setManualBrand('');
    setManualSalePrice('');
    setPurchasePrice('');
  }

  const qty   = Number(quantity)      || 0;
  const price = Number(purchasePrice) || 0;
  const total = qty * price;

  const displayProduct = manualMode
    ? { name: manualName || 'New product', brand: manualBrand, stock: 0, salePrice: Number(manualSalePrice) || 0 }
    : product;

  function validate() {
    const e: Record<string, string> = {};

    if (manualMode) {
      if (!manualName.trim())  e.manualName  = 'Product name is required';
      if (!manualSalePrice || Number(manualSalePrice) <= 0)
        e.manualSalePrice = 'Sale price is required';
    } else {
      if (!product) e.product = 'Please select a product';
    }

    if (!quantity || qty < 1)         e.quantity      = 'Quantity must be at least 1';
    if (!purchasePrice || price <= 0) e.purchasePrice = 'Enter a valid price';

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      let productId = product?.id;

      // Manual mode — create the product first, then record purchase
      if (manualMode) {
        const res = await productsApi.create({
          name:          manualName.trim(),
          brand:         manualBrand.trim() || 'Unknown',
          category:      'phone',
          condition:     'new',
          purchasePrice: price,
          salePrice:     Number(manualSalePrice),
          stock:         qty,
        });
        productId = res.data.data.id;

        // For manual mode the product was created with correct stock already
        Alert.alert(
          'Stock Added ✓',
          `"${manualName}" added to inventory with ${qty} unit(s).`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      // Existing product — record purchase (backend adds stock)
      await purchasesApi.create({
        productId:     productId!,
        quantity:      qty,
        purchasePrice: price,
        supplierName:  supplierName  || undefined,
        supplierPhone: supplierPhone || undefined,
      });

      Alert.alert(
        'Stock Added ✓',
        `${qty} unit(s) of ${product!.name} added to inventory.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      Alert.alert(
        'Error',
        e?.response?.data?.error || 'Something went wrong',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Purchase</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >

        {/* ── Product selection ── */}
        {!manualMode ? (
          <>
            <ProductPicker
              label="Product *"
              value={product}
              onChange={handleProductChange}
              onManualEntry={handleManualEntry}
            />
            {errors.product && <Text style={styles.errorText}>{errors.product}</Text>}
          </>
        ) : (
          /* ── Manual entry card ── */
          <View style={styles.manualCard}>
            <View style={styles.manualCardHeader}>
              <Text style={styles.manualCardTitle}>✏️ Manual Entry</Text>
              <TouchableOpacity onPress={clearManual}>
                <Text style={styles.manualCardSwitch}>← Pick from list</Text>
              </TouchableOpacity>
            </View>

            <Input
              label="Product Name *"
              placeholder="e.g. Vivo Y19s"
              value={manualName}
              onChangeText={setManualName}
              error={errors.manualName}
            />
            <Input
              label="Brand"
              placeholder="e.g. Vivo, Samsung, Oppo"
              value={manualBrand}
              onChangeText={setManualBrand}
            />
            <Input
              label="Sale Price (Rs) *"
              placeholder="Price you'll sell it for"
              value={manualSalePrice}
              onChangeText={setManualSalePrice}
              keyboardType="numeric"
              error={errors.manualSalePrice}
            />
            <Text style={styles.manualNote}>
              This product will be added to your inventory automatically.
            </Text>
          </View>
        )}

        <Input
          label="Quantity *"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          error={errors.quantity}
        />
        <Input
          label="Purchase Price per unit (Rs) *"
          value={purchasePrice}
          onChangeText={setPurchasePrice}
          keyboardType="numeric"
          error={errors.purchasePrice}
        />

        {/* ── Purchase summary ── */}
        {displayProduct && qty > 0 && price > 0 && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Purchase Summary</Text>
            <SummaryRow label="Product"      value={displayProduct.name} />
            {!manualMode && (
              <>
                <SummaryRow label="Current stock" value={String((displayProduct as Product).stock)} />
                <SummaryRow label="Units to add"  value={String(qty)} />
                <SummaryRow
                  label="Stock after"
                  value={String((displayProduct as Product).stock + qty)}
                  highlight
                />
              </>
            )}
            {manualMode && (
              <SummaryRow label="Units"  value={String(qty)} />
            )}
            <View style={styles.summaryDivider} />
            <SummaryRow label="Total Cost" value={`Rs ${total.toLocaleString()}`} bold />
          </View>
        )}

        {/* ── Supplier info ── */}
        <Text style={styles.sectionLabel}>Supplier Info (optional)</Text>
        <Input
          label="Supplier Name"
          placeholder="e.g. Malik Traders"
          value={supplierName}
          onChangeText={setSupplierName}
        />
        <Input
          label="Supplier Phone"
          placeholder="e.g. 03001234567"
          value={supplierPhone}
          onChangeText={setSupplierPhone}
          keyboardType="phone-pad"
        />

        <Button
          label={manualMode ? 'Add to Inventory' : 'Add to Stock'}
          onPress={handleSubmit}
          loading={loading}
          style={{ marginTop: 8 }}
        />
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SummaryRow({ label, value, bold, highlight }: {
  label: string; value: string; bold?: boolean; highlight?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[
        styles.summaryValue,
        bold      && { fontWeight: '700', fontSize: 15 },
        highlight && { color: colors.success, fontWeight: '700' },
      ]}>
        {value}
      </Text>
    </View>
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

  // Manual entry card
  manualCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12, borderWidth: 1, borderColor: '#bae6fd',
    padding: 14, marginBottom: 14,
  },
  manualCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  manualCardTitle:  { fontSize: 14, fontWeight: '700', color: '#0369a1' },
  manualCardSwitch: { fontSize: 13, color: colors.primary, fontWeight: '500' },
  manualNote: {
    fontSize: 12, color: '#0284c7', fontStyle: 'italic', marginTop: 4,
  },

  // Summary
  summaryBox: {
    backgroundColor: colors.card, borderRadius: 12,
    padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  summaryTitle: {
    fontSize: 12, fontWeight: '600', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  summaryRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  summaryLabel:  { fontSize: 13, color: colors.textMuted },
  summaryValue:  { fontSize: 13, color: colors.text },
  summaryDivider: {
    height: 1, backgroundColor: colors.border, marginVertical: 6,
  },

  sectionLabel: {
    fontSize: 12, fontWeight: '600', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 10, marginTop: 4,
  },
});
