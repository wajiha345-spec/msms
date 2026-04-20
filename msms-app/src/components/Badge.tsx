import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface BadgeProps {
  label:   string;
  type?:   'success' | 'warning' | 'info' | 'danger' | 'default';
}

const bgMap = {
  success: '#D1FAE5',
  warning: '#FEF3C7',
  info:    '#DBEAFE',
  danger:  '#FEE2E2',
  default: '#F3F4F6',
};

const textMap = {
  success: '#065F46',
  warning: '#92400E',
  info:    '#1E40AF',
  danger:  '#991B1B',
  default: '#374151',
};

export function Badge({ label, type = 'default' }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: bgMap[type] }]}>
      <Text style={[styles.text, { color: textMap[type] }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      20,
    alignSelf:         'flex-start',
  },
  text: { fontSize: 11, fontWeight: '600' },
});