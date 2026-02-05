/**
 * Library Database Manager
 * Gestisce il database centrale library.db che contiene:
 * - Indice dei documenti
 * - Categorie personalizzate
 * - Impostazioni applicazione
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Lazy load di sql.js
let initSqlJs = null;
function getSqlJs() {
  if (!initSqlJs) {
    initSqlJs = require('sql.js');
  }
  return initSqlJs;
}

let db = null;
let SQL = null;
let libraryPath = null;

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
 * Ottieni il percorso della libreria
 * @param {string} customPath - Percorso personalizzato (opzionale)
 * @returns {string} - Percorso della cartella libreria
 */
function getLibraryPath(customPath = null) {
  if (customPath) {
    return customPath;
  }

  // Percorso di default: %APPDATA%/study-assistant
  const { app } = require('electron');
  return path.join(app.getPath('userData'), 'library');
}

/**
 * Verifica se la libreria esiste
 * @param {string} libraryDir - Percorso della libreria
 * @returns {boolean}
 */
function libraryExists(libraryDir) {
  const dbPath = path.join(libraryDir, 'library.db');
  return fs.existsSync(dbPath);
}

/**
 * Inizializza il database della libreria
 * @param {string} customPath - Percorso personalizzato (opzionale)
 */
async function initLibraryDatabase(customPath = null) {
  libraryPath = getLibraryPath(customPath);
  const dbPath = path.join(libraryPath, 'library.db');

  // Se il database è già aperto per questo percorso, riutilizzalo
  if (db && libraryPath === getLibraryPath(customPath)) {
    return { success: true, path: dbPath, isNew: false };
  }

  // Chiudi database precedente se aperto
  if (db) {
    saveLibraryToFile();
    db.close();
    db = null;
  }

  try {
    // Crea la directory se non esiste
    if (!fs.existsSync(libraryPath)) {
      fs.mkdirSync(libraryPath, { recursive: true });
    }

    // Crea la cartella documents se non esiste
    const documentsDir = path.join(libraryPath, 'documents');
    if (!fs.existsSync(documentsDir)) {
      fs.mkdirSync(documentsDir, { recursive: true });
    }

    await initSqlJsOnce();

    const isNew = !fs.existsSync(dbPath);

    // Carica database esistente o creane uno nuovo
    if (!isNew) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }

    // Abilita foreign keys
    db.run('PRAGMA foreign_keys = ON');

    // Crea tabelle se non esistono
    createLibraryTables();

    // Salva subito
    saveLibraryToFile();

    console.log(`[LibraryDB] Database inizializzato: ${dbPath}`);
    return { success: true, path: dbPath, libraryPath, isNew };
  } catch (error) {
    console.error('[LibraryDB] Errore inizializzazione:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Salva il database su file
 */
function saveLibraryToFile() {
  if (db && libraryPath) {
    try {
      const dbPath = path.join(libraryPath, 'library.db');
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    } catch (error) {
      console.error('[LibraryDB] Errore salvataggio:', error);
    }
  }
}

/**
 * Crea le tabelle del database libreria
 */
function createLibraryTables() {
  // Tabella Documenti
  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      authors TEXT,
      publisher TEXT,
      isbn TEXT,
      year INTEGER,
      file_path TEXT NOT NULL,
      file_hash TEXT,
      is_favorite INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      last_opened_at TEXT,
      -- Statistics (cached, updated on document close)
      stat_notes INTEGER DEFAULT 0,
      stat_dictionary INTEGER DEFAULT 0,
      stat_keywords INTEGER DEFAULT 0,
      stat_mindmaps INTEGER DEFAULT 0,
      stat_bookmarks INTEGER DEFAULT 0,
      stat_flashcards INTEGER DEFAULT 0,
      stat_annotations INTEGER DEFAULT 0
    )
  `);

  // Migrazione: aggiungi colonne statistiche se non esistono
  try {
    db.run('ALTER TABLE documents ADD COLUMN stat_notes INTEGER DEFAULT 0');
  } catch (e) { /* colonna già esistente */ }
  try {
    db.run('ALTER TABLE documents ADD COLUMN stat_dictionary INTEGER DEFAULT 0');
  } catch (e) { /* colonna già esistente */ }
  try {
    db.run('ALTER TABLE documents ADD COLUMN stat_keywords INTEGER DEFAULT 0');
  } catch (e) { /* colonna già esistente */ }
  try {
    db.run('ALTER TABLE documents ADD COLUMN stat_mindmaps INTEGER DEFAULT 0');
  } catch (e) { /* colonna già esistente */ }
  try {
    db.run('ALTER TABLE documents ADD COLUMN stat_bookmarks INTEGER DEFAULT 0');
  } catch (e) { /* colonna già esistente */ }
  try {
    db.run('ALTER TABLE documents ADD COLUMN stat_flashcards INTEGER DEFAULT 0');
  } catch (e) { /* colonna già esistente */ }
  try {
    db.run('ALTER TABLE documents ADD COLUMN stat_annotations INTEGER DEFAULT 0');
  } catch (e) { /* colonna già esistente */ }

  // Tabella Categorie
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#6b7280',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Tabella relazione documenti-categorie
  db.run(`
    CREATE TABLE IF NOT EXISTS document_categories (
      document_id TEXT,
      category_id INTEGER,
      PRIMARY KEY (document_id, category_id),
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  // Tabella Impostazioni
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // Indici per performance
  db.run('CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title)');
  db.run('CREATE INDEX IF NOT EXISTS idx_documents_favorite ON documents(is_favorite)');
  db.run('CREATE INDEX IF NOT EXISTS idx_documents_last_opened ON documents(last_opened_at DESC)');
  db.run('CREATE INDEX IF NOT EXISTS idx_categories_order ON categories(sort_order)');
}

/**
 * Chiudi il database
 */
function closeLibraryDatabase() {
  if (db) {
    saveLibraryToFile();
    db.close();
    db = null;
    libraryPath = null;
    console.log('[LibraryDB] Database chiuso');
  }
}

// ==================== HELPER FUNCTIONS ====================

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
    console.error('[LibraryDB] Query error:', sql, error);
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
    saveLibraryToFile();
    return { changes, lastInsertRowid: lastId ? lastId.id : 0 };
  } catch (error) {
    console.error('[LibraryDB] Run error:', sql, error);
    return { changes: 0, lastInsertRowid: 0 };
  }
}

// ==================== DOCUMENTS ====================

/**
 * Genera un nuovo UUID per documento
 */
function generateDocumentId() {
  return crypto.randomUUID();
}

/**
 * Ottieni tutti i documenti
 */
function getAllDocuments() {
  const docs = queryAll(`
    SELECT d.*,
           GROUP_CONCAT(c.id) as category_ids,
           GROUP_CONCAT(c.name) as category_names
    FROM documents d
    LEFT JOIN document_categories dc ON d.id = dc.document_id
    LEFT JOIN categories c ON dc.category_id = c.id
    GROUP BY d.id
    ORDER BY d.last_opened_at DESC NULLS LAST, d.created_at DESC
  `);

  return docs.map(doc => ({
    ...doc,
    authors: doc.authors ? JSON.parse(doc.authors) : [],
    categories: doc.category_ids
      ? doc.category_ids.split(',').map((id, i) => ({
          id: parseInt(id),
          name: doc.category_names.split(',')[i]
        }))
      : []
  }));
}

/**
 * Ottieni documenti filtrati
 */
function getDocuments(filters = {}) {
  let sql = `
    SELECT DISTINCT d.*,
           GROUP_CONCAT(DISTINCT c.id) as category_ids,
           GROUP_CONCAT(DISTINCT c.name) as category_names
    FROM documents d
    LEFT JOIN document_categories dc ON d.id = dc.document_id
    LEFT JOIN categories c ON dc.category_id = c.id
  `;

  const conditions = [];
  const params = [];

  // Filtro per categoria
  if (filters.categoryId) {
    sql = `
      SELECT DISTINCT d.*,
             GROUP_CONCAT(DISTINCT c2.id) as category_ids,
             GROUP_CONCAT(DISTINCT c2.name) as category_names
      FROM documents d
      INNER JOIN document_categories dc_filter ON d.id = dc_filter.document_id AND dc_filter.category_id = ?
      LEFT JOIN document_categories dc ON d.id = dc.document_id
      LEFT JOIN categories c2 ON dc.category_id = c2.id
    `;
    params.push(filters.categoryId);
  }

  // Filtro preferiti
  if (filters.favoritesOnly) {
    conditions.push('d.is_favorite = 1');
  }

  // Filtro ricerca testo
  if (filters.search) {
    conditions.push('(d.title LIKE ? OR d.authors LIKE ? OR d.publisher LIKE ?)');
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' GROUP BY d.id';

  // Ordinamento
  const orderBy = filters.orderBy || 'last_opened_at';
  const orderDir = filters.orderDir || 'DESC';

  switch (orderBy) {
    case 'title':
      sql += ` ORDER BY d.title ${orderDir}`;
      break;
    case 'authors':
      sql += ` ORDER BY d.authors ${orderDir}`;
      break;
    case 'created_at':
      sql += ` ORDER BY d.created_at ${orderDir}`;
      break;
    case 'last_opened_at':
    default:
      sql += ` ORDER BY d.last_opened_at ${orderDir} NULLS LAST, d.created_at DESC`;
  }

  const docs = queryAll(sql, params);

  return docs.map(doc => ({
    ...doc,
    authors: doc.authors ? JSON.parse(doc.authors) : [],
    categories: doc.category_ids
      ? doc.category_ids.split(',').map((id, i) => ({
          id: parseInt(id),
          name: doc.category_names.split(',')[i]
        }))
      : []
  }));
}

/**
 * Ottieni documenti recenti
 */
function getRecentDocuments(limit = 10) {
  const docs = queryAll(`
    SELECT d.*,
           GROUP_CONCAT(c.id) as category_ids,
           GROUP_CONCAT(c.name) as category_names
    FROM documents d
    LEFT JOIN document_categories dc ON d.id = dc.document_id
    LEFT JOIN categories c ON dc.category_id = c.id
    WHERE d.last_opened_at IS NOT NULL
    GROUP BY d.id
    ORDER BY d.last_opened_at DESC
    LIMIT ?
  `, [limit]);

  return docs.map(doc => ({
    ...doc,
    authors: doc.authors ? JSON.parse(doc.authors) : [],
    categories: doc.category_ids
      ? doc.category_ids.split(',').map((id, i) => ({
          id: parseInt(id),
          name: doc.category_names.split(',')[i]
        }))
      : []
  }));
}

/**
 * Ottieni un documento per ID
 */
function getDocumentById(id) {
  const doc = queryOne(`
    SELECT d.*,
           GROUP_CONCAT(c.id) as category_ids,
           GROUP_CONCAT(c.name) as category_names
    FROM documents d
    LEFT JOIN document_categories dc ON d.id = dc.document_id
    LEFT JOIN categories c ON dc.category_id = c.id
    WHERE d.id = ?
    GROUP BY d.id
  `, [id]);

  if (!doc) return null;

  return {
    ...doc,
    authors: doc.authors ? JSON.parse(doc.authors) : [],
    categories: doc.category_ids
      ? doc.category_ids.split(',').map((catId, i) => ({
          id: parseInt(catId),
          name: doc.category_names.split(',')[i]
        }))
      : []
  };
}

/**
 * Crea un nuovo documento
 */
function createDocument(docData) {
  const id = generateDocumentId();

  runQuery(`
    INSERT INTO documents (id, title, authors, publisher, isbn, year, file_path, file_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    docData.title,
    docData.authors ? JSON.stringify(docData.authors) : null,
    docData.publisher || null,
    docData.isbn || null,
    docData.year || null,
    docData.filePath,
    docData.fileHash || null
  ]);

  // Aggiungi categorie se specificate
  if (docData.categoryIds && docData.categoryIds.length > 0) {
    for (const categoryId of docData.categoryIds) {
      runQuery(
        'INSERT OR IGNORE INTO document_categories (document_id, category_id) VALUES (?, ?)',
        [id, categoryId]
      );
    }
  }

  return getDocumentById(id);
}

/**
 * Aggiorna un documento
 */
function updateDocument(id, updates) {
  const fields = [];
  const values = [];

  if (updates.title !== undefined) {
    fields.push('title = ?');
    values.push(updates.title);
  }
  if (updates.authors !== undefined) {
    fields.push('authors = ?');
    values.push(JSON.stringify(updates.authors));
  }
  if (updates.publisher !== undefined) {
    fields.push('publisher = ?');
    values.push(updates.publisher);
  }
  if (updates.isbn !== undefined) {
    fields.push('isbn = ?');
    values.push(updates.isbn);
  }
  if (updates.year !== undefined) {
    fields.push('year = ?');
    values.push(updates.year);
  }
  if (updates.filePath !== undefined) {
    fields.push('file_path = ?');
    values.push(updates.filePath);
  }
  if (updates.isFavorite !== undefined) {
    fields.push('is_favorite = ?');
    values.push(updates.isFavorite ? 1 : 0);
  }

  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    values.push(id);
    runQuery(`UPDATE documents SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  // Aggiorna categorie se specificate
  if (updates.categoryIds !== undefined) {
    // Rimuovi tutte le categorie esistenti
    runQuery('DELETE FROM document_categories WHERE document_id = ?', [id]);

    // Aggiungi le nuove categorie
    for (const categoryId of updates.categoryIds) {
      runQuery(
        'INSERT OR IGNORE INTO document_categories (document_id, category_id) VALUES (?, ?)',
        [id, categoryId]
      );
    }
  }

  return getDocumentById(id);
}

/**
 * Aggiorna data ultimo accesso
 */
function updateDocumentLastOpened(id) {
  runQuery("UPDATE documents SET last_opened_at = datetime('now') WHERE id = ?", [id]);
  return getDocumentById(id);
}

/**
 * Aggiorna le statistiche di un documento
 * @param {string} id - ID del documento
 * @param {Object} stats - Oggetto con i conteggi
 */
function updateDocumentStatistics(id, stats) {
  runQuery(`
    UPDATE documents SET
      stat_notes = ?,
      stat_dictionary = ?,
      stat_keywords = ?,
      stat_mindmaps = ?,
      stat_bookmarks = ?,
      stat_flashcards = ?,
      stat_annotations = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `, [
    stats.notes || 0,
    stats.dictionary || 0,
    stats.keywords || 0,
    stats.mindmaps || 0,
    stats.bookmarks || 0,
    stats.flashcards || 0,
    stats.annotations || 0,
    id
  ]);
  return getDocumentById(id);
}

/**
 * Toggle preferito
 */
function toggleDocumentFavorite(id) {
  const doc = getDocumentById(id);
  if (!doc) return null;

  const newValue = doc.is_favorite ? 0 : 1;
  runQuery('UPDATE documents SET is_favorite = ? WHERE id = ?', [newValue, id]);
  return getDocumentById(id);
}

/**
 * Elimina un documento
 */
function deleteDocument(id) {
  // Elimina prima le relazioni con le categorie
  runQuery('DELETE FROM document_categories WHERE document_id = ?', [id]);

  // Elimina il documento
  const result = runQuery('DELETE FROM documents WHERE id = ?', [id]);

  // Elimina il database del documento se esiste
  if (libraryPath) {
    const docDbPath = path.join(libraryPath, 'documents', `${id}.db`);
    if (fs.existsSync(docDbPath)) {
      try {
        fs.unlinkSync(docDbPath);
        console.log(`[LibraryDB] Eliminato database documento: ${docDbPath}`);
      } catch (error) {
        console.error(`[LibraryDB] Errore eliminazione DB documento:`, error);
      }
    }
  }

  return result.changes > 0;
}

/**
 * Verifica se un file esiste
 */
function checkDocumentFileExists(id) {
  const doc = getDocumentById(id);
  if (!doc) return { exists: false, document: null };

  const exists = fs.existsSync(doc.file_path);
  return { exists, document: doc };
}

// ==================== CATEGORIES ====================

/**
 * Ottieni tutte le categorie
 */
function getAllCategories() {
  return queryAll('SELECT * FROM categories ORDER BY sort_order, name');
}

/**
 * Ottieni una categoria per ID
 */
function getCategoryById(id) {
  return queryOne('SELECT * FROM categories WHERE id = ?', [id]);
}

/**
 * Crea una nuova categoria
 */
function createCategory(name, color = '#6b7280') {
  // Ottieni il prossimo sort_order
  const maxOrder = queryOne('SELECT MAX(sort_order) as max_order FROM categories');
  const sortOrder = (maxOrder?.max_order || 0) + 1;

  const result = runQuery(
    'INSERT INTO categories (name, color, sort_order) VALUES (?, ?, ?)',
    [name, color, sortOrder]
  );

  return getCategoryById(result.lastInsertRowid);
}

/**
 * Aggiorna una categoria
 */
function updateCategory(id, updates) {
  const fields = [];
  const values = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.color !== undefined) {
    fields.push('color = ?');
    values.push(updates.color);
  }
  if (updates.sortOrder !== undefined) {
    fields.push('sort_order = ?');
    values.push(updates.sortOrder);
  }

  if (fields.length === 0) return getCategoryById(id);

  values.push(id);
  runQuery(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, values);
  return getCategoryById(id);
}

/**
 * Elimina una categoria
 */
function deleteCategory(id) {
  // Prima elimina le relazioni
  runQuery('DELETE FROM document_categories WHERE category_id = ?', [id]);
  // Poi elimina la categoria
  const result = runQuery('DELETE FROM categories WHERE id = ?', [id]);
  return result.changes > 0;
}

/**
 * Conta documenti per categoria
 */
function countDocumentsByCategory(categoryId) {
  const result = queryOne(
    'SELECT COUNT(*) as count FROM document_categories WHERE category_id = ?',
    [categoryId]
  );
  return result ? result.count : 0;
}

// ==================== SETTINGS ====================

/**
 * Ottieni un'impostazione
 */
function getSetting(key) {
  const row = queryOne('SELECT value FROM settings WHERE key = ?', [key]);
  if (!row) return null;

  try {
    return JSON.parse(row.value);
  } catch {
    return row.value;
  }
}

/**
 * Salva un'impostazione
 */
function setSetting(key, value) {
  const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
  runQuery(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
    [key, jsonValue, jsonValue]
  );
  return getSetting(key);
}

/**
 * Ottieni tutte le impostazioni
 */
function getAllSettings() {
  const rows = queryAll('SELECT * FROM settings');
  const settings = {};

  for (const row of rows) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }

  return settings;
}

// ==================== DOCUMENT DATABASE PATH ====================

/**
 * Ottieni il percorso del database per un documento specifico
 */
function getDocumentDatabasePath(documentId) {
  if (!libraryPath) return null;
  return path.join(libraryPath, 'documents', `${documentId}.db`);
}

/**
 * Ottieni il percorso della cartella libreria
 */
function getCurrentLibraryPath() {
  return libraryPath;
}

// ==================== EXPORT ====================

module.exports = {
  // Inizializzazione
  initLibraryDatabase,
  closeLibraryDatabase,
  libraryExists,
  getLibraryPath,
  getCurrentLibraryPath,
  getDocumentDatabasePath,

  // Documents
  generateDocumentId,
  getAllDocuments,
  getDocuments,
  getRecentDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  updateDocumentLastOpened,
  updateDocumentStatistics,
  toggleDocumentFavorite,
  deleteDocument,
  checkDocumentFileExists,

  // Categories
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  countDocumentsByCategory,

  // Settings
  getSetting,
  setSetting,
  getAllSettings
};
