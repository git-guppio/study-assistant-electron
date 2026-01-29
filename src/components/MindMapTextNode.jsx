import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Handle, Position } from 'reactflow';

/**
 * Nodo testo personalizzato per la mappa mentale
 * Supporta modifica inline con doppio click
 * Ha 4 punti di ancoraggio (top, bottom, left, right)
 *
 * Props (via data):
 * - label: string
 * - onLabelChange: (nodeId, newLabel) => void
 */
function MindMapTextNode({ id, data, selected }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label || '');
  const inputRef = useRef(null);

  // Sincronizza editValue con data.label quando cambia esternamente
  useEffect(() => {
    if (!isEditing) {
      setEditValue(data.label || '');
    }
  }, [data.label, isEditing]);

  // Focus sull'input quando entra in modalità editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = useCallback((e) => {
    e.stopPropagation();
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editValue.trim() && editValue !== data.label && data.onLabelChange) {
      data.onLabelChange(id, editValue.trim());
    } else {
      setEditValue(data.label || '');
    }
  }, [id, editValue, data]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(data.label || '');
    }
  }, [handleBlur, data.label]);

  return (
    <div
      className={`mindmap-text-node ${selected ? 'selected' : ''}`}
      style={data.style}
      onDoubleClick={handleDoubleClick}
    >
      {/* Handle per connessioni - 4 punti di ancoraggio */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="mindmap-text-handle"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="mindmap-text-handle"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="mindmap-text-handle"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="mindmap-text-handle"
      />

      {/* Contenuto: input o testo */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="mindmap-text-node-input nodrag"
          style={{
            color: data.style?.color || '#1f2937',
            fontSize: data.style?.fontSize || '12px',
            fontWeight: data.style?.fontWeight || 'normal'
          }}
        />
      ) : (
        <div className="mindmap-text-node-label">
          {data.label || 'Nuovo concetto'}
        </div>
      )}
    </div>
  );
}

export default MindMapTextNode;
