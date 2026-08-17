import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { openUrl } from '../../utils/openUrl';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Input }           from '../../components/Inputs';
import { Button }          from '../../components/Buttons';
import { ProductPicker }   from '../../components/ProductPicker';
import VariantPicker       from '../../components/VariantPicker';
import ScannerOverlay      from '../../components/ScannerOverlay';
import { BranchPicker }    from '../../components/BranchPicker';
import { CustomerPicker }  from '../../components/CustomerPicker';
import { PaymentMethodPicker } from '../../components/PaymentMethodPicker';
import { Product, productsApi } from '../../api/products';
import { salesApi, Guarantor }  from '../../api/sales';
import { Branch }          from '../../api/branches';
import { Customer }        from '../../api/crm';
import { invoicesApi }     from '../../api/invoices';
import { PaymentFields }   from '../../api/payment';
import { formatCnic, formatPhone, parseDDMMYYYY, formatDDMMYYYY, extractImei } from '../../utils/format';
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
  const [payment,       setPayment]       = useState<PaymentFields>({});

  // Installment sale fields
  const [paymentType,        setPaymentType]        = useState<'Cash' | 'Installment'>('Cash');
  const [customerCnic,       setCustomerCnic]       = useState('');
  const [installmentDueDate, setInstallmentDueDate] = useState('');
  const [guarantors,         setGuarantors]         = useState<Guarantor[]>([
    { ...EMPTY_GUARANTOR }, { ...EMPTY_GUARANTOR }, { ...EMPTY_GUARANTOR },
  ]);

  // Installment due date is always exactly one month from today — not
  // something the shop owner picks. Recomputed every time Installment is
  // (re)selected so it's never stale from an earlier visit to this screen.
  useEffect(() => {
    if (paymentType === 'Installment') {
      const due = new Date();
      due.setMonth(due.getMonth() + 1);
      setInstallmentDueDate(formatDDMMYYYY(due));
    }
  }, [paymentType]);

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
      // IMEI detection rule: a 15-digit run (GSMA IMEI standard) found
      // anywhere in the decoded text — not required to be the *entire*
      // string, since some IMEI barcodes decode with a stray leading/
      // trailing character. Anything with no 15-digit run at all is a
      // plain product/box barcode (EAN-13, Code-128, etc.).
      const imeiMatch = extractImei(code);

      // Look up by the raw decoded text first; if that misses and we found
      // an embedded 15-digit run, retry with just the clean digits — covers
      // decode noise around an otherwise-correct IMEI.
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

      if (p.stock <= 0) {
        Alert.alert(
          'Out of Stock',
          `"${p.name}" (${p.brand}) was found but has 0 units in stock.`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Auto-select product
      setProduct(p);
      if (imeiMatch) {
        setImei(imeiMatch);
        imeiLinkedToProductId.current = p.id;  // link so we can clear on product change
      }
      Alert.alert(
        '✓ Product Found',
        `${p.name} (${p.brand})\nStock: ${p.stock} units\nSale Price: Rs ${p.salePrice.toLocaleString()}` +
          (imeiMatch
            ? `\n\nIMEI captured: ${imeiMatch}`
            : `\n\nScanned "${code}" — this looks like a product barcode, not an IMEI. Scan the IMEI barcode too, or type it below, to link this specific unit.`),
        [{ text: 'OK' }]
      );
    } catch (e: any) {
      if (e?.response?.status === 404) {
        Alert.alert(
          'Product Not Found',
          `Scanned "${code}" — no product with this IMEI/barcode exists in inventory.\n\nAdd it first via the Products tab.`,
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

    if (paymentType === 'Cash') {
      if (!payment.paymentMethod) e.paymentMethod = 'Select how the payment was received';
      else if (payment.paymentMethod !== 'CASH' && !payment.accountId) e.paymentMethod = 'Select an account';
      else if (payment.paymentMethod === 'SPLIT') {
        const sum = (payment.cashAmount ?? 0) + (payment.accountAmount ?? 0);
        if (Math.abs(sum - revenue) > 0.01) e.paymentMethod = 'Split amounts must add up to the total';
      }
    }

    if (paymentType === 'Installment') {
      if (!customerCnic.trim()) e.customerCnic = 'Customer CNIC is required';
      else if (customerCnic.replace(/\D/g, '').length !== 13)
        e.customerCnic = 'CNIC must be 13 digits (XXXXX-XXXXXXX-X)';

      if (!installmentDueDate.trim()) e.installmentDueDate = 'Due date is required';
      else if (!parseDDMMYYYY(installmentDueDate)) e.installmentDueDate = 'Enter a valid date (DD/MM/YYYY)';

      guarantors.forEach((g, i) => {
        if (!g.name?.trim()) e[`guarantor${i}Name`] = 'Guarantor name is required';

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
    if (!validate()) {
      return;
    }
    setLoading(true);
    try {
      const isInstallment = paymentType === 'Installment';
      const dueDate = isInstallment ? parseDDMMYYYY(installmentDueDate) : null;

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
        ...(isInstallment ? {} : payment),
      });

      const invoiceUrl = invoicesApi.getUrl(sale.data.data.id);

      // navigation.goBack() is ambiguous here: NewSale is reachable both by
      // drilling down from SalesListScreen (goBack correctly lands there)
      // and via a direct jump from Dashboard's "New Sale" quick action
      // (navigation.navigate('SalesTab', {screen: 'NewSale'})), which can
      // leave goBack() with nothing to pop within the Sales stack and fall
      // through to whatever tab was active before — Dashboard. Navigating
      // to 'SalesList' explicitly always lands on the sales list (where the
      // just-recorded sale shows up), regardless of how this screen was reached.
      Alert.alert(
        'Sale Recorded ✓',
        `Invoice: ${sale.data.data.invoiceNo}\nTotal: Rs ${sale.data.data.totalAmount.toLocaleString()}`,
        [
          {
            text: 'View Invoice',
            onPress: async () => {
              // Opens as in-app browser overlay — app stays in foreground, no reload
              await openUrl(invoiceUrl);
              navigation.navigate('SalesList');
            },
          },
          { text: 'Close', onPress: () => navigation.navigate('SalesList') },
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
        hint="Point at barcode — tap Type for IMEI"
      />

      {Platform.OS === 'web' ? (
        <View style={styles.desktopRow}>
          <ScrollView style={styles.desktopLeftCol} contentContainerStyle={styles.desktopColContent}>
            {renderItemColumn()}
          </ScrollView>
          <ScrollView style={styles.desktopRightCol} contentContainerStyle={styles.desktopColContent}>
            {renderCheckoutColumn()}
          </ScrollView>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          {renderItemColumn()}
          {renderCheckoutColumn()}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );

  // ── Column contents ──────────────────────────────────────────────────────
  // Split into two logical groups — "what's being sold" (product/qty/price/
  // discount/branch/IMEI) and "who's buying + payment" (summary, payment
  // method, customer info, installment/guarantors, submit) — rendered as two
  // side-by-side columns on desktop (Platform.OS === 'web') or stacked in a
  // single scroll view on mobile, exactly as before. No handler, validation,
  // or state logic differs between platforms; only this arrangement does.
  // (This isn't a multi-item cart — the underlying API is one product per
  // sale — so the split follows the screen's actual two concerns instead of
  // inventing a cart UI the data model doesn't support.)

  function renderItemColumn() {
    return (
      <>
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
            <Ionicons name="camera-outline" size={24} color="#fff" style={styles.scanBannerIcon} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.scanBannerTitle}>
              {scanLoading ? 'Looking up product…' : 'Scan barcode or type IMEI'}
            </Text>
            <Text style={styles.scanBannerSub}>
              {scanLoading ? 'Please wait…' : 'Camera reads barcodes — use Type for IMEI'}
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
      </>
    );
  }

  function renderCheckoutColumn() {
    return (
      <>
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
        {paymentType === 'Cash' && (
          <>
            <PaymentMethodPicker total={revenue} value={payment} onChange={setPayment} />
            {errors.paymentMethod && <Text style={styles.errorText}>{errors.paymentMethod}</Text>}
          </>
        )}

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
              label="Installment Due Date (1 month from today)"
              value={installmentDueDate}
              editable={false}
              style={styles.readOnlyInput}
              error={errors.installmentDueDate}
            />

            <Text style={styles.sectionLabel}>Guarantors (3 required)</Text>
            {guarantors.map((g, i) => (
              <View key={i} style={styles.guarantorBox}>
                <Text style={styles.guarantorTitle}>Guarantor {i + 1}</Text>
                <Input
                  label="Name *"
                  placeholder="e.g. Bilal Ahmed"
                  value={g.name}
                  onChangeText={(v) => updateGuarantor(i, 'name', v)}
                  error={errors[`guarantor${i}Name`]}
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
      </>
    );
  }
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
  readOnlyInput: { backgroundColor: colors.background, color: colors.textMuted },
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

  // Desktop split-pane layout only (Platform.OS === 'web') — mobile keeps
  // the single scrolling form above untouched. Left column: what's being
  // sold (product/qty/price/branch/IMEI). Right column: who's buying, how
  // they're paying, and the submit action.
  desktopRow: { flex: 1, flexDirection: 'row' },
  desktopLeftCol: {
    flex: 1,
    maxWidth: 480,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  desktopRightCol: { flex: 1.2 },
  desktopColContent: { padding: 24, paddingBottom: 60 },
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
  scanBannerIcon:  {},
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