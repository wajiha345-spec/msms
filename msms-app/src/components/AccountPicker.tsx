import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  TextInput, Modal, StyleSheet, ActivityIndicator
} from 'react-native';
import { accountingApi, Account, AccountType } from '../api/accounting';
import { colors } from '../theme/colors';

interface AccountPickerProps {
  value?:      Account | null;
  onChange:    (account: Account) => void;
  label?:      string;
  filterType?: AccountType; // when set, only accounts of this type are shown/selectable
  excludeCodes?: string[];  // when set, these account codes are hidden (e.g. tracking-only accounts)
}

export function AccountPicker({ value, onChange, label = 'Account', filterType, excludeCodes }: AccountPickerProps) {
  const [open,     setOpen]     = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await accountingApi.listAccounts();
      let active = res.data.data.filter((a) => a.isActive);
      if (filterType)    active = active.filter((a) => a.type === filterType);
      if (excludeCodes)  active = active.filter((a) => !excludeCodes.includes(a.code));
      setAccounts(active);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (open) load(); }, [open, filterType, excludeCodes]);

  const filtered = accounts.filter((a) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q);
  });

  return (
    <>
      <View style={styles.wrapper}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)}>
          {value ? (
            <Text style={styles.selectedName}>{value.code} · {value.name}</Text>
          ) : (
            <Text style={styles.placeholder}>Tap to select an account…</Text>
          )}
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Account</Text>
            <TouchableOpacity onPress={() => { setOpen(false); setSearch(''); }}>
              <Text style={styles.closeBtn}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or code…"
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.row, value?.id === item.id && styles.rowSelected]}
                  onPress={() => { onChange(item); setOpen(false); setSearch(''); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{item.code} · {item.name}</Text>
                    <Text style={styles.rowSub}>{item.type}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No accounts found</Text>
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
  wrapper:  { marginBottom: 14 },
  label:    { fontSize: 13, fontWeight: '500', color: colors.text, marginBottom: 6 },
  trigger: {
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 13,
    backgroundColor: colors.card,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  selectedName: { fontSize: 15, color: colors.text, fontWeight: '500' },
  placeholder:  { fontSize: 15, color: colors.textMuted, flex: 1 },
  chevron:      { fontSize: 20, color: colors.textMuted },

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
    backgroundColor: colors.background, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    padding: 11, fontSize: 14, color: colors.text,
  },

  row: {
    padding: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  rowSelected: { backgroundColor: '#EEF2FF' },
  rowName:     { fontSize: 15, fontWeight: '500', color: colors.text },
  rowSub:      { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  emptyBox:  { alignItems: 'center', marginTop: 40, gap: 6 },
  emptyText: { fontSize: 14, color: colors.textMuted },
});
