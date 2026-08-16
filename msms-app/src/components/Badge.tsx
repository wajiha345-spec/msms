import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface BadgeProps {
  label:   string;
  type?:   'success' | 'warning' | 'info' | 'danger' | 'default';
}

const bgMap = {
  success: '#C9BEF2',
  warning: '#EDE6FB',
  info:    '#EDE6FB',
  danger:  '#EDE6FB',
  default: '#F3F4F6',
};

const textMap = {
  success: '#34208C',
  warning: '#34208C',
  info:    '#34208C',
  danger:  '#34208C',
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