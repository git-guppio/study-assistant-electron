const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

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

// Quando Electron è pronto
app.whenReady().then(() => {
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
  return getDatabase().getNotes();
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

// --- Mindmap ---
ipcMain.handle('db-get-mindmap', () => {
  return getDatabase().getMindmap();
});

ipcMain.handle('db-save-mindmap', (event, data) => {
  return getDatabase().saveMindmap(data);
});

// --- Summary ---
ipcMain.handle('db-get-summary', () => {
  return getDatabase().getSummary();
});

ipcMain.handle('db-save-summary', (event, content) => {
  return getDatabase().saveSummary(content);
});

// Chiudi database quando l'app si chiude
app.on('before-quit', () => {
  getDatabase().closeDatabase();
});
