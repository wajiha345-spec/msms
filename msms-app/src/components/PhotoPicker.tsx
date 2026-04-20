import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  Image, StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';

interface PhotoPickerProps {
  label:    string;
  uri?:     string;
  onPick:   (uri: string) => void;
  onClear?: () => void;
}

async function requestAndLaunchLibrary(): Promise<string | null> {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission required',
        'Please allow photo library access in your phone Settings to upload photos.'
      );
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:    ImagePicker.MediaTypeOptions.Images,
      quality:       0.7,
      allowsEditing: true,
    });
    if (result.canceled) return null;
    return result.assets?.[0]?.uri ?? null;
  } catch (err) {
    console.warn('Library picker error:', err);
    return null;
  }
}

async function requestAndLaunchCamera(): Promise<string | null> {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission required',
        'Please allow camera access in your phone Settings to take photos.'
      );
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality:       0.7,
      allowsEditing: true,
      aspect:        [4, 3],
    });
    if (result.canceled) return null;
    return result.assets?.[0]?.uri ?? null;
  } catch (err) {
    console.warn('Camera error:', err);
    return null;
  }
}

export function PhotoPicker({ label, uri, onPick, onClear }: PhotoPickerProps) {
  const [busy, setBusy] = useState(false);

  function showOptions() {
    Alert.alert(
      label,
      'Choose photo source',
      [
        {
          text: '📷  Camera',
          onPress: async () => {
            setBusy(true);
            const picked = await requestAndLaunchCamera();
            setBusy(false);
            if (picked) onPick(picked);
          },
        },
        {
          text: '🖼  Photo Library',
          onPress: async () => {
            setBusy(true);
            const picked = await requestAndLaunchLibrary();
            setBusy(false);
            if (picked) onPick(picked);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      {uri ? (
        // Photo selected — show preview with actions
        <View style={styles.previewBox}>
          <Image source={{ uri }} style={styles.previewImage} resizeMode="cover" />
          <View style={styles.previewActions}>
            <TouchableOpacity
              style={styles.changeBtn}
              onPress={showOptions}
              disabled={busy}
            >
              <Text style={styles.changeBtnText}>Change</Text>
            </TouchableOpacity>
            {onClear && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={onClear}
                disabled={busy}
              >
                <Text style={styles.clearBtnText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        // No photo yet — show tap target
        <TouchableOpacity
          style={[styles.emptyBox, busy && styles.emptyBoxBusy]}
          onPress={showOptions}
          disabled={busy}
          activeOpacity={0.7}
        >
          {busy ? (
            <>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.busyText}>Opening...</Text>
            </>
          ) : (
            <>
              <Text style={styles.emptyIcon}>📷</Text>
              <Text style={styles.emptyText}>Tap to add photo</Text>
              <Text style={styles.emptyHint}>Camera or photo library</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:      { marginBottom: 14 },
  label:        { fontSize: 13, fontWeight: '500', color: colors.text, marginBottom: 6 },
  emptyBox: {
    borderWidth:     1,
    borderColor:     colors.border,
    borderStyle:     'dashed',
    borderRadius:    10,
    paddingVertical: 28,
    alignItems:      'center',
    backgroundColor: colors.background,
  },
  emptyBoxBusy: { opacity: 0.6 },
  emptyIcon:    { fontSize: 28, marginBottom: 6 },
  emptyText:    { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  emptyHint:    { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  busyText:     { fontSize: 13, color: colors.textMuted, marginTop: 8 },
  previewBox: {
    borderRadius:  10,
    overflow:      'hidden',
    borderWidth:   1,
    borderColor:   colors.border,
  },
  previewImage: { width: '100%', height: 180 },
  previewActions: {
    flexDirection:   'row',
    gap:             8,
    padding:         10,
    backgroundColor: colors.card,
  },
  changeBtn: {
    flex:            1,
    paddingVertical: 8,
    borderRadius:    8,
    borderWidth:     1,
    borderColor:     colors.primary,
    alignItems:      'center',
  },
  changeBtnText: { color: colors.primary, fontWeight: '500', fontSize: 13 },
  clearBtn: {
    flex:            1,
    paddingVertical: 8,
    borderRadius:    8,
    borderWidth:     1,
    borderColor:     colors.danger,
    alignItems:      'center',
  },
  clearBtnText: { color: colors.danger, fontWeight: '500', fontSize: 13 },
});