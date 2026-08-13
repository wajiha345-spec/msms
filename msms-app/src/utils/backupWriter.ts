import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// expo-file-system's new SDK54 File/Paths class API has no working web
// implementation — calling .create()/.write() throws at runtime on
// web/Electron. This splits the export/save step by platform: native keeps
// the existing File+Sharing flow unchanged; web/Electron builds a Blob and
// triggers a browser download via a temporary <a download> link, which
// works unmodified in a plain browser tab AND gets upgraded to a native
// Save-As dialog automatically inside Electron (electron/main.js hooks
// session.on('will-download') + setSaveDialogOptions) — no extra
// contextBridge/IPC surface needed for this feature at all.
export async function writeBackupFile(
  filename: string,
  jsonContent: string
): Promise<{ shared: true } | { shared: false; message: string }> {
  if (Platform.OS === 'web') {
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { shared: true };
  }

  const file = new File(Paths.document, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(jsonContent);

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Save or send your SmartShop backup',
    });
    return { shared: true };
  }
  return {
    shared: false,
    message: `Saved as ${filename} on this device. Sharing isn't available here — you can find it in the app's document storage.`,
  };
}
