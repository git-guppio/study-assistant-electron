import React, { useState, useRef, useCallback, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { getEmojiForIcon } from '../constants/annotations';
import { getDatabase } from '../database/db';
import MiniEditor from './MiniEditor';
import { showDeleteNoteDialog } from '../utils/confirmDialog';
import { useEditorContext } from '../contexts/EditorContext';

/**
 * Componente React per blocco nota TipTap
 *
 * Layout:
 * ┌─────────────────────────────────────────────┐
 * │ 💡 Pag. 5  │ [▼] │ [PDF] │ [✕]              │  ← Header
 * ├─────────────────────────────────────────────┤
 * │ > "Testo selezionato dal PDF..."            │  ← Blockquote
 * ├─────────────────────────────────────────────┤
 * │ [Rich Text Editor - comprimibile]           │  ← MiniEditor
 * └─────────────────────────────────────────────┘
 */
function PdfNoteBlockComponent({ node, updateAttributes, deleteNode, extension }) {
  const { noteId, annotationId, pageNumber, selectionText, color, gutterIconId, comment } = node.attrs;

  // Recupera pdfDir e bookId dalle extension options
  const { pdfDir, bookId } = extension.options;

  // Context per sapere quale nota è attiva
  const { activeMiniEditorId } = useEditorContext();

  // Stato expanded/collapsed (default: compresso)
  const [isExpanded, setIsExpanded] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const lastSavedRef = useRef(comment);

  // La nota è attiva se il suo MiniEditor ha il focus
  const isActive = activeMiniEditorId === noteId;

  // Quando la nota diventa attiva, espandila automaticamente
  useEffect(() => {
    if (isActive && !isExpanded) {
      setIsExpanded(true);
    }
  }, [isActive]);

  // Ascolta eventi globali per espandi/comprimi tutte
  useEffect(() => {
    const handleExpandAll = () => setIsExpanded(true);
    const handleCollapseAll = () => setIsExpanded(false);

    window.addEventListener('expandAllNotes', handleExpandAll);
    window.addEventListener('collapseAllNotes', handleCollapseAll);

    return () => {
      window.removeEventListener('expandAllNotes', handleExpandAll);
      window.removeEventListener('collapseAllNotes', handleCollapseAll);
    };
  }, []);

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

  // Toggle expand/collapse
  const toggleExpanded = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // Classi CSS per stato attivo e espanso
  const blockClasses = [
    'pdf-note-block',
    isActive ? 'pdf-note-block-active' : '',
    isExpanded ? 'pdf-note-block-expanded' : 'pdf-note-block-collapsed'
  ].filter(Boolean).join(' ');

  return (
    <NodeViewWrapper className={blockClasses} data-note-id={noteId}>
      {/* Header */}
      <div className="pdf-note-block-header" style={{ borderLeftColor: color }}>
        <div className="pdf-note-block-header-left">
          <span className="pdf-note-block-icon">{getEmojiForIcon(gutterIconId)}</span>
          <span className="pdf-note-block-page">Pag. {pageNumber}</span>
        </div>
        <div className="pdf-note-block-header-right">
          <button
            className="pdf-note-block-btn pdf-note-block-btn-expand"
            onClick={toggleExpanded}
            title={isExpanded ? 'Comprimi nota' : 'Espandi nota'}
          >
            {isExpanded ? '▲' : '▼'}
          </button>
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

      {/* Rich Text Comment Editor - comprimibile */}
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
