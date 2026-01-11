// Database manager usando SQLite via IPC
// Il database SQLite viene gestito nel main process (electron/database.js)
// Questo modulo espone un'interfaccia async che comunica via IPC

class DatabaseManager {
  constructor() {
    this.initialized = false;
    this.bookId = null;
  }

  async init(pdfDirectory, bookId) {
    this.bookId = bookId;

    try {
      const result = await window.electronAPI.dbInit(pdfDirectory, bookId);
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

  // --- ANNOTATIONS (Highlights + Outlines) ---

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
      color: annotation.color || (annotation.type === 'outline' ? '#8b5cf6' : '#ffff00'),
      opacity: annotation.opacity || (annotation.type === 'outline' ? 0.08 : 0.35),
      rects: annotation.rects || [],
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

  // --- MINDMAP ---

  async getMindmap() {
    if (!this.initialized) return null;
    return await window.electronAPI.dbGetMindmap();
  }

  async saveMindmap(data) {
    if (!this.initialized) return null;
    return await window.electronAPI.dbSaveMindmap(data);
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
