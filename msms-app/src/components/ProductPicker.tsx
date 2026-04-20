import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  TextInput, Modal, StyleSheet, ActivityIndicator
} from 'react-native';
import { productsApi, Product } from '../api/products';
import { Badge }  from './Badge';
import { colors } from '../theme/colors';

interface ProductPickerProps {
  value?:    Product | null;
  onChange:  (product: Product) => void;
  label?:    string;
}

export function ProductPicker({ value, onChange, label = 'Select Product' }: ProductPickerProps) {
  const [open,     setOpen]     = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(false);

  async function load(q?: string) {
    setLoading(true);
    try {
      const res = await productsApi.list(q);
      // Only show products with stock > 0 by default for sales
      setProducts(res.data.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (open) load(); }, [open]);

  return (
    <>
      <View style={styles.wrapper}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)}>
          {value ? (
            <View>
              <Text style={styles.selectedName}>{value.name}</Text>
              <Text style={styles.selectedSub}>
                {value.brand} · Stock: {value.stock} · Rs {value.salePrice.toLocaleString()}
              </Text>
            </View>
          ) : (
            <Text style={styles.placeholder}>Tap to select a product...</Text>
          )}
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Product</Text>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <Text style={styles.closeBtn}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={(t) => { setSearch(t); load(t); }}
              autoFocus
            />
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
          ) : (
            <FlatList
              data={products}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.productRow,
                    value?.id === item.id && styles.productRowSelected,
                  ]}
                  onPress={() => { onChange(item); setOpen(false); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productRowName}>{item.name}</Text>
                    <Text style={styles.productRowSub}>
                      {item.brand} · Rs {item.salePrice.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.productRowRight}>
                    <Badge
                      label={`${item.stock} left`}
                      type={item.stock === 0 ? 'danger' : item.stock <= 2 ? 'warning' : 'success'}
                    />
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No products found</Text>
              }
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper:       { marginBottom: 14 },
  label:         { fontSize: 13, fontWeight: '500', color: colors.text, marginBottom: 6 },
  trigger: {
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    10,
    padding:         13,
    backgroundColor: colors.card,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
  },
  selectedName:  { fontSize: 15, color: colors.text, fontWeight: '500' },
  selectedSub:   { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  placeholder:   { fontSize: 15, color: colors.textMuted },
  chevron:       { fontSize: 20, color: colors.textMuted },
  modal:         { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    padding:         16,
    paddingTop:      54,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle:    { fontSize: 17, fontWeight: '700', color: colors.text },
  closeBtn:      { color: colors.primary, fontSize: 15, fontWeight: '500' },
  searchRow:     { padding: 12, backgroundColor: colors.card },
  searchInput: {
    backgroundColor: colors.background,
    borderRadius:    10,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         11,
    fontSize:        14,
    color:           colors.text,
  },
  productRow: {
    flexDirection:   'row',
    alignItems:      'center',
    padding:         14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  productRowSelected: { backgroundColor: '#EEF2FF' },
  productRowName:     { fontSize: 15, fontWeight: '500', color: colors.text },
  productRowSub:      { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  productRowRight:    { marginLeft: 10 },
  emptyText: {
    textAlign:  'center',
    color:      colors.textMuted,
    marginTop:  40,
    fontSize:   14,
  },
});