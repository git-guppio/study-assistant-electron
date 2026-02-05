import React, { useState } from 'react';

function DeleteDocumentDialog({ isOpen, document, onClose, onConfirm }) {
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Reset quando si chiude
  React.useEffect(() => {
    if (!isOpen) {
      setConfirmed(false);
      setLoading(false);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!confirmed || !document) return;

    setLoading(true);
    try {
      await onConfirm(document.id);
    } catch (error) {
      console.error('Error deleting document:', error);
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
          <h2 className="text-lg font-semibold text-red-600 flex items-center space-x-2">
            <span>🗑️</span>
            <span>Elimina documento</span>
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-gray-700">
            Stai per eliminare <strong>"{document.title}"</strong> dalla libreria.
          </p>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700 font-medium mb-2">
              Questa azione eliminerà definitivamente:
            </p>
            <ul className="text-sm text-red-600 list-disc list-inside space-y-1">
              <li>Tutte le note associate</li>
              <li>Tutte le annotazioni e gli evidenziatori</li>
              <li>Le voci del dizionario</li>
              <li>Le parole chiave</li>
              <li>Le mappe mentali</li>
              <li>I riassunti</li>
              <li>I segnalibri</li>
            </ul>
          </div>

          <p className="text-sm text-gray-500">
            Il file PDF originale <strong>non</strong> verrà eliminato.
          </p>

          {/* Confirmation checkbox */}
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <span className="text-sm text-gray-700">
              Confermo di voler eliminare questo documento e tutti i dati associati
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium"
            disabled={loading}
          >
            Annulla
          </button>
          <button
            onClick={handleConfirm}
            disabled={!confirmed || loading}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
          >
            {loading ? 'Eliminazione...' : 'Elimina'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteDocumentDialog;
