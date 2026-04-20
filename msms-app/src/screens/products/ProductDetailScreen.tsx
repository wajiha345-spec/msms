import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator,
  Alert, ActionSheetIOS, Platform
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { productsApi, Product } from '../../api/products';
import { Badge }  from '../../components/Badge';
import { Button } from '../../components/Buttons';
import { colors } from '../../theme/colors';

export default function ProductDetailScreen() {
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  const { id }     = route.params as { id: string };

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      productsApi.getOne(id)
        .then((res) => setProduct(res.data.data))
        .catch(() => Alert.alert('Error', 'Failed to load product'))
        .finally(() => setLoading(false));
    }, [id])
  );

  function confirmDelete() {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product?.name}"?\n\nIf this product has sales history it will be hidden, not permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await productsApi.delete(id);
              navigation.goBack();
            } catch (e: any) {
              Alert.alert('Delete failed', e?.response?.data?.error || 'Something went wrong');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }

  function openMenu() {
    // On iOS use native ActionSheet, on Android use Alert as menu
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Edit Product', 'Delete Product'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) navigation.navigate('AddProduct', { id });
          if (buttonIndex === 2) confirmDelete();
        }
      );
    } else {
      // Android: show Alert with buttons as the menu
      Alert.alert(
        product?.name ?? 'Product',
        'What would you like to do?',
        [
          { text: 'Edit Product',   onPress: () => navigation.navigate('AddProduct', { id }) },
          { text: 'Delete Product', onPress: confirmDelete, style: 'destructive' },
          { text: 'Cancel',         style: 'cancel' },
        ]
      );
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!product) return null;

  const profit = product.salePrice - product.purchasePrice;

  return (
    <View style={styles.container}>
      {/* Header with 3-dot menu */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title} numberOfLines={1}>{product.name}</Text>

        <TouchableOpacity
          onPress={openMenu}
          style={styles.headerBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.menuDots}>•••</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Status badges */}
        <View style={styles.badgeRow}>
          <Badge
            label={product.condition === 'new' ? 'New' : 'Used'}
            type={product.condition === 'new' ? 'info' : 'warning'}
          />
          {product.isSecondhand && <Badge label="Secondhand" type="warning" />}
          <Badge
            label={product.stock === 0 ? 'Out of stock' : `${product.stock} in stock`}
            type={
              product.stock === 0 ? 'danger' :
              product.stock <= 2  ? 'warning' : 'success'
            }
          />
        </View>

        {/* Main info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Product Info</Text>
          <Row label="Name"     value={product.name} />
          <Row label="Brand"    value={product.brand} />
          <Row label="Category" value={product.category} />
          <Row label="Condition" value={product.condition === 'new' ? 'New' : 'Used'} />
          {product.imei && <Row label="IMEI" value={product.imei} mono />}
          <Row
            label="Added on"
            value={new Date(product.createdAt).toLocaleDateString('en-PK')}
          />
        </View>

        {/* Pricing */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pricing</Text>
          <View style={styles.priceGrid}>
            <PriceBox
              label="Purchase Price"
              amount={product.purchasePrice}
              color={colors.text}
            />
            <PriceBox
              label="Sale Price"
              amount={product.salePrice}
              color={colors.primary}
            />
            <PriceBox
              label="Profit / unit"
              amount={profit}
              color={profit >= 0 ? colors.success : colors.danger}
            />
          </View>
        </View>

        {/* Action buttons */}
        <Button
          label="Edit Product"
          onPress={() => navigation.navigate('AddProduct', { id })}
          variant="outline"
        />
        <Button
          label={deleting ? 'Deleting...' : 'Delete Product'}
          onPress={confirmDelete}
          variant="danger"
          loading={deleting}
          style={{ marginTop: 10 }}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function Row({
  label, value, mono,
}: {
  label: string; value: string; mono?: boolean;
}) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, mono && rowStyles.mono]}>{value}</Text>
    </View>
  );
}

function PriceBox({
  label, amount, color,
}: {
  label: string; amount: number; color: string;
}) {
  return (
    <View style={priceStyles.box}>
      <Text style={priceStyles.label}>{label}</Text>
      <Text style={[priceStyles.amount, { color }]}>
        Rs {amount.toLocaleString()}
      </Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    paddingVertical:   9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: { fontSize: 13, color: colors.textMuted, flex: 1 },
  value: {
    fontSize:   13,
    color:      colors.text,
    fontWeight: '500',
    flex:       2,
    textAlign:  'right',
  },
  mono: { fontFamily: 'monospace', fontSize: 12 },
});

const priceStyles = StyleSheet.create({
  box:    { flex: 1, alignItems: 'center', padding: 10 },
  label:  { fontSize: 11, color: colors.textMuted, marginBottom: 4, textAlign: 'center' },
  amount: { fontSize: 16, fontWeight: '700' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  headerBtn:  { width: 60 },
  backBtn:    { color: colors.primary, fontSize: 15, fontWeight: '500' },
  title: {
    fontSize:   17,
    fontWeight: '700',
    color:      colors.text,
    flex:       1,
    textAlign:  'center',
  },
  menuDots: {
    fontSize:   18,
    color:      colors.text,
    fontWeight: '700',
    textAlign:  'right',
    letterSpacing: 1,
  },
  content:   { padding: 16, gap: 14, paddingBottom: 40 },
  badgeRow:  { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  card: {
    backgroundColor: colors.card,
    borderRadius:    12,
    padding:         14,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  cardTitle: {
    fontSize:      12,
    fontWeight:    '600',
    color:         colors.textMuted,
    marginBottom:  10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceGrid: { flexDirection: 'row' },
});