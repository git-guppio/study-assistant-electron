import React, { useState } from 'react';

function FileNotFoundDialog({ isOpen, document, onClose, onRelocate, onRemove }) {
  const [loading, setLoading] = useState(false);

  // Reset quando si chiude
  React.useEffect(() => {
    if (!isOpen) {
      setLoading(false);
    }
  }, [isOpen]);

  const handleLocateFile = async () => {
    try {
      const result = await window.electronAPI.showOpenDialog({
        title: 'Localizza documento PDF',
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
        properties: ['openFile'],
        defaultPath: document?.file_path
      });

      if (result.canceled || result.filePaths.length === 0) return;

      setLoading(true);
      await onRelocate(document.id, result.filePaths[0]);
    } catch (error) {
      console.error('Error relocating file:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm('Sei sicuro di voler rimuovere questo documento dalla libreria?')) {
      return;
    }

    setLoading(true);
    try {
      await onRemove(document.id);
    } catch (error) {
      console.error('Error removing document:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-orange-600 flex items-center space-x-2">
            <span>⚠️</span>
            <span>File non trovato</span>
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-gray-700">
            Il file per <strong>"{document.title}"</strong> non è stato trovato nel percorso originale.
          </p>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-700 font-medium mb-1">
              Percorso precedente:
            </p>
            <p className="text-sm text-orange-600 break-all font-mono">
              {document.file_path}
            </p>
          </div>

          <p className="text-sm text-gray-500">
            Il file potrebbe essere stato spostato, rinominato o eliminato.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium"
            disabled={loading}
          >
            Annulla
          </button>
          <button
            onClick={handleRemove}
            disabled={loading}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium"
          >
            Rimuovi dalla libreria
          </button>
          <button
            onClick={handleLocateFile}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 text-sm font-medium"
          >
            {loading ? 'Ricerca...' : 'Cerca file...'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FileNotFoundDialog;
