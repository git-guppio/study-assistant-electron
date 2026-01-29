import React, { useState, useRef, useEffect } from 'react';

/**
 * Dropdown per selezione mappa mentale
 *
 * Props:
 * - mindmaps: Array di mappe disponibili
 * - selectedId: ID mappa selezionata
 * - onSelect: (id) => void
 * - onNew: () => void
 * - onEdit: (id) => void
 * - onDelete: (id) => void
 */
function MindMapSelector({
  mindmaps,
  selectedId,
  onSelect,
  onNew,
  onEdit,
  onDelete
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedMap = mindmaps.find(m => m.id === selectedId);

  // Chiudi dropdown quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Chiudi con Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div className="mindmap-selector" ref={dropdownRef}>
      {/* Header con toolbar */}
      <div className="mindmap-selector-header">
        <span className="mindmap-selector-label">Mappa:</span>

        {/* Dropdown button */}
        <button
          className="mindmap-selector-dropdown"
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectedMap ? (
            <>
              <span
                className="mindmap-selector-color"
                style={{ backgroundColor: selectedMap.color }}
              />
              <span className="mindmap-selector-name">{selectedMap.name}</span>
            </>
          ) : (
            <span className="mindmap-selector-name">Seleziona mappa...</span>
          )}
          <span className="mindmap-selector-arrow">{isOpen ? '▲' : '▼'}</span>
        </button>

        {/* Action buttons */}
        <button
          className="mindmap-action-btn"
          onClick={onNew}
          title="Nuova mappa"
        >
          +
        </button>
        <button
          className="mindmap-action-btn-edit"
          onClick={() => selectedId && onEdit(selectedId)}
          disabled={!selectedId}
          title="Modifica mappa"
        >
          ✏️
        </button>
        <button
          className="mindmap-action-btn mindmap-action-btn-danger"
          onClick={() => selectedId && onDelete(selectedId)}
          disabled={!selectedId || mindmaps.length <= 1}
          title={mindmaps.length <= 1 ? 'Non puoi eliminare l\'unica mappa' : 'Elimina mappa'}
        >
          🗑️
        </button>
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="mindmap-selector-menu">
          {mindmaps.length === 0 ? (
            <div className="mindmap-selector-empty">Nessuna mappa disponibile</div>
          ) : (
            mindmaps.map((map) => (
              <button
                key={map.id}
                className={`mindmap-selector-item ${map.id === selectedId ? 'selected' : ''}`}
                onClick={() => {
                  onSelect(map.id);
                  setIsOpen(false);
                }}
              >
                <span
                  className="mindmap-selector-color"
                  style={{ backgroundColor: map.color }}
                />
                <span className="mindmap-selector-item-name">{map.name}</span>
                {map.id === selectedId && <span className="mindmap-selector-check">✓</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default MindMapSelector;
