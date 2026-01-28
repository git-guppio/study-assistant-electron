import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { getDatabase } from '../database/db';
import BookmarkDialog from './BookmarkDialog';
import { showDeleteBookmarkDialog } from '../utils/confirmDialog';

/**
 * Componente per visualizzare e gestire i segnalibri
 *
 * Props:
 * - bookId: string - ID del libro
 * - dbReady: boolean - se il database è pronto
 * - onNavigateToPdf: ({pageNumber}) => void - callback per navigare alla pagina
 * - currentPage: number - pagina corrente del PDF (opzionale, per highlight)
 * - onBookmarksChange: (bookmarks) => void - callback quando i segnalibri cambiano
 */
const BookmarksEditor = forwardRef(function BookmarksEditor({
  bookId,
  dbReady,
  onNavigateToPdf,
  currentPage,
  onBookmarksChange
}, ref) {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  // State per il dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState(null);
  const [dialogPageNumber, setDialogPageNumber] = useState(1);

  // Carica segnalibri dal database
  const loadBookmarks = async () => {
    try {
      const db = getDatabase();
      if (db) {
        const data = await db.getBookmarks();
        setBookmarks(data || []);
        // Notifica il cambiamento al componente padre
        if (onBookmarksChange) {
          onBookmarksChange(data || []);
        }
      }
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carica segnalibri quando il database è pronto
  useEffect(() => {
    if (dbReady) {
      loadBookmarks();
    }
  }, [dbReady]);

  // Esponi metodi via ref per permettere ad App.jsx di ricaricare i dati
  useImperativeHandle(ref, () => ({
    refresh: loadBookmarks,
    openDialog: (pageNumber, existingBookmark = null) => {
      setDialogPageNumber(pageNumber);
      setEditingBookmark(existingBookmark);
      setDialogOpen(true);
    }
  }), []);

  // Gestisci salvataggio dal dialog
  const handleSaveBookmark = async (data) => {
    try {
      const db = getDatabase();
      if (db) {
        if (editingBookmark) {
          // Modifica
          await db.updateBookmark(editingBookmark.id, data);
        } else {
          // Nuovo
          await db.saveBookmark({
            pageNumber: dialogPageNumber,
            ...data
          });
        }
        await loadBookmarks();
      }
    } catch (error) {
      console.error('Error saving bookmark:', error);
    } finally {
      setDialogOpen(false);
      setEditingBookmark(null);
    }
  };

  // Gestisci eliminazione
  const handleDelete = async (bookmark) => {
    const confirmed = await showDeleteBookmarkDialog(bookmark.title);
    if (!confirmed) return;

    try {
      const db = getDatabase();
      if (db) {
        await db.deleteBookmark(bookmark.id);
        await loadBookmarks();
      }
    } catch (error) {
      console.error('Error deleting bookmark:', error);
    }
  };

  // Gestisci modifica
  const handleEdit = (bookmark) => {
    setDialogPageNumber(bookmark.pageNumber);
    setEditingBookmark(bookmark);
    setDialogOpen(true);
  };

  // Gestisci navigazione
  const handleNavigate = (bookmark) => {
    if (onNavigateToPdf) {
      onNavigateToPdf({ pageNumber: bookmark.pageNumber });
    }
  };

  if (loading) {
    return (
      <div className="bookmarks-editor-loading">
        <span>Caricamento segnalibri...</span>
      </div>
    );
  }

  return (
    <div className="bookmarks-editor">
      {/* Header */}
      <div className="bookmarks-editor-header">
        <span className="bookmarks-editor-title">🔖 Segnalibri</span>
        <span className="bookmarks-editor-count">{bookmarks.length}</span>
      </div>

      {/* Lista segnalibri */}
      {bookmarks.length === 0 ? (
        <div className="bookmarks-editor-empty">
          <div className="bookmarks-editor-empty-icon">🔖</div>
          <div className="bookmarks-editor-empty-text">
            Nessun segnalibro presente
          </div>
          <div className="bookmarks-editor-empty-hint">
            Usa il pulsante 🔖 nella toolbar del PDF<br />
            o il menu contestuale per aggiungere segnalibri
          </div>
        </div>
      ) : (
        <div className="bookmarks-editor-list">
          {bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className={`bookmarks-editor-item ${currentPage === bookmark.pageNumber ? 'active' : ''}`}
            >
              {/* Ribbon colorato */}
              <div
                className="bookmarks-editor-item-ribbon"
                style={{ backgroundColor: bookmark.color }}
              />

              {/* Contenuto cliccabile */}
              <div
                className="bookmarks-editor-item-content"
                onClick={() => handleNavigate(bookmark)}
                title={`Vai a pagina ${bookmark.pageNumber}`}
              >
                <div className="bookmarks-editor-item-title">{bookmark.title}</div>
                <div className="bookmarks-editor-item-page">Pag. {bookmark.pageNumber}</div>
              </div>

              {/* Azioni */}
              <div className="bookmarks-editor-item-actions">
                <button
                  className="bookmarks-editor-action-btn"
                  onClick={() => handleEdit(bookmark)}
                  title="Modifica"
                >
                  ✏️
                </button>
                <button
                  className="bookmarks-editor-action-btn"
                  onClick={() => handleDelete(bookmark)}
                  title="Elimina"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog per creare/modificare */}
      <BookmarkDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingBookmark(null);
        }}
        onSave={handleSaveBookmark}
        pageNumber={dialogPageNumber}
        initialData={editingBookmark}
        isEditing={!!editingBookmark}
      />
    </div>
  );
});

export default BookmarksEditor;
