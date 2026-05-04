import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, Switch, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Input }          from '../../components/Inputs';
import { Button }         from '../../components/Buttons';
import ScannerOverlay     from '../../components/ScannerOverlay';
import VariantPicker      from '../../components/VariantPicker';
import { productsApi, CreateProductPayload } from '../../api/products';
import { catalogApi } from '../../api/catalog';
import ImeiVerifyPanel from '../../components/ImeiVerifyPanel';
import { ImeiVerifyResult } from '../../api/imeiVerify';
import { colors }         from '../../theme/colors';
import { useAuth }        from '../../context/AuthContext';

export default function AddProductScreen() {
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  const { user }   = useAuth();
  const isPro      = user?.plan === 'PRO';
  const editId     = route.params?.id as string | undefined;
  const isEdit     = Boolean(editId);

  // Form state
  const [name,          setName]          = useState('');
  const [brand,         setBrand]         = useState('');
  const [category,      setCategory]      = useState('phone');
  const [condition,     setCondition]     = useState<'new' | 'used'>('new');
  const [imei,          setImei]          = useState('');
  const [barcode,       setBarcode]       = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [salePrice,     setSalePrice]     = useState('');
  const [stock,         setStock]         = useState('');
  const [isSecondhand,  setIsSecondhand]  = useState(false);
  const [storage,       setStorage]       = useState('');
  const [color,         setColor]         = useState('');
  const [ram,           setRam]           = useState('');
  const [loading,       setLoading]       = useState(false);
  const [errors,        setErrors]        = useState<Record<string, string>>({});

  // Scanner state
  const [scannerOpen,      setScannerOpen]      = useState(false);
  const [scanLoading,      setScanLoading]      = useState(false);
  const [scanResult,       setScanResult]       = useState<'found' | 'new' | null>(null);
  // linkCatalogMode: scanner opened after save — only captures barcode for catalog,
  // does NOT check inventory or fill the form.
  const [linkCatalogMode,  setLinkCatalogMode]  = useState(false);
  // savedProductName keeps name/brand available after form state would be cleared
  const [savedProduct,     setSavedProduct]     = useState<{ name: string; brand: string; category: string } | null>(null);

  // If editing, pre-fill form
  useEffect(() => {
    if (isEdit && editId) {
      productsApi.getOne(editId).then((res) => {
        const p = res.data.data;
        setName(p.name);
        setBrand(p.brand);
        setCategory(p.category);
        setCondition(p.condition);
        setImei(p.imei ?? '');
        setBarcode(p.barcode ?? '');
        setPurchasePrice(String(p.purchasePrice));
        setSalePrice(String(p.salePrice));
        setStock(String(p.stock));
        setIsSecondhand(p.isSecondhand);
        setStorage(p.storage ?? '');
        setColor(p.color ?? '');
        setRam(p.ram ?? '');
      });
    }
  }, [editId]);

  // ── Catalog-link handler (runs after save when no barcode was set) ─────────
  async function handleCatalogLink(code: string) {
    setScannerOpen(false);
    setLinkCatalogMode(false);
    const isImei = /^\d{15}$/.test(code);
    if (isImei) {
      Alert.alert(
        'That looks like an IMEI',
        'The box barcode is the shorter number (EAN-13, 13 digits) printed on the product packaging — not the 15-digit IMEI on the phone itself.\n\nTry scanning or typing the barcode from the box.',
        [{ text: 'OK' }]
      );
      return;
    }
    if (savedProduct) {
      try {
        await catalogApi.contribute({
          barcode:  code,
          name:     savedProduct.name,
          brand:    savedProduct.brand,
          category: savedProduct.category,
        });
        Alert.alert(
          '✅ Linked to Catalog',
          `"${savedProduct.name}" is now saved in the shared catalog.\nNext time anyone scans this barcode it will auto-fill instantly.`,
          [{ text: 'Done', onPress: () => navigation.goBack() }]
        );
      } catch {
        Alert.alert('Error', 'Could not save to catalog. Product was already added to inventory.');
        navigation.goBack();
      }
    } else {
      navigation.goBack();
    }
  }

  // ── Main scanner handler ───────────────────────────────────────────────────
  async function handleScanCode(code: string) {
    setScannerOpen(false);
    setScanLoading(true);
    setScanResult(null);

    // IMEI detection rule: exactly 15 digits = GSMA IMEI standard.
    // Barcodes on product boxes are EAN-13 (13 digits), UPC-A (12 digits),
    // Code-128 (alphanumeric), etc. Only barcodes can be looked up in an
    // external product database — IMEIs identify individual devices, not models.
    const isImei = /^\d{15}$/.test(code);

    try {
      // ── Step 1: check our own inventory first ──────────────────────────────
      const res = await productsApi.scan(code);
      const p = res.data.data;

      // Product already exists in inventory → warn about duplicate
      setScanResult('found');
      Alert.alert(
        '⚠️ Already in Inventory',
        `"${p.name}" (${p.brand}) already exists with this ${isImei ? 'IMEI' : 'barcode'}.\n\nStock: ${p.stock} units`,
        [
          {
            text: 'Edit Existing',
            onPress: () => navigation.replace('AddProduct', { id: p.id }),
          },
          { text: 'OK', style: 'cancel' },
        ]
      );

    } catch (e: any) {
      if (e?.response?.status === 404) {
        // ── Step 2: not in our inventory — try external barcode database ──────
        if (isImei) {
          // IMEI scanned → fill field, ImeiVerifyPanel auto-fires to get brand+model
          setImei(code);
          setScanResult('new');
        } else {
          // Product barcode scanned (EAN-13 / Code-128 non-IMEI)
          // Pakistani/Chinese phone boxes are not in international databases.
          // Save the barcode for catalog contribution, then guide user to scan IMEI.
          setBarcode(code);
          setScanResult('new');
          Alert.alert(
            '✓ Box Barcode Scanned',
            'Barcode saved.\n\nTo auto-fill brand and model, scan the IMEI barcode on the box (the long number barcode) — or type the IMEI manually below.',
          );
        }
      } else {
        Alert.alert('Scan Error', e?.response?.data?.error ?? e?.message ?? 'Lookup failed');
      }
    } finally {
      setScanLoading(false);
    }
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim())          e.name          = 'Product name is required';
    if (!brand.trim())         e.brand         = 'Brand is required';
    if (!purchasePrice)        e.purchasePrice = 'Purchase price is required';
    if (!salePrice)            e.salePrice     = 'Sale price is required';
    if (isNaN(Number(purchasePrice))) e.purchasePrice = 'Must be a number';
    if (isNaN(Number(salePrice)))     e.salePrice     = 'Must be a number';
    if (stock && isNaN(Number(stock))) e.stock = 'Must be a number';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload: CreateProductPayload = {
        name:          name.trim(),
        brand:         brand.trim(),
        category:      category.trim() || 'phone',
        condition,
        imei:          imei.trim()    || undefined,
        barcode:       barcode.trim() || undefined,
        purchasePrice: Number(purchasePrice),
        salePrice:     Number(salePrice),
        stock:         Number(stock || 0),
        isSecondhand,
        storage:       storage || undefined,
        color:         color   || undefined,
        ram:           ram     || undefined,
      };

      if (isEdit && editId) {
        await productsApi.update(editId, payload);
        Alert.alert('Success', 'Product updated');
        navigation.goBack();
      } else {
        await productsApi.create(payload);

        // ── Auto-contribute to shared catalog ──────────────────────────────
        if (payload.barcode && payload.name && payload.brand) {
          // Has barcode → save to catalog immediately, go back
          catalogApi.contribute({
            barcode:  payload.barcode,
            name:     payload.name,
            brand:    payload.brand,
            category: payload.category ?? 'phone',
          }).catch(() => {});

          Alert.alert('Success', 'Product added to inventory');
          navigation.goBack();

        } else if (payload.name && payload.brand) {
          // No barcode → product saved, but catalog won't have it.
          // Offer to link the box barcode right now so future scans auto-fill.
          setSavedProduct({
            name:     payload.name,
            brand:    payload.brand,
            category: payload.category ?? 'phone',
          });
          Alert.alert(
            '✅ Product Saved!',
            `"${payload.name}" added to inventory.\n\nWant to scan the barcode from the product box? This teaches the app to recognize this model — next time you scan it, name and brand fill automatically.`,
            [
              {
                text: 'Scan Box Barcode',
                onPress: () => {
                  setLinkCatalogMode(true);
                  setScannerOpen(true);
                },
              },
              {
                text: 'Skip',
                style: 'cancel',
                onPress: () => navigation.goBack(),
              },
            ]
          );
        } else {
          Alert.alert('Success', 'Product added to inventory');
          navigation.goBack();
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Something went wrong');
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{isEdit ? 'Edit Product' : 'Add Product'}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">

        {/* ── Scan banner ── */}
        {!isEdit && isPro && (
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
                {scanLoading ? 'Looking up…' : 'Scan IMEI barcode on the box'}
              </Text>
              <Text style={styles.scanBannerSub}>
                {scanLoading ? 'Please wait…' : 'Point camera at the long number barcode · or type IMEI below'}
              </Text>
            </View>
            {!scanLoading && <Text style={styles.scanBannerArrow}>›</Text>}
          </TouchableOpacity>
        )}
        {/* IMEI scan locked for Simple plan */}
        {!isEdit && !isPro && (
          <View style={styles.scanBannerLocked}>
            <Text style={styles.scanBannerIcon}>📷</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.scanBannerTitleLocked}>IMEI Scan — PRO Feature</Text>
              <Text style={styles.scanBannerSub}>Upgrade to PRO to scan IMEI and auto-fill product details.</Text>
            </View>
            <Text style={styles.proBadge}>PRO</Text>
          </View>
        )}

        {/* Scan result badge */}
        {scanResult === 'new' && (
          <View style={styles.badge}>
            <Text style={styles.badgeTxt}>✓ Details filled — add price &amp; stock to save</Text>
          </View>
        )}

        <Input
          label="Product Name *"
          placeholder="e.g. Samsung Galaxy A54"
          value={name}
          onChangeText={setName}
          error={errors.name}
        />
        <Input
          label="Brand *"
          placeholder="e.g. Samsung, Apple, Oppo"
          value={brand}
          onChangeText={setBrand}
          error={errors.brand}
        />
        <Input
          label="Category"
          placeholder="e.g. phone, tablet, accessory"
          value={category}
          onChangeText={setCategory}
        />

        {/* Condition selector */}
        <Text style={styles.fieldLabel}>Condition *</Text>
        <View style={styles.conditionRow}>
          {(['new', 'used'] as const).map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.condBtn, condition === c && styles.condBtnActive]}
              onPress={() => setCondition(c)}
            >
              <Text style={[styles.condBtnText, condition === c && styles.condBtnTextActive]}>
                {c === 'new' ? '🆕  New' : '♻️  Used'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <VariantPicker
          label="Storage"
          value={storage}
          onChange={setStorage}
          options={['32GB', '64GB', '128GB', '256GB', '512GB', '1TB']}
          placeholder="Select storage capacity"
        />
        <VariantPicker
          label="RAM"
          value={ram}
          onChange={setRam}
          options={['2GB', '3GB', '4GB', '6GB', '8GB', '12GB', '16GB']}
          placeholder="Select RAM"
        />
        <VariantPicker
          label="Color"
          value={color}
          onChange={setColor}
          options={['Black', 'White', 'Gold', 'Blue', 'Red', 'Green', 'Purple', 'Silver', 'Rose Gold']}
          placeholder="Select color"
        />

        <Input
          label="IMEI (optional)"
          placeholder="15-digit number on the phone itself"
          value={imei}
          onChangeText={setImei}
          keyboardType="numeric"
          maxLength={15}
        />
        {/* Auto-fill brand/model from IMEI when 15 digits entered — PRO only */}
        {!isEdit && isPro && (
          <ImeiVerifyPanel
            imei={imei}
            mode="new"
            onResult={(r: ImeiVerifyResult) => {
              if (r.device.found) {
                if (!name.trim())  setName(`${r.device.brand} ${r.device.model}`.trim());
                if (!brand.trim()) setBrand(r.device.brand);
              }
            }}
          />
        )}
        <Input
          label="Box Barcode (optional — for catalog lookup)"
          placeholder="EAN-13 on the product box — scan to auto-fill next time"
          value={barcode}
          onChangeText={setBarcode}
          autoCapitalize="none"
        />
        <Input
          label="Purchase Price (Rs) *"
          placeholder="Amount you paid"
          value={purchasePrice}
          onChangeText={setPurchasePrice}
          keyboardType="numeric"
          error={errors.purchasePrice}
        />
        <Input
          label="Sale Price (Rs) *"
          placeholder="Amount you'll sell for"
          value={salePrice}
          onChangeText={setSalePrice}
          keyboardType="numeric"
          error={errors.salePrice}
        />
        <Input
          label="Initial Stock Quantity"
          placeholder="How many units in stock"
          value={stock}
          onChangeText={setStock}
          keyboardType="numeric"
          error={errors.stock}
        />

        {/* Secondhand toggle */}
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.fieldLabel}>Secondhand Purchase</Text>
            <Text style={styles.switchHint}>Turn on if bought from a customer</Text>
          </View>
          <Switch
            value={isSecondhand}
            onValueChange={setIsSecondhand}
            trackColor={{ true: colors.primary }}
            thumbColor="#fff"
          />
        </View>

        {/* Profit preview */}
        {purchasePrice && salePrice && (
          <View style={styles.profitBox}>
            <Text style={styles.profitLabel}>Profit per unit</Text>
            <Text style={[
              styles.profitValue,
              Number(salePrice) - Number(purchasePrice) < 0
                ? { color: colors.danger }
                : { color: colors.success }
            ]}>
              Rs {(Number(salePrice) - Number(purchasePrice)).toLocaleString()}
            </Text>
          </View>
        )}

        <Button
          label={isEdit ? 'Save Changes' : 'Add to Inventory'}
          onPress={handleSubmit}
          loading={loading}
          style={{ marginTop: 8 }}
        />
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Scanner modal */}
      <ScannerOverlay
        visible={scannerOpen}
        onScanned={linkCatalogMode ? handleCatalogLink : handleScanCode}
        onClose={() => setScannerOpen(false)}
        title={linkCatalogMode ? 'Scan Product Box Barcode' : 'Scan Barcode to Check Inventory'}
        hint={linkCatalogMode
          ? 'Scan the EAN-13 barcode on the product box (not the IMEI)'
          : 'Point at barcode — tap ⌨️ Type for IMEI'
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 14,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn:  { color: colors.primary, fontSize: 15, fontWeight: '500' },
  title:    { fontSize: 17, fontWeight: '700', color: colors.text },
  form:     { padding: 16 },

  scanBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.primary, borderRadius: 14,
    padding: 16, marginBottom: 16,
  },
  scanBannerIcon:       { fontSize: 28 },
  scanBannerTitle:      { color: '#fff', fontSize: 15, fontWeight: '700' },
  scanBannerTitleLocked:{ color: '#92400e', fontSize: 15, fontWeight: '700' },
  scanBannerSub:        { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  scanBannerArrow:      { color: '#fff', fontSize: 22, fontWeight: '300' },
  scanBannerLocked: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fffbeb', borderRadius: 14,
    padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#fde68a',
  },
  proBadge: {
    backgroundColor: '#f59e0b', color: '#fff', fontSize: 11,
    fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, overflow: 'hidden',
  },

  badge: {
    backgroundColor: '#f0fdf4', borderRadius: 8, padding: 10,
    marginBottom: 14, borderWidth: 1, borderColor: '#bbf7d0',
  },
  badgeTxt: { color: '#166534', fontSize: 13, fontWeight: '600' },

  fieldLabel:   { fontSize: 13, fontWeight: '500', color: colors.text, marginBottom: 8 },
  conditionRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  condBtn: {
    flex: 1, padding: 13, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', backgroundColor: colors.card,
  },
  condBtnActive:     { backgroundColor: colors.primary, borderColor: colors.primary },
  condBtnText:       { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  condBtnTextActive: { color: '#fff' },

  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.card, padding: 14, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border, marginBottom: 14,
  },
  switchHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  profitBox: {
    backgroundColor: '#F0FDF4', borderRadius: 10, padding: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14, borderWidth: 1, borderColor: '#BBF7D0',
  },
  profitLabel: { fontSize: 13, color: '#166534', fontWeight: '500' },
  profitValue: { fontSize: 18, fontWeight: '700' },
});
