const { contextBridge, ipcRenderer } = require('electron');

// Minimal, explicit renderer surface — no filesystem access, no Node APIs,
// no direct ipcRenderer exposure. Grows only as later phases need a
// specific capability (printing here; backup save-as is added in Phase 5
// via the same pattern).
contextBridge.exposeInMainWorld('electronAPI', {
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
});
