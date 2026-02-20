import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';

/**
 * Nodo immagine personalizzato per la mappa mentale
 * Supporta ridimensionamento tramite maniglie agli angoli
 *
 * Props (via data):
 * - image: string (base64 o URL)
 * - width: number
 * - height: number
 * - onResize: (nodeId, { width, height }) => void
 */
function MindMapImageNode({ id, data, selected }) {
  const [isResizing, setIsResizing] = useState(false);
  const [dimensions, setDimensions] = useState({
    width: data.width || 100,
    height: data.height || 100
  });
  const startPosRef = useRef({ x: 0, y: 0 });
  const startDimRef = useRef({ width: 0, height: 0 });
  const resizeCornerRef = useRef(null);
  const dimensionsRef = useRef(dimensions);

  // Sincronizza dimensioni con data quando cambiano esternamente
  useEffect(() => {
    if (data.width && data.height && !isResizing) {
      setDimensions({ width: data.width, height: data.height });
    }
  }, [data.width, data.height, isResizing]);

  // Mantieni ref aggiornato
  useEffect(() => {
    dimensionsRef.current = dimensions;
  }, [dimensions]);

  const handleResizeStart = useCallback((e, corner) => {
    // Previeni drag del nodo e pan della mappa
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    startDimRef.current = { ...dimensionsRef.current };
    resizeCornerRef.current = corner;

    const handleMouseMove = (moveEvent) => {
      moveEvent.preventDefault();
      moveEvent.stopPropagation();

      const deltaX = moveEvent.clientX - startPosRef.current.x;
      const deltaY = moveEvent.clientY - startPosRef.current.y;

      let newWidth = startDimRef.current.width;
      let newHeight = startDimRef.current.height;

      // Calcola nuove dimensioni in base all'angolo
      if (corner.includes('e')) newWidth = Math.max(40, startDimRef.current.width + deltaX);
      if (corner.includes('w')) newWidth = Math.max(40, startDimRef.current.width - deltaX);
      if (corner.includes('s')) newHeight = Math.max(40, startDimRef.current.height + deltaY);
      if (corner.includes('n')) newHeight = Math.max(40, startDimRef.current.height - deltaY);

      // Mantieni proporzioni con Shift
      if (moveEvent.shiftKey) {
        const ratio = startDimRef.current.width / startDimRef.current.height;
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          newHeight = newWidth / ratio;
        } else {
          newWidth = newHeight * ratio;
        }
      }

      setDimensions({ width: Math.round(newWidth), height: Math.round(newHeight) });
    };

    const handleMouseUp = (upEvent) => {
      upEvent.preventDefault();
      upEvent.stopPropagation();

      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // Notifica il parent delle nuove dimensioni
      if (data.onResize) {
        data.onResize(id, dimensionsRef.current);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [id, data]);

  return (
    <div
      className={`mindmap-image-node ${selected ? 'selected' : ''} ${isResizing ? 'resizing' : ''}`}
      style={{
        width: dimensions.width,
        height: dimensions.height,
      }}
    >
      {/* Handle per connessioni */}
      <Handle
        type="target"
        position={Position.Top}
        className="mindmap-image-handle"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="mindmap-image-handle"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="mindmap-image-handle"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="mindmap-image-handle"
      />

      {/* Immagine */}
      <img
        src={data.image}
        alt="Mind map image"
        className="mindmap-image-content"
        draggable={false}
      />

      {/* Maniglie di ridimensionamento (visibili solo se selezionato) */}
      {selected && (
        <>
          <div
            className="mindmap-image-resize-handle nw nodrag nopan"
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
          />
          <div
            className="mindmap-image-resize-handle ne nodrag nopan"
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
          />
          <div
            className="mindmap-image-resize-handle sw nodrag nopan"
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
          />
          <div
            className="mindmap-image-resize-handle se nodrag nopan"
            onMouseDown={(e) => handleResizeStart(e, 'se')}
          />
        </>
      )}
    </div>
  );
}

export default MindMapImageNode;
