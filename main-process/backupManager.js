const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * Backup Manager - Gestione backup automatici dei database documenti
 *
 * Strategia:
 * - Backup creato all'apertura del documento (prima di modifiche)
 * - Mantenute ultime 5 versioni per documento
 * - Backup salvati in %APPDATA%/study-assistant/library/backups/{documentId}/
 * - Formato file: backup_{timestamp}.db
 */

const MAX_BACKUPS = 5;

/**
 * Ottiene il percorso della directory backup per un documento
 */
function getBackupDir(documentId) {
  const userDataPath = app.getPath('userData');
  const backupDir = path.join(userDataPath, 'library', 'backups', documentId);

  // Crea la directory se non esiste
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  return backupDir;
}

/**
 * Crea un backup del database documento
 * @param {string} dbPath - Percorso del file .db da backuppare
 * @param {string} documentId - ID del documento (UUID)
 * @returns {object} { success: boolean, backupPath?: string, timestamp?: string, error?: string }
 */
function createBackup(dbPath, documentId) {
  try {
    // Verifica che il file DB esista
    if (!fs.existsSync(dbPath)) {
      return { success: false, error: 'Database file not found' };
    }

    const backupDir = getBackupDir(documentId);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup_${timestamp}.db`;
    const backupPath = path.join(backupDir, backupFileName);

    // Copia il file DB nella cartella backup
    fs.copyFileSync(dbPath, backupPath);

    console.log(`✅ Backup created: ${backupPath}`);

    // Cleanup vecchi backup (mantieni solo ultimi MAX_BACKUPS)
    cleanOldBackups(documentId);

    return { success: true, backupPath, timestamp };
  } catch (error) {
    console.error('❌ Error creating backup:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Lista tutti i backup disponibili per un documento
 * @param {string} documentId - ID del documento
 * @returns {Array} Array di oggetti { filename, timestamp, size, path }
 */
function listBackups(documentId) {
  try {
    const backupDir = getBackupDir(documentId);

    if (!fs.existsSync(backupDir)) {
      return [];
    }

    const files = fs.readdirSync(backupDir);
    const backups = files
      .filter(file => file.startsWith('backup_') && file.endsWith('.db'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);

        // Estrai timestamp dal nome file: backup_2024-02-20T10-30-45-123Z.db
        const timestampMatch = file.match(/backup_(.+)\.db$/);
        const timestamp = timestampMatch ? timestampMatch[1].replace(/-/g, ':').replace('T', 'T').replace(/Z$/, '.000Z') : null;

        return {
          filename: file,
          timestamp: timestamp ? new Date(timestamp) : new Date(stats.mtime),
          size: stats.size,
          path: filePath,
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp); // Ordina dal più recente al più vecchio

    return backups;
  } catch (error) {
    console.error('❌ Error listing backups:', error);
    return [];
  }
}

/**
 * Ripristina un backup specifico
 * @param {string} documentId - ID del documento
 * @param {string} backupPath - Percorso del backup da ripristinare
 * @param {string} targetDbPath - Percorso del DB corrente da sovrascrivere
 * @returns {object} { success: boolean, error?: string }
 */
function restoreBackup(documentId, backupPath, targetDbPath) {
  try {
    // Verifica che il backup esista
    if (!fs.existsSync(backupPath)) {
      return { success: false, error: 'Backup file not found' };
    }

    // IMPORTANTE: Crea un backup del DB corrente prima di sovrascriverlo
    // così possiamo fare rollback se il ripristino fallisce
    const tempBackupPath = `${targetDbPath}.temp_before_restore`;
    if (fs.existsSync(targetDbPath)) {
      fs.copyFileSync(targetDbPath, tempBackupPath);
    }

    // Sovrascrivi il DB corrente con il backup
    fs.copyFileSync(backupPath, targetDbPath);

    console.log(`✅ Backup restored from: ${backupPath}`);

    // Rimuovi il backup temporaneo (successo)
    if (fs.existsSync(tempBackupPath)) {
      fs.unlinkSync(tempBackupPath);
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Error restoring backup:', error);

    // Rollback: ripristina il DB originale dal backup temporaneo
    const tempBackupPath = `${targetDbPath}.temp_before_restore`;
    if (fs.existsSync(tempBackupPath)) {
      try {
        fs.copyFileSync(tempBackupPath, targetDbPath);
        fs.unlinkSync(tempBackupPath);
        console.log('⚠️ Rollback successful - original DB restored');
      } catch (rollbackError) {
        console.error('❌ CRITICAL: Rollback failed!', rollbackError);
      }
    }

    return { success: false, error: error.message };
  }
}

/**
 * Elimina i backup più vecchi mantenendo solo gli ultimi MAX_BACKUPS
 * @param {string} documentId - ID del documento
 */
function cleanOldBackups(documentId) {
  try {
    const backups = listBackups(documentId);

    if (backups.length <= MAX_BACKUPS) {
      return; // Niente da eliminare
    }

    // Elimina i backup in eccesso (mantieni solo i primi MAX_BACKUPS più recenti)
    const toDelete = backups.slice(MAX_BACKUPS);

    toDelete.forEach(backup => {
      try {
        fs.unlinkSync(backup.path);
        console.log(`🗑️ Deleted old backup: ${backup.filename}`);
      } catch (err) {
        console.error(`❌ Failed to delete backup ${backup.filename}:`, err);
      }
    });
  } catch (error) {
    console.error('❌ Error cleaning old backups:', error);
  }
}

/**
 * Elimina tutti i backup di un documento (usato quando si elimina il documento)
 * @param {string} documentId - ID del documento
 * @returns {boolean} True se eliminati con successo
 */
function deleteAllBackups(documentId) {
  try {
    const backupDir = getBackupDir(documentId);

    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
      console.log(`🗑️ Deleted all backups for document: ${documentId}`);
      return true;
    }

    return true;
  } catch (error) {
    console.error('❌ Error deleting backups:', error);
    return false;
  }
}

module.exports = {
  createBackup,
  listBackups,
  restoreBackup,
  cleanOldBackups,
  deleteAllBackups,
};
