import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors } from '../theme/colors';

// react-native-web's Alert.alert() is a no-op stub (patched in
// patches/react-native-web+*.patch to dispatch a "rnw-alert" window event
// instead). This component is the desktop/web-only renderer for that event —
// native iOS/Android keep using the real platform Alert module untouched.
type AlertButtonStyle = 'default' | 'cancel' | 'destructive';
type AlertButton = { text?: string; onPress?: () => void; style?: AlertButtonStyle };
type AlertRequest = { title?: string; message?: string; buttons?: AlertButton[] };

export default function AlertHost() {
  const [request, setRequest] = useState<AlertRequest | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    function handleAlertEvent(e: Event) {
      const detail = (e as CustomEvent<AlertRequest>).detail;
      setRequest(detail);
    }
    window.addEventListener('rnw-alert', handleAlertEvent as EventListener);
    return () => window.removeEventListener('rnw-alert', handleAlertEvent as EventListener);
  }, []);

  if (Platform.OS !== 'web' || !request) return null;

  const buttons: AlertButton[] = request.buttons && request.buttons.length > 0
    ? request.buttons
    : [{ text: 'OK' }];

  function press(btn: AlertButton) {
    setRequest(null);
    btn.onPress?.();
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        {!!request.title && <Text style={styles.title}>{request.title}</Text>}
        {!!request.message && <Text style={styles.message}>{request.message}</Text>}
        <View style={styles.buttonRow}>
          {buttons.map((btn, i) => (
            <TouchableOpacity
              key={i}
              style={styles.button}
              onPress={() => press(btn)}
            >
              <Text
                style={[
                  styles.buttonText,
                  btn.style === 'destructive' && styles.destructiveText,
                  btn.style === 'cancel' && styles.cancelText,
                ]}
              >
                {btn.text || 'OK'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 22,
    minWidth: 320,
    maxWidth: 420,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  button: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  destructiveText: {
    color: colors.danger,
  },
  cancelText: {
    color: colors.textMuted,
  },
});
