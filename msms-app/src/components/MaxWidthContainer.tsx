import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

// Wraps a screen's existing (mobile-width) render output so it doesn't look
// stretched full-bleed across a wide desktop window — used for the majority
// of screens (forms, detail views, settings, reports) that don't need a
// genuinely different desktop layout. Renders as a plain passthrough <View>
// on native (no width cap, no behavior change).
export default function MaxWidthContainer({
  children,
  maxWidth = 720,
  style,
}: {
  children: React.ReactNode;
  maxWidth?: number;
  style?: ViewStyle;
}) {
  return (
    <View style={styles.outer}>
      <View style={[styles.inner, { maxWidth }, style]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, alignItems: 'center' },
  inner: { flex: 1, width: '100%' },
});
