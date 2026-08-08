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
import VariantPicker       from '../../components/VariantPicker';
import ScannerOverlay      from '../../components/ScannerOverlay';
import { BranchPicker }    from '../../components/BranchPicker';
import { CustomerPicker }  from '../../components/CustomerPicker';
import { Product, productsApi } from '../../api/products';
import { salesApi, Guarantor }  from '../../api/sales';
import { Branch }          from '../../api/branches';
import { Customer }        from '../../api/crm';
import { invoicesApi }     from '../../api/invoices';
import { formatCnic, formatPhone, formatDateInput, parseDDMMYYYY } from '../../utils/format';
import { colors }          from '../../theme/colors';

const EMPTY_GUARANTOR: Guarantor = { name: '', cnic: '', phone: '' };

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
  const [discount,      setDiscount]      = useState('');
  const [customerName,  setCustomerName]  = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [imei,          setImei]          = useState('');
  const [branch,        setBranch]        = useState<Branch | null>(null);
  const [loading,       setLoading]       = useState(false);
  const [errors,        setErrors]        = useState<Record<string, string>>({});

  // Installment sale fields
  const [paymentType,        setPaymentType]        = useState<'Cash' | 'Installment'>('Cash');
  const [customerCnic,       setCustomerCnic]       = useState('');
  const [installmentDueDate, setInstallmentDueDate] = useState('');
  const [guarantors,         setGuarantors]         = useState<Guarantor[]>([
    { ...EMPTY_GUARANTOR }, { ...EMPTY_GUARANTOR }, { ...EMPTY_GUARANTOR },
  ]);

  function updateGuarantor(index: number, field: keyof Guarantor, value: string) {
    setGuarantors((prev) => prev.map((g, i) => (i === index ? { ...g, [field]: value } : g)));
  }

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
  const qty      = Number(quantity)  || 0;
  const price    = Number(salePrice) || 0;
  const discAmt  = Number(discount)  || 0;
  const cost     = product ? product.purchasePrice * qty : 0;
  const subtotal = price * qty;
  const revenue  = subtotal - discAmt;
  const profit   = revenue - cost;

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
    if (discount && (isNaN(discAmt) || discAmt < 0))
      e.discount = 'Enter a valid discount amount';
    else if (discAmt > price * qty)
      e.discount = 'Discount cannot exceed the sale total';

    if (!customerName.trim())  e.customerName  = 'Customer name is required';
    if (!customerPhone.trim()) e.customerPhone = 'Customer phone is required';
    else if (customerPhone.length !== 11) e.customerPhone = 'Phone must be 11 digits';

    if (paymentType === 'Installment') {
      if (!customerCnic.trim()) e.customerCnic = 'Customer CNIC is required';
      else if (customerCnic.replace(/\D/g, '').length !== 13)
        e.customerCnic = 'CNIC must be 13 digits (XXXXX-XXXXXXX-X)';

      if (!installmentDueDate.trim()) e.installmentDueDate = 'Due date is required';
      else if (!parseDDMMYYYY(installmentDueDate)) e.installmentDueDate = 'Enter a valid date (DD/MM/YYYY)';

      guarantors.forEach((g, i) => {
        if (!g.cnic.trim()) e[`guarantor${i}Cnic`] = 'Guarantor CNIC is required';
        else if (g.cnic.replace(/\D/g, '').length !== 13) e[`guarantor${i}Cnic`] = 'CNIC must be 13 digits';

        if (!g.phone.trim()) e[`guarantor${i}Phone`] = 'Guarantor phone is required';
        else if (g.phone.length !== 11) e[`guarantor${i}Phone`] = 'Phone must be 11 digits';
      });
    }

    setErrors(e);
    console.log('[DEBUG] validate() paymentType =', paymentType, 'errors =', e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    console.log('[DEBUG] Record Sale tapped. paymentType state =', paymentType);
    if (!validate()) {
      return;
    }
    setLoading(true);
    try {
      const isInstallment = paymentType === 'Installment';
      const dueDate = isInstallment ? parseDDMMYYYY(installmentDueDate) : null;
      console.log('[DEBUG] Submitting sale. isInstallment =', isInstallment, 'dueDate =', dueDate);

      const sale = await salesApi.create({
        productId:     product!.id,
        quantity:      qty,
        salePrice:     price,
        discount:      discAmt || undefined,
        customerName:  customerName  || undefined,
        customerPhone: customerPhone || undefined,
        customerCnic:  isInstallment ? customerCnic : undefined,
        imei:          imei          || undefined,
        secondhandId:  secondhandId  || undefined,
        paymentType:   isInstallment ? 'INSTALLMENT' : 'CASH',
        installmentDueDate: dueDate ? dueDate.toISOString() : undefined,
        guarantors:    isInstallment ? guarantors : undefined,
        branchId:      branch?.id || undefined,
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
      Alert.alert(
        'Sale Failed',
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
        <Input
          label="Discount (Rs, optional)"
          placeholder="Flat amount off the total"
          value={discount}
          onChangeText={setDiscount}
          keyboardType="numeric"
          error={errors.discount}
        />

        <BranchPicker value={branch} onChange={setBranch} />

        {/* Live transaction summary */}
        {product && qty > 0 && price > 0 && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Transaction Summary</Text>
            <SummaryRow label="Product"       value={product.name} />
            <SummaryRow label="Quantity"      value={String(qty)} />
            <SummaryRow label="Price/unit"    value={`Rs ${price.toLocaleString()}`} />
            <SummaryRow label="Subtotal"      value={`Rs ${subtotal.toLocaleString()}`} />
            {discAmt > 0 && (
              <SummaryRow label="Discount" value={`- Rs ${discAmt.toLocaleString()}`} />
            )}
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

        <Text style={styles.sectionLabel}>Payment</Text>
        <VariantPicker
          label="Payment Type *"
          value={paymentType}
          onChange={(v) => {
            const next = v === 'Installment' ? 'Installment' : 'Cash';
            console.log('[DEBUG] Payment Type picker changed:', { tapped: v, next });
            setPaymentType(next);
          }}
          options={['Cash', 'Installment']}
          placeholder="Select payment type"
          required
        />

        <Text style={styles.sectionLabel}>Customer Info</Text>
        <CustomerPicker
          onChange={(c: Customer) => {
            setCustomerName(c.name);
            setCustomerPhone(c.phone);
            setErrors((prev) => ({ ...prev, customerName: '', customerPhone: '' }));
          }}
        />
        <Input
          label="Customer Name *"
          placeholder="e.g. Ahmed Khan"
          value={customerName}
          onChangeText={setCustomerName}
          error={errors.customerName}
        />
        <Input
          label="Customer Phone *"
          placeholder="e.g. 03001234567"
          value={customerPhone}
          onChangeText={(v) => setCustomerPhone(formatPhone(v))}
          keyboardType="phone-pad"
          maxLength={11}
          error={errors.customerPhone}
          autoComplete="off"
          importantForAutofill="no"
          textContentType="none"
        />
        <Input
          label="IMEI of sold unit (optional)"
          placeholder="15-digit IMEI"
          value={imei}
          onChangeText={setImei}
          keyboardType="numeric"
          maxLength={15}
          autoComplete="off"
          importantForAutofill="no"
          textContentType="none"
        />

        {paymentType === 'Installment' && (
          <>
            <Input
              label="Customer CNIC *"
              placeholder="35202-1234567-1"
              value={customerCnic}
              onChangeText={(v) => setCustomerCnic(formatCnic(v))}
              keyboardType="numeric"
              maxLength={15}
              error={errors.customerCnic}
              autoComplete="off"
              importantForAutofill="no"
              textContentType="none"
            />
            <Input
              label="Installment Due Date *"
              placeholder="DD/MM/YYYY"
              value={installmentDueDate}
              onChangeText={(v) => setInstallmentDueDate(formatDateInput(v))}
              keyboardType="numeric"
              maxLength={10}
              error={errors.installmentDueDate}
            />

            <Text style={styles.sectionLabel}>Guarantors (3 required)</Text>
            {guarantors.map((g, i) => (
              <View key={i} style={styles.guarantorBox}>
                <Text style={styles.guarantorTitle}>Guarantor {i + 1}</Text>
                <Input
                  label="Name (optional)"
                  placeholder="e.g. Bilal Ahmed"
                  value={g.name}
                  onChangeText={(v) => updateGuarantor(i, 'name', v)}
                />
                <Input
                  label="CNIC *"
                  placeholder="35202-1234567-1"
                  value={g.cnic}
                  onChangeText={(v) => updateGuarantor(i, 'cnic', formatCnic(v))}
                  keyboardType="numeric"
                  maxLength={15}
                  error={errors[`guarantor${i}Cnic`]}
                  autoComplete="off"
                  importantForAutofill="no"
                  textContentType="none"
                />
                <Input
                  label="Phone *"
                  placeholder="03001234567"
                  value={g.phone}
                  onChangeText={(v) => updateGuarantor(i, 'phone', formatPhone(v))}
                  keyboardType="phone-pad"
                  maxLength={11}
                  error={errors[`guarantor${i}Phone`]}
                  autoComplete="off"
                  importantForAutofill="no"
                  textContentType="none"
                />
              </View>
            ))}
          </>
        )}

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
  guarantorBox: {
    backgroundColor: colors.card,
    borderRadius:    12,
    padding:         12,
    marginBottom:    12,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  guarantorTitle: {
    fontSize:     13,
    fontWeight:   '700',
    color:        colors.text,
    marginBottom: 8,
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