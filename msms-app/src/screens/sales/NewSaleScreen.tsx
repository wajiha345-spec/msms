import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Input }           from '../../components/Inputs';
import { Button }          from '../../components/Buttons';
import { ProductPicker }   from '../../components/ProductPicker';
import ScannerOverlay      from '../../components/ScannerOverlay';
import { Product, productsApi } from '../../api/products';
import { salesApi }        from '../../api/sales';
import { invoicesApi }     from '../../api/invoices';
import { colors }          from '../../theme/colors';

export default function NewSaleScreen() {
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  const { preselectedProductId, secondhandId } = (route.params ?? {}) as {
    preselectedProductId?: string;
    secondhandId?: string;
  };

  const [product,       setProduct]       = useState<Product | null>(null);
  const [quantity,      setQuantity]      = useState('1');
  const [salePrice,     setSalePrice]     = useState('');
  const [customerName,  setCustomerName]  = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [imei,          setImei]          = useState('');
  const [loading,       setLoading]       = useState(false);
  const [errors,        setErrors]        = useState<Record<string, string>>({});

  // Scanner state
  const [scannerOpen,   setScannerOpen]   = useState(false);
  const [scanLoading,   setScanLoading]   = useState(false);

  // Track which product ID the scanner auto-filled the IMEI for.
  // When the user picks a *different* product, we clear that stale IMEI so
  // the wrong handset is never recorded on the sale.
  const imeiLinkedToProductId = useRef<string | null>(null);

  // Pre-select product when arriving from Secondhand Detail screen
  useEffect(() => {
    if (preselectedProductId) {
      productsApi.getOne(preselectedProductId)
        .then(res => setProduct(res.data.data))
        .catch(() => {});
    }
  }, [preselectedProductId]);

  // Auto-fill sale price; clear a scanner-set IMEI if the product changed
  useEffect(() => {
    if (product) {
      setSalePrice(String(product.salePrice));
      // If the IMEI in the form was auto-filled for a *different* product, clear it
      if (imeiLinkedToProductId.current && imeiLinkedToProductId.current !== product.id) {
        setImei('');
        imeiLinkedToProductId.current = null;
      }
    } else {
      // Product cleared entirely — drop any scanner-linked IMEI
      if (imeiLinkedToProductId.current) {
        setImei('');
        imeiLinkedToProductId.current = null;
      }
    }
  }, [product]);

  // Live profit calculation
  const qty     = Number(quantity)  || 0;
  const price   = Number(salePrice) || 0;
  const cost    = product ? product.purchasePrice * qty : 0;
  const revenue = price * qty;
  const profit  = revenue - cost;

  // ── Scanner handler ────────────────────────────────────────────────────────
  async function handleScanCode(code: string) {
    setScannerOpen(false);
    setScanLoading(true);
    try {
      const res = await productsApi.scan(code);
      const p = res.data.data;

      if (p.stock <= 0) {
        Alert.alert(
          '⚠️ Out of Stock',
          `"${p.name}" (${p.brand}) was found but has 0 units in stock.`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Auto-select product
      setProduct(p);
      // IMEI detection rule: exactly 15 digits = GSMA IMEI standard.
      // Anything else (EAN-13 = 13 digits, Code-128 = alphanumeric, etc.) is a barcode.
      // The barcode identifies the *model* in inventory; the IMEI identifies *this unit*.
      if (/^\d{15}$/.test(code)) {
        setImei(code);
        imeiLinkedToProductId.current = p.id;  // link so we can clear on product change
      }
      Alert.alert(
        '✓ Product Found',
        `${p.name} (${p.brand})\nStock: ${p.stock} units\nSale Price: Rs ${p.salePrice.toLocaleString()}`,
        [{ text: 'OK' }]
      );
    } catch (e: any) {
      if (e?.response?.status === 404) {
        Alert.alert(
          '❌ Product Not Found',
          'No product with this IMEI/barcode exists in inventory.\n\nAdd it first via the Products tab.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Scan Error', e?.response?.data?.error ?? e?.message ?? 'Lookup failed');
      }
    } finally {
      setScanLoading(false);
    }
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!product)              e.product  = 'Please select a product';
    if (!quantity || qty < 1)  e.quantity = 'Quantity must be at least 1';
    if (!salePrice || price <= 0) e.salePrice = 'Enter a valid sale price';
    if (product && qty > product.stock)
      e.quantity = `Only ${product.stock} in stock`;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      const sale = await salesApi.create({
        productId:     product!.id,
        quantity:      qty,
        salePrice:     price,
        customerName:  customerName  || undefined,
        customerPhone: customerPhone || undefined,
        imei:          imei          || undefined,
        secondhandId:  secondhandId  || undefined,
      });

      const invoiceUrl = invoicesApi.getUrl(sale.data.data.id);

      Alert.alert(
        'Sale Recorded ✓',
        `Invoice: ${sale.data.data.invoiceNo}\nTotal: Rs ${sale.data.data.totalAmount.toLocaleString()}`,
        [
          {
            text: 'View Invoice',
            onPress: async () => {
              // Opens as in-app browser overlay — app stays in foreground, no reload
              await WebBrowser.openBrowserAsync(invoiceUrl);
              navigation.goBack();
            },
          },
          { text: 'Close', onPress: () => navigation.goBack() },
        ]
      );
    } catch (e: any) {
      Alert.alert('Sale Failed', e?.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Sale</Text>
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

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">

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

        <ProductPicker
          label="Product *"
          value={product}
          onChange={setProduct}
        />
        {errors.product && <Text style={styles.errorText}>{errors.product}</Text>}

        <Input
          label="Quantity *"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          error={errors.quantity}
        />
        <Input
          label="Sale Price per unit (Rs) *"
          value={salePrice}
          onChangeText={setSalePrice}
          keyboardType="numeric"
          error={errors.salePrice}
        />

        {/* Live transaction summary */}
        {product && qty > 0 && price > 0 && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Transaction Summary</Text>
            <SummaryRow label="Product"       value={product.name} />
            <SummaryRow label="Quantity"      value={String(qty)} />
            <SummaryRow label="Price/unit"    value={`Rs ${price.toLocaleString()}`} />
            <SummaryRow label="Total Revenue" value={`Rs ${revenue.toLocaleString()}`} bold />
            <SummaryRow label="Total Cost"    value={`Rs ${cost.toLocaleString()}`} />
            <View style={styles.divider} />
            <View style={styles.profitRow}>
              <Text style={styles.profitLabel}>Profit</Text>
              <Text style={[
                styles.profitValue,
                profit >= 0 ? { color: colors.success } : { color: colors.danger }
              ]}>
                Rs {profit.toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionLabel}>Customer Info (optional)</Text>
        <Input
          label="Customer Name"
          placeholder="e.g. Ahmed Khan"
          value={customerName}
          onChangeText={setCustomerName}
        />
        <Input
          label="Customer Phone"
          placeholder="e.g. 03001234567"
          value={customerPhone}
          onChangeText={setCustomerPhone}
          keyboardType="phone-pad"
        />
        <Input
          label="IMEI of sold unit (optional)"
          placeholder="15-digit IMEI"
          value={imei}
          onChangeText={setImei}
          keyboardType="numeric"
          maxLength={15}
        />

        <Button
          label="Record Sale"
          onPress={handleSubmit}
          loading={loading}
          style={{ marginTop: 8 }}
        />
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SummaryRow({ label, value, bold }: {
  label: string; value: string; bold?: boolean;
}) {
  return (
    <View style={sumStyles.row}>
      <Text style={sumStyles.label}>{label}</Text>
      <Text style={[sumStyles.value, bold && sumStyles.bold]}>{value}</Text>
    </View>
  );
}
const sumStyles = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  label: { fontSize: 13, color: colors.textMuted },
  value: { fontSize: 13, color: colors.text },
  bold:  { fontWeight: '700' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: 16,
    paddingTop:        54,
    paddingBottom:     14,
    backgroundColor:   colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn:      { color: colors.primary, fontSize: 15, fontWeight: '500', width: 60 },
  title:        { fontSize: 17, fontWeight: '700', color: colors.text },
  form:         { padding: 16 },
  errorText:    { color: colors.danger, fontSize: 12, marginTop: -10, marginBottom: 10 },
  summaryBox: {
    backgroundColor: colors.card,
    borderRadius:    12,
    padding:         14,
    marginBottom:    14,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  summaryTitle: {
    fontSize:      13,
    fontWeight:    '600',
    color:         colors.textMuted,
    marginBottom:  10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider:     { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  profitRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profitLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  profitValue: { fontSize: 18, fontWeight: '700' },
  sectionLabel: {
    fontSize:      12,
    fontWeight:    '600',
    color:         colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom:  10,
    marginTop:     4,
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