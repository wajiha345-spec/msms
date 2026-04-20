import React from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle
} from 'react-native';
import { colors } from '../theme/colors';

interface ButtonProps {
  label:      string;
  onPress:    () => void;
  loading?:   boolean;
  disabled?:  boolean;
  variant?:   'primary' | 'danger' | 'outline';
  style?:     ViewStyle;
}

export function Button({
  label, onPress, loading, disabled, variant = 'primary', style
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        variant === 'danger'  ? styles.danger  : null,
        variant === 'outline' ? styles.outline : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading
        ? <ActivityIndicator color={variant === 'outline' ? colors.primary : '#fff'} />
        : <Text style={[
            styles.text,
            variant === 'outline' ? styles.outlineText : null,
          ]}>
            {label}
          </Text>
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.primary,
    borderRadius:    10,
    padding:         15,
    alignItems:      'center',
  },
  danger:      { backgroundColor: colors.danger },
  outline: {
    backgroundColor: 'transparent',
    borderWidth:      1,
    borderColor:      colors.primary,
  },
  disabled:    { opacity: 0.55 },
  text:        { color: '#fff', fontSize: 15, fontWeight: '600' },
  outlineText: { color: colors.primary },
});