import React, { useState, useEffect, useRef } from 'react';

// Palette colori per nodi
const NODE_COLORS = [
  { hex: '#3b82f6', name: 'Blu' },
  { hex: '#ef4444', name: 'Rosso' },
  { hex: '#f97316', name: 'Arancio' },
  { hex: '#eab308', name: 'Giallo' },
  { hex: '#22c55e', name: 'Verde' },
  { hex: '#8b5cf6', name: 'Viola' },
  { hex: '#ec4899', name: 'Rosa' },
  { hex: '#06b6d4', name: 'Ciano' },
  { hex: '#1f2937', name: 'Scuro' },
  { hex: '#6b7280', name: 'Grigio' },
  { hex: '#f0f9ff', name: 'Azzurro chiaro' },
  { hex: '#ffffff', name: 'Bianco' }
];

// Stili linea per edges
const LINE_STYLES = [
  { value: 'solid', name: 'Continuo', dashArray: undefined },
  { value: 'dashed', name: 'Tratteggiato', dashArray: '5,5' },
  { value: 'dotted', name: 'Puntinato', dashArray: '2,2' },
  { value: 'dashdot', name: 'Tratto-punto', dashArray: '10,5,2,5' }
];

/**
 * Menu contestuale per nodi, frecce e sfondo della mappa mentale
 */
function MindMapContextMenu({
  isOpen,
  position,
  flowPosition,
  type,
  targetId,
  currentStyle,
  isImageNode,
  onClose,
  onUpdateNode,
  onUpdateEdge,
  onAddNode,
  onAddImage,
  onPasteImage,
  onDeleteNode,
  onDuplicateNode,
  onDeleteEdge
}) {
  const menuRef = useRef(null);
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [localOpacity, setLocalOpacity] = useState(1);

  // Chiudi menu quando si clicca fuori
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Chiudi submenu quando si chiude il menu principale
  useEffect(() => {
    if (!isOpen) setActiveSubmenu(null);
  }, [isOpen]);

  // Inizializza opacità locale quando si apre il menu
  useEffect(() => {
    if (isOpen && type === 'node' && currentStyle) {
      const bg = currentStyle.background || currentStyle.backgroundColor || '';
      if (bg.startsWith('rgba')) {
        const match = bg.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/);
        if (match) {
          setLocalOpacity(parseFloat(match[1]));
          return;
        }
      }
      setLocalOpacity(1);
    }
  }, [isOpen, type, currentStyle]);

  if (!isOpen) return null;

  // Estrai colori correnti dal nodo
  const getNodeColors = () => {
    if (!currentStyle) return { fill: '#f0f9ff', border: '#3b82f6', text: '#1f2937', opacity: 1 };

    let fill = currentStyle.background || currentStyle.backgroundColor || '#f0f9ff';
    let opacity = 1;

    // Estrai opacità se il colore è in formato rgba
    if (fill.startsWith('rgba')) {
      const match = fill.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
      if (match) {
        opacity = parseFloat(match[4]);
        // Converti in hex per la visualizzazione
        fill = `#${parseInt(match[1]).toString(16).padStart(2, '0')}${parseInt(match[2]).toString(16).padStart(2, '0')}${parseInt(match[3]).toString(16).padStart(2, '0')}`;
      }
    }

    const border = currentStyle.borderColor ||
      (currentStyle.border ? currentStyle.border.split(' ').pop() : '#3b82f6');
    const text = currentStyle.color || '#1f2937';

    return { fill, border, text, opacity };
  };

  // Estrai stile corrente dell'edge
  const getEdgeStyle = () => {
    if (!currentStyle) return { color: '#64748b', lineStyle: 'solid' };

    const color = currentStyle.stroke || '#64748b';
    let lineStyle = 'solid';

    if (currentStyle.strokeDasharray) {
      const dash = currentStyle.strokeDasharray;
      if (dash === '5,5' || dash === '5 5') lineStyle = 'dashed';
      else if (dash === '2,2' || dash === '2 2') lineStyle = 'dotted';
      else if (dash.includes('10')) lineStyle = 'dashdot';
    }

    return { color, lineStyle };
  };

  // Converte hex in rgba
  const hexToRgba = (hex, opacity) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const handleNodeColorChange = (colorType, color) => {
    if (!onUpdateNode || !targetId) return;

    let styleUpdate = {};

    if (colorType === 'fill') {
      // Applica il colore con l'opacità corrente
      styleUpdate.background = localOpacity < 1 ? hexToRgba(color, localOpacity) : color;
    } else if (colorType === 'border') {
      const borderWidth = currentStyle?.borderWidth || '2px';
      styleUpdate.border = `${borderWidth} solid ${color}`;
    } else if (colorType === 'text') {
      styleUpdate.color = color;
    }

    onUpdateNode(targetId, styleUpdate);
    setActiveSubmenu(null);
  };

  const handleOpacityChange = (newOpacity) => {
    if (!onUpdateNode || !targetId) return;

    setLocalOpacity(newOpacity);

    // Ottieni il colore corrente e applica la nuova opacità
    const nodeColors = getNodeColors();
    const fillColor = nodeColors.fill;

    const styleUpdate = {
      background: newOpacity < 1 ? hexToRgba(fillColor, newOpacity) : fillColor
    };

    onUpdateNode(targetId, styleUpdate);
  };

  const handleEdgeStyleChange = (styleType, value) => {
    if (!onUpdateEdge || !targetId) return;

    let styleUpdate = {};

    if (styleType === 'color') {
      styleUpdate.stroke = value;
    } else if (styleType === 'lineStyle') {
      const lineStyleDef = LINE_STYLES.find(s => s.value === value);
      styleUpdate.strokeDasharray = lineStyleDef?.dashArray;
    }

    onUpdateEdge(targetId, styleUpdate);
    setActiveSubmenu(null);
  };

  const nodeColors = type === 'node' ? getNodeColors() : null;
  const edgeStyle = type === 'edge' ? getEdgeStyle() : null;

  return (
    <div
      ref={menuRef}
      className="mindmap-context-menu"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 1000
      }}
    >
      {type === 'node' && !isImageNode && (
        <>
          {/* Colore riempimento */}
          <div className="mindmap-context-menu-item">
            <button
              className="mindmap-context-menu-btn"
              onClick={() => setActiveSubmenu(activeSubmenu === 'fill' ? null : 'fill')}
            >
              <span
                className="mindmap-context-menu-color-preview"
                style={{ backgroundColor: nodeColors.fill }}
              />
              <span>Colore riempimento</span>
              <span className="mindmap-context-menu-arrow">▶</span>
            </button>
            {activeSubmenu === 'fill' && (
              <div className="mindmap-context-submenu">
                <div className="mindmap-context-colors">
                  {NODE_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      className={`mindmap-context-color-swatch ${nodeColors.fill === c.hex ? 'selected' : ''}`}
                      style={{ backgroundColor: c.hex }}
                      onClick={() => handleNodeColorChange('fill', c.hex)}
                      title={c.name}
                    />
                  ))}
                </div>
                {/* Slider opacità */}
                <div className="mindmap-context-opacity">
                  <label className="mindmap-context-opacity-label">
                    Opacità: {Math.round(localOpacity * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={localOpacity}
                    onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                    className="mindmap-context-opacity-slider"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Colore bordo */}
          <div className="mindmap-context-menu-item">
            <button
              className="mindmap-context-menu-btn"
              onClick={() => setActiveSubmenu(activeSubmenu === 'border' ? null : 'border')}
            >
              <span
                className="mindmap-context-menu-color-preview"
                style={{
                  backgroundColor: 'transparent',
                  border: `3px solid ${nodeColors.border}`
                }}
              />
              <span>Colore bordo</span>
              <span className="mindmap-context-menu-arrow">▶</span>
            </button>
            {activeSubmenu === 'border' && (
              <div className="mindmap-context-submenu">
                <div className="mindmap-context-colors">
                  {NODE_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      className={`mindmap-context-color-swatch ${nodeColors.border === c.hex ? 'selected' : ''}`}
                      style={{ backgroundColor: c.hex }}
                      onClick={() => handleNodeColorChange('border', c.hex)}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Colore testo */}
          <div className="mindmap-context-menu-item">
            <button
              className="mindmap-context-menu-btn"
              onClick={() => setActiveSubmenu(activeSubmenu === 'text' ? null : 'text')}
            >
              <span
                className="mindmap-context-menu-color-preview mindmap-context-menu-text-preview"
                style={{ color: nodeColors.text }}
              >
                A
              </span>
              <span>Colore testo</span>
              <span className="mindmap-context-menu-arrow">▶</span>
            </button>
            {activeSubmenu === 'text' && (
              <div className="mindmap-context-submenu">
                <div className="mindmap-context-colors">
                  {NODE_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      className={`mindmap-context-color-swatch ${nodeColors.text === c.hex ? 'selected' : ''}`}
                      style={{ backgroundColor: c.hex }}
                      onClick={() => handleNodeColorChange('text', c.hex)}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mindmap-context-menu-separator" />
        </>
      )}

      {/* Duplica e Elimina per nodi (testo e immagine) */}
      {type === 'node' && (
        <>
          {/* Duplica */}
          <div className="mindmap-context-menu-item">
            <button
              className="mindmap-context-menu-btn"
              onClick={() => {
                if (onDuplicateNode && targetId) {
                  onDuplicateNode(targetId);
                }
                onClose();
              }}
            >
              <span className="mindmap-context-menu-icon">📋</span>
              <span>Duplica</span>
            </button>
          </div>

          {/* Elimina */}
          <div className="mindmap-context-menu-item">
            <button
              className="mindmap-context-menu-btn mindmap-context-menu-btn-danger"
              onClick={() => {
                if (onDeleteNode && targetId) {
                  onDeleteNode(targetId);
                }
                onClose();
              }}
            >
              <span className="mindmap-context-menu-icon">🗑️</span>
              <span>Elimina</span>
              <span className="mindmap-context-menu-shortcut">Del</span>
            </button>
          </div>
        </>
      )}

      {type === 'edge' && (
        <>
          {/* Stile linea */}
          <div className="mindmap-context-menu-item">
            <button
              className="mindmap-context-menu-btn"
              onClick={() => setActiveSubmenu(activeSubmenu === 'lineStyle' ? null : 'lineStyle')}
            >
              <span className="mindmap-context-menu-line-preview">
                <svg width="20" height="12" viewBox="0 0 20 12">
                  <line
                    x1="0" y1="6" x2="20" y2="6"
                    stroke={edgeStyle.color}
                    strokeWidth="2"
                    strokeDasharray={LINE_STYLES.find(s => s.value === edgeStyle.lineStyle)?.dashArray}
                  />
                </svg>
              </span>
              <span>Stile linea</span>
              <span className="mindmap-context-menu-arrow">▶</span>
            </button>
            {activeSubmenu === 'lineStyle' && (
              <div className="mindmap-context-submenu">
                <div className="mindmap-context-line-styles">
                  {LINE_STYLES.map((style) => (
                    <button
                      key={style.value}
                      className={`mindmap-context-line-style-btn ${edgeStyle.lineStyle === style.value ? 'selected' : ''}`}
                      onClick={() => handleEdgeStyleChange('lineStyle', style.value)}
                    >
                      <svg width="40" height="12" viewBox="0 0 40 12">
                        <line
                          x1="0" y1="6" x2="40" y2="6"
                          stroke="#374151"
                          strokeWidth="2"
                          strokeDasharray={style.dashArray}
                        />
                      </svg>
                      <span>{style.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Colore linea */}
          <div className="mindmap-context-menu-item">
            <button
              className="mindmap-context-menu-btn"
              onClick={() => setActiveSubmenu(activeSubmenu === 'edgeColor' ? null : 'edgeColor')}
            >
              <span
                className="mindmap-context-menu-color-preview"
                style={{ backgroundColor: edgeStyle.color }}
              />
              <span>Colore linea</span>
              <span className="mindmap-context-menu-arrow">▶</span>
            </button>
            {activeSubmenu === 'edgeColor' && (
              <div className="mindmap-context-submenu">
                <div className="mindmap-context-colors">
                  {NODE_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      className={`mindmap-context-color-swatch ${edgeStyle.color === c.hex ? 'selected' : ''}`}
                      style={{ backgroundColor: c.hex }}
                      onClick={() => handleEdgeStyleChange('color', c.hex)}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mindmap-context-menu-separator" />

          {/* Elimina collegamento */}
          <div className="mindmap-context-menu-item">
            <button
              className="mindmap-context-menu-btn mindmap-context-menu-btn-danger"
              onClick={() => {
                if (onDeleteEdge && targetId) {
                  onDeleteEdge(targetId);
                }
                onClose();
              }}
            >
              <span className="mindmap-context-menu-icon">🗑️</span>
              <span>Elimina collegamento</span>
              <span className="mindmap-context-menu-shortcut">Del</span>
            </button>
          </div>
        </>
      )}

      {type === 'pane' && (
        <>
          {/* Aggiungi nuovo nodo */}
          <div className="mindmap-context-menu-item">
            <button
              className="mindmap-context-menu-btn"
              onClick={() => {
                if (onAddNode && flowPosition) {
                  onAddNode(flowPosition);
                }
                onClose();
              }}
            >
              <span className="mindmap-context-menu-icon">📝</span>
              <span>Aggiungi nodo</span>
            </button>
          </div>

          <div className="mindmap-context-menu-separator" />

          {/* Incolla immagine da clipboard */}
          <div className="mindmap-context-menu-item">
            <button
              className="mindmap-context-menu-btn"
              onClick={() => {
                if (onPasteImage && flowPosition) {
                  onPasteImage(flowPosition);
                }
                onClose();
              }}
            >
              <span className="mindmap-context-menu-icon">📋</span>
              <span>Incolla immagine</span>
              <span className="mindmap-context-menu-shortcut">Ctrl+V</span>
            </button>
          </div>

          {/* Carica immagine da file */}
          <div className="mindmap-context-menu-item">
            <button
              className="mindmap-context-menu-btn"
              onClick={() => {
                if (onAddImage && flowPosition) {
                  onAddImage(flowPosition);
                }
                onClose();
              }}
            >
              <span className="mindmap-context-menu-icon">🖼️</span>
              <span>Carica immagine...</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default MindMapContextMenu;
