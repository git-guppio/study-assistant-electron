import React, { useState, useRef, useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { getDatabase } from '../database/db';
import MiniEditor from './MiniEditor';

/**
 * Componente React per blocco parola chiave TipTap
 *
 * Layout:
 * ┌─────────────────────────────────────┐
 * │ 🔑 Termine        Pag. 5  │ [PDF] │ [✕] │  ← Header
 * ├─────────────────────────────────────┤
 * │ [Rich Text Editor per commento]    │  ← MiniEditor
 * └─────────────────────────────────────┘
 */
function KeywordBlockComponent({ node, updateAttributes, deleteNode, extension }) {
  const { keywordId, annotationId, pageNumber, term, color, comment } = node.attrs;

  // Recupera pdfDir e bookId dalle extension options
  const { pdfDir, bookId } = extension.options;

  const [isSaving, setIsSaving] = useState(false);
  const lastSavedRef = useRef(comment);

  // Handler per salvare il commento
  const handleCommentChange = useCallback(async (htmlContent) => {
    // Non salvare se il contenuto è uguale
    if (htmlContent === lastSavedRef.current) return;

    try {
      const db = getDatabase();
      if (db && keywordId) {
        await db.updateKeyword(keywordId, { comment: htmlContent });
        updateAttributes({ comment: htmlContent });
        lastSavedRef.current = htmlContent;
        console.log('💾 Keyword comment saved:', keywordId);
      }
    } catch (error) {
      console.error('Error saving keyword comment:', error);
    }
  }, [keywordId, updateAttributes]);

  const handleDelete = () => {
    // Callback passato dall'extension options
    if (extension.options.onDeleteKeyword) {
      extension.options.onDeleteKeyword(keywordId, annotationId);
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
    <NodeViewWrapper className="keyword-block" data-keyword-id={keywordId} data-annotation-id={annotationId}>
      {/* Header */}
      <div className="keyword-block-header" style={{ borderLeftColor: color }}>
        <div className="keyword-block-header-left">
          <span className="keyword-block-icon">🔑</span>
          <span className="keyword-block-term">{term}</span>
          <span className="keyword-block-page">Pag. {pageNumber}</span>
        </div>
        <div className="keyword-block-header-right">
          <button
            className="keyword-block-btn keyword-block-btn-navigate"
            onClick={handleNavigateToPdf}
            title="Vai al PDF"
          >
            PDF
          </button>
          <button
            className="keyword-block-btn keyword-block-btn-delete"
            onClick={handleDelete}
            title="Elimina parola chiave"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Rich Text Comment Editor */}
      <div className="keyword-block-comment-wrapper">
        <MiniEditor
          content={comment}
          onChange={handleCommentChange}
          placeholder="Aggiungi note sulla parola chiave..."
          pdfDir={pdfDir}
          bookId={bookId}
          noteId={`kw-${keywordId}`}
          onSavingChange={setIsSaving}
        />
        {isSaving && (
          <span className="keyword-block-saving-indicator">Salvataggio...</span>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export default KeywordBlockComponent;
