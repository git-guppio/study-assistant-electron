console.log('📊📊📊 DATABASE.JS LOADED - VERSION 2 WITH LOGGING 📊📊📊');

// Lazy load di sql.js per evitare conflitti
let initSqlJs = null;
function getSqlJs() {
  if (!initSqlJs) {
    initSqlJs = require('sql.js');
  }
  return initSqlJs;
}
const path = require('path');
const fs = require('fs');

let db = null;
let currentDbPath = null;
let SQL = null;

/**
 * Inizializza sql.js (una volta sola)
 */
async function initSqlJsOnce() {
  if (!SQL) {
    const sqlJsInit = getSqlJs();
    SQL = await sqlJsInit();
  }
  return SQL;
}

/**
 * Inizializza il database SQLite per un libro specifico
 * Il database viene salvato nella stessa cartella del PDF
 * @param {string} pdfDir - Directory del PDF
 * @param {string} bookId - ID univoco del libro
 */
async function initDatabase(pdfDir, bookId) {
  const dbPath = path.join(pdfDir, `${bookId}.db`);

  // Se il database e' gia' aperto per questo libro, riutilizzalo
  if (db && currentDbPath === dbPath) {
    return { success: true, path: dbPath };
  }

  // Chiudi database precedente se aperto
  if (db) {
    saveToFile(); // Salva prima di chiudere
    db.close();
    db = null;
  }

  try {
    // Assicurati che la directory esista
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    await initSqlJsOnce();

    // Carica database esistente o creane uno nuovo
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }

    currentDbPath = dbPath;

    // Abilita foreign keys
    db.run('PRAGMA foreign_keys = ON');

    // Crea tabelle se non esistono
    createTables();

    // Salva subito per creare il file se nuovo
    saveToFile();

    console.log(`[SQLite] Database inizializzato: ${dbPath}`);
    return { success: true, path: dbPath };
  } catch (error) {
    console.error('[SQLite] Errore inizializzazione:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Salva il database su file
 */
function saveToFile() {
  if (db && currentDbPath) {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(currentDbPath, buffer);
    } catch (error) {
      console.error('[SQLite] Errore salvataggio:', error);
    }
  }
}

/**
 * Crea le tabelle del database
 */
function createTables() {
  // Tabella Note (estesa con campi per il nuovo sistema)
  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      comment TEXT,
      pageNumber INTEGER,
      selectionText TEXT,
      pdfCoordinates TEXT,
      annotationId INTEGER,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    )
  `);

  // Tabella Annotazioni (estesa per supportare tutti i tipi)
  db.run(`
    CREATE TABLE IF NOT EXISTS annotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('highlight', 'outline', 'note', 'flashcard', 'dictionary', 'keyword')),
      pageNumber INTEGER NOT NULL,
      text TEXT,
      color TEXT NOT NULL,
      opacity REAL DEFAULT 0.35,
      rects TEXT NOT NULL,
      gutterIconId TEXT,
      noteId INTEGER,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (noteId) REFERENCES notes(id) ON DELETE SET NULL
    )
  `);

  // Tabella Default Documento (colori e preferenze per documento)
  db.run(`
    CREATE TABLE IF NOT EXISTS document_defaults (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      highlightColor TEXT DEFAULT '#eab308',
      lastNoteIconId TEXT DEFAULT 'note',
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    )
  `);

  // Tabella Colori Custom per Icona (associazione icona-colore personalizzata)
  db.run(`
    CREATE TABLE IF NOT EXISTS document_icon_colors (
      iconId TEXT PRIMARY KEY,
      customColor TEXT NOT NULL,
      updatedAt TEXT DEFAULT (datetime('now'))
    )
  `);

  // Tabella Colori Custom per Azioni (flashcard, dictionary, keyword)
  db.run(`
    CREATE TABLE IF NOT EXISTS document_action_colors (
      actionType TEXT PRIMARY KEY,
      customColor TEXT NOT NULL,
      updatedAt TEXT DEFAULT (datetime('now'))
    )
  `);

  // Tabella Flashcards (per tab Flashcard)
  db.run(`
    CREATE TABLE IF NOT EXISTS flashcards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT,
      answer TEXT,
      annotationId INTEGER,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (annotationId) REFERENCES annotations(id) ON DELETE CASCADE
    )
  `);

  // Tabella Dictionary Entries (per tab Dizionario)
  db.run(`
    CREATE TABLE IF NOT EXISTS dictionary_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      term TEXT NOT NULL,
      definition TEXT,
      pageNumber INTEGER,
      annotationId INTEGER,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (annotationId) REFERENCES annotations(id) ON DELETE CASCADE
    )
  `);

  // Tabella Keywords (per tab Keywords)
  db.run(`
    CREATE TABLE IF NOT EXISTS keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL,
      comment TEXT,
      pageNumber INTEGER,
      annotationId INTEGER,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (annotationId) REFERENCES annotations(id) ON DELETE CASCADE
    )
  `);

  // Tabella Mindmap
  db.run(`
    CREATE TABLE IF NOT EXISTS mindmap (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT,
      updatedAt TEXT DEFAULT (datetime('now'))
    )
  `);

  // Tabella Summary
  db.run(`
    CREATE TABLE IF NOT EXISTS summary (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      content TEXT,
      updatedAt TEXT DEFAULT (datetime('now'))
    )
  `);

  // Indici per performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_annotations_page ON annotations(pageNumber)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_annotations_type ON annotations(type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_notes_annotation ON notes(annotationId)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_flashcards_annotation ON flashcards(annotationId)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_dictionary_annotation ON dictionary_entries(annotationId)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_keywords_annotation ON keywords(annotationId)`);

  // Migrazioni
  migrateOutlineToNote();
  migrateDictionaryAndKeywords();
}

/**
 * Migra i vecchi record 'outline' al nuovo tipo 'note'
 */
function migrateOutlineToNote() {
  try {
    // Verifica se ci sono outline da migrare
    const outlines = queryAll("SELECT id FROM annotations WHERE type = 'outline'");
    if (outlines.length > 0) {
      db.run("UPDATE annotations SET type = 'note', gutterIconId = 'note' WHERE type = 'outline'");
      console.log(`[SQLite] Migrati ${outlines.length} outline -> note`);
      saveToFile();
    }
  } catch (error) {
    console.error('[SQLite] Errore migrazione outline:', error);
  }
}

/**
 * Aggiunge colonne mancanti a dictionary_entries e keywords per database esistenti
 */
function migrateDictionaryAndKeywords() {
  try {
    // Aggiungi pageNumber a dictionary_entries se non esiste
    const dictColumns = db.exec("PRAGMA table_info(dictionary_entries)");
    if (dictColumns.length > 0) {
      const dictColNames = dictColumns[0].values.map(row => row[1]);
      if (!dictColNames.includes('pageNumber')) {
        db.run("ALTER TABLE dictionary_entries ADD COLUMN pageNumber INTEGER");
        console.log('[SQLite] Aggiunta colonna pageNumber a dictionary_entries');
        saveToFile();
      }
    }

    // Aggiungi pageNumber e comment a keywords se non esistono
    const kwColumns = db.exec("PRAGMA table_info(keywords)");
    if (kwColumns.length > 0) {
      const kwColNames = kwColumns[0].values.map(row => row[1]);
      if (!kwColNames.includes('pageNumber')) {
        db.run("ALTER TABLE keywords ADD COLUMN pageNumber INTEGER");
        console.log('[SQLite] Aggiunta colonna pageNumber a keywords');
        saveToFile();
      }
      if (!kwColNames.includes('comment')) {
        db.run("ALTER TABLE keywords ADD COLUMN comment TEXT");
        console.log('[SQLite] Aggiunta colonna comment a keywords');
        saveToFile();
      }
    }
  } catch (error) {
    console.error('[SQLite] Errore migrazione dictionary/keywords:', error);
  }
}

/**
 * Chiude il database
 */
function closeDatabase() {
  if (db) {
    saveToFile();
    db.close();
    db = null;
    currentDbPath = null;
    console.log('[SQLite] Database chiuso');
  }
}

// Helper per eseguire query e ottenere risultati come array di oggetti
function queryAll(sql, params = []) {
  if (!db) return [];
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (error) {
    console.error('[SQLite] Query error:', sql, error);
    return [];
  }
}

function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

function runQuery(sql, params = []) {
  if (!db) return { changes: 0, lastInsertRowid: 0 };
  try {
    db.run(sql, params);
    const changes = db.getRowsModified();
    const lastId = queryOne('SELECT last_insert_rowid() as id');
    saveToFile(); // Auto-save dopo ogni modifica
    return { changes, lastInsertRowid: lastId ? lastId.id : 0 };
  } catch (error) {
    console.error('[SQLite] Run error:', sql, error);
    return { changes: 0, lastInsertRowid: 0 };
  }
}

// ==================== NOTE ====================

function getNotes() {
  const notes = queryAll(`
    SELECT
      n.*,
      a.color as annotation_color,
      a.gutterIconId as annotation_gutterIconId
    FROM notes n
    LEFT JOIN annotations a ON n.annotationId = a.id
    ORDER BY n.createdAt DESC
  `);

  console.log('[DB] getNotes - raw results:', notes.length, notes);

  const mapped = notes.map(note => ({
    ...note,
    pdfCoordinates: note.pdfCoordinates ? JSON.parse(note.pdfCoordinates) : null,
    annotation: note.annotationId ? {
      color: note.annotation_color,
      gutterIconId: note.annotation_gutterIconId
    } : null
  }));

  console.log('[DB] getNotes - mapped results:', mapped);
  return mapped;
}

function getNoteById(id) {
  const note = queryOne('SELECT * FROM notes WHERE id = ?', [id]);
  if (note) {
    note.pdfCoordinates = note.pdfCoordinates ? JSON.parse(note.pdfCoordinates) : null;
  }
  return note;
}

function saveNote(noteData) {
  const result = runQuery(
    `INSERT INTO notes (content, pageNumber, selectionText, pdfCoordinates, annotationId)
     VALUES (?, ?, ?, ?, ?)`,
    [
      noteData.content,
      noteData.pageNumber || null,
      noteData.selectionText || null,
      noteData.pdfCoordinates ? JSON.stringify(noteData.pdfCoordinates) : null,
      noteData.annotationId || null
    ]
  );
  return getNoteById(result.lastInsertRowid);
}

function updateNote(id, updates) {
  const fields = [];
  const values = [];

  if (updates.content !== undefined) {
    fields.push('content = ?');
    values.push(updates.content);
  }
  if (updates.comment !== undefined) {
    fields.push('comment = ?');
    values.push(updates.comment);
  }
  if (updates.pageNumber !== undefined) {
    fields.push('pageNumber = ?');
    values.push(updates.pageNumber);
  }
  if (updates.annotationId !== undefined) {
    fields.push('annotationId = ?');
    values.push(updates.annotationId);
  }

  if (fields.length === 0) return getNoteById(id);

  fields.push("updatedAt = datetime('now')");
  values.push(id);

  runQuery(`UPDATE notes SET ${fields.join(', ')} WHERE id = ?`, values);
  return getNoteById(id);
}

function deleteNote(id) {
  const result = runQuery('DELETE FROM notes WHERE id = ?', [id]);
  return result.changes > 0;
}

// ==================== ANNOTAZIONI ====================

function getAnnotations() {
  const annotations = queryAll('SELECT * FROM annotations ORDER BY pageNumber, createdAt');
  return annotations.map(ann => ({
    ...ann,
    rects: JSON.parse(ann.rects)
  }));
}

function getAnnotationsByPage(pageNumber) {
  const annotations = queryAll(
    'SELECT * FROM annotations WHERE pageNumber = ? ORDER BY createdAt',
    [pageNumber]
  );
  return annotations.map(ann => ({
    ...ann,
    rects: JSON.parse(ann.rects)
  }));
}

function getAnnotationById(id) {
  const ann = queryOne('SELECT * FROM annotations WHERE id = ?', [id]);
  if (ann) {
    ann.rects = JSON.parse(ann.rects);
  }
  return ann;
}

function saveAnnotation(annData) {
  const result = runQuery(
    `INSERT INTO annotations (type, pageNumber, text, color, opacity, rects, gutterIconId, noteId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      annData.type,
      annData.pageNumber,
      annData.text || null,
      annData.color,
      annData.opacity || 0.35,
      JSON.stringify(annData.rects),
      annData.gutterIconId || null,
      annData.noteId || null
    ]
  );
  return getAnnotationById(result.lastInsertRowid);
}

function updateAnnotation(id, updates) {
  const fields = [];
  const values = [];

  if (updates.color !== undefined) {
    fields.push('color = ?');
    values.push(updates.color);
  }
  if (updates.opacity !== undefined) {
    fields.push('opacity = ?');
    values.push(updates.opacity);
  }
  if (updates.noteId !== undefined) {
    fields.push('noteId = ?');
    values.push(updates.noteId);
  }
  if (updates.gutterIconId !== undefined) {
    fields.push('gutterIconId = ?');
    values.push(updates.gutterIconId);
  }

  if (fields.length === 0) return getAnnotationById(id);

  values.push(id);
  runQuery(`UPDATE annotations SET ${fields.join(', ')} WHERE id = ?`, values);
  return getAnnotationById(id);
}

function deleteAnnotation(id) {
  const result = runQuery('DELETE FROM annotations WHERE id = ?', [id]);
  return result.changes > 0;
}

// ==================== MINDMAP ====================

function getMindmap() {
  const row = queryOne('SELECT * FROM mindmap WHERE id = 1');
  if (row && row.data) {
    return {
      data: JSON.parse(row.data),
      updatedAt: row.updatedAt
    };
  }
  return null;
}

function saveMindmap(data) {
  runQuery(
    `INSERT INTO mindmap (id, data, updatedAt)
     VALUES (1, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       data = excluded.data,
       updatedAt = datetime('now')`,
    [JSON.stringify(data)]
  );
  return getMindmap();
}

// ==================== SUMMARY ====================

function getSummary() {
  return queryOne('SELECT * FROM summary WHERE id = 1');
}

function saveSummary(content) {
  runQuery(
    `INSERT INTO summary (id, content, updatedAt)
     VALUES (1, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       content = excluded.content,
       updatedAt = datetime('now')`,
    [content]
  );
  return getSummary();
}

// ==================== DOCUMENT DEFAULTS ====================

function getDocumentDefaults() {
  let defaults = queryOne('SELECT * FROM document_defaults WHERE id = 1');
  if (!defaults) {
    // Crea defaults se non esistono
    runQuery(
      `INSERT INTO document_defaults (id, highlightColor, lastNoteIconId)
       VALUES (1, '#eab308', 'note')`
    );
    defaults = queryOne('SELECT * FROM document_defaults WHERE id = 1');
  }
  return defaults;
}

function updateDocumentDefaults(updates) {
  const fields = [];
  const values = [];

  if (updates.highlightColor !== undefined) {
    fields.push('highlightColor = ?');
    values.push(updates.highlightColor);
  }
  if (updates.lastNoteIconId !== undefined) {
    fields.push('lastNoteIconId = ?');
    values.push(updates.lastNoteIconId);
  }

  if (fields.length === 0) return getDocumentDefaults();

  fields.push("updatedAt = datetime('now')");
  runQuery(
    `INSERT INTO document_defaults (id) VALUES (1) ON CONFLICT(id) DO UPDATE SET ${fields.join(', ')}`,
    values
  );
  return getDocumentDefaults();
}

// ==================== ICON COLORS (CUSTOM) ====================

function getCustomIconColor(iconId) {
  const row = queryOne('SELECT customColor FROM document_icon_colors WHERE iconId = ?', [iconId]);
  return row ? row.customColor : null;
}

function getAllCustomIconColors() {
  return queryAll('SELECT * FROM document_icon_colors');
}

function upsertCustomIconColor(iconId, color) {
  runQuery(
    `INSERT INTO document_icon_colors (iconId, customColor, updatedAt)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(iconId) DO UPDATE SET
       customColor = excluded.customColor,
       updatedAt = datetime('now')`,
    [iconId, color]
  );
  return getCustomIconColor(iconId);
}

function deleteCustomIconColor(iconId) {
  const result = runQuery('DELETE FROM document_icon_colors WHERE iconId = ?', [iconId]);
  return result.changes > 0;
}

// ==================== ACTION COLORS (CUSTOM) ====================

function getCustomActionColor(actionType) {
  const row = queryOne('SELECT customColor FROM document_action_colors WHERE actionType = ?', [actionType]);
  return row ? row.customColor : null;
}

function getAllCustomActionColors() {
  return queryAll('SELECT * FROM document_action_colors');
}

function upsertCustomActionColor(actionType, color) {
  runQuery(
    `INSERT INTO document_action_colors (actionType, customColor, updatedAt)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(actionType) DO UPDATE SET
       customColor = excluded.customColor,
       updatedAt = datetime('now')`,
    [actionType, color]
  );
  return getCustomActionColor(actionType);
}

function deleteCustomActionColor(actionType) {
  const result = runQuery('DELETE FROM document_action_colors WHERE actionType = ?', [actionType]);
  return result.changes > 0;
}

// ==================== FLASHCARDS ====================

function getFlashcards() {
  const cards = queryAll('SELECT * FROM flashcards ORDER BY createdAt DESC');
  return cards;
}

function getFlashcardById(id) {
  return queryOne('SELECT * FROM flashcards WHERE id = ?', [id]);
}

function saveFlashcard(data) {
  const result = runQuery(
    `INSERT INTO flashcards (question, answer, annotationId)
     VALUES (?, ?, ?)`,
    [data.question || '', data.answer || '', data.annotationId || null]
  );
  return getFlashcardById(result.lastInsertRowid);
}

function updateFlashcard(id, updates) {
  const fields = [];
  const values = [];

  if (updates.question !== undefined) {
    fields.push('question = ?');
    values.push(updates.question);
  }
  if (updates.answer !== undefined) {
    fields.push('answer = ?');
    values.push(updates.answer);
  }

  if (fields.length === 0) return getFlashcardById(id);

  fields.push("updatedAt = datetime('now')");
  values.push(id);
  runQuery(`UPDATE flashcards SET ${fields.join(', ')} WHERE id = ?`, values);
  return getFlashcardById(id);
}

function deleteFlashcard(id) {
  const result = runQuery('DELETE FROM flashcards WHERE id = ?', [id]);
  return result.changes > 0;
}

// ==================== DICTIONARY ENTRIES ====================

function getDictionaryEntries() {
  return queryAll('SELECT * FROM dictionary_entries ORDER BY term ASC');
}

function getDictionaryEntryById(id) {
  return queryOne('SELECT * FROM dictionary_entries WHERE id = ?', [id]);
}

function saveDictionaryEntry(data) {
  const result = runQuery(
    `INSERT INTO dictionary_entries (term, definition, pageNumber, annotationId)
     VALUES (?, ?, ?, ?)`,
    [data.term, data.definition || '', data.pageNumber || null, data.annotationId || null]
  );
  return getDictionaryEntryById(result.lastInsertRowid);
}

function updateDictionaryEntry(id, updates) {
  const fields = [];
  const values = [];

  if (updates.term !== undefined) {
    fields.push('term = ?');
    values.push(updates.term);
  }
  if (updates.definition !== undefined) {
    fields.push('definition = ?');
    values.push(updates.definition);
  }

  if (fields.length === 0) return getDictionaryEntryById(id);

  fields.push("updatedAt = datetime('now')");
  values.push(id);
  runQuery(`UPDATE dictionary_entries SET ${fields.join(', ')} WHERE id = ?`, values);
  return getDictionaryEntryById(id);
}

function deleteDictionaryEntry(id) {
  const result = runQuery('DELETE FROM dictionary_entries WHERE id = ?', [id]);
  return result.changes > 0;
}

// ==================== KEYWORDS ====================

function getKeywords() {
  return queryAll('SELECT * FROM keywords ORDER BY keyword ASC');
}

function getKeywordById(id) {
  return queryOne('SELECT * FROM keywords WHERE id = ?', [id]);
}

function saveKeyword(data) {
  // Supporta sia 'term' (dal frontend) che 'keyword' (per retrocompatibilità)
  const keyword = data.term || data.keyword;
  const result = runQuery(
    `INSERT INTO keywords (keyword, comment, pageNumber, annotationId)
     VALUES (?, ?, ?, ?)`,
    [keyword, data.comment || '', data.pageNumber || null, data.annotationId || null]
  );
  return getKeywordById(result.lastInsertRowid);
}

function updateKeyword(id, updates) {
  const fields = [];
  const values = [];

  // Supporta sia 'term' che 'keyword'
  if (updates.term !== undefined || updates.keyword !== undefined) {
    fields.push('keyword = ?');
    values.push(updates.term || updates.keyword);
  }
  if (updates.comment !== undefined) {
    fields.push('comment = ?');
    values.push(updates.comment);
  }

  if (fields.length === 0) return getKeywordById(id);

  fields.push("updatedAt = datetime('now')");
  values.push(id);
  runQuery(`UPDATE keywords SET ${fields.join(', ')} WHERE id = ?`, values);
  return getKeywordById(id);
}

function deleteKeyword(id) {
  const result = runQuery('DELETE FROM keywords WHERE id = ?', [id]);
  return result.changes > 0;
}

// ==================== EXPORT ====================

module.exports = {
  initDatabase,
  closeDatabase,
  // Notes
  getNotes,
  getNoteById,
  saveNote,
  updateNote,
  deleteNote,
  // Annotations
  getAnnotations,
  getAnnotationsByPage,
  getAnnotationById,
  saveAnnotation,
  updateAnnotation,
  deleteAnnotation,
  // Mindmap
  getMindmap,
  saveMindmap,
  // Summary
  getSummary,
  saveSummary,
  // Document Defaults
  getDocumentDefaults,
  updateDocumentDefaults,
  // Custom Icon Colors
  getCustomIconColor,
  getAllCustomIconColors,
  upsertCustomIconColor,
  deleteCustomIconColor,
  // Custom Action Colors
  getCustomActionColor,
  getAllCustomActionColors,
  upsertCustomActionColor,
  deleteCustomActionColor,
  // Flashcards
  getFlashcards,
  getFlashcardById,
  saveFlashcard,
  updateFlashcard,
  deleteFlashcard,
  // Dictionary
  getDictionaryEntries,
  getDictionaryEntryById,
  saveDictionaryEntry,
  updateDictionaryEntry,
  deleteDictionaryEntry,
  // Keywords
  getKeywords,
  getKeywordById,
  saveKeyword,
  updateKeyword,
  deleteKeyword
};
