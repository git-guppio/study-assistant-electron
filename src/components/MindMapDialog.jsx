import React, { useState, useEffect, useRef } from 'react';

// Stessa palette dei segnalibri
const MINDMAP_COLORS = [
  { hex: '#3b82f6', name: 'Blu' },
  { hex: '#ef4444', name: 'Rosso' },
  { hex: '#f97316', name: 'Arancio' },
  { hex: '#eab308', name: 'Giallo' },
  { hex: '#22c55e', name: 'Verde' },
  { hex: '#8b5cf6', name: 'Viola' }
];

/**
 * Dialog per creare/modificare mappa (nome + colore insieme)
 *
 * Props:
 * - isOpen: boolean
 * - isEditing: boolean - true se modifica, false se nuova
 * - initialName: string
 * - initialColor: string
 * - onClose: () => void
 * - onSave: ({ name, color }) => void
 */
function MindMapDialog({ isOpen, isEditing, initialName, initialColor, onClose, onSave }) {
  const [name, setName] = useState(initialName || '');
  const [color, setColor] = useState(initialColor || MINDMAP_COLORS[0].hex);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialName || '');
      setColor(initialColor || MINDMAP_COLORS[0].hex);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, initialName, initialColor]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && name.trim()) handleSave();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, name, color]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), color });
  };

  if (!isOpen) return null;

  return (
    <div className="mindmap-dialog-overlay" onClick={onClose}>
      <div className="mindmap-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="mindmap-dialog-header">
          <span className="mindmap-dialog-icon">🗺️</span>
          <span className="mindmap-dialog-title">
            {isEditing ? 'Modifica mappa' : 'Nuova mappa'}
          </span>
        </div>

        <div className="mindmap-dialog-body">
          {/* Campo nome */}
          <div className="mindmap-dialog-field">
            <label htmlFor="mindmap-name">Nome</label>
            <input
              ref={inputRef}
              id="mindmap-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Inserisci un nome..."
              className="mindmap-dialog-input"
            />
          </div>

          {/* Selezione colore */}
          <div className="mindmap-dialog-field">
            <label>Colore</label>
            <div className="mindmap-dialog-colors">
              {MINDMAP_COLORS.map((c) => (
                <button
                  key={c.hex}
                  className={`mindmap-color-swatch ${color === c.hex ? 'selected' : ''}`}
                  style={{ backgroundColor: c.hex }}
                  onClick={() => setColor(c.hex)}
                  title={c.name}
                  type="button"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mindmap-dialog-footer">
          <button
            type="button"
            className="mindmap-dialog-btn mindmap-dialog-btn-cancel"
            onClick={onClose}
          >
            Annulla
          </button>
          <button
            type="button"
            className="mindmap-dialog-btn mindmap-dialog-btn-save"
            onClick={handleSave}
            disabled={!name.trim()}
          >
            {isEditing ? 'Salva modifiche' : 'Crea mappa'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MindMapDialog;
