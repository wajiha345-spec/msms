import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, Switch
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Input }  from '../../components/Inputs';
import { Button } from '../../components/Buttons';
import { productsApi, CreateProductPayload } from '../../api/products';
import { colors } from '../../theme/colors';

export default function AddProductScreen() {
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  const editId     = route.params?.id as string | undefined;
  const isEdit     = Boolean(editId);

  // Form state
  const [name,          setName]          = useState('');
  const [brand,         setBrand]         = useState('');
  const [category,      setCategory]      = useState('phone');
  const [condition,     setCondition]     = useState<'new' | 'used'>('new');
  const [imei,          setImei]          = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [salePrice,     setSalePrice]     = useState('');
  const [stock,         setStock]         = useState('');
  const [isSecondhand,  setIsSecondhand]  = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [errors,        setErrors]        = useState<Record<string, string>>({});

  // If editing, pre-fill form with existing product data
  useEffect(() => {
    if (isEdit && editId) {
      productsApi.getOne(editId).then((res) => {
        const p = res.data.data;
        setName(p.name);
        setBrand(p.brand);
        setCategory(p.category);
        setCondition(p.condition);
        setImei(p.imei ?? '');
        setPurchasePrice(String(p.purchasePrice));
        setSalePrice(String(p.salePrice));
        setStock(String(p.stock));
        setIsSecondhand(p.isSecondhand);
      });
    }
  }, [editId]);

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
        imei:          imei.trim() || undefined,
        purchasePrice: Number(purchasePrice),
        salePrice:     Number(salePrice),
        stock:         Number(stock || 0),
        isSecondhand,
      };

      if (isEdit && editId) {
        await productsApi.update(editId, payload);
        Alert.alert('Success', 'Product updated');
      } else {
        await productsApi.create(payload);
        Alert.alert('Success', 'Product added to inventory');
      }

      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{isEdit ? 'Edit Product' : 'Add Product'}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">

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
              <Text style={[
                styles.condBtnText,
                condition === c && styles.condBtnTextActive
              ]}>
                {c === 'new' ? '🆕  New' : '♻️  Used'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="IMEI (optional)"
          placeholder="15-digit IMEI number"
          value={imei}
          onChangeText={setImei}
          keyboardType="numeric"
          maxLength={15}
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
            <Text style={styles.switchHint}>
              Turn on if you bought this from a customer
            </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: 16,
    paddingTop:      54,
    paddingBottom:   14,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn:    { color: colors.primary, fontSize: 15, fontWeight: '500' },
  title:      { fontSize: 17, fontWeight: '700', color: colors.text },
  form:       { padding: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: colors.text, marginBottom: 8 },
  conditionRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  condBtn: {
    flex:            1,
    padding:         13,
    borderRadius:    10,
    borderWidth:     1,
    borderColor:     colors.border,
    alignItems:      'center',
    backgroundColor: colors.card,
  },
  condBtnActive:    { backgroundColor: colors.primary, borderColor: colors.primary },
  condBtnText:      { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  condBtnTextActive:{ color: '#fff' },
  switchRow: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    backgroundColor: colors.card,
    padding:         14,
    borderRadius:    10,
    borderWidth:     1,
    borderColor:     colors.border,
    marginBottom:    14,
  },
  switchHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  profitBox: {
    backgroundColor: '#F0FDF4',
    borderRadius:    10,
    padding:         14,
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    marginBottom:    14,
    borderWidth:     1,
    borderColor:     '#BBF7D0',
  },
  profitLabel: { fontSize: 13, color: '#166534', fontWeight: '500' },
  profitValue: { fontSize: 18, fontWeight: '700' },
});