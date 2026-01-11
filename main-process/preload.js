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
  log: (message) => ipcRenderer.send('log', message),

  // ==================== DATABASE API ====================

  // Inizializzazione
  dbInit: (pdfDir, bookId) => ipcRenderer.invoke('db-init', { pdfDir, bookId }),
  dbClose: () => ipcRenderer.invoke('db-close'),

  // Note
  dbGetNotes: () => ipcRenderer.invoke('db-get-notes'),
  dbGetNote: (id) => ipcRenderer.invoke('db-get-note', id),
  dbSaveNote: (noteData) => ipcRenderer.invoke('db-save-note', noteData),
  dbUpdateNote: (id, updates) => ipcRenderer.invoke('db-update-note', { id, updates }),
  dbDeleteNote: (id) => ipcRenderer.invoke('db-delete-note', id),

  // Annotazioni
  dbGetAnnotations: () => ipcRenderer.invoke('db-get-annotations'),
  dbGetAnnotationsByPage: (pageNumber) => ipcRenderer.invoke('db-get-annotations-by-page', pageNumber),
  dbGetAnnotation: (id) => ipcRenderer.invoke('db-get-annotation', id),
  dbSaveAnnotation: (annData) => ipcRenderer.invoke('db-save-annotation', annData),
  dbUpdateAnnotation: (id, updates) => ipcRenderer.invoke('db-update-annotation', { id, updates }),
  dbDeleteAnnotation: (id) => ipcRenderer.invoke('db-delete-annotation', id),

  // Mindmap
  dbGetMindmap: () => ipcRenderer.invoke('db-get-mindmap'),
  dbSaveMindmap: (data) => ipcRenderer.invoke('db-save-mindmap', data),

  // Summary
  dbGetSummary: () => ipcRenderer.invoke('db-get-summary'),
  dbSaveSummary: (content) => ipcRenderer.invoke('db-save-summary', content)
});
