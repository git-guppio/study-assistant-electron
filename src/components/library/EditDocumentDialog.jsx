import React, { useState, useEffect } from 'react';

function EditDocumentDialog({ isOpen, document, categories, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [publisher, setPublisher] = useState('');
  const [isbn, setIsbn] = useState('');
  const [year, setYear] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Funzione per copiare l'ID nella clipboard
  const handleCopyId = async () => {
    if (document?.id) {
      try {
        await navigator.clipboard.writeText(document.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Error copying to clipboard:', error);
      }
    }
  };

  // Popola form quando si apre con un documento
  useEffect(() => {
    if (isOpen && document) {
      setTitle(document.title || '');
      setAuthors(document.authors?.join(', ') || '');
      setPublisher(document.publisher || '');
      setIsbn(document.isbn || '');
      setYear(document.year?.toString() || '');
      setSelectedCategories(document.categories?.map(c => c.id) || []);
    }
  }, [isOpen, document]);

  // Reset form quando si chiude
  useEffect(() => {
    if (!isOpen) {
      setLoading(false);
      setCopied(false);
    }
  }, [isOpen]);

  const handleCategoryToggle = (categoryId) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      }
      return [...prev, categoryId];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      return;
    }

    setLoading(true);
    try {
      // Parsa autori (separati da virgola)
      const authorsList = authors
        .split(',')
        .map(a => a.trim())
        .filter(a => a.length > 0);

      await onSave(document.id, {
        title: title.trim(),
        authors: authorsList,
        publisher: publisher.trim() || null,
        isbn: isbn.trim() || null,
        year: year ? parseInt(year) : null,
        categoryIds: selectedCategories
      });
    } catch (error) {
      console.error('Error saving document:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Modifica documento
          </h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title (required) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titolo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Inserisci il titolo"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              required
            />
          </div>

          {/* Authors */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Autori
            </label>
            <input
              type="text"
              value={authors}
              onChange={(e) => setAuthors(e.target.value)}
              placeholder="Separa più autori con virgola"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* Publisher and Year row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Editore
              </label>
              <input
                type="text"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="Casa editrice"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Anno
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="YYYY"
                min="1900"
                max="2100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          {/* ISBN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ISBN
            </label>
            <input
              type="text"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              placeholder="978-..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categorie
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryToggle(cat.id)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedCategories.includes(cat.id)
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={
                      selectedCategories.includes(cat.id)
                        ? { backgroundColor: cat.color || '#6b7280' }
                        : {}
                    }
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* File path (read-only info) */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Percorso file
            </label>
            <p className="text-sm text-gray-400 truncate" title={document.file_path}>
              {document.file_path}
            </p>
          </div>

          {/* Document ID (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              ID Documento
            </label>
            <div className="flex items-center space-x-2">
              <code className="flex-1 text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded font-mono truncate" title={document.id}>
                {document.id}
              </code>
              <button
                type="button"
                onClick={handleCopyId}
                className={`p-1.5 rounded transition-colors ${
                  copied
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                }`}
                title={copied ? 'Copiato!' : 'Copia ID'}
              >
                {copied ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </form>

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
            onClick={handleSubmit}
            disabled={!title.trim() || loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
          >
            {loading ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditDocumentDialog;
