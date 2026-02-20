import React, { useState, useEffect } from 'react';
import { showConfirmDialog } from '../utils/confirmDialog';

/**
 * Dialog per visualizzare e ripristinare backup del database libreria
 *
 * Props:
 * - onClose (function): Callback per chiudere il dialog
 * - onRestoreSuccess (function): Callback chiamato dopo ripristino riuscito (richiede reload app)
 */
function LibraryBackupDialog({ onClose, onRestoreSuccess }) {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    setLoading(true);
    setError(null);

    try {
      const backupList = await window.electronAPI.libraryBackupList();
      setBackups(backupList);
    } catch (err) {
      console.error('Error loading library backups:', err);
      setError('Errore durante il caricamento dei backup della libreria');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('it-IT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleRestore = async (backup) => {
    // Conferma prima del ripristino
    const confirmed = await showConfirmDialog({
      title: '🔄 Ripristina Backup Libreria',
      message: `Vuoi ripristinare il backup della libreria del <b>${formatDate(backup.timestamp)}</b>?`,
      detail: `Questa azione sovrascriverà il database della libreria corrente con la versione del backup.\n\nTutti i documenti, categorie e impostazioni verranno ripristinati allo stato salvato.\n\nSarà creato automaticamente un backup dello stato attuale prima del ripristino.`,
      confirmText: 'Ripristina',
      confirmColor: '#f59e0b',
    });

    if (!confirmed) return;

    setRestoring(true);
    setError(null);

    try {
      const result = await window.electronAPI.libraryBackupRestore(backup.path);

      if (result.success) {
        console.log('✅ Library backup restored successfully');
        // Chiudi il dialog e notifica il successo
        if (onRestoreSuccess) {
          onRestoreSuccess();
        }
        onClose();
      } else {
        setError(`Errore durante il ripristino: ${result.error || 'Errore sconosciuto'}`);
      }
    } catch (err) {
      console.error('Error restoring library backup:', err);
      setError('Errore durante il ripristino del backup della libreria');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">📦 Backup Libreria</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            disabled={restoring}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              Caricamento backup...
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {!loading && !error && backups.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📁</div>
              <p>Nessun backup della libreria disponibile</p>
              <p className="text-sm mt-2">
                I backup della libreria vengono creati automaticamente all'avvio dell'applicazione
              </p>
            </div>
          )}

          {!loading && backups.length > 0 && (
            <div className="space-y-2">
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-3 text-sm">
                <strong>⚠️ Attenzione:</strong> Il ripristino della libreria richiederà il ricaricamento completo dell'applicazione.
              </div>

              <p className="text-sm text-gray-600 mb-3">
                Seleziona un backup da ripristinare. Lo stato corrente verrà salvato automaticamente prima del ripristino.
              </p>

              {backups.map((backup, index) => (
                <div
                  key={backup.filename}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {index === 0 ? '🕐' : '📦'}
                        </span>
                        <span className="font-medium text-gray-800">
                          {formatDate(backup.timestamp)}
                        </span>
                        {index === 0 && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            Più recente
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Dimensione: {formatSize(backup.size)}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRestore(backup)}
                      disabled={restoring}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {restoring ? 'Ripristino...' : 'Ripristina'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {backups.length > 0 && (
                <span>
                  {backups.length} backup disponibil{backups.length === 1 ? 'e' : 'i'} (ultimi 5 mantenuti)
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              disabled={restoring}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 transition-colors"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LibraryBackupDialog;
