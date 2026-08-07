import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Input }  from '../../components/Inputs';
import { Button } from '../../components/Buttons';
import { ProductPicker } from '../../components/ProductPicker';
import { BranchPicker }  from '../../components/BranchPicker';
import { Product } from '../../api/products';
import { Branch, branchesApi } from '../../api/branches';
import { inventoryApi } from '../../api/inventory';
import { colors } from '../../theme/colors';

export default function TransferStockScreen() {
  const navigation = useNavigation<any>();
  const [product,  setProduct]  = useState<Product | null>(null);
  const [branch,   setBranch]   = useState<Branch | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState<Record<string, string>>({});
  const [hasMultipleBranches, setHasMultipleBranches] = useState(false);

  useEffect(() => {
    branchesApi.list()
      .then((res) => setHasMultipleBranches(res.data.data.filter((b) => b.isActive).length > 1))
      .catch(() => {});
  }, []);

  const qty = Number(quantity) || 0;

  function validate() {
    const e: Record<string, string> = {};
    if (!product) e.product = 'Please select a product';
    if (!branch)  e.branch  = 'Please select a destination branch';
    if (!quantity || qty < 1) e.quantity = 'Quantity must be at least 1';
    else if (product && qty > product.stock) e.quantity = `Only ${product.stock} in stock`;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      await inventoryApi.transfer({ productId: product!.id, toBranchId: branch!.id, quantity: qty });
      Alert.alert(
        'Stock Transferred ✓',
        `${qty} unit(s) of ${product!.name} moved to ${branch!.name}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      Alert.alert('Transfer Failed', e?.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (!hasMultipleBranches) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Transfer Stock</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            You need at least 2 branches to transfer stock. Add one under More → Branches.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Transfer Stock</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <ProductPicker label="Product *" value={product} onChange={setProduct} />
        {errors.product && <Text style={styles.errorText}>{errors.product}</Text>}
        {product && (
          <Text style={styles.hint}>Currently at {product.stock} unit(s).</Text>
        )}

        <Input
          label="Quantity to Transfer *"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          error={errors.quantity}
        />

        <BranchPicker label="Destination Branch *" value={branch} onChange={setBranch} />
        {errors.branch && <Text style={styles.errorText}>{errors.branch}</Text>}

        <Button label="Transfer Stock" onPress={handleSubmit} loading={loading} style={{ marginTop: 8 }} />
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
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
  hint: { fontSize: 12, color: colors.textMuted, marginTop: -8, marginBottom: 14 },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
