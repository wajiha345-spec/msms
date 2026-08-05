import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Input } from './Inputs';
import { colors } from '../theme/colors';

const DEFAULT_CATEGORIES = [
  'Phone', 'Tablet', 'Accessory', 'Charger',
  'Case/Cover', 'Earphones', 'Smart Watch', 'Power Bank',
];

interface CategoryPickerProps {
  value: string;
  onChange: (v: string) => void;
  options?: string[];
  error?: string;
  disabled?: boolean;
}

export default function CategoryPicker({
  value, onChange, options = DEFAULT_CATEGORIES, error, disabled,
}: CategoryPickerProps) {
  return (
    <View style={styles.wrapper}>
      <Input
        label="Category"
        placeholder="Type any category — or pick below"
        value={value}
        onChangeText={onChange}
        error={error}
        editable={!disabled}
      />
      <View style={styles.chipRow}>
        {options.map((opt) => {
          const active = value.trim().toLowerCase() === opt.toLowerCase();
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => !disabled && onChange(opt)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -6, marginBottom: 4 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: '#fff' },
});
