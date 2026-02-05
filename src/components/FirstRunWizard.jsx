import React, { useState, useEffect } from 'react';

function FirstRunWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [libraryPath, setLibraryPath] = useState('');
  const [defaultPath, setDefaultPath] = useState('');
  const [loading, setLoading] = useState(false);

  // Carica il percorso di default all'avvio
  useEffect(() => {
    async function loadDefaultPath() {
      try {
        const appDataPath = await window.electronAPI.getAppDataPath();
        const path = `${appDataPath}\\library`;
        setDefaultPath(path);
        setLibraryPath(path);
      } catch (error) {
        console.error('Error getting default path:', error);
      }
    }
    loadDefaultPath();
  }, []);

  const handleSelectPath = async () => {
    try {
      const result = await window.electronAPI.showOpenDialog({
        title: 'Seleziona cartella per la libreria',
        properties: ['openDirectory', 'createDirectory']
      });

      if (result.canceled || result.filePaths.length === 0) return;

      setLibraryPath(result.filePaths[0]);
    } catch (error) {
      console.error('Error selecting path:', error);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await onComplete(libraryPath);
    } catch (error) {
      console.error('Error completing wizard:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header con progress */}
        <div className="bg-blue-500 px-6 py-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold">Study Assistant</h1>
            <span className="text-blue-200 text-sm">Passo {step} di 2</span>
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-blue-400 rounded-full">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${(step / 2) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <span className="text-5xl">📚</span>
                <h2 className="text-2xl font-bold text-gray-800 mt-4">
                  Benvenuto!
                </h2>
                <p className="text-gray-600 mt-2">
                  Study Assistant ti aiuta a studiare i tuoi documenti PDF con note, annotazioni, mappe mentali e molto altro.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 mb-2">Funzionalità principali:</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>📝 Note e annotazioni sul PDF</li>
                  <li>📖 Dizionario dei termini</li>
                  <li>🔑 Parole chiave</li>
                  <li>🗺️ Mappe mentali</li>
                  <li>📋 Riassunti</li>
                  <li>🔖 Segnalibri</li>
                </ul>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <span className="text-5xl">📁</span>
                <h2 className="text-2xl font-bold text-gray-800 mt-4">
                  Scegli dove salvare la libreria
                </h2>
                <p className="text-gray-600 mt-2">
                  Tutti i tuoi dati (note, annotazioni, ecc.) verranno salvati in questa cartella.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Percorso libreria
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={libraryPath}
                    onChange={(e) => setLibraryPath(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  />
                  <button
                    onClick={handleSelectPath}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                  >
                    Sfoglia...
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Percorso predefinito: {defaultPath}
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-700">
                  💡 <strong>Suggerimento:</strong> Puoi scegliere una cartella su un servizio cloud (OneDrive, Dropbox) per sincronizzare i dati tra dispositivi.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
              disabled={loading}
            >
              ← Indietro
            </button>
          ) : (
            <div />
          )}

          {step < 2 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium"
            >
              Avanti →
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!libraryPath || loading}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 text-sm font-medium"
            >
              {loading ? 'Creazione...' : 'Inizia! 🚀'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default FirstRunWizard;
