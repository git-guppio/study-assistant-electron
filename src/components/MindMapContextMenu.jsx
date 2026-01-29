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
 * Menu contestuale per nodi e frecce della mappa mentale
 *
 * Props:
 * - isOpen: boolean
 * - position: { x, y }
 * - type: 'node' | 'edge'
 * - targetId: string - ID del nodo/edge selezionato
 * - currentStyle: object - Stile corrente dell'elemento
 * - onClose: () => void
 * - onUpdateNode: (nodeId, styleUpdates) => void
 * - onUpdateEdge: (edgeId, styleUpdates) => void
 */
function MindMapContextMenu({
  isOpen,
  position,
  type,
  targetId,
  currentStyle,
  onClose,
  onUpdateNode,
  onUpdateEdge
}) {
  const menuRef = useRef(null);
  const [activeSubmenu, setActiveSubmenu] = useState(null);

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

  if (!isOpen) return null;

  // Estrai colori correnti dal nodo
  const getNodeColors = () => {
    if (!currentStyle) return { fill: '#f0f9ff', border: '#3b82f6', text: '#1f2937' };

    const fill = currentStyle.background || currentStyle.backgroundColor || '#f0f9ff';
    const border = currentStyle.borderColor ||
      (currentStyle.border ? currentStyle.border.split(' ').pop() : '#3b82f6');
    const text = currentStyle.color || '#1f2937';

    return { fill, border, text };
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

  const handleNodeColorChange = (colorType, color) => {
    if (!onUpdateNode || !targetId) return;

    const nodeColors = getNodeColors();
    let styleUpdate = {};

    if (colorType === 'fill') {
      styleUpdate.background = color;
    } else if (colorType === 'border') {
      // Preserva larghezza bordo e stile
      const borderWidth = currentStyle?.borderWidth || '2px';
      styleUpdate.border = `${borderWidth} solid ${color}`;
    } else if (colorType === 'text') {
      styleUpdate.color = color;
    }

    onUpdateNode(targetId, styleUpdate);
    setActiveSubmenu(null);
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
      {type === 'node' && (
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
        </>
      )}
    </div>
  );
}

export default MindMapContextMenu;
