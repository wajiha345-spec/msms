import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Input }         from '../../components/Inputs';
import { Button }        from '../../components/Buttons';
import { ProductPicker } from '../../components/ProductPicker';
import VariantPicker     from '../../components/VariantPicker';
import { BranchPicker }  from '../../components/BranchPicker';
import { SupplierPicker } from '../../components/SupplierPicker';
import { PaymentMethodPicker } from '../../components/PaymentMethodPicker';
import ScannerOverlay     from '../../components/ScannerOverlay';
import { Product, productsApi } from '../../api/products';
import { purchasesApi, SupplierContact }  from '../../api/purchases';
import { Branch }        from '../../api/branches';
import { PaymentFields } from '../../api/payment';
import { formatPhone, formatDateInput, parseDDMMYYYY, extractImei } from '../../utils/format';
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
  const [imei,          setImei]          = useState('');
  const [barcode,       setBarcode]       = useState('');

  // ── Scanner ────────────────────────────────────────────────────────────────
  const [scannerOpen,   setScannerOpen]   = useState(false);
  const [scanLoading,   setScanLoading]   = useState(false);

  // ── Shared fields ──────────────────────────────────────────────────────────
  const [quantity,      setQuantity]      = useState('1');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [supplierName,  setSupplierName]  = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [paymentType,   setPaymentType]   = useState<'Cash' | 'Credit'>('Cash');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [branch,        setBranch]        = useState<Branch | null>(null);
  const [loading,       setLoading]       = useState(false);
  const [errors,        setErrors]        = useState<Record<string, string>>({});
  const [payment,       setPayment]       = useState<PaymentFields>({});

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
    setImei('');
    setBarcode('');
  }

  function clearManual() {
    setManualMode(false);
    setManualName('');
    setManualBrand('');
    setManualSalePrice('');
    setPurchasePrice('');
    setImei('');
    setBarcode('');
  }

  // ── Scanner handler ────────────────────────────────────────────────────────
  // Mirrors NewSaleScreen's handleScanCode: try the raw decoded text against
  // inventory first, retry with just the digits if a 15-digit IMEI run was
  // embedded in decode noise, then either auto-select the matching existing
  // product or — if this code isn't in inventory yet — drop into manual
  // entry with whatever was captured prefilled, since a purchase is often
  // how a brand-new unit's IMEI first enters the system.
  async function handleScanCode(code: string) {
    setScannerOpen(false);
    setScanLoading(true);
    const imeiMatch = extractImei(code);
    try {
      let res;
      try {
        res = await productsApi.scan(code);
      } catch (e: any) {
        if (e?.response?.status === 404 && imeiMatch && imeiMatch !== code.trim()) {
          res = await productsApi.scan(imeiMatch);
        } else {
          throw e;
        }
      }
      const p = res.data.data;
      handleProductChange(p);
      Alert.alert(
        '✓ Product Found',
        `${p.name} (${p.brand}) selected for this purchase.` +
          (imeiMatch ? `\n\nIMEI captured: ${imeiMatch}` : ''),
        [{ text: 'OK' }]
      );
    } catch (e: any) {
      if (e?.response?.status === 404) {
        // Not in inventory yet — switch to manual entry and prefill
        // whatever we captured, so the user only has to fill in the rest.
        handleManualEntry('');
        if (imeiMatch) {
          setImei(imeiMatch);
          Alert.alert(
            'New IMEI Scanned',
            `IMEI captured: ${imeiMatch}\n\nThis isn't in inventory yet — fill in the product details below to add it.`,
          );
        } else {
          setBarcode(code);
          Alert.alert(
            'New Barcode Scanned',
            `Scanned "${code}" — this isn't in inventory yet. Fill in the product details below, or scan the IMEI barcode instead if this is a phone.`,
          );
        }
      } else {
        Alert.alert('Scan Error', e?.response?.data?.error ?? e?.message ?? 'Lookup failed');
      }
    } finally {
      setScanLoading(false);
    }
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

    if (!supplierName.trim())  e.supplierName  = 'Supplier name is required';
    if (!supplierPhone.trim()) e.supplierPhone = 'Supplier phone is required';
    else if (supplierPhone.length !== 11) e.supplierPhone = 'Phone must be 11 digits';

    if (paymentType === 'Credit') {
      if (!paymentDueDate.trim())            e.paymentDueDate = 'Due date is required';
      else if (!parseDDMMYYYY(paymentDueDate)) e.paymentDueDate = 'Enter a valid date (DD/MM/YYYY)';
    } else {
      if (!payment.paymentMethod) e.paymentMethod = 'Select how the payment was made';
      else if (payment.paymentMethod !== 'CASH' && !payment.accountId) e.paymentMethod = 'Select an account';
      else if (payment.paymentMethod === 'SPLIT') {
        const sum = (payment.cashAmount ?? 0) + (payment.accountAmount ?? 0);
        if (Math.abs(sum - total) > 0.01) e.paymentMethod = 'Split amounts must add up to the total';
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      let productId = product?.id;
      let productName = product?.name;

      // Manual mode — create the product first (with zero stock), then
      // record the purchase like any other product so it shows up in the
      // Purchases list and the backend adds the stock via that transaction.
      if (manualMode) {
        const res = await productsApi.create({
          name:          manualName.trim(),
          brand:         manualBrand.trim() || 'Unknown',
          category:      'phone',
          condition:     'new',
          imei:          imei.trim()    || undefined,
          barcode:       barcode.trim() || undefined,
          purchasePrice: price,
          salePrice:     Number(manualSalePrice),
          stock:         0,
        });
        productId = res.data.data.id;
        productName = manualName.trim();
      }

      const isCredit = paymentType === 'Credit';
      const dueDate  = isCredit ? parseDDMMYYYY(paymentDueDate) : null;

      // Record purchase (backend adds stock)
      await purchasesApi.create({
        productId:     productId!,
        quantity:      qty,
        purchasePrice: price,
        supplierName:  supplierName  || undefined,
        supplierPhone: supplierPhone || undefined,
        paymentType:    isCredit ? 'CREDIT' : 'CASH',
        paymentDueDate: dueDate ? dueDate.toISOString() : undefined,
        branchId:       branch?.id || undefined,
        ...(isCredit ? {} : payment),
      });

      Alert.alert(
        'Stock Added ✓',
        `${qty} unit(s) of ${productName} added to inventory.`,
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

      {/* Scanner modal */}
      <ScannerOverlay
        visible={scannerOpen}
        onScanned={handleScanCode}
        onClose={() => setScannerOpen(false)}
        title="Scan Barcode to Find Product"
        hint="Point at barcode — tap ⌨️ Type for IMEI"
      />

      <ScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >

        {/* ── Scan banner ── */}
        <TouchableOpacity
          style={styles.scanBanner}
          onPress={() => setScannerOpen(true)}
          disabled={scanLoading}
          activeOpacity={0.8}
        >
          {scanLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.scanBannerIcon}>📷</Text>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.scanBannerTitle}>
              {scanLoading ? 'Looking up product…' : 'Scan barcode or type IMEI'}
            </Text>
            <Text style={styles.scanBannerSub}>
              {scanLoading ? 'Please wait…' : 'Camera reads barcodes — use ⌨️ Type for IMEI'}
            </Text>
          </View>
          {!scanLoading && <Text style={styles.scanBannerArrow}>›</Text>}
        </TouchableOpacity>

        {/* ── OR divider ── */}
        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>or pick manually</Text>
          <View style={styles.orLine} />
        </View>

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
            <Input
              label="IMEI (optional)"
              placeholder="15-digit number on the phone itself"
              value={imei}
              onChangeText={setImei}
              keyboardType="numeric"
              maxLength={15}
              autoComplete="off"
              importantForAutofill="no"
              textContentType="none"
            />
            <Input
              label="Box Barcode (optional)"
              placeholder="EAN-13 on the product box"
              value={barcode}
              onChangeText={setBarcode}
              autoCapitalize="none"
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

        <VariantPicker
          label="Payment Type *"
          value={paymentType}
          onChange={(v) => setPaymentType(v === 'Credit' ? 'Credit' : 'Cash')}
          options={['Cash', 'Credit']}
          placeholder="Select payment type"
          required
        />
        {paymentType === 'Credit' && (
          <Input
            label="Payment Due Date *"
            placeholder="DD/MM/YYYY"
            value={paymentDueDate}
            onChangeText={(v) => setPaymentDueDate(formatDateInput(v))}
            keyboardType="numeric"
            maxLength={10}
            error={errors.paymentDueDate}
          />
        )}
        {paymentType === 'Cash' && (
          <>
            <PaymentMethodPicker total={total} value={payment} onChange={setPayment} />
            {errors.paymentMethod && <Text style={styles.errorText}>{errors.paymentMethod}</Text>}
          </>
        )}

        <BranchPicker value={branch} onChange={setBranch} />

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
        <Text style={styles.sectionLabel}>Supplier Info</Text>
        <SupplierPicker
          onChange={(s: SupplierContact) => {
            setSupplierName(s.supplierName || '');
            setSupplierPhone(s.supplierPhone);
            setErrors((prev) => ({ ...prev, supplierName: '', supplierPhone: '' }));
          }}
        />
        <Input
          label="Supplier Name *"
          placeholder="e.g. Malik Traders"
          value={supplierName}
          onChangeText={setSupplierName}
          error={errors.supplierName}
        />
        <Input
          label="Supplier Phone *"
          placeholder="e.g. 03001234567"
          value={supplierPhone}
          onChangeText={(v: string) => setSupplierPhone(formatPhone(v))}
          keyboardType="phone-pad"
          maxLength={11}
          error={errors.supplierPhone}
          autoComplete="off"
          importantForAutofill="no"
          textContentType="none"
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

  scanBanner: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             12,
    backgroundColor: colors.primary,
    borderRadius:    14,
    padding:         16,
    marginBottom:    12,
  },
  scanBannerIcon:  { fontSize: 28 },
  scanBannerTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  scanBannerSub:   { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  scanBannerArrow: { color: '#fff', fontSize: 22, fontWeight: '300' },

  orRow: {
    flexDirection:  'row',
    alignItems:     'center',
    marginBottom:   12,
    gap:            8,
  },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
});
