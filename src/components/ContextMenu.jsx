import React, { useState, useEffect, useRef } from 'react';
import ColorPalette, { DEFAULT_COLORS } from './ColorPalette';

/**
 * Menu contestuale per annotazioni PDF
 *
 * Due modalita:
 * - selection: dopo selezione testo (Aggiungi note, Evidenzia, Outline)
 * - annotation: click destro su annotazione esistente (Elimina)
 *
 * @param {string} type - 'selection' | 'annotation'
 * @param {{ x: number, y: number }} position - Posizione del menu
 * @param {function} onAddToNotes - Callback per aggiungere alle note
 * @param {function} onHighlight - Callback per creare highlight (riceve colore)
 * @param {function} onOutline - Callback per creare outline (riceve colore)
 * @param {function} onDelete - Callback per eliminare annotazione
 * @param {function} onClose - Callback per chiudere il menu
 */
function ContextMenu({
  type,
  position,
  onAddToNotes,
  onHighlight,
  onOutline,
  onDelete,
  onClose
}) {
  const [showHighlightColors, setShowHighlightColors] = useState(false);
  const [showOutlineColors, setShowOutlineColors] = useState(false);
  const [highlightColor, setHighlightColor] = useState(DEFAULT_COLORS.highlight);
  const [outlineColor, setOutlineColor] = useState(DEFAULT_COLORS.outline);
  const menuRef = useRef(null);

  // Chiudi menu quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Calcola posizione per evitare overflow fuori schermo
  const getAdjustedPosition = () => {
    const menuWidth = 220;
    const menuHeight = type === 'selection' ? 200 : 60;
    const padding = 10;

    let x = position.x;
    let y = position.y + 5;

    // Evita overflow a destra
    if (x + menuWidth > window.innerWidth - padding) {
      x = window.innerWidth - menuWidth - padding;
    }

    // Evita overflow in basso
    if (y + menuHeight > window.innerHeight - padding) {
      y = position.y - menuHeight - 5;
    }

    return { x: Math.max(padding, x), y: Math.max(padding, y) };
  };

  const adjustedPosition = getAdjustedPosition();

  const handleHighlightClick = () => {
    if (showHighlightColors) {
      onHighlight(highlightColor);
    } else {
      setShowHighlightColors(true);
      setShowOutlineColors(false);
    }
  };

  const handleOutlineClick = () => {
    if (showOutlineColors) {
      onOutline(outlineColor);
    } else {
      setShowOutlineColors(true);
      setShowHighlightColors(false);
    }
  };

  const handleHighlightColorSelect = (color) => {
    setHighlightColor(color);
    onHighlight(color);
  };

  const handleOutlineColorSelect = (color) => {
    setOutlineColor(color);
    onOutline(color);
  };

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        top: adjustedPosition.y,
        left: adjustedPosition.x
      }}
    >
      {type === 'selection' && (
        <>
          {/* Aggiungi alle note */}
          <button
            className="context-menu-item"
            onClick={onAddToNotes}
          >
            <span>📝</span>
            <span>Aggiungi alle note</span>
          </button>

          <div className="context-menu-divider" />

          {/* Evidenzia */}
          <button
            className="context-menu-item"
            onClick={handleHighlightClick}
          >
            <span>🖍️</span>
            <span>Evidenzia</span>
            <span className="context-menu-arrow">{showHighlightColors ? '▼' : '▶'}</span>
          </button>

          {showHighlightColors && (
            <div className="context-menu-submenu">
              <ColorPalette
                selectedColor={highlightColor}
                onColorSelect={handleHighlightColorSelect}
              />
            </div>
          )}

          {/* Outline per nota */}
          <button
            className="context-menu-item"
            onClick={handleOutlineClick}
          >
            <span>📌</span>
            <span>Outline per nota</span>
            <span className="context-menu-arrow">{showOutlineColors ? '▼' : '▶'}</span>
          </button>

          {showOutlineColors && (
            <div className="context-menu-submenu">
              <ColorPalette
                selectedColor={outlineColor}
                onColorSelect={handleOutlineColorSelect}
              />
            </div>
          )}
        </>
      )}

      {type === 'annotation' && (
        <>
          <button
            className="context-menu-item danger"
            onClick={onDelete}
          >
            <span>🗑️</span>
            <span>Elimina annotazione</span>
          </button>
        </>
      )}
    </div>
  );
}

export default ContextMenu;
