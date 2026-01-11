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
  // Tabella Note
  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      pageNumber INTEGER,
      selectionText TEXT,
      pdfCoordinates TEXT,
      annotationId INTEGER,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    )
  `);

  // Tabella Annotazioni (highlights e outlines)
  db.run(`
    CREATE TABLE IF NOT EXISTS annotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('highlight', 'outline')),
      pageNumber INTEGER NOT NULL,
      text TEXT,
      color TEXT NOT NULL,
      opacity REAL DEFAULT 0.35,
      rects TEXT NOT NULL,
      noteId INTEGER,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (noteId) REFERENCES notes(id) ON DELETE SET NULL
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
  db.run(`CREATE INDEX IF NOT EXISTS idx_notes_annotation ON notes(annotationId)`);
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
  const notes = queryAll('SELECT * FROM notes ORDER BY createdAt DESC');
  return notes.map(note => ({
    ...note,
    pdfCoordinates: note.pdfCoordinates ? JSON.parse(note.pdfCoordinates) : null
  }));
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
    `INSERT INTO annotations (type, pageNumber, text, color, opacity, rects, noteId)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      annData.type,
      annData.pageNumber,
      annData.text || null,
      annData.color,
      annData.opacity || 0.35,
      JSON.stringify(annData.rects),
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
  saveSummary
};
