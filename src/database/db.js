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
    if (!this.storage.getItem(`highlights_${this.bookId}`)) {
      this.storage.setItem(`highlights_${this.bookId}`, JSON.stringify([]));
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
      pageNumber: note.pageNumber,
      selectionText: note.selectionText,
      pdfCoordinates: note.pdfCoordinates,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    notes.push(newNote);
    this.storage.setItem(`notes_${this.bookId}`, JSON.stringify(notes));
    return newNote;
  }

  async updateNote(id, content) {
    const notes = await this.getNotes();
    const index = notes.findIndex(n => n.id === id);
    if (index !== -1) {
      notes[index].content = content;
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

  // --- HIGHLIGHTS ---
  
  async getHighlights() {
    const highlights = JSON.parse(this.storage.getItem(`highlights_${this.bookId}`) || '[]');
    return highlights;
  }

  async saveHighlight(highlight) {
    const highlights = await this.getHighlights();
    const newHighlight = {
      id: Date.now(),
      pageNumber: highlight.pageNumber,
      text: highlight.text,
      color: highlight.color || '#ffff00',
      coordinates: highlight.coordinates,
      noteId: highlight.noteId || null,
      createdAt: new Date().toISOString()
    };
    highlights.push(newHighlight);
    this.storage.setItem(`highlights_${this.bookId}`, JSON.stringify(highlights));
    return newHighlight;
  }

  async deleteHighlight(id) {
    const highlights = await this.getHighlights();
    const filtered = highlights.filter(h => h.id !== id);
    this.storage.setItem(`highlights_${this.bookId}`, JSON.stringify(filtered));
    return true;
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
