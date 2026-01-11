// Database manager usando SQLite
// Nota: In Electron, better-sqlite3 deve essere usato nel main process
// Per ora usiamo localStorage come mock, poi integreremo SQLite via IPC

class DatabaseManager {
  constructor() {
    this.dbPath = null;
    this.bookId = null;
  }

  async init(pdfDirectory, bookId) {
    this.dbPath = `${pdfDirectory}/book_notes_${bookId}.db`;
    this.bookId = bookId;

    console.log('📦 Database path:', this.dbPath);

    // Per ora usiamo localStorage come storage temporaneo
    // TODO: Implementare SQLite via IPC con main process
    this.storage = window.localStorage;

    // Inizializza le tabelle se non esistono
    this.initTables();
  }

  initTables() {
    // Crea le "tabelle" in localStorage se non esistono
    if (!this.storage.getItem(`notes_${this.bookId}`)) {
      this.storage.setItem(`notes_${this.bookId}`, JSON.stringify([]));
    }
    if (!this.storage.getItem(`annotations_${this.bookId}`)) {
      this.storage.setItem(`annotations_${this.bookId}`, JSON.stringify([]));
    }
    if (!this.storage.getItem(`mindmap_${this.bookId}`)) {
      this.storage.setItem(`mindmap_${this.bookId}`, JSON.stringify(null));
    }
    if (!this.storage.getItem(`summary_${this.bookId}`)) {
      this.storage.setItem(`summary_${this.bookId}`, JSON.stringify(null));
    }
  }

  // --- NOTES ---

  async getNotes() {
    const notes = JSON.parse(this.storage.getItem(`notes_${this.bookId}`) || '[]');
    return notes;
  }

  async saveNote(note) {
    const notes = await this.getNotes();
    const newNote = {
      id: Date.now(),
      content: note.content,
      pageNumber: note.pageNumber || null,
      selectionText: note.selectionText || null,
      pdfCoordinates: note.pdfCoordinates || null,
      annotationId: note.annotationId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    notes.push(newNote);
    this.storage.setItem(`notes_${this.bookId}`, JSON.stringify(notes));
    return newNote;
  }

  async updateNote(id, updates) {
    const notes = await this.getNotes();
    const index = notes.findIndex(n => n.id === id);
    if (index !== -1) {
      // Supporta aggiornamento parziale
      if (typeof updates === 'string') {
        notes[index].content = updates;
      } else {
        notes[index] = { ...notes[index], ...updates };
      }
      notes[index].updatedAt = new Date().toISOString();
      this.storage.setItem(`notes_${this.bookId}`, JSON.stringify(notes));
      return notes[index];
    }
    return null;
  }

  async deleteNote(id) {
    const notes = await this.getNotes();
    const filtered = notes.filter(n => n.id !== id);
    this.storage.setItem(`notes_${this.bookId}`, JSON.stringify(filtered));
    return true;
  }

  async getNoteById(id) {
    const notes = await this.getNotes();
    return notes.find(n => n.id === id) || null;
  }

  // --- ANNOTATIONS (Highlights + Outlines) ---

  async getAnnotations() {
    const annotations = JSON.parse(this.storage.getItem(`annotations_${this.bookId}`) || '[]');
    return annotations;
  }

  async getAnnotationsByPage(pageNumber) {
    const annotations = await this.getAnnotations();
    return annotations.filter(a => a.pageNumber === pageNumber);
  }

  async saveAnnotation(annotation) {
    const annotations = await this.getAnnotations();
    const newAnnotation = {
      id: Date.now(),
      type: annotation.type || 'highlight', // 'highlight' | 'outline'
      pageNumber: annotation.pageNumber,
      text: annotation.text,
      color: annotation.color || (annotation.type === 'outline' ? '#8b5cf6' : '#ffff00'),
      opacity: annotation.opacity || (annotation.type === 'outline' ? 0.08 : 0.35),
      rects: annotation.rects || [], // Array di { x, y, width, height } normalizzati 0-1
      noteId: annotation.noteId || null,
      createdAt: new Date().toISOString()
    };
    annotations.push(newAnnotation);
    this.storage.setItem(`annotations_${this.bookId}`, JSON.stringify(annotations));
    return newAnnotation;
  }

  async updateAnnotation(id, updates) {
    const annotations = await this.getAnnotations();
    const index = annotations.findIndex(a => a.id === id);
    if (index !== -1) {
      annotations[index] = { ...annotations[index], ...updates };
      this.storage.setItem(`annotations_${this.bookId}`, JSON.stringify(annotations));
      return annotations[index];
    }
    return null;
  }

  async deleteAnnotation(id) {
    const annotations = await this.getAnnotations();
    const filtered = annotations.filter(a => a.id !== id);
    this.storage.setItem(`annotations_${this.bookId}`, JSON.stringify(filtered));
    return true;
  }

  async getAnnotationById(id) {
    const annotations = await this.getAnnotations();
    return annotations.find(a => a.id === id) || null;
  }

  // Legacy method for backward compatibility
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
    const mindmap = JSON.parse(this.storage.getItem(`mindmap_${this.bookId}`) || 'null');
    return mindmap;
  }

  async saveMindmap(data) {
    const mindmap = {
      data: data,
      updatedAt: new Date().toISOString()
    };
    this.storage.setItem(`mindmap_${this.bookId}`, JSON.stringify(mindmap));
    return mindmap;
  }

  // --- SUMMARY ---

  async getSummary() {
    const summary = JSON.parse(this.storage.getItem(`summary_${this.bookId}`) || 'null');
    return summary;
  }

  async saveSummary(content) {
    const summary = {
      content: content,
      updatedAt: new Date().toISOString()
    };
    this.storage.setItem(`summary_${this.bookId}`, JSON.stringify(summary));
    return summary;
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
