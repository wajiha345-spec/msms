import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  TextInput, Modal, StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { colors } from '../theme/colors';

interface Category {
  id:   string;
  name: string;
}

interface CategoryModalPickerProps<T extends Category> {
  label:           string;
  value?:          T | null;
  onChange:        (category: T) => void;
  fetchCategories: () => Promise<T[]>;
  createCategory:  (name: string) => Promise<T>;
}

export function CategoryModalPicker<T extends Category>({
  label, value, onChange, fetchCategories, createCategory,
}: CategoryModalPickerProps<T>) {
  const [open,       setOpen]       = useState(false);
  const [categories, setCategories] = useState<T[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [newName,    setNewName]    = useState('');
  const [adding,     setAdding]     = useState(false);

  async function load() {
    setLoading(true);
    try {
      setCategories(await fetchCategories());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (open) load(); }, [open]);

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const category = await createCategory(newName.trim());
      setNewName('');
      await load();
      onChange(category);
      setOpen(false);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Could not add category');
    } finally {
      setAdding(false);
    }
  }

  return (
    <>
      <View style={styles.wrapper}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)}>
          {value ? (
            <Text style={styles.selectedName}>{value.name}</Text>
          ) : (
            <Text style={styles.placeholder}>Tap to select…</Text>
          )}
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select {label}</Text>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <Text style={styles.closeBtn}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              placeholder="Add a new category…"
              placeholderTextColor={colors.textMuted}
              value={newName}
              onChangeText={setNewName}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.addBtn, (!newName.trim() || adding) && styles.addBtnDisabled]}
              onPress={handleAdd}
              disabled={!newName.trim() || adding}
            >
              {adding ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.addBtnText}>Add</Text>}
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
          ) : (
            <FlatList
              data={categories}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.row, value?.id === item.id && styles.rowSelected]}
                  onPress={() => { onChange(item); setOpen(false); }}
                >
                  <Text style={styles.rowName}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No categories yet</Text>
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

  addRow: {
    flexDirection: 'row', gap: 8, padding: 12, backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  addInput: {
    flex: 1, backgroundColor: colors.background, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    padding: 11, fontSize: 14, color: colors.text,
  },
  addBtn: {
    backgroundColor: colors.primary, borderRadius: 10,
    paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center',
  },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  row: {
    padding: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  rowSelected: { backgroundColor: '#EDE6FB' },
  rowName:     { fontSize: 15, fontWeight: '500', color: colors.text },

  emptyBox:  { alignItems: 'center', marginTop: 40, gap: 6 },
  emptyText: { fontSize: 14, color: colors.textMuted },
});
