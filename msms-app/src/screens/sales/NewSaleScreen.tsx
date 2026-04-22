import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, Linking
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Input }           from '../../components/Inputs';
import { Button }          from '../../components/Buttons';
import { ProductPicker }   from '../../components/ProductPicker';
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

  // Pre-select product when arriving from Secondhand Detail screen
  useEffect(() => {
    if (preselectedProductId) {
      productsApi.getOne(preselectedProductId)
        .then(res => setProduct(res.data.data))
        .catch(() => {});
    }
  }, [preselectedProductId]);

  // Auto-fill sale price from product default when product is selected
  useEffect(() => {
    if (product) setSalePrice(String(product.salePrice));
  }, [product]);

  // Live profit calculation
  const qty     = Number(quantity)  || 0;
  const price   = Number(salePrice) || 0;
  const cost    = product ? product.purchasePrice * qty : 0;
  const revenue = price * qty;
  const profit  = revenue - cost;

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
            onPress: () => {
              navigation.goBack();
              setTimeout(() => Linking.openURL(invoiceUrl).catch(() => {}), 300);
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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Sale</Text>
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
    </View>
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
});