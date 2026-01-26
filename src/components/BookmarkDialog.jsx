import React, { useState, useEffect, useRef } from 'react';

// Palette colori predefinita per i segnalibri
const BOOKMARK_COLORS = [
  { hex: '#ef4444', name: 'Rosso' },
  { hex: '#f97316', name: 'Arancio' },
  { hex: '#eab308', name: 'Giallo' },
  { hex: '#22c55e', name: 'Verde' },
  { hex: '#3b82f6', name: 'Blu' },
  { hex: '#8b5cf6', name: 'Viola' }
];

/**
 * Dialog modale per creare/modificare un segnalibro
 *
 * Props:
 * - isOpen: boolean - se il dialog è visibile
 * - onClose: () => void - callback per chiudere il dialog
 * - onSave: (data: {title, color}) => void - callback per salvare
 * - pageNumber: number - numero pagina del segnalibro
 * - initialData: {title, color} - dati iniziali (per modifica)
 * - isEditing: boolean - true se stiamo modificando un segnalibro esistente
 */
function BookmarkDialog({ isOpen, onClose, onSave, pageNumber, initialData, isEditing }) {
  const [title, setTitle] = useState('');
  const [color, setColor] = useState(BOOKMARK_COLORS[0].hex);
  const inputRef = useRef(null);

  // Reset form quando si apre il dialog
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title || '');
        setColor(initialData.color || BOOKMARK_COLORS[0].hex);
      } else {
        setTitle('');
        setColor(BOOKMARK_COLORS[0].hex);
      }
      // Focus sul campo titolo
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, initialData]);

  // Gestisci tasti
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && title.trim()) {
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, title, color, onClose]);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ title: title.trim(), color });
  };

  if (!isOpen) return null;

  return (
    <div className="bookmark-dialog-overlay" onClick={onClose}>
      <div className="bookmark-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bookmark-dialog-header">
          <span className="bookmark-dialog-icon">🔖</span>
          <span className="bookmark-dialog-title">
            {isEditing ? 'Modifica segnalibro' : 'Nuovo segnalibro'}
          </span>
          <span className="bookmark-dialog-page">Pag. {pageNumber}</span>
        </div>

        {/* Body */}
        <div className="bookmark-dialog-body">
          {/* Campo titolo */}
          <div className="bookmark-dialog-field">
            <label htmlFor="bookmark-title">Titolo</label>
            <input
              ref={inputRef}
              id="bookmark-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Inserisci un titolo..."
              className="bookmark-dialog-input"
            />
          </div>

          {/* Selezione colore */}
          <div className="bookmark-dialog-field">
            <label>Colore</label>
            <div className="bookmark-dialog-colors">
              {BOOKMARK_COLORS.map((c) => (
                <button
                  key={c.hex}
                  className={`bookmark-color-swatch ${color === c.hex ? 'selected' : ''}`}
                  style={{ backgroundColor: c.hex }}
                  onClick={() => setColor(c.hex)}
                  title={c.name}
                  type="button"
                />
              ))}
            </div>
          </div>

          {/* Preview ribbon */}
          <div className="bookmark-dialog-preview">
            <span className="bookmark-dialog-preview-label">Anteprima:</span>
            <div className="bookmark-ribbon-preview" style={{ backgroundColor: color }}>
              <div className="bookmark-ribbon-fold" style={{ borderTopColor: color }}></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bookmark-dialog-footer">
          <button
            type="button"
            className="bookmark-dialog-btn bookmark-dialog-btn-cancel"
            onClick={onClose}
          >
            Annulla
          </button>
          <button
            type="button"
            className="bookmark-dialog-btn bookmark-dialog-btn-save"
            onClick={handleSave}
            disabled={!title.trim()}
          >
            {isEditing ? 'Salva modifiche' : 'Aggiungi segnalibro'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BookmarkDialog;
