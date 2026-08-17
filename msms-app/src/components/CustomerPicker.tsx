import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, FlatList,
  Modal, StyleSheet, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { crmApi, Customer } from '../api/crm';
import { colors } from '../theme/colors';

interface CustomerPickerProps {
  onChange: (customer: Customer) => void;
  label?:   string;
}

// Lets New Sale autofill customer name/phone from an existing CRM
// customer instead of always retyping them. Renders nothing for shops that
// have never added a CRM customer — same "invisible until used" pattern as
// BranchPicker. Manual entry stays the primary path either way; picking a
// customer here just fills the existing fields, which remain editable.
export function CustomerPicker({ onChange, label = 'Select from Customers' }: CustomerPickerProps) {
  const [open,      setOpen]      = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [loaded,    setLoaded]    = useState(false);

  async function fetchCustomers(q?: string) {
    setLoading(true);
    try {
      const res = await crmApi.listCustomers(q ? { search: q } : undefined);
      setCustomers(res.data.data);
    } catch {
      // silent — picker just stays empty; manual entry is always available
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }

  const openPicker = useCallback(() => {
    setOpen(true);
    fetchCustomers(search);
  }, [search]);

  if (loaded && customers.length === 0 && !search) return null;

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={openPicker}>
        <Ionicons name="person-outline" size={13} color={colors.primary} />
        <Text style={styles.triggerText}>{label}</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Customer</Text>
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
              onChangeText={(t) => { setSearch(t); fetchCustomers(t); }}
              clearButtonMode="while-editing"
            />
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
          ) : (
            <FlatList
              data={customers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => { onChange(item); setOpen(false); }}
                >
                  <Text style={styles.rowName}>{item.name}</Text>
                  <Text style={styles.rowSub}>{item.phone}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No customers found</Text>
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
    flexDirection: 'row', alignItems: 'center', gap: 6,
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
