const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nativeShare', {
  canShare: () => ipcRenderer.invoke('can-share'),
  share: (options) => ipcRenderer.invoke('share', options),
});
