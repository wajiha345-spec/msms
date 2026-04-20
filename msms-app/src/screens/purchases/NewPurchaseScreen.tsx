import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Input }         from '../../components/Inputs';
import { Button }        from '../../components/Buttons';
import { ProductPicker } from '../../components/ProductPicker';
import { Product }       from '../../api/products';
import { purchasesApi }  from '../../api/purchases';
import { colors }        from '../../theme/colors';

export default function NewPurchaseScreen() {
  const navigation = useNavigation<any>();

  const [product,       setProduct]       = useState<Product | null>(null);
  const [quantity,      setQuantity]      = useState('1');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [supplierName,  setSupplierName]  = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [loading,       setLoading]       = useState(false);
  const [errors,        setErrors]        = useState<Record<string, string>>({});

  // Auto-fill purchase price from product's last purchase price
  useEffect(() => {
    if (product) setPurchasePrice(String(product.purchasePrice));
  }, [product]);

  const qty   = Number(quantity)      || 0;
  const price = Number(purchasePrice) || 0;
  const total = qty * price;

  function validate() {
    const e: Record<string, string> = {};
    if (!product)                 e.product       = 'Please select a product';
    if (!quantity || qty < 1)     e.quantity      = 'Quantity must be at least 1';
    if (!purchasePrice || price <= 0) e.purchasePrice = 'Enter a valid price';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      await purchasesApi.create({
        productId:     product!.id,
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
      Alert.alert('Error', e?.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Purchase</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">

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
          label="Purchase Price per unit (Rs) *"
          value={purchasePrice}
          onChangeText={setPurchasePrice}
          keyboardType="numeric"
          error={errors.purchasePrice}
        />

        {/* Summary */}
        {product && qty > 0 && price > 0 && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Purchase Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Product</Text>
              <Text style={styles.summaryValue}>{product.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Units to add</Text>
              <Text style={styles.summaryValue}>{qty}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Current stock</Text>
              <Text style={styles.summaryValue}>{product.stock}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Stock after</Text>
              <Text style={[styles.summaryValue, { color: colors.success, fontWeight: '700' }]}>
                {product.stock + qty}
              </Text>
            </View>
            <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 4 }]}>
              <Text style={[styles.summaryLabel, { fontWeight: '600', color: colors.text }]}>
                Total Cost
              </Text>
              <Text style={[styles.summaryValue, { fontWeight: '700', fontSize: 16 }]}>
                Rs {total.toLocaleString()}
              </Text>
            </View>
          </View>
        )}

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
          label="Add to Stock"
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
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  summaryLabel: { fontSize: 13, color: colors.textMuted },
  summaryValue: { fontSize: 13, color: colors.text },
  sectionLabel: {
    fontSize:      12,
    fontWeight:    '600',
    color:         colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom:  10,
    marginTop:     4,
  },
});