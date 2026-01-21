import React, { useState, useRef, useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { getDatabase } from '../database/db';
import MiniEditor from './MiniEditor';

/**
 * Componente React per blocco dizionario TipTap
 *
 * Layout:
 * ┌─────────────────────────────────────┐
 * │ 📖 Termine        Pag. 5  │ [PDF] │ [✕] │  ← Header
 * ├─────────────────────────────────────┤
 * │ [Rich Text Editor per definizione] │  ← MiniEditor
 * └─────────────────────────────────────┘
 */
function DictionaryBlockComponent({ node, updateAttributes, deleteNode, extension }) {
  const { entryId, annotationId, pageNumber, term, color, definition } = node.attrs;

  // Recupera pdfDir e bookId dalle extension options
  const { pdfDir, bookId } = extension.options;

  const [isSaving, setIsSaving] = useState(false);
  const lastSavedRef = useRef(definition);

  // Handler per salvare la definizione
  const handleDefinitionChange = useCallback(async (htmlContent) => {
    // Non salvare se il contenuto è uguale
    if (htmlContent === lastSavedRef.current) return;

    try {
      const db = getDatabase();
      if (db && entryId) {
        await db.updateDictionaryEntry(entryId, { definition: htmlContent });
        updateAttributes({ definition: htmlContent });
        lastSavedRef.current = htmlContent;
        console.log('💾 Dictionary definition saved:', entryId);
      }
    } catch (error) {
      console.error('Error saving definition:', error);
    }
  }, [entryId, updateAttributes]);

  const handleDelete = () => {
    // Callback passato dall'extension options
    if (extension.options.onDeleteEntry) {
      extension.options.onDeleteEntry(entryId, annotationId);
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
    <NodeViewWrapper className="dictionary-block" data-entry-id={entryId} data-annotation-id={annotationId}>
      {/* Header */}
      <div className="dictionary-block-header" style={{ borderLeftColor: color }}>
        <div className="dictionary-block-header-left">
          <span className="dictionary-block-icon">📖</span>
          <span className="dictionary-block-term">{term}</span>
          <span className="dictionary-block-page">Pag. {pageNumber}</span>
        </div>
        <div className="dictionary-block-header-right">
          <button
            className="dictionary-block-btn dictionary-block-btn-navigate"
            onClick={handleNavigateToPdf}
            title="Vai al PDF"
          >
            PDF
          </button>
          <button
            className="dictionary-block-btn dictionary-block-btn-delete"
            onClick={handleDelete}
            title="Elimina voce"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Rich Text Definition Editor */}
      <div className="dictionary-block-definition-wrapper">
        <MiniEditor
          content={definition}
          onChange={handleDefinitionChange}
          placeholder="Inserisci la definizione..."
          pdfDir={pdfDir}
          bookId={bookId}
          noteId={`dict-${entryId}`}
          onSavingChange={setIsSaving}
        />
        {isSaving && (
          <span className="dictionary-block-saving-indicator">Salvataggio...</span>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export default DictionaryBlockComponent;
