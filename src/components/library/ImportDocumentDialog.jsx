import React, { useState, useEffect } from 'react';

function ImportDocumentDialog({ isOpen, onClose, onImport, categories }) {
  const [filePath, setFilePath] = useState('');
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [publisher, setPublisher] = useState('');
  const [isbn, setIsbn] = useState('');
  const [year, setYear] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [extractingMetadata, setExtractingMetadata] = useState(false);

  // Reset form quando si chiude
  useEffect(() => {
    if (!isOpen) {
      setFilePath('');
      setTitle('');
      setAuthors('');
      setPublisher('');
      setIsbn('');
      setYear('');
      setSelectedCategories([]);
      setLoading(false);
      setExtractingMetadata(false);
    }
  }, [isOpen]);

  const handleSelectFile = async () => {
    try {
      const result = await window.electronAPI.showOpenDialog({
        title: 'Seleziona documento PDF',
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
        properties: ['openFile']
      });

      if (result.canceled || result.filePaths.length === 0) return;

      const selectedPath = result.filePaths[0];
      setFilePath(selectedPath);

      // Estrai metadati automaticamente
      setExtractingMetadata(true);
      try {
        const metadata = await window.electronAPI.extractPdfMetadata(selectedPath);
        console.log('📄 Extracted metadata:', metadata);

        if (metadata.success) {
          if (metadata.title) setTitle(metadata.title);
          if (metadata.authors && metadata.authors.length > 0) {
            setAuthors(metadata.authors.join(', '));
          }
          // Prova a estrarre l'anno dalla data di creazione
          if (metadata.creationDate) {
            const yearMatch = metadata.creationDate.match(/\d{4}/);
            if (yearMatch) setYear(yearMatch[0]);
          }
        }
      } catch (error) {
        console.error('Error extracting metadata:', error);
      } finally {
        setExtractingMetadata(false);
      }
    } catch (error) {
      console.error('Error selecting file:', error);
    }
  };

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

    if (!filePath || !title.trim()) {
      return;
    }

    setLoading(true);
    try {
      // Parsa autori (separati da virgola)
      const authorsList = authors
        .split(',')
        .map(a => a.trim())
        .filter(a => a.length > 0);

      await onImport({
        filePath,
        title: title.trim(),
        authors: authorsList,
        publisher: publisher.trim() || null,
        isbn: isbn.trim() || null,
        year: year ? parseInt(year) : null,
        categoryIds: selectedCategories
      });
    } catch (error) {
      console.error('Error importing document:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Importa documento
          </h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* File selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File PDF
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={filePath}
                readOnly
                placeholder="Seleziona un file..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
              />
              <button
                type="button"
                onClick={handleSelectFile}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
              >
                Sfoglia...
              </button>
            </div>
          </div>

          {/* Title (required) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titolo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={extractingMetadata ? 'Estrazione in corso...' : 'Inserisci il titolo'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              required
              disabled={extractingMetadata}
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
            disabled={!filePath || !title.trim() || loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
          >
            {loading ? 'Importazione...' : 'Importa'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImportDocumentDialog;
