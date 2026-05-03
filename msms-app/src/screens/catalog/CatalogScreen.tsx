import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { catalogApi, CatalogEntry } from '../../api/catalog';
import { colors } from '../../theme/colors';

export default function CatalogScreen() {
  const navigation = useNavigation<any>();
  const [entries,  setEntries]  = useState<CatalogEntry[]>([]);
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function fetchEntries(q?: string) {
    setLoading(true);
    try {
      const res = await catalogApi.list(q);
      setEntries(res.data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { fetchEntries(); }, []));

  useEffect(() => {
    const t = setTimeout(() => fetchEntries(search || undefined), 350);
    return () => clearTimeout(t);
  }, [search]);

  function confirmDelete(entry: CatalogEntry) {
    Alert.alert(
      'Delete from Catalog?',
      `Remove "${entry.name}" (${entry.barcode}) from the shared catalog?\n\nThis does NOT delete it from your inventory.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => doDelete(entry),
        },
      ]
    );
  }

  async function doDelete(entry: CatalogEntry) {
    setDeleting(entry.id);
    try {
      await catalogApi.delete(entry.id);
      setEntries(prev => prev.filter(e => e.id !== entry.id));
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Could not delete');
    } finally {
      setDeleting(null);
    }
  }

  function renderItem({ item }: { item: CatalogEntry }) {
    const isDeleting = deleting === item.id;
    return (
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.rowMeta}>{item.brand}  ·  {item.category}</Text>
          <Text style={styles.rowBarcode}>{item.barcode}</Text>
        </View>
        <TouchableOpacity
          style={[styles.deleteBtn, isDeleting && { opacity: 0.5 }]}
          onPress={() => confirmDelete(item)}
          disabled={isDeleting}
        >
          {isDeleting
            ? <ActivityIndicator size="small" color={colors.danger} />
            : <Text style={styles.deleteTxt}>🗑</Text>
          }
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Product Catalog</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, brand or barcode…"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
      </View>

      {loading && entries.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>Catalog is empty</Text>
          <Text style={styles.emptySub}>
            Products are added here automatically when you save a product with a barcode.
            Use "Import CSV" to bulk-add your stock.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.countLabel}>{entries.length} entries</Text>
          <FlatList
            data={entries}
            keyExtractor={e => e.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 14,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { color: colors.primary, fontSize: 15, fontWeight: '500', width: 60 },
  title:   { fontSize: 17, fontWeight: '700', color: colors.text },

  searchRow: { padding: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchInput: {
    backgroundColor: colors.background, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: colors.text,
    borderWidth: 1, borderColor: colors.border,
  },

  countLabel: {
    fontSize: 12, color: colors.textMuted, fontWeight: '600',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 2,
  },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: colors.border,
  },
  rowLeft:    { flex: 1 },
  rowName:    { fontSize: 14, fontWeight: '600', color: colors.text },
  rowMeta:    { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  rowBarcode: { fontSize: 11, color: colors.primary, marginTop: 3, fontFamily: 'monospace' },
  sep:        { height: 8 },

  deleteBtn: { padding: 10 },
  deleteTxt: { fontSize: 20 },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon:  { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
  emptySub:   { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
