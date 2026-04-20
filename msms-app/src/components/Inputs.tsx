import React from 'react';
import {
  View, Text, TextInput, TextInputProps, StyleSheet
} from 'react-native';
import { colors } from '../theme/colors';

interface InputProps extends TextInputProps {
  label:   string;
  error?:  string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null, style]}
        placeholderTextColor={colors.textMuted}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:    { marginBottom: 14 },
  label:      { fontSize: 13, fontWeight: '500', color: colors.text, marginBottom: 6 },
  input: {
    borderWidth:    1,
    borderColor:    colors.border,
    borderRadius:   10,
    padding:        13,
    fontSize:       15,
    color:          colors.text,
    backgroundColor: colors.card,
  },
  inputError: { borderColor: colors.danger },
  error:      { fontSize: 12, color: colors.danger, marginTop: 4 },
});