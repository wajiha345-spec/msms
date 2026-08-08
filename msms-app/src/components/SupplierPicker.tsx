import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, FlatList,
  Modal, StyleSheet, ActivityIndicator
} from 'react-native';
import { purchasesApi, SupplierContact } from '../api/purchases';
import { colors } from '../theme/colors';

interface SupplierPickerProps {
  onChange: (supplier: SupplierContact) => void;
  label?:   string;
}

// New Purchase's equivalent of CustomerPicker. There's no dedicated
// Supplier master table (same reasoning as supplierLedger.service.ts) — so
// instead of a CRM list, this picks from suppliers you've bought from
// before, sourced from past Purchase rows. Renders nothing until you've
// recorded at least one purchase with supplier info. Manual entry stays
// the primary path; picking here just autofills the existing fields.
export function SupplierPicker({ onChange, label = 'Select from Previous Suppliers' }: SupplierPickerProps) {
  const [open,      setOpen]      = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierContact[]>([]);
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [loaded,    setLoaded]    = useState(false);

  async function fetchSuppliers(q?: string) {
    setLoading(true);
    try {
      const res = await purchasesApi.listSuppliers(q);
      setSuppliers(res.data.data);
    } catch {
      // silent — picker just stays empty; manual entry is always available
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }

  const openPicker = useCallback(() => {
    setOpen(true);
    fetchSuppliers(search);
  }, [search]);

  if (loaded && suppliers.length === 0 && !search) return null;

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={openPicker}>
        <Text style={styles.triggerText}>🚚 {label}</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Supplier</Text>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <Text style={styles.closeBtn}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or phone..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={(t) => { setSearch(t); fetchSuppliers(t); }}
              clearButtonMode="while-editing"
            />
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
          ) : (
            <FlatList
              data={suppliers}
              keyExtractor={(item) => item.supplierPhone}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => { onChange(item); setOpen(false); }}
                >
                  <Text style={styles.rowName}>{item.supplierName || 'Unnamed supplier'}</Text>
                  <Text style={styles.rowSub}>{item.supplierPhone}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No suppliers found</Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    alignSelf: 'flex-start', marginBottom: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: colors.primary,
  },
  triggerText: { color: colors.primary, fontWeight: '600', fontSize: 13 },

  modal:        { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingTop: 54,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  closeBtn:   { color: colors.primary, fontSize: 15, fontWeight: '500' },

  searchRow: { padding: 12, backgroundColor: colors.card },
  searchInput: {
    backgroundColor: colors.background,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    padding: 11, fontSize: 14, color: colors.text,
  },

  row: {
    padding: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  rowName: { fontSize: 15, fontWeight: '500', color: colors.text },
  rowSub:  { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  emptyBox:  { alignItems: 'center', marginTop: 40, gap: 6 },
  emptyText: { fontSize: 14, color: colors.textMuted },
});
