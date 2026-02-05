/**
 * Library Database Manager per il renderer
 * Gestisce la comunicazione IPC con il main process per operazioni sulla libreria
 */

class LibraryManager {
  constructor() {
    this.initialized = false;
    this.libraryPath = null;
  }

  /**
   * Verifica se esiste una libreria nel percorso specificato
   */
  async checkLibraryExists(customPath = null) {
    return await window.electronAPI.libraryExists(customPath);
  }

  /**
   * Inizializza la libreria
   */
  async init(customPath = null) {
    try {
      const result = await window.electronAPI.libraryInit(customPath);
      if (result.success) {
        this.initialized = true;
        this.libraryPath = result.libraryPath;
        console.log('[LibraryDB] Libreria inizializzata:', result.path);
      }
      return result;
    } catch (error) {
      console.error('[LibraryDB] Errore inizializzazione:', error);
      throw error;
    }
  }

  /**
   * Ottieni il percorso corrente della libreria
   */
  getLibraryPath() {
    return this.libraryPath;
  }

  // ==================== DOCUMENTS ====================

  /**
   * Ottieni tutti i documenti
   */
  async getAllDocuments() {
    if (!this.initialized) return [];
    return await window.electronAPI.libraryGetAllDocuments();
  }

  /**
   * Ottieni documenti con filtri
   */
  async getDocuments(filters = {}) {
    if (!this.initialized) return [];
    return await window.electronAPI.libraryGetDocuments(filters);
  }

  /**
   * Ottieni documenti recenti
   */
  async getRecentDocuments(limit = 10) {
    if (!this.initialized) return [];
    return await window.electronAPI.libraryGetRecentDocuments(limit);
  }

  /**
   * Ottieni un documento per ID
   */
  async getDocumentById(id) {
    if (!this.initialized) return null;
    return await window.electronAPI.libraryGetDocumentById(id);
  }

  /**
   * Crea un nuovo documento
   */
  async createDocument(docData) {
    if (!this.initialized) return null;
    return await window.electronAPI.libraryCreateDocument(docData);
  }

  /**
   * Aggiorna un documento
   */
  async updateDocument(id, updates) {
    if (!this.initialized) return null;
    return await window.electronAPI.libraryUpdateDocument(id, updates);
  }

  /**
   * Aggiorna data ultimo accesso
   */
  async updateDocumentLastOpened(id) {
    if (!this.initialized) return null;
    return await window.electronAPI.libraryUpdateDocumentLastOpened(id);
  }

  /**
   * Toggle preferito
   */
  async toggleDocumentFavorite(id) {
    if (!this.initialized) return null;
    return await window.electronAPI.libraryToggleDocumentFavorite(id);
  }

  /**
   * Elimina un documento
   */
  async deleteDocument(id) {
    if (!this.initialized) return false;
    return await window.electronAPI.libraryDeleteDocument(id);
  }

  /**
   * Verifica se il file di un documento esiste
   */
  async checkDocumentFileExists(id) {
    if (!this.initialized) return { exists: false };
    return await window.electronAPI.libraryCheckDocumentFileExists(id);
  }

  /**
   * Aggiorna il percorso di un documento (rilocalizzazione)
   */
  async relocateDocument(id, newFilePath) {
    if (!this.initialized) return null;
    return await window.electronAPI.libraryUpdateDocument(id, { filePath: newFilePath });
  }

  // ==================== CATEGORIES ====================

  /**
   * Ottieni tutte le categorie
   */
  async getAllCategories() {
    if (!this.initialized) return [];
    return await window.electronAPI.libraryGetAllCategories();
  }

  /**
   * Ottieni una categoria per ID
   */
  async getCategoryById(id) {
    if (!this.initialized) return null;
    return await window.electronAPI.libraryGetCategoryById(id);
  }

  /**
   * Crea una nuova categoria
   */
  async createCategory(name, color = '#6b7280') {
    if (!this.initialized) return null;
    return await window.electronAPI.libraryCreateCategory(name, color);
  }

  /**
   * Aggiorna una categoria
   */
  async updateCategory(id, updates) {
    if (!this.initialized) return null;
    return await window.electronAPI.libraryUpdateCategory(id, updates);
  }

  /**
   * Elimina una categoria
   */
  async deleteCategory(id) {
    if (!this.initialized) return false;
    return await window.electronAPI.libraryDeleteCategory(id);
  }

  /**
   * Conta documenti per categoria
   */
  async countDocumentsByCategory(categoryId) {
    if (!this.initialized) return 0;
    return await window.electronAPI.libraryCountDocumentsByCategory(categoryId);
  }

  // ==================== SETTINGS ====================

  /**
   * Ottieni un'impostazione
   */
  async getSetting(key) {
    if (!this.initialized) return null;
    return await window.electronAPI.libraryGetSetting(key);
  }

  /**
   * Salva un'impostazione
   */
  async setSetting(key, value) {
    if (!this.initialized) return null;
    return await window.electronAPI.librarySetSetting(key, value);
  }

  /**
   * Ottieni tutte le impostazioni
   */
  async getAllSettings() {
    if (!this.initialized) return {};
    return await window.electronAPI.libraryGetAllSettings();
  }

  // ==================== PDF METADATA ====================

  /**
   * Estrai metadati da un file PDF
   */
  async extractPdfMetadata(filePath) {
    return await window.electronAPI.extractPdfMetadata(filePath);
  }

  // ==================== DOCUMENT DATABASE ====================

  /**
   * Ottieni il percorso del database per un documento
   */
  async getDocumentDatabasePath(documentId) {
    return await window.electronAPI.libraryGetDocumentDatabasePath(documentId);
  }
}

// Singleton instance
let libraryInstance = null;

/**
 * Inizializza la libreria
 */
export async function initLibrary(customPath = null) {
  if (!libraryInstance) {
    libraryInstance = new LibraryManager();
  }
  await libraryInstance.init(customPath);
  return libraryInstance;
}

/**
 * Ottieni l'istanza della libreria
 */
export function getLibrary() {
  return libraryInstance;
}

/**
 * Verifica se esiste una libreria
 */
export async function checkLibraryExists(customPath = null) {
  if (!libraryInstance) {
    libraryInstance = new LibraryManager();
  }
  return await libraryInstance.checkLibraryExists(customPath);
}

export default LibraryManager;
