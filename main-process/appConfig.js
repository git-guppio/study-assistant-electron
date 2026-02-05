/**
 * App Configuration Manager
 * Gestisce il file config.json in %APPDATA%/study-assistant/
 * Separato dalla cartella library per poter trovare il path della libreria
 */

const path = require('path');
const fs = require('fs');

let configPath = null;
let config = null;

/**
 * Ottieni il percorso del file config.json
 */
function getConfigPath() {
  if (!configPath) {
    const { app } = require('electron');
    configPath = path.join(app.getPath('userData'), 'config.json');
  }
  return configPath;
}

/**
 * Carica la configurazione dal file
 */
function loadConfig() {
  const filePath = getConfigPath();

  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      config = JSON.parse(data);
      console.log('[Config] Configurazione caricata:', config);
    } else {
      config = {};
      console.log('[Config] Nessun file config.json trovato, usando defaults');
    }
  } catch (error) {
    console.error('[Config] Errore lettura config:', error);
    config = {};
  }

  return config;
}

/**
 * Salva la configurazione su file
 */
function saveConfig() {
  const filePath = getConfigPath();

  try {
    // Assicurati che la directory esista
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
    console.log('[Config] Configurazione salvata:', filePath);
    return true;
  } catch (error) {
    console.error('[Config] Errore salvataggio config:', error);
    return false;
  }
}

/**
 * Ottieni un valore dalla configurazione
 */
function getConfigValue(key, defaultValue = null) {
  if (!config) {
    loadConfig();
  }
  return config[key] !== undefined ? config[key] : defaultValue;
}

/**
 * Imposta un valore nella configurazione
 */
function setConfigValue(key, value) {
  if (!config) {
    loadConfig();
  }
  config[key] = value;
  return saveConfig();
}

/**
 * Ottieni il percorso della libreria configurato
 */
function getLibraryPath() {
  return getConfigValue('libraryPath', null);
}

/**
 * Imposta il percorso della libreria
 */
function setLibraryPath(libraryPath) {
  return setConfigValue('libraryPath', libraryPath);
}

/**
 * Verifica se la libreria è già configurata
 */
function isLibraryConfigured() {
  const libPath = getLibraryPath();
  if (!libPath) return false;

  // Verifica anche che la cartella esista
  return fs.existsSync(libPath);
}

/**
 * Ottieni il percorso di default per la libreria
 */
function getDefaultLibraryPath() {
  const { app } = require('electron');
  return path.join(app.getPath('userData'), 'library');
}

/**
 * Sposta la libreria esistente in una nuova posizione
 */
async function moveLibrary(oldPath, newPath) {
  return new Promise((resolve, reject) => {
    try {
      // Verifica che la sorgente esista
      if (!fs.existsSync(oldPath)) {
        reject(new Error('La libreria sorgente non esiste'));
        return;
      }

      // Crea la directory di destinazione se non esiste
      if (!fs.existsSync(newPath)) {
        fs.mkdirSync(newPath, { recursive: true });
      }

      // Copia ricorsivamente tutti i file
      copyFolderRecursive(oldPath, newPath);

      // Aggiorna la configurazione
      setLibraryPath(newPath);

      console.log('[Config] Libreria spostata da', oldPath, 'a', newPath);
      resolve({ success: true, newPath });
    } catch (error) {
      console.error('[Config] Errore spostamento libreria:', error);
      reject(error);
    }
  });
}

/**
 * Copia una cartella ricorsivamente
 */
function copyFolderRecursive(source, target) {
  // Crea la cartella target se non esiste
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  // Leggi i contenuti della cartella sorgente
  const items = fs.readdirSync(source);

  for (const item of items) {
    const sourcePath = path.join(source, item);
    const targetPath = path.join(target, item);
    const stat = fs.statSync(sourcePath);

    if (stat.isDirectory()) {
      // Ricorsione per le sottocartelle
      copyFolderRecursive(sourcePath, targetPath);
    } else {
      // Copia il file
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

/**
 * Crea una nuova libreria vuota
 */
function createEmptyLibrary(newPath) {
  try {
    // Crea la directory
    if (!fs.existsSync(newPath)) {
      fs.mkdirSync(newPath, { recursive: true });
    }

    // Crea la sottocartella documents
    const documentsDir = path.join(newPath, 'documents');
    if (!fs.existsSync(documentsDir)) {
      fs.mkdirSync(documentsDir, { recursive: true });
    }

    // Aggiorna la configurazione
    setLibraryPath(newPath);

    console.log('[Config] Nuova libreria vuota creata:', newPath);
    return { success: true, newPath };
  } catch (error) {
    console.error('[Config] Errore creazione libreria vuota:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  loadConfig,
  saveConfig,
  getConfigValue,
  setConfigValue,
  getLibraryPath,
  setLibraryPath,
  isLibraryConfigured,
  getDefaultLibraryPath,
  moveLibrary,
  createEmptyLibrary
};
