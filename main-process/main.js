const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

// Mappa per tenere traccia dei file immagine (id -> percorso)
const imagePathMap = new Map();

// Lazy load del modulo database per evitare conflitti con Electron
let database = null;
function getDatabase() {
  if (!database) {
    database = require('./database');
  }
  return database;
}

// Argomenti da CLI (passati dal plugin Calibre)
let bookInfo = {
  bookId: null,
  title: 'Nessun libro',
  authors: 'Sconosciuto',
  filePath: null,
  format: 'PDF'
};

// Parsing argomenti CLI
function parseArguments() {
  const args = process.argv.slice(2);
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--book-id' && i + 1 < args.length) {
      bookInfo.bookId = args[i + 1];
      i++;
    } else if (arg === '--title' && i + 1 < args.length) {
      bookInfo.title = args[i + 1];
      i++;
    } else if (arg === '--authors' && i + 1 < args.length) {
      bookInfo.authors = args[i + 1];
      i++;
    } else if (arg === '--file' && i + 1 < args.length) {
      bookInfo.filePath = args[i + 1];
      i++;
    } else if (arg === '--format' && i + 1 < args.length) {
      bookInfo.format = args[i + 1];
      i++;
    }
  }
  
  console.log('📚 Book Info:', bookInfo);
  console.log('🔍 Raw args:', process.argv);  // <- Aggiungi questo per debug
}

parseArguments();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/icon.png'),
    title: `Study Assistant - ${bookInfo.title}`
  });

  // In sviluppo, carica da Vite dev server
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In produzione, carica i file compilati
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Registra custom protocol per servire immagini locali in modo sicuro
// Deve essere chiamato PRIMA di app.whenReady()
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-image',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      corsEnabled: true
    }
  }
]);

// Quando Electron è pronto
app.whenReady().then(() => {
  console.log('🚀🚀🚀 MAIN.JS LOADED - VERSION 2 WITH IPC LOGGING 🚀🚀🚀');

  // Registra handler per il protocol local-image://
  // Usa un ID semplice nell'URL: local-image://img_123456.png
  // Il path reale viene recuperato dalla mappa imagePathMap
  protocol.registerFileProtocol('local-image', (request, callback) => {
    try {
      console.log('🖼️ Protocol request URL:', request.url);

      // Estrai l'ID immagine dall'URL
      // URL: local-image://img_123456_abc.png o local-image://img_123456_abc.png/
      let imageId = request.url.replace('local-image://', '');
      imageId = decodeURIComponent(imageId);
      // Rimuovi eventuali slash finali aggiunti dal browser
      imageId = imageId.replace(/\/+$/, '');
      console.log('🖼️ Image ID:', imageId);

      // Cerca il percorso nella mappa
      const filePath = imagePathMap.get(imageId);
      console.log('🖼️ Mapped path:', filePath);

      if (!filePath) {
        console.error('❌ Image ID not found in map:', imageId);
        // Restituisci placeholder SVG per immagine mancante
        const placeholderPath = path.join(__dirname, '../public/missing-image.svg');
        if (fs.existsSync(placeholderPath)) {
          callback({ path: placeholderPath });
        } else {
          callback({ error: -6 });
        }
        return;
      }

      // Verifica esistenza
      if (!fs.existsSync(filePath)) {
        console.error('❌ File not found on disk:', filePath);
        // Restituisci placeholder SVG per immagine mancante
        const placeholderPath = path.join(__dirname, '../public/missing-image.svg');
        if (fs.existsSync(placeholderPath)) {
          callback({ path: placeholderPath });
        } else {
          callback({ error: -6 });
        }
        return;
      }

      console.log('🖼️ Serving file:', filePath);
      callback({ path: filePath });
    } catch (error) {
      console.error('❌ Error in protocol handler:', error);
      callback({ error: -2 });
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Chiudi app quando tutte le finestre sono chiuse (eccetto macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers - Comunicazione con il renderer

// Invia le informazioni del libro al frontend
ipcMain.handle('get-book-info', () => {
  return bookInfo;
});

// Leggi file PDF
ipcMain.handle('read-pdf-file', async (event, filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error('File PDF non trovato');
    }
    
    const buffer = fs.readFileSync(filePath);
    return {
      success: true,
      data: buffer,
      path: filePath
    };
  } catch (error) {
    console.error('Errore lettura PDF:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Ottieni la directory del PDF per salvare il database
ipcMain.handle('get-pdf-directory', (event, filePath) => {
  if (!filePath) return null;
  return path.dirname(filePath);
});

// Salva file (export)
ipcMain.handle('save-file', async (event, { content, filePath }) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Dialog per salvare file
ipcMain.handle('show-save-dialog', async (event, options) => {
  const { dialog } = require('electron');
  return await dialog.showSaveDialog(mainWindow, options);
});

// Dialog per aprire file
ipcMain.handle('show-open-dialog', async (event, options) => {
  const { dialog } = require('electron');
  return await dialog.showOpenDialog(mainWindow, options);
});

// Ottieni percorso app data
ipcMain.handle('get-app-data-path', () => {
  return app.getPath('userData');
});

// Log per debug
ipcMain.on('log', (event, message) => {
  console.log('🖥️ Renderer:', message);
});

// ==================== DATABASE IPC HANDLERS ====================

// Inizializza database (async per sql.js)
ipcMain.handle('db-init', async (event, { pdfDir, bookId }) => {
  return await getDatabase().initDatabase(pdfDir, bookId);
});

// Chiudi database
ipcMain.handle('db-close', () => {
  getDatabase().closeDatabase();
  return { success: true };
});

// --- Note ---
ipcMain.handle('db-get-notes', () => {
  console.log('[IPC] db-get-notes called');
  const result = getDatabase().getNotes();
  console.log('[IPC] db-get-notes result:', result.length, 'notes');
  return result;
});

ipcMain.handle('db-get-note', (event, id) => {
  return getDatabase().getNoteById(id);
});

ipcMain.handle('db-save-note', (event, noteData) => {
  return getDatabase().saveNote(noteData);
});

ipcMain.handle('db-update-note', (event, { id, updates }) => {
  return getDatabase().updateNote(id, updates);
});

ipcMain.handle('db-delete-note', (event, id) => {
  return getDatabase().deleteNote(id);
});

// --- Annotazioni ---
ipcMain.handle('db-get-annotations', () => {
  return getDatabase().getAnnotations();
});

ipcMain.handle('db-get-annotations-by-page', (event, pageNumber) => {
  return getDatabase().getAnnotationsByPage(pageNumber);
});

ipcMain.handle('db-get-annotation', (event, id) => {
  return getDatabase().getAnnotationById(id);
});

ipcMain.handle('db-save-annotation', (event, annData) => {
  return getDatabase().saveAnnotation(annData);
});

ipcMain.handle('db-update-annotation', (event, { id, updates }) => {
  return getDatabase().updateAnnotation(id, updates);
});

ipcMain.handle('db-delete-annotation', (event, id) => {
  return getDatabase().deleteAnnotation(id);
});

// --- Mindmap (legacy) ---
ipcMain.handle('db-get-mindmap', () => {
  return getDatabase().getMindmap();
});

ipcMain.handle('db-save-mindmap', (event, data) => {
  return getDatabase().saveMindmap(data);
});

// --- Mindmaps (multiple) ---
ipcMain.handle('db-get-all-mindmaps', () => {
  return getDatabase().getAllMindmaps();
});

ipcMain.handle('db-get-mindmap-by-id', (event, id) => {
  return getDatabase().getMindmapById(id);
});

ipcMain.handle('db-create-mindmap', (event, name, color) => {
  return getDatabase().createMindmap(name, color);
});

ipcMain.handle('db-update-mindmap-data', (event, id, data) => {
  return getDatabase().updateMindmapData(id, data);
});

ipcMain.handle('db-update-mindmap-info', (event, id, updates) => {
  return getDatabase().updateMindmapInfo(id, updates);
});

ipcMain.handle('db-delete-mindmap', (event, id) => {
  return getDatabase().deleteMindmap(id);
});

ipcMain.handle('db-count-mindmaps', () => {
  return getDatabase().countMindmaps();
});

// --- Summary ---
ipcMain.handle('db-get-summary', () => {
  return getDatabase().getSummary();
});

ipcMain.handle('db-save-summary', (event, content) => {
  return getDatabase().saveSummary(content);
});

// --- Document Defaults ---
ipcMain.handle('db-get-document-defaults', () => {
  return getDatabase().getDocumentDefaults();
});

ipcMain.handle('db-update-document-defaults', (event, updates) => {
  return getDatabase().updateDocumentDefaults(updates);
});

// --- Custom Icon Colors ---
ipcMain.handle('db-get-custom-icon-color', (event, iconId) => {
  return getDatabase().getCustomIconColor(iconId);
});

ipcMain.handle('db-get-all-custom-icon-colors', () => {
  return getDatabase().getAllCustomIconColors();
});

ipcMain.handle('db-upsert-custom-icon-color', (event, { iconId, color }) => {
  return getDatabase().upsertCustomIconColor(iconId, color);
});

ipcMain.handle('db-delete-custom-icon-color', (event, iconId) => {
  return getDatabase().deleteCustomIconColor(iconId);
});

// --- Custom Action Colors ---
ipcMain.handle('db-get-custom-action-color', (event, actionType) => {
  return getDatabase().getCustomActionColor(actionType);
});

ipcMain.handle('db-get-all-custom-action-colors', () => {
  return getDatabase().getAllCustomActionColors();
});

ipcMain.handle('db-upsert-custom-action-color', (event, { actionType, color }) => {
  return getDatabase().upsertCustomActionColor(actionType, color);
});

ipcMain.handle('db-delete-custom-action-color', (event, actionType) => {
  return getDatabase().deleteCustomActionColor(actionType);
});

// --- Flashcards ---
ipcMain.handle('db-get-flashcards', () => {
  return getDatabase().getFlashcards();
});

ipcMain.handle('db-get-flashcard', (event, id) => {
  return getDatabase().getFlashcardById(id);
});

ipcMain.handle('db-save-flashcard', (event, data) => {
  return getDatabase().saveFlashcard(data);
});

ipcMain.handle('db-update-flashcard', (event, { id, updates }) => {
  return getDatabase().updateFlashcard(id, updates);
});

ipcMain.handle('db-delete-flashcard', (event, id) => {
  return getDatabase().deleteFlashcard(id);
});

// --- Dictionary ---
ipcMain.handle('db-get-dictionary-entries', () => {
  return getDatabase().getDictionaryEntries();
});

ipcMain.handle('db-get-dictionary-entry', (event, id) => {
  return getDatabase().getDictionaryEntryById(id);
});

ipcMain.handle('db-save-dictionary-entry', (event, data) => {
  return getDatabase().saveDictionaryEntry(data);
});

ipcMain.handle('db-update-dictionary-entry', (event, { id, updates }) => {
  return getDatabase().updateDictionaryEntry(id, updates);
});

ipcMain.handle('db-delete-dictionary-entry', (event, id) => {
  return getDatabase().deleteDictionaryEntry(id);
});

// --- Keywords ---
ipcMain.handle('db-get-keywords', () => {
  return getDatabase().getKeywords();
});

// ==================== IMAGE HANDLING ====================

// Carica tutte le immagini esistenti nella mappa (da chiamare all'avvio)
ipcMain.handle('load-images-map', async (event, { pdfDir, bookId }) => {
  try {
    const imagesDir = path.join(pdfDir, `${bookId}_images`);

    if (!fs.existsSync(imagesDir)) {
      console.log('🖼️ No images directory found:', imagesDir);
      return { success: true, count: 0 };
    }

    const files = fs.readdirSync(imagesDir);
    let count = 0;

    for (const fileName of files) {
      // Solo file immagine
      if (/\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(fileName)) {
        const filePath = path.join(imagesDir, fileName);
        imagePathMap.set(fileName, filePath);
        count++;
        console.log('🖼️ Loaded existing image:', fileName, '->', filePath);
      }
    }

    console.log(`🖼️ Loaded ${count} existing images into map`);
    return { success: true, count };
  } catch (error) {
    console.error('❌ Error loading images map:', error);
    return { success: false, error: error.message };
  }
});

// Salva immagine su disco (da clipboard o file)
ipcMain.handle('save-image-to-disk', async (event, { imageData, pdfDir, bookId }) => {
  try {
    // Crea cartella immagini se non esiste
    const imagesDir = path.join(pdfDir, `${bookId}_images`);
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    // Genera nome univoco con timestamp
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const fileName = `img_${timestamp}_${randomSuffix}.png`;
    const filePath = path.join(imagesDir, fileName);

    // imageData può essere base64 o buffer
    let buffer;
    if (typeof imageData === 'string') {
      // Rimuovi prefisso data:image/...;base64, se presente
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      buffer = Buffer.from(imageData);
    }

    fs.writeFileSync(filePath, buffer);
    console.log('🖼️ Image saved:', filePath);

    // Registra il path nella mappa usando il filename come ID
    imagePathMap.set(fileName, filePath);
    console.log('🖼️ Registered in map:', fileName, '->', filePath);

    // URL semplice con solo il filename
    const imageUrl = `local-image://${fileName}`;

    return {
      success: true,
      filePath: filePath,
      imageUrl: imageUrl,  // URL da usare nell'editor
      relativePath: `${bookId}_images/${fileName}`
    };
  } catch (error) {
    console.error('❌ Error saving image:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Leggi immagine da disco
ipcMain.handle('read-image-from-disk', async (event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error('Image file not found');
    }
    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString('base64');
    const ext = path.extname(filePath).toLowerCase().slice(1) || 'png';
    return {
      success: true,
      dataUrl: `data:image/${ext};base64,${base64}`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// Seleziona file immagine con dialog
ipcMain.handle('select-image-file', async () => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Seleziona immagine',
    filters: [
      { name: 'Immagini', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, canceled: true };
  }

  const filePath = result.filePaths[0];
  const buffer = fs.readFileSync(filePath);
  const base64 = buffer.toString('base64');
  const ext = path.extname(filePath).toLowerCase().slice(1) || 'png';

  return {
    success: true,
    filePath: filePath,
    dataUrl: `data:image/${ext};base64,${base64}`
  };
});

// Elimina immagine da disco
ipcMain.handle('delete-image-from-disk', async (event, imageUrl) => {
  try {
    // Estrai l'ID immagine dall'URL (local-image://img_123456_abc.png)
    let imageId = imageUrl.replace('local-image://', '');
    imageId = decodeURIComponent(imageId);
    imageId = imageId.replace(/\/+$/, '');

    // Cerca il percorso nella mappa
    const filePath = imagePathMap.get(imageId);

    if (!filePath) {
      console.log('⚠️ Image not found in map (may already be deleted):', imageId);
      return { success: true, notFound: true };
    }

    // Elimina il file se esiste
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('🗑️ Image deleted from disk:', filePath);
    }

    // Rimuovi dalla mappa
    imagePathMap.delete(imageId);

    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting image:', error);
    return { success: false, error: error.message };
  }
});

// Elimina multiple immagini da disco
ipcMain.handle('delete-images-from-disk', async (event, imageUrls) => {
  const results = [];

  for (const imageUrl of imageUrls) {
    try {
      let imageId = imageUrl.replace('local-image://', '');
      imageId = decodeURIComponent(imageId);
      imageId = imageId.replace(/\/+$/, '');

      const filePath = imagePathMap.get(imageId);

      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('🗑️ Image deleted:', filePath);
      }

      imagePathMap.delete(imageId);
      results.push({ url: imageUrl, success: true });
    } catch (error) {
      console.error('❌ Error deleting image:', imageUrl, error);
      results.push({ url: imageUrl, success: false, error: error.message });
    }
  }

  return { success: true, results };
});

// Verifica se un'immagine esiste su disco
ipcMain.handle('check-image-exists', async (event, imageUrl) => {
  try {
    let imageId = imageUrl.replace('local-image://', '');
    imageId = decodeURIComponent(imageId);
    imageId = imageId.replace(/\/+$/, '');

    const filePath = imagePathMap.get(imageId);

    if (!filePath) {
      return { exists: false };
    }

    return { exists: fs.existsSync(filePath) };
  } catch (error) {
    return { exists: false, error: error.message };
  }
});

// Cleanup immagini orfane (immagini su disco non presenti in nessun contenuto)
ipcMain.handle('cleanup-orphan-images', async (event, { pdfDir, bookId, usedImageUrls }) => {
  try {
    const imagesDir = path.join(pdfDir, `${bookId}_images`);

    if (!fs.existsSync(imagesDir)) {
      return { success: true, deleted: 0 };
    }

    // Estrai gli ID delle immagini usate
    const usedImageIds = new Set(
      usedImageUrls.map(url => {
        let imageId = url.replace('local-image://', '');
        imageId = decodeURIComponent(imageId);
        return imageId.replace(/\/+$/, '');
      })
    );

    const files = fs.readdirSync(imagesDir);
    let deletedCount = 0;

    for (const fileName of files) {
      if (/\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(fileName)) {
        if (!usedImageIds.has(fileName)) {
          const filePath = path.join(imagesDir, fileName);
          fs.unlinkSync(filePath);
          imagePathMap.delete(fileName);
          deletedCount++;
        }
      }
    }

    if (deletedCount > 0) {
      console.log(`🧹 Cleanup complete: ${deletedCount} orphan images deleted`);
    }
    return { success: true, deleted: deletedCount };
  } catch (error) {
    console.error('❌ Error during orphan cleanup:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-get-keyword', (event, id) => {
  return getDatabase().getKeywordById(id);
});

ipcMain.handle('db-save-keyword', (event, data) => {
  return getDatabase().saveKeyword(data);
});

ipcMain.handle('db-update-keyword', (event, { id, updates }) => {
  return getDatabase().updateKeyword(id, updates);
});

ipcMain.handle('db-delete-keyword', (event, id) => {
  return getDatabase().deleteKeyword(id);
});

// --- Bookmarks ---
ipcMain.handle('db-get-bookmarks', () => {
  return getDatabase().getBookmarks();
});

ipcMain.handle('db-get-bookmark', (event, id) => {
  return getDatabase().getBookmarkById(id);
});

ipcMain.handle('db-get-bookmark-by-page', (event, pageNumber) => {
  return getDatabase().getBookmarkByPage(pageNumber);
});

ipcMain.handle('db-save-bookmark', (event, data) => {
  return getDatabase().saveBookmark(data);
});

ipcMain.handle('db-update-bookmark', (event, { id, updates }) => {
  return getDatabase().updateBookmark(id, updates);
});

ipcMain.handle('db-delete-bookmark', (event, id) => {
  return getDatabase().deleteBookmark(id);
});

// Chiudi database quando l'app si chiude
app.on('before-quit', () => {
  getDatabase().closeDatabase();
});
