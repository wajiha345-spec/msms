import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  Modal, StyleSheet, ActivityIndicator
} from 'react-native';
import { branchesApi, Branch } from '../api/branches';
import { colors } from '../theme/colors';

interface BranchPickerProps {
  value?:   Branch | null;
  onChange: (branch: Branch) => void;
  label?:   string;
}

// Renders nothing at all for shops with 1 or fewer active branches — i.e.
// the ~100% of shops that never create a second branch see no change to
// this screen at all.
export function BranchPicker({ value, onChange, label = 'Branch' }: BranchPickerProps) {
  const [open,     setOpen]     = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [loaded,   setLoaded]   = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await branchesApi.list();
        setBranches(res.data.data.filter((b) => b.isActive));
      } finally {
        setLoading(false);
        setLoaded(true);
      }
    })();
  }, []);

  if (loaded && branches.length <= 1) return null;
  if (!loaded) return null;

  return (
    <>
      <View style={styles.wrapper}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)}>
          {value ? (
            <Text style={styles.selectedName}>{value.name}{value.isMain ? ' (Main)' : ''}</Text>
          ) : (
            <Text style={styles.placeholder}>Tap to select a branch…</Text>
          )}
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Branch</Text>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <Text style={styles.closeBtn}>Close</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
          ) : (
            <FlatList
              data={branches}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.row, value?.id === item.id && styles.rowSelected]}
                  onPress={() => { onChange(item); setOpen(false); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{item.name}</Text>
                    {item.isMain && <Text style={styles.rowSub}>Main Branch</Text>}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No branches found</Text>
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
