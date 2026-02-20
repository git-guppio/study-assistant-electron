import React, { useState, useEffect } from 'react';
import CategorySidebar from './library/CategorySidebar';
import DocumentList from './library/DocumentList';
import DocumentListHeader from './library/DocumentListHeader';
import ImportDocumentDialog from './library/ImportDocumentDialog';
import EditDocumentDialog from './library/EditDocumentDialog';
import DeleteDocumentDialog from './library/DeleteDocumentDialog';
import FileNotFoundDialog from './library/FileNotFoundDialog';
import CategoryDialog from './library/CategoryDialog';
import LibraryBackupDialog from './LibraryBackupDialog';
import { getLibrary } from '../database/libraryDb';

function WelcomeScreen({ onOpenDocument, onOpenSettings }) {
  // State per documenti e categorie
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // State per filtri e ricerca
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', 'favorites', 'recent', o category id
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('last_opened_at');
  const [sortDir, setSortDir] = useState('DESC');

  // State per dialogs
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileNotFoundDialogOpen, setFileNotFoundDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [libraryBackupDialogOpen, setLibraryBackupDialogOpen] = useState(false);

  // State per documento selezionato (per edit/delete)
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);

  // Carica documenti e categorie all'avvio
  useEffect(() => {
    loadData();
  }, []);

  // Ricarica documenti quando cambiano filtri
  useEffect(() => {
    loadDocuments();
  }, [selectedFilter, searchQuery, sortBy, sortDir]);

  const loadData = async () => {
    setLoading(true);
    try {
      await loadDocuments();
      await loadCategories();
    } catch (error) {
      console.error('Error loading library data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    const library = getLibrary();
    if (!library) return;

    try {
      let filters = {
        orderBy: sortBy,
        orderDir: sortDir,
        search: searchQuery || undefined
      };

      // Applica filtro selezionato
      if (selectedFilter === 'favorites') {
        filters.favoritesOnly = true;
      } else if (selectedFilter === 'recent') {
        // Ultimi 10 documenti aperti
        const recentDocs = await library.getRecentDocuments(10);
        setDocuments(recentDocs);
        return;
      } else if (typeof selectedFilter === 'number') {
        // Categoria specifica
        filters.categoryId = selectedFilter;
      }

      const docs = await library.getDocuments(filters);
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const loadCategories = async () => {
    const library = getLibrary();
    if (!library) return;

    try {
      const cats = await library.getAllCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  // Handlers per documenti
  const handleOpenDocument = async (document) => {
    const library = getLibrary();
    if (!library) return;

    // Verifica se il file esiste
    const { exists } = await library.checkDocumentFileExists(document.id);

    if (!exists) {
      setSelectedDocument(document);
      setFileNotFoundDialogOpen(true);
      return;
    }

    // Aggiorna data ultimo accesso
    await library.updateDocumentLastOpened(document.id);

    // Apri il documento
    onOpenDocument(document);
  };

  const handleImportDocument = async (documentData) => {
    const library = getLibrary();
    if (!library) return;

    try {
      const newDoc = await library.createDocument(documentData);
      setImportDialogOpen(false);
      await loadDocuments();

      // Apri automaticamente il documento appena importato
      if (newDoc) {
        onOpenDocument(newDoc);
      }
    } catch (error) {
      console.error('Error importing document:', error);
    }
  };

  const handleEditDocument = (document) => {
    setSelectedDocument(document);
    setEditDialogOpen(true);
  };

  const handleSaveDocument = async (id, updates) => {
    const library = getLibrary();
    if (!library) return;

    try {
      await library.updateDocument(id, updates);
      setEditDialogOpen(false);
      setSelectedDocument(null);
      await loadDocuments();
    } catch (error) {
      console.error('Error updating document:', error);
    }
  };

  const handleDeleteDocument = (document) => {
    setSelectedDocument(document);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async (id) => {
    const library = getLibrary();
    if (!library) return;

    try {
      await library.deleteDocument(id);
      setDeleteDialogOpen(false);
      setSelectedDocument(null);
      await loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const handleToggleFavorite = async (documentId) => {
    const library = getLibrary();
    if (!library) return;

    try {
      await library.toggleDocumentFavorite(documentId);
      await loadDocuments();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleRelocateDocument = async (id, newPath) => {
    const library = getLibrary();
    if (!library) return;

    try {
      await library.relocateDocument(id, newPath);
      setFileNotFoundDialogOpen(false);
      setSelectedDocument(null);

      // Riapri il documento con il nuovo percorso
      const updatedDoc = await library.getDocumentById(id);
      if (updatedDoc) {
        onOpenDocument(updatedDoc);
      }
    } catch (error) {
      console.error('Error relocating document:', error);
    }
  };

  const handleRemoveFromLibrary = async (id) => {
    const library = getLibrary();
    if (!library) return;

    try {
      await library.deleteDocument(id);
      setFileNotFoundDialogOpen(false);
      setSelectedDocument(null);
      await loadDocuments();
    } catch (error) {
      console.error('Error removing document:', error);
    }
  };

  // Handlers per categorie
  const handleAddCategory = () => {
    setEditingCategory(null);
    setCategoryDialogOpen(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = async (categoryData) => {
    const library = getLibrary();
    if (!library) return;

    try {
      if (editingCategory) {
        await library.updateCategory(editingCategory.id, categoryData);
      } else {
        await library.createCategory(categoryData.name, categoryData.color);
      }
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      await loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    const library = getLibrary();
    if (!library) return;

    try {
      await library.deleteCategory(categoryId);
      if (selectedFilter === categoryId) {
        setSelectedFilter('all');
      }
      await loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  // Handler per ripristino backup libreria
  const handleLibraryBackupRestoreSuccess = async () => {
    // Dopo il ripristino della libreria, ricarica tutti i dati
    console.log('📦 Library backup restored, reloading data...');
    await loadData();
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">📚</span>
          <h1 className="text-xl font-semibold text-gray-800">
            Study Assistant
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setImportDialogOpen(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
          >
            <span>+</span>
            <span>Importa documento</span>
          </button>

          <button
            onClick={() => setLibraryBackupDialogOpen(true)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Backup Libreria"
          >
            <span className="text-xl">📦</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Impostazioni"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Categorie */}
        <CategorySidebar
          categories={categories}
          selectedFilter={selectedFilter}
          onSelectFilter={setSelectedFilter}
          onAddCategory={handleAddCategory}
          onEditCategory={handleEditCategory}
          onDeleteCategory={handleDeleteCategory}
        />

        {/* Document List Area */}
        <div className="flex-1 flex flex-col">
          {/* Search and Sort Header */}
          <DocumentListHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={(newSortBy, newSortDir) => {
              setSortBy(newSortBy);
              setSortDir(newSortDir);
            }}
          />

          {/* Document List */}
          <div className="flex-1 overflow-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Caricamento...</div>
              </div>
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <span className="text-4xl mb-4">📄</span>
                <p className="text-lg mb-2">Nessun documento</p>
                <p className="text-sm">
                  {searchQuery
                    ? 'Nessun risultato per la ricerca'
                    : 'Importa un documento per iniziare'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setImportDialogOpen(true)}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    + Importa documento
                  </button>
                )}
              </div>
            ) : (
              <DocumentList
                documents={documents}
                onOpenDocument={handleOpenDocument}
                onEditDocument={handleEditDocument}
                onDeleteDocument={handleDeleteDocument}
                onToggleFavorite={handleToggleFavorite}
              />
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <ImportDocumentDialog
        isOpen={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImport={handleImportDocument}
        categories={categories}
      />

      <EditDocumentDialog
        isOpen={editDialogOpen}
        document={selectedDocument}
        categories={categories}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedDocument(null);
        }}
        onSave={handleSaveDocument}
      />

      <DeleteDocumentDialog
        isOpen={deleteDialogOpen}
        document={selectedDocument}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedDocument(null);
        }}
        onConfirm={handleConfirmDelete}
      />

      <FileNotFoundDialog
        isOpen={fileNotFoundDialogOpen}
        document={selectedDocument}
        onClose={() => {
          setFileNotFoundDialogOpen(false);
          setSelectedDocument(null);
        }}
        onRelocate={handleRelocateDocument}
        onRemove={handleRemoveFromLibrary}
      />

      <CategoryDialog
        isOpen={categoryDialogOpen}
        category={editingCategory}
        onClose={() => {
          setCategoryDialogOpen(false);
          setEditingCategory(null);
        }}
        onSave={handleSaveCategory}
      />

      {libraryBackupDialogOpen && (
        <LibraryBackupDialog
          onClose={() => setLibraryBackupDialogOpen(false)}
          onRestoreSuccess={handleLibraryBackupRestoreSuccess}
        />
      )}
    </div>
  );
}

export default WelcomeScreen;
