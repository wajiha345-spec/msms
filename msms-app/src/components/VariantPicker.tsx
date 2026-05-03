import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList,
  StyleSheet, SafeAreaView,
} from 'react-native';
import { colors } from '../theme/colors';

interface VariantPickerProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
}

export default function VariantPicker({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
}: VariantPickerProps) {
  const [open, setOpen] = useState(false);

  function select(opt: string) {
    onChange(opt === value ? '' : opt); // tap same = deselect
    setOpen(false);
  }

  return (
    <>
      <View style={styles.wrapper}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity
          style={[styles.trigger, disabled && styles.triggerDisabled]}
          onPress={() => !disabled && setOpen(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.triggerText, !value && styles.placeholder]}>
            {value || placeholder}
          </Text>
          <Text style={styles.arrow}>▾</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)} />
        <SafeAreaView style={styles.sheet} pointerEvents="box-none">
          <View style={styles.sheetInner}>
            <Text style={styles.sheetTitle}>{label}</Text>

            <FlatList
              data={['', ...options]}
              keyExtractor={(item) => item || '__none__'}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.option, item === value && styles.optionActive]}
                  onPress={() => select(item)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.optionText, item === value && styles.optionTextActive]}>
                    {item || 'None'}
                  </Text>
                  {item === value && <Text style={styles.check}>✓</Text>}
                </TouchableOpacity>
              )}
              style={styles.list}
            />

            <TouchableOpacity style={styles.closeBtn} onPress={() => setOpen(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '500', color: colors.text, marginBottom: 6 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  triggerDisabled: { opacity: 0.5 },
  triggerText: { fontSize: 15, color: colors.text, flex: 1 },
  placeholder: { color: colors.textMuted },
  arrow: { fontSize: 14, color: colors.textMuted },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
  },
  sheetInner: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 14,
    paddingBottom: 8,
    maxHeight: 380,
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginHorizontal: 16,
  },
  list: { flexGrow: 0 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionActive: { backgroundColor: `${colors.primary}15` },
  optionText: { fontSize: 15, color: colors.text, flex: 1 },
  optionTextActive: { color: colors.primary, fontWeight: '600' },
  check: { fontSize: 14, color: colors.primary, fontWeight: '700' },
  closeBtn: {
    margin: 12,
    padding: 13,
    borderRadius: 10,
    backgroundColor: colors.border,
    alignItems: 'center',
  },
  closeBtnText: { fontSize: 15, fontWeight: '600', color: colors.text },
});
