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

  // Mindmap (legacy)
  dbGetMindmap: () => ipcRenderer.invoke('db-get-mindmap'),
  dbSaveMindmap: (data) => ipcRenderer.invoke('db-save-mindmap', data),

  // Mindmaps (multiple)
  dbGetAllMindmaps: () => ipcRenderer.invoke('db-get-all-mindmaps'),
  dbGetMindmapById: (id) => ipcRenderer.invoke('db-get-mindmap-by-id', id),
  dbCreateMindmap: (name, color) => ipcRenderer.invoke('db-create-mindmap', name, color),
  dbUpdateMindmapData: (id, data) => ipcRenderer.invoke('db-update-mindmap-data', id, data),
  dbUpdateMindmapInfo: (id, updates) => ipcRenderer.invoke('db-update-mindmap-info', id, updates),
  dbDeleteMindmap: (id) => ipcRenderer.invoke('db-delete-mindmap', id),
  dbCountMindmaps: () => ipcRenderer.invoke('db-count-mindmaps'),

  // Summary
  dbGetSummary: () => ipcRenderer.invoke('db-get-summary'),
  dbSaveSummary: (content) => ipcRenderer.invoke('db-save-summary', content),

  // Document Defaults
  dbGetDocumentDefaults: () => ipcRenderer.invoke('db-get-document-defaults'),
  dbUpdateDocumentDefaults: (updates) => ipcRenderer.invoke('db-update-document-defaults', updates),

  // Custom Icon Colors
  dbGetCustomIconColor: (iconId) => ipcRenderer.invoke('db-get-custom-icon-color', iconId),
  dbGetAllCustomIconColors: () => ipcRenderer.invoke('db-get-all-custom-icon-colors'),
  dbUpsertCustomIconColor: (iconId, color) => ipcRenderer.invoke('db-upsert-custom-icon-color', { iconId, color }),
  dbDeleteCustomIconColor: (iconId) => ipcRenderer.invoke('db-delete-custom-icon-color', iconId),

  // Custom Action Colors
  dbGetCustomActionColor: (actionType) => ipcRenderer.invoke('db-get-custom-action-color', actionType),
  dbGetAllCustomActionColors: () => ipcRenderer.invoke('db-get-all-custom-action-colors'),
  dbUpsertCustomActionColor: (actionType, color) => ipcRenderer.invoke('db-upsert-custom-action-color', { actionType, color }),
  dbDeleteCustomActionColor: (actionType) => ipcRenderer.invoke('db-delete-custom-action-color', actionType),

  // Flashcards
  dbGetFlashcards: () => ipcRenderer.invoke('db-get-flashcards'),
  dbGetFlashcard: (id) => ipcRenderer.invoke('db-get-flashcard', id),
  dbSaveFlashcard: (data) => ipcRenderer.invoke('db-save-flashcard', data),
  dbUpdateFlashcard: (id, updates) => ipcRenderer.invoke('db-update-flashcard', { id, updates }),
  dbDeleteFlashcard: (id) => ipcRenderer.invoke('db-delete-flashcard', id),

  // Dictionary
  dbGetDictionaryEntries: () => ipcRenderer.invoke('db-get-dictionary-entries'),
  dbGetDictionaryEntry: (id) => ipcRenderer.invoke('db-get-dictionary-entry', id),
  dbSaveDictionaryEntry: (data) => ipcRenderer.invoke('db-save-dictionary-entry', data),
  dbUpdateDictionaryEntry: (id, updates) => ipcRenderer.invoke('db-update-dictionary-entry', { id, updates }),
  dbDeleteDictionaryEntry: (id) => ipcRenderer.invoke('db-delete-dictionary-entry', id),

  // Keywords
  dbGetKeywords: () => ipcRenderer.invoke('db-get-keywords'),
  dbGetKeyword: (id) => ipcRenderer.invoke('db-get-keyword', id),
  dbSaveKeyword: (data) => ipcRenderer.invoke('db-save-keyword', data),
  dbUpdateKeyword: (id, updates) => ipcRenderer.invoke('db-update-keyword', { id, updates }),
  dbDeleteKeyword: (id) => ipcRenderer.invoke('db-delete-keyword', id),

  // Bookmarks
  dbGetBookmarks: () => ipcRenderer.invoke('db-get-bookmarks'),
  dbGetBookmark: (id) => ipcRenderer.invoke('db-get-bookmark', id),
  dbGetBookmarkByPage: (pageNumber) => ipcRenderer.invoke('db-get-bookmark-by-page', pageNumber),
  dbSaveBookmark: (data) => ipcRenderer.invoke('db-save-bookmark', data),
  dbUpdateBookmark: (id, updates) => ipcRenderer.invoke('db-update-bookmark', { id, updates }),
  dbDeleteBookmark: (id) => ipcRenderer.invoke('db-delete-bookmark', id),

  // ==================== LIBRARY API ====================

  // Inizializzazione libreria
  libraryExists: (customPath) => ipcRenderer.invoke('library-exists', customPath),
  libraryInit: (customPath) => ipcRenderer.invoke('library-init', customPath),
  libraryGetPath: () => ipcRenderer.invoke('library-get-path'),
  libraryGetDocumentDatabasePath: (documentId) =>
    ipcRenderer.invoke('library-get-document-db-path', documentId),

  // Documents
  libraryGetAllDocuments: () => ipcRenderer.invoke('library-get-all-documents'),
  libraryGetDocuments: (filters) => ipcRenderer.invoke('library-get-documents', filters),
  libraryGetRecentDocuments: (limit) => ipcRenderer.invoke('library-get-recent-documents', limit),
  libraryGetDocumentById: (id) => ipcRenderer.invoke('library-get-document-by-id', id),
  libraryCreateDocument: (docData) => ipcRenderer.invoke('library-create-document', docData),
  libraryUpdateDocument: (id, updates) =>
    ipcRenderer.invoke('library-update-document', { id, updates }),
  libraryUpdateDocumentLastOpened: (id) =>
    ipcRenderer.invoke('library-update-document-last-opened', id),
  libraryToggleDocumentFavorite: (id) =>
    ipcRenderer.invoke('library-toggle-document-favorite', id),
  libraryDeleteDocument: (id) => ipcRenderer.invoke('library-delete-document', id),
  libraryCheckDocumentFileExists: (id) =>
    ipcRenderer.invoke('library-check-document-file-exists', id),

  // Categories
  libraryGetAllCategories: () => ipcRenderer.invoke('library-get-all-categories'),
  libraryGetCategoryById: (id) => ipcRenderer.invoke('library-get-category-by-id', id),
  libraryCreateCategory: (name, color) =>
    ipcRenderer.invoke('library-create-category', { name, color }),
  libraryUpdateCategory: (id, updates) =>
    ipcRenderer.invoke('library-update-category', { id, updates }),
  libraryDeleteCategory: (id) => ipcRenderer.invoke('library-delete-category', id),
  libraryCountDocumentsByCategory: (categoryId) =>
    ipcRenderer.invoke('library-count-documents-by-category', categoryId),

  // Settings
  libraryGetSetting: (key) => ipcRenderer.invoke('library-get-setting', key),
  librarySetSetting: (key, value) => ipcRenderer.invoke('library-set-setting', { key, value }),
  libraryGetAllSettings: () => ipcRenderer.invoke('library-get-all-settings'),

  // PDF Metadata
  extractPdfMetadata: (filePath) => ipcRenderer.invoke('extract-pdf-metadata', filePath),
  calculateFileHash: (filePath) => ipcRenderer.invoke('calculate-file-hash', filePath),

  // Document Statistics
  getDocumentStatistics: () => ipcRenderer.invoke('get-document-statistics'),
  libraryUpdateDocumentStatistics: (id, stats) =>
    ipcRenderer.invoke('library-update-document-statistics', { id, stats }),

  // App Configuration
  configGetLibraryPath: () => ipcRenderer.invoke('config-get-library-path'),
  configSetLibraryPath: (libraryPath) => ipcRenderer.invoke('config-set-library-path', libraryPath),
  configIsLibraryConfigured: () => ipcRenderer.invoke('config-is-library-configured'),
  configGetDefaultLibraryPath: () => ipcRenderer.invoke('config-get-default-library-path'),
  configMoveLibrary: (oldPath, newPath) =>
    ipcRenderer.invoke('config-move-library', { oldPath, newPath }),
  configCreateEmptyLibrary: (newPath) => ipcRenderer.invoke('config-create-empty-library', newPath),

  // ==================== IMAGE API ====================
  loadImagesMap: (pdfDir, bookId) =>
    ipcRenderer.invoke('load-images-map', { pdfDir, bookId }),
  saveImageToDisk: (imageData, pdfDir, bookId) =>
    ipcRenderer.invoke('save-image-to-disk', { imageData, pdfDir, bookId }),
  readImageFromDisk: (filePath) => ipcRenderer.invoke('read-image-from-disk', filePath),
  selectImageFile: () => ipcRenderer.invoke('select-image-file'),
  deleteImageFromDisk: (imageUrl) => ipcRenderer.invoke('delete-image-from-disk', imageUrl),
  deleteImagesFromDisk: (imageUrls) => ipcRenderer.invoke('delete-images-from-disk', imageUrls),
  checkImageExists: (imageUrl) => ipcRenderer.invoke('check-image-exists', imageUrl),
  cleanupOrphanImages: (pdfDir, bookId, usedImageUrls) =>
    ipcRenderer.invoke('cleanup-orphan-images', { pdfDir, bookId, usedImageUrls })
});
