// Database manager usando SQLite via IPC
// Il database SQLite viene gestito nel main process (electron/database.js)
// Questo modulo espone un'interfaccia async che comunica via IPC

class DatabaseManager {
  constructor() {
    this.initialized = false;
    this.bookId = null;
    this.documentId = null;
  }

  async init(pdfDirectory, bookId, documentId = null) {
    this.bookId = bookId;
    this.documentId = documentId;

    try {
      const result = await window.electronAPI.dbInit(pdfDirectory, bookId, documentId);
      if (result.success) {
        this.initialized = true;
        console.log('[DB] Database SQLite inizializzato:', result.path);
      } else {
        console.error('[DB] Errore inizializzazione:', result.error);
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('[DB] Errore init:', error);
      throw error;
    }
  }

  async close() {
    if (this.initialized) {
      await window.electronAPI.dbClose();
      this.initialized = false;
      console.log('[DB] Database chiuso');
    }
  }

  // --- NOTES ---

  async getNotes() {
    if (!this.initialized) return [];
    return await window.electronAPI.dbGetNotes();
  }

  async getNoteById(id) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbGetNote(id);
  }

  async saveNote(note) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbSaveNote({
      content: note.content,
      pageNumber: note.pageNumber || null,
      selectionText: note.selectionText || null,
      pdfCoordinates: note.pdfCoordinates || null,
      annotationId: note.annotationId || null
    });
  }

  async updateNote(id, updates) {
    if (!this.initialized) return null;
    // Supporta aggiornamento con stringa (solo content) o oggetto
    const updateData = typeof updates === 'string'
      ? { content: updates }
      : updates;
    return await window.electronAPI.dbUpdateNote(id, updateData);
  }

  async deleteNote(id) {
    if (!this.initialized) return false;
    return await window.electronAPI.dbDeleteNote(id);
  }

  // --- ANNOTATIONS (Highlights + Notes + Actions) ---

  async getAnnotations() {
    if (!this.initialized) return [];
    return await window.electronAPI.dbGetAnnotations();
  }

  async getAnnotationsByPage(pageNumber) {
    if (!this.initialized) return [];
    return await window.electronAPI.dbGetAnnotationsByPage(pageNumber);
  }

  async getAnnotationById(id) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbGetAnnotation(id);
  }

  async saveAnnotation(annotation) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbSaveAnnotation({
      type: annotation.type || 'highlight',
      pageNumber: annotation.pageNumber,
      text: annotation.text || null,
      color: annotation.color || '#eab308',
      opacity: annotation.opacity || 0.35,
      rects: annotation.rects || [],
      gutterIconId: annotation.gutterIconId || null,
      noteId: annotation.noteId || null
    });
  }

  async updateAnnotation(id, updates) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbUpdateAnnotation(id, updates);
  }

  async deleteAnnotation(id) {
    if (!this.initialized) return false;
    return await window.electronAPI.dbDeleteAnnotation(id);
  }

  // Legacy methods for backward compatibility
  async getHighlights() {
    return this.getAnnotations();
  }

  async saveHighlight(highlight) {
    return this.saveAnnotation(highlight);
  }

  async deleteHighlight(id) {
    return this.deleteAnnotation(id);
  }

  // --- MINDMAP (legacy) ---

  async getMindmap() {
    if (!this.initialized) return null;
    return await window.electronAPI.dbGetMindmap();
  }

  async saveMindmap(data) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbSaveMindmap(data);
  }

  // --- MINDMAPS (multiple) ---

  async getAllMindmaps() {
    if (!this.initialized) return [];
    return await window.electronAPI.dbGetAllMindmaps();
  }

  async getMindmapById(id) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbGetMindmapById(id);
  }

  async createMindmap(name, color) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbCreateMindmap(name, color);
  }

  async updateMindmapData(id, data) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbUpdateMindmapData(id, data);
  }

  async updateMindmapInfo(id, updates) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbUpdateMindmapInfo(id, updates);
  }

  async deleteMindmap(id) {
    if (!this.initialized) return false;
    return await window.electronAPI.dbDeleteMindmap(id);
  }

  async countMindmaps() {
    if (!this.initialized) return 0;
    return await window.electronAPI.dbCountMindmaps();
  }

  // --- SUMMARY ---

  async getSummary() {
    if (!this.initialized) return null;
    return await window.electronAPI.dbGetSummary();
  }

  async saveSummary(content) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbSaveSummary(content);
  }

  // --- DOCUMENT DEFAULTS ---

  async getDocumentDefaults() {
    if (!this.initialized) return null;
    return await window.electronAPI.dbGetDocumentDefaults();
  }

  async updateDocumentDefaults(updates) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbUpdateDocumentDefaults(updates);
  }

  // --- CUSTOM ICON COLORS ---

  async getCustomIconColor(iconId) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbGetCustomIconColor(iconId);
  }

  async getAllCustomIconColors() {
    if (!this.initialized) return [];
    return await window.electronAPI.dbGetAllCustomIconColors();
  }

  async upsertCustomIconColor(iconId, color) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbUpsertCustomIconColor(iconId, color);
  }

  async deleteCustomIconColor(iconId) {
    if (!this.initialized) return false;
    return await window.electronAPI.dbDeleteCustomIconColor(iconId);
  }

  // --- CUSTOM ACTION COLORS ---

  async getCustomActionColor(actionType) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbGetCustomActionColor(actionType);
  }

  async getAllCustomActionColors() {
    if (!this.initialized) return [];
    return await window.electronAPI.dbGetAllCustomActionColors();
  }

  async upsertCustomActionColor(actionType, color) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbUpsertCustomActionColor(actionType, color);
  }

  async deleteCustomActionColor(actionType) {
    if (!this.initialized) return false;
    return await window.electronAPI.dbDeleteCustomActionColor(actionType);
  }

  // --- FLASHCARDS ---

  async getFlashcards() {
    if (!this.initialized) return [];
    return await window.electronAPI.dbGetFlashcards();
  }

  async getFlashcardById(id) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbGetFlashcard(id);
  }

  async saveFlashcard(data) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbSaveFlashcard(data);
  }

  async updateFlashcard(id, updates) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbUpdateFlashcard(id, updates);
  }

  async deleteFlashcard(id) {
    if (!this.initialized) return false;
    return await window.electronAPI.dbDeleteFlashcard(id);
  }

  // --- DICTIONARY ---

  async getDictionaryEntries() {
    if (!this.initialized) return [];
    return await window.electronAPI.dbGetDictionaryEntries();
  }

  async getDictionaryEntryById(id) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbGetDictionaryEntry(id);
  }

  async saveDictionaryEntry(data) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbSaveDictionaryEntry(data);
  }

  async updateDictionaryEntry(id, updates) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbUpdateDictionaryEntry(id, updates);
  }

  async deleteDictionaryEntry(id) {
    if (!this.initialized) return false;
    return await window.electronAPI.dbDeleteDictionaryEntry(id);
  }

  // --- KEYWORDS ---

  async getKeywords() {
    if (!this.initialized) return [];
    return await window.electronAPI.dbGetKeywords();
  }

  async getKeywordById(id) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbGetKeyword(id);
  }

  async saveKeyword(data) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbSaveKeyword(data);
  }

  async updateKeyword(id, updates) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbUpdateKeyword(id, updates);
  }

  async deleteKeyword(id) {
    if (!this.initialized) return false;
    return await window.electronAPI.dbDeleteKeyword(id);
  }

  // --- BOOKMARKS ---

  async getBookmarks() {
    if (!this.initialized) return [];
    return await window.electronAPI.dbGetBookmarks();
  }

  async getBookmarkById(id) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbGetBookmark(id);
  }

  async getBookmarkByPage(pageNumber) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbGetBookmarkByPage(pageNumber);
  }

  async saveBookmark(data) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbSaveBookmark(data);
  }

  async updateBookmark(id, updates) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbUpdateBookmark(id, updates);
  }

  async deleteBookmark(id) {
    if (!this.initialized) return false;
    return await window.electronAPI.dbDeleteBookmark(id);
  }
}

// Singleton instance
let dbInstance = null;

export async function initDatabase(pdfDirectory, bookId) {
  if (!dbInstance) {
    dbInstance = new DatabaseManager();
  }
  await dbInstance.init(pdfDirectory, bookId);
  return dbInstance;
}

export function getDatabase() {
  return dbInstance;
}

export default DatabaseManager;
