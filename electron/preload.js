const { contextBridge, ipcRenderer } = require('electron');

// Espone API sicure al frontend
contextBridge.exposeInMainWorld('electronAPI', {
  // Informazioni libro
  getBookInfo: () => ipcRenderer.invoke('get-book-info'),
  
  // Gestione PDF
  readPdfFile: (filePath) => ipcRenderer.invoke('read-pdf-file', filePath),
  getPdfDirectory: (filePath) => ipcRenderer.invoke('get-pdf-directory', filePath),
  
  // File system
  saveFile: (content, filePath) => ipcRenderer.invoke('save-file', { content, filePath }),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  
  // App data
  getAppDataPath: () => ipcRenderer.invoke('get-app-data-path'),
  
  // Logging
  log: (message) => ipcRenderer.send('log', message)
});
