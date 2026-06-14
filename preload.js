const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  closeWindow: () => ipcRenderer.send('window-close')
});

contextBridge.exposeInMainWorld('spotify', {
  startAuth: () => ipcRenderer.invoke('start-auth'),
  getAuthStatus: () => ipcRenderer.invoke('get-auth-status'),
  onNowPlaying: (callback) => ipcRenderer.on('now-playing', (_event, data) => callback(data)),
});