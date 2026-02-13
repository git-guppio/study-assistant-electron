import React, { useState, useRef, useCallback, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';

const MIN_SIZE = 50;

/**
 * Componente React per immagini ridimensionabili nel TipTap editor.
 * Mostra 4 maniglie agli angoli quando l'immagine è selezionata E l'editor ha focus.
 * Mantiene le proporzioni durante il ridimensionamento.
 * Limiti: min 50px, max larghezza contenitore.
 */
function ResizableImageComponent({ node, updateAttributes, selected, editor, extension, getPos }) {
  const [isResizing, setIsResizing] = useState(false);
  const [editorFocused, setEditorFocused] = useState(false);
  const imageRef = useRef(null);
  const wrapperRef = useRef(null);
  const startDataRef = useRef(null);

  const { src, width, height, alt, title } = node.attrs;

  // Traccia lo stato di focus dell'editor genitore
  useEffect(() => {
    if (!editor) return;

    const onFocus = () => setEditorFocused(true);
    const onBlur = () => setEditorFocused(false);

    // Stato iniziale
    setEditorFocused(editor.isFocused);

    editor.on('focus', onFocus);
    editor.on('blur', onBlur);

    return () => {
      editor.off('focus', onFocus);
      editor.off('blur', onBlur);
    };
  }, [editor]);

  // Click sull'immagine: forza NodeSelection persistente (non si perde al mouseup)
  const handleImageClick = useCallback((e) => {
    if (!editor || typeof getPos !== 'function') return;
    e.stopPropagation();
    const pos = getPos();
    if (pos !== undefined) {
      editor.chain().focus().setNodeSelection(pos).run();
    }
  }, [editor, getPos]);

  // Mostra controlli solo se l'immagine è selezionata E l'editor ha focus
  const showControls = selected && editorFocused;

  const handleResizeStart = useCallback((e, corner) => {
    e.preventDefault();
    e.stopPropagation();

    const img = imageRef.current;
    if (!img) return;

    const naturalWidth = img.naturalWidth || img.offsetWidth;
    const naturalHeight = img.naturalHeight || img.offsetHeight;

    startDataRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: img.offsetWidth,
      height: img.offsetHeight,
      aspectRatio: naturalWidth / (naturalHeight || 1),
      corner,
    };

    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const data = startDataRef.current;
      if (!data) return;

      const dx = e.clientX - data.x;

      let newWidth;
      switch (data.corner) {
        case 'se':
        case 'ne':
          newWidth = data.width + dx;
          break;
        case 'sw':
        case 'nw':
          newWidth = data.width - dx;
          break;
        default:
          newWidth = data.width;
      }

      // Max: larghezza del contenitore
      const container = wrapperRef.current?.closest('.mini-editor-content')
        || wrapperRef.current?.closest('.ProseMirror');
      const maxWidth = container ? container.clientWidth - 20 : 800;

      newWidth = Math.max(MIN_SIZE, Math.min(Math.round(newWidth), maxWidth));
      const newHeight = Math.round(newWidth / data.aspectRatio);

      updateAttributes({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      startDataRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, updateAttributes]);

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      className={`resizable-image-wrapper ${showControls ? 'show-controls' : ''} ${isResizing ? 'resizing' : ''}`}
    >
      <div className="resizable-image-container" style={{ display: 'inline-block', position: 'relative' }}>
        <img
          ref={imageRef}
          src={src}
          alt={alt || ''}
          title={title || ''}
          style={{
            width: width ? `${width}px` : 'auto',
            height: height ? `${height}px` : 'auto',
            display: 'block',
            maxWidth: '100%',
          }}
          draggable={false}
          onClick={handleImageClick}
        />

        {/* Maniglie di ridimensionamento - solo quando selezionata E editor ha focus */}
        {showControls && (
          <>
            <div
              className="resize-handle resize-handle-nw"
              onMouseDown={(e) => handleResizeStart(e, 'nw')}
            />
            <div
              className="resize-handle resize-handle-ne"
              onMouseDown={(e) => handleResizeStart(e, 'ne')}
            />
            <div
              className="resize-handle resize-handle-sw"
              onMouseDown={(e) => handleResizeStart(e, 'sw')}
            />
            <div
              className="resize-handle resize-handle-se"
              onMouseDown={(e) => handleResizeStart(e, 'se')}
            />
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export default ResizableImageComponent;
