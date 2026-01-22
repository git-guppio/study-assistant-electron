import React, { useState, useRef, useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { getEmojiForIcon } from '../constants/annotations';
import { getDatabase } from '../database/db';
import MiniEditor from './MiniEditor';
import { showDeleteNoteDialog } from '../utils/confirmDialog';

/**
 * Componente React per blocco nota TipTap
 *
 * Layout:
 * ┌─────────────────────────────────────┐
 * │ 💡 Arancio  Pag. 5  │ [PDF] │ [✕]  │  ← Header
 * ├─────────────────────────────────────┤
 * │ > "Testo selezionato dal PDF..."    │  ← Blockquote
 * ├─────────────────────────────────────┤
 * │ [Rich Text Editor con toolbar]      │  ← MiniEditor
 * └─────────────────────────────────────┘
 */
function PdfNoteBlockComponent({ node, updateAttributes, deleteNode, extension }) {
  const { noteId, annotationId, pageNumber, selectionText, color, gutterIconId, comment } = node.attrs;

  // Recupera pdfDir e bookId dalle extension options
  const { pdfDir, bookId } = extension.options;

  // Debug: log extension options
  console.log('🔧 PdfNoteBlockComponent extension options:', { pdfDir, bookId, noteId });

  const [isSaving, setIsSaving] = useState(false);
  const lastSavedRef = useRef(comment);

  // Handler per salvare il commento
  const handleCommentChange = useCallback(async (htmlContent) => {
    // Non salvare se il contenuto è uguale
    if (htmlContent === lastSavedRef.current) return;

    try {
      const db = getDatabase();
      if (db && noteId) {
        await db.updateNote(noteId, { comment: htmlContent });
        updateAttributes({ comment: htmlContent });
        lastSavedRef.current = htmlContent;
        console.log('💾 Rich comment saved:', noteId);
      }
    } catch (error) {
      console.error('Error saving comment:', error);
    }
  }, [noteId, updateAttributes]);

  const handleDelete = async () => {
    // Mostra dialog di conferma
    const confirmed = await showDeleteNoteDialog();
    if (!confirmed) return;

    // Callback passato dall'extension options
    // Passa anche il contenuto del commento per eliminare le immagini
    if (extension.options.onDeleteNote) {
      extension.options.onDeleteNote(noteId, annotationId, comment);
    }
    deleteNode();
  };

  const handleNavigateToPdf = () => {
    // Callback passato dall'extension options
    if (extension.options.onNavigateToPdf) {
      extension.options.onNavigateToPdf({ annotationId, pageNumber });
    }
  };

  return (
    <NodeViewWrapper className="pdf-note-block" data-note-id={noteId}>
      {/* Header */}
      <div className="pdf-note-block-header" style={{ borderLeftColor: color }}>
        <div className="pdf-note-block-header-left">
          <span className="pdf-note-block-icon">{getEmojiForIcon(gutterIconId)}</span>
          <span className="pdf-note-block-page">Pag. {pageNumber}</span>
        </div>
        <div className="pdf-note-block-header-right">
          <button
            className="pdf-note-block-btn pdf-note-block-btn-navigate"
            onClick={handleNavigateToPdf}
            title="Vai al PDF"
          >
            PDF
          </button>
          <button
            className="pdf-note-block-btn pdf-note-block-btn-delete"
            onClick={handleDelete}
            title="Elimina nota"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Blockquote - Testo dal PDF */}
      {selectionText && (
        <div className="pdf-note-block-quote">
          {selectionText}
        </div>
      )}

      {/* Rich Text Comment Editor - espanso per occupare tutto lo spazio */}
      <div className="pdf-note-block-comment-wrapper">
        <MiniEditor
          content={comment}
          onChange={handleCommentChange}
          placeholder="Aggiungi un commento..."
          pdfDir={pdfDir}
          bookId={bookId}
          noteId={noteId}
          onSavingChange={setIsSaving}
        />
        {isSaving && (
          <span className="pdf-note-block-saving-indicator">Salvataggio...</span>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export default PdfNoteBlockComponent;
