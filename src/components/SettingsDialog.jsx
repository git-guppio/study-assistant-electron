import React, { useState, useEffect } from 'react';
import { getLibrary } from '../database/libraryDb';

function SettingsDialog({ isOpen, onClose, onLibraryPathChanged }) {
  const [libraryPath, setLibraryPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [newPath, setNewPath] = useState('');
  const [moveError, setMoveError] = useState('');

  // Carica le impostazioni correnti
  useEffect(() => {
    async function loadSettings() {
      const library = getLibrary();
      if (library) {
        const path = library.getLibraryPath();
        setLibraryPath(path || '');
      }
    }

    if (isOpen) {
      loadSettings();
      setShowMoveDialog(false);
      setNewPath('');
      setMoveError('');
    }
  }, [isOpen]);

  const handleExportLibrary = async () => {
    try {
      const result = await window.electronAPI.showSaveDialog({
        title: 'Esporta backup libreria',
        defaultPath: 'study-assistant-backup.zip',
        filters: [{ name: 'ZIP', extensions: ['zip'] }]
      });

      if (result.canceled) return;

      setLoading(true);
      // TODO: Implementare export completo
      alert('Funzionalità di export in sviluppo');
    } catch (error) {
      console.error('Error exporting library:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportLibrary = async () => {
    try {
      const result = await window.electronAPI.showOpenDialog({
        title: 'Importa backup libreria',
        filters: [{ name: 'ZIP', extensions: ['zip'] }],
        properties: ['openFile']
      });

      if (result.canceled || result.filePaths.length === 0) return;

      setLoading(true);
      // TODO: Implementare import completo
      alert('Funzionalità di import in sviluppo');
    } catch (error) {
      console.error('Error importing library:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apri dialog per selezionare nuovo percorso
  const handleChangePathClick = async () => {
    try {
      const result = await window.electronAPI.showOpenDialog({
        title: 'Seleziona nuova cartella per la libreria',
        properties: ['openDirectory', 'createDirectory']
      });

      if (result.canceled || result.filePaths.length === 0) return;

      setNewPath(result.filePaths[0]);
      setShowMoveDialog(true);
      setMoveError('');
    } catch (error) {
      console.error('Error selecting path:', error);
    }
  };

  // Sposta la libreria esistente
  const handleMoveLibrary = async () => {
    if (!newPath) return;

    setLoading(true);
    setMoveError('');

    try {
      const result = await window.electronAPI.configMoveLibrary(libraryPath, newPath);

      if (result.success) {
        setLibraryPath(newPath);
        setShowMoveDialog(false);
        onLibraryPathChanged?.(newPath);
        onClose();
      } else {
        setMoveError(result.error || 'Errore durante lo spostamento');
      }
    } catch (error) {
      console.error('Error moving library:', error);
      setMoveError(error.message || 'Errore durante lo spostamento');
    } finally {
      setLoading(false);
    }
  };

  // Crea una nuova libreria vuota
  const handleCreateNewLibrary = async () => {
    if (!newPath) return;

    setLoading(true);
    setMoveError('');

    try {
      const result = await window.electronAPI.configCreateEmptyLibrary(newPath);

      if (result.success) {
        setLibraryPath(newPath);
        setShowMoveDialog(false);
        onLibraryPathChanged?.(newPath);
        onClose();
      } else {
        setMoveError(result.error || 'Errore durante la creazione');
      }
    } catch (error) {
      console.error('Error creating library:', error);
      setMoveError(error.message || 'Errore durante la creazione');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
            <span>⚙️</span>
            <span>Impostazioni</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            disabled={loading}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Percorso libreria */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Percorso libreria
            </h3>
            <p className="text-sm text-gray-500 font-mono bg-gray-50 p-2 rounded break-all">
              {libraryPath || 'Non configurato'}
            </p>
            <button
              onClick={handleChangePathClick}
              disabled={loading}
              className="mt-2 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium flex items-center justify-center space-x-2"
            >
              <span>📁</span>
              <span>Cambia percorso libreria</span>
            </button>
          </div>

          {/* Backup & Export */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Backup & Ripristino
            </h3>
            <div className="space-y-2">
              <button
                onClick={handleExportLibrary}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium flex items-center justify-center space-x-2"
              >
                <span>📤</span>
                <span>Esporta backup libreria</span>
              </button>
              <button
                onClick={handleImportLibrary}
                disabled={loading}
                className="w-full px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-medium flex items-center justify-center space-x-2"
              >
                <span>📥</span>
                <span>Importa backup</span>
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Informazioni
            </h3>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between">
                <dt className="text-gray-500">Versione</dt>
                <dd className="text-gray-700">1.0.0</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Electron</dt>
                <dd className="text-gray-700">28.x</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
          >
            Chiudi
          </button>
        </div>
      </div>

      {/* Dialog per spostamento/creazione libreria */}
      {showMoveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Cambia percorso libreria
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Nuovo percorso:</p>
                <p className="text-sm font-mono bg-gray-50 p-2 rounded break-all text-gray-700">
                  {newPath}
                </p>
              </div>

              <p className="text-sm text-gray-600">
                Cosa vuoi fare con i dati esistenti?
              </p>

              {moveError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{moveError}</p>
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={handleMoveLibrary}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 text-sm font-medium flex items-center justify-center space-x-2"
                >
                  <span>📦</span>
                  <span>{loading ? 'Spostamento in corso...' : 'Sposta dati esistenti'}</span>
                </button>
                <p className="text-xs text-gray-500 text-center">
                  Copia tutti i dati nella nuova posizione
                </p>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-2 text-xs text-gray-400">oppure</span>
                  </div>
                </div>

                <button
                  onClick={handleCreateNewLibrary}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:bg-gray-100 text-sm font-medium flex items-center justify-center space-x-2"
                >
                  <span>✨</span>
                  <span>{loading ? 'Creazione in corso...' : 'Crea nuova libreria vuota'}</span>
                </button>
                <p className="text-xs text-gray-500 text-center">
                  I dati esistenti rimarranno nella posizione attuale
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowMoveDialog(false)}
                disabled={loading}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsDialog;
