import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface MetricTileProps {
  label:      string;
  value:      string;
  sub?:       string;
  accent?:    string;
  icon:       string;
}

export function MetricTile({
  label, value, sub, accent = colors.primary, icon
}: MetricTileProps) {
  return (
    <View style={[styles.tile, { borderTopColor: accent, borderTopWidth: 3 }]}>
      <View style={styles.top}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={[styles.value, { color: accent }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {sub && <Text style={styles.sub}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex:            1,
    backgroundColor: colors.card,
    borderRadius:    12,
    padding:         14,
    borderWidth:     1,
    borderColor:     colors.border,
    minWidth:        '47%',
  },
  top:   { marginBottom: 6 },
  icon:  { fontSize: 22 },
  value: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  label: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  sub:   { fontSize: 11, color: colors.textMuted, marginTop: 2 },
});