import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Handle, Position } from 'reactflow';

/**
 * Nodo testo personalizzato per la mappa mentale
 * Supporta modifica inline con doppio click
 * Supporta testo multilinea con Shift+Enter
 * Ha 4 punti di ancoraggio (top, bottom, left, right)
 *
 * Props (via data):
 * - label: string
 * - onLabelChange: (nodeId, newLabel) => void
 */
function MindMapTextNode({ id, data, selected }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label || '');
  const textareaRef = useRef(null);

  // Sincronizza editValue con data.label quando cambia esternamente
  useEffect(() => {
    if (!isEditing) {
      setEditValue(data.label || '');
    }
  }, [data.label, isEditing]);

  // Focus sulla textarea quando entra in modalità editing
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
      // Auto-resize iniziale
      adjustTextareaHeight();
    }
  }, [isEditing]);

  // Auto-resize della textarea
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, []);

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
    if (e.key === 'Enter' && !e.shiftKey) {
      // Enter senza Shift = salva
      e.preventDefault();
      handleBlur();
    } else if (e.key === 'Enter' && e.shiftKey) {
      // Shift+Enter = nuova riga (lascia il comportamento di default)
      // L'auto-resize verrà gestito da onChange
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(data.label || '');
    }
  }, [handleBlur, data.label]);

  const handleChange = useCallback((e) => {
    setEditValue(e.target.value);
    adjustTextareaHeight();
  }, [adjustTextareaHeight]);

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

      {/* Contenuto: textarea o testo */}
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={editValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="mindmap-text-node-input nodrag"
          style={{
            color: data.style?.color || '#1f2937',
            fontSize: data.style?.fontSize || '12px',
            fontWeight: data.style?.fontWeight || 'normal',
            fontStyle: data.style?.fontStyle || 'normal'
          }}
          rows={1}
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
