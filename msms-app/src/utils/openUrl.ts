import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

declare global {
  interface Window {
    electronAPI?: {
      openExternal: (url: string) => Promise<void>;
    };
  }
}

// Opens an external URL (invoice/quotation print pages, IMEI/DIRBS links,
// etc). Native: unchanged existing behavior — an in-app browser tab via
// expo-web-browser. Desktop (Electron): routed through the
// contextBridge-exposed IPC call to shell.openExternal in the main process
// (electron/preload.js + main.js), so it opens in the user's real default
// browser rather than inside the app window — the server-rendered pages
// already have their own window.print() button, so this needs no other
// desktop-specific handling. Plain browser (Platform.OS==='web' without
// Electron, e.g. local dev in a normal tab): falls back to window.open,
// since window.electronAPI won't exist there.
export async function openUrl(url: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.electronAPI?.openExternal) {
      await window.electronAPI.openExternal(url);
    } else if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    return;
  }
  await WebBrowser.openBrowserAsync(url);
}
