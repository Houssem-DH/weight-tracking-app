// preload.js - UPDATED for database access
const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  dbQuery: (sql, params) => ipcRenderer.invoke('database:query', { sql, params }),
  testDbConnection: () => ipcRenderer.invoke('database:test-connection'),
  
  // App utilities
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // File system access
  readLocalFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeLocalFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content)
});