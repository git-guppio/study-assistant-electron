import React, { useState, useEffect, useRef } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { getEmojiForIcon } from '../constants/annotations';
import { getDatabase } from '../database/db';

/**
 * Componente React per blocco nota TipTap
 *
 * Layout:
 * ┌─────────────────────────────────────┐
 * │ 💡 Arancio  Pag. 5  │ [PDF] │ [✕]  │  ← Header
 * ├─────────────────────────────────────┤
 * │ > "Testo selezionato dal PDF..."    │  ← Blockquote
 * ├─────────────────────────────────────┤
 * │ [Commento editabile]                │  ← Textarea
 * └─────────────────────────────────────┘
 */
function PdfNoteBlockComponent({ node, updateAttributes, deleteNode, extension }) {
  const { noteId, annotationId, pageNumber, selectionText, color, gutterIconId, comment } = node.attrs;

  const [localComment, setLocalComment] = useState(comment || '');
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef(null);

  // Debounced save: salva dopo 1.5s di inattività
  useEffect(() => {
    if (localComment === comment) return;

    // Mostra indicatore immediatamente quando cambia il commento
    setIsSaving(true);

    // Cancella timeout precedente
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Imposta nuovo timeout per salvare
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const db = getDatabase();
        if (db && noteId) {
          await db.updateNote(noteId, { comment: localComment });
          updateAttributes({ comment: localComment });
          console.log('💾 Comment saved:', noteId);
        }
      } catch (error) {
        console.error('Error saving comment:', error);
      }
      setIsSaving(false);
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [localComment, comment, noteId, updateAttributes]);

  const handleDelete = () => {
    // Callback passato dall'extension options
    if (extension.options.onDeleteNote) {
      extension.options.onDeleteNote(noteId, annotationId);
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
      <div className="pdf-note-block-quote">
        {selectionText}
      </div>

      {/* Commento editabile */}
      <div className="pdf-note-block-comment-wrapper">
        <textarea
          className="pdf-note-block-comment"
          placeholder="Aggiungi un commento..."
          value={localComment}
          onChange={(e) => setLocalComment(e.target.value)}
          rows={3}
        />
        {isSaving && (
          <span className="pdf-note-block-saving-indicator">Salvataggio...</span>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export default PdfNoteBlockComponent;
