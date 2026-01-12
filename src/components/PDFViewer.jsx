import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import ContextMenu from './ContextMenu';
import { getSelectionRects, denormalizeRect, getGutterYPosition, findAnnotationAtPoint } from '../utils/coordinates';
import { getEmojiForIcon, ANNOTATION_OPACITY } from '../constants/annotations';

// Configurazione Worker - bundled localmente per supporto offline
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  '/pdf.worker.min.js',
  import.meta.url
).href;

function PDFViewer({
  filePath,
  annotations = [],
  onAddNote,
  onHighlight,
  onCreateFlashcard,
  onCreateDictionary,
  onCreateKeyword,
  onDeleteAnnotation,
  onGutterClick,
  documentDefaults = {},
  customIconColors = {},
  customActionColors = {}
}) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(false);
  const [viewport, setViewport] = useState(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);
  const [contextMenuType, setContextMenuType] = useState(null); // 'selection' | 'annotation'
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [selectionData, setSelectionData] = useState(null);

  // Refs
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const highlightsLayerRef = useRef(null);
  const gutterLayerRef = useRef(null);
  const pageContainerRef = useRef(null);
  const renderTaskRef = useRef(null);

  // Filtra annotazioni per la pagina corrente
  const pageAnnotations = annotations.filter(a => a.pageNumber === currentPage);

  // Caricamento Documento
  useEffect(() => {
    if (!filePath) return;
    const loadDoc = async () => {
      setLoading(true);
      try {
        const result = await window.electronAPI.readPdfFile(filePath);
        if (result.success) {
          const doc = await pdfjsLib.getDocument({
            data: result.data,
            cMapUrl: '/cmaps/',
            cMapPacked: true,
          }).promise;
          setPdfDoc(doc);
          setNumPages(doc.numPages);
        }
      } catch (err) {
        console.error("Errore caricamento:", err);
      }
      setLoading(false);
    };
    loadDoc();
  }, [filePath]);

  // Rendering Pagina e Text Layer (Sincronizzato)
  useEffect(() => {
    if (!pdfDoc) return;

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) renderTaskRef.current.cancel();

        const page = await pdfDoc.getPage(currentPage);
        const vp = page.getViewport({ scale });
        setViewport(vp);

        const canvas = canvasRef.current;
        const textLayerDiv = textLayerRef.current;
        const dpr = window.devicePixelRatio || 1;

        // 1. Configurazione Canvas (HiDPI)
        canvas.width = Math.floor(vp.width * dpr);
        canvas.height = Math.floor(vp.height * dpr);
        canvas.style.width = `${vp.width}px`;
        canvas.style.height = `${vp.height}px`;

        const context = canvas.getContext('2d');
        const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null;

        renderTaskRef.current = page.render({
          canvasContext: context,
          viewport: vp,
          transform: transform
        });
        await renderTaskRef.current.promise;

        // 2. Configurazione Text Layer
        if (textLayerDiv) {
          textLayerDiv.innerHTML = '';
          textLayerDiv.style.width = `${vp.width}px`;
          textLayerDiv.style.height = `${vp.height}px`;
          textLayerDiv.style.setProperty('--scale-factor', scale);

          const textContent = await page.getTextContent();
          await pdfjsLib.renderTextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport: vp,
            textDivs: []
          }).promise;
        }

        // 3. Configurazione Highlights Layer
        if (highlightsLayerRef.current) {
          highlightsLayerRef.current.style.width = `${vp.width}px`;
          highlightsLayerRef.current.style.height = `${vp.height}px`;
        }

      } catch (err) {
        if (err.name !== 'RenderingCancelledException') console.error(err);
      }
    };

    renderPage();
  }, [pdfDoc, currentPage, scale]);

  // Handler per selezione testo
  const handleMouseUp = (e) => {
    // Ignora se click destro (gestito da handleContextMenu)
    if (e.button === 2) return;

    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text && viewport && pageContainerRef.current) {
      // Cattura i rettangoli normalizzati della selezione
      const rects = getSelectionRects(selection, pageContainerRef.current, viewport);

      if (rects.length > 0) {
        setSelectionData({
          text,
          pageNumber: currentPage,
          rects
        });
        setContextMenuType('selection');
        setContextMenu({
          x: e.clientX,
          y: e.clientY
        });
      }
    } else {
      closeContextMenu();
    }
  };

  // Handler per click destro su annotazione
  const handleAnnotationContextMenu = (e, annotation) => {
    e.preventDefault();
    e.stopPropagation();

    setSelectedAnnotation(annotation);
    setContextMenuType('annotation');
    setContextMenu({
      x: e.clientX,
      y: e.clientY
    });
  };

  // Handler per click destro generico (check se su annotazione)
  const handleContextMenu = (e) => {
    // Prima controlla se c'e' un'annotazione sotto il click
    if (viewport && pageContainerRef.current) {
      const annotation = findAnnotationAtPoint(
        e.clientX,
        e.clientY,
        pageContainerRef.current,
        viewport,
        pageAnnotations
      );

      if (annotation) {
        handleAnnotationContextMenu(e, annotation);
        return;
      }
    }

    // Se c'e' testo selezionato, mostra menu selezione
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text && viewport && pageContainerRef.current) {
      e.preventDefault();
      const rects = getSelectionRects(selection, pageContainerRef.current, viewport);

      if (rects.length > 0) {
        setSelectionData({
          text,
          pageNumber: currentPage,
          rects
        });
        setContextMenuType('selection');
        setContextMenu({
          x: e.clientX,
          y: e.clientY
        });
      }
    }
  };

  const closeContextMenu = () => {
    setContextMenu(null);
    setContextMenuType(null);
    setSelectedAnnotation(null);
    setSelectionData(null);
  };

  // Handler per "Aggiungi Nota" (con icona e colore)
  const handleAddNote = ({ iconId, color, opacity }) => {
    if (selectionData && onAddNote) {
      onAddNote({
        ...selectionData,
        type: 'note',
        gutterIconId: iconId,
        color,
        opacity: opacity || ANNOTATION_OPACITY.note
      });
    }
    closeContextMenu();
    window.getSelection().removeAllRanges();
  };

  // Handler per "Evidenziatura" (solo colore, no gutter icon)
  const handleHighlight = (color) => {
    if (selectionData && onHighlight) {
      onHighlight({
        ...selectionData,
        type: 'highlight',
        color,
        opacity: ANNOTATION_OPACITY.highlight
      });
    }
    closeContextMenu();
    window.getSelection().removeAllRanges();
  };

  // Handler per "Crea Flashcard"
  const handleCreateFlashcard = (color) => {
    if (selectionData && onCreateFlashcard) {
      onCreateFlashcard({
        ...selectionData,
        type: 'flashcard',
        gutterIconId: 'flashcard',
        color,
        opacity: ANNOTATION_OPACITY.flashcard
      });
    }
    closeContextMenu();
    window.getSelection().removeAllRanges();
  };

  // Handler per "Inserisci in Dizionario"
  const handleCreateDictionary = (color) => {
    if (selectionData && onCreateDictionary) {
      onCreateDictionary({
        ...selectionData,
        type: 'dictionary',
        gutterIconId: 'dictionary',
        color,
        opacity: ANNOTATION_OPACITY.dictionary
      });
    }
    closeContextMenu();
    window.getSelection().removeAllRanges();
  };

  // Handler per "Parola Chiave"
  const handleCreateKeyword = (color) => {
    if (selectionData && onCreateKeyword) {
      onCreateKeyword({
        ...selectionData,
        type: 'keyword',
        gutterIconId: 'keyword',
        color,
        opacity: ANNOTATION_OPACITY.keyword
      });
    }
    closeContextMenu();
    window.getSelection().removeAllRanges();
  };

  // Handler per "Elimina"
  const handleDelete = () => {
    if (selectedAnnotation && onDeleteAnnotation) {
      onDeleteAnnotation(selectedAnnotation.id);
    }
    closeContextMenu();
  };

  // Handler per click su gutter icon
  const handleGutterIconClick = (annotation) => {
    if (onGutterClick) {
      onGutterClick(annotation);
    }
  };

  // Rendering rettangoli annotazione
  const renderAnnotationRects = (annotation) => {
    if (!viewport || !annotation.rects) return null;

    return annotation.rects.map((rect, idx) => {
      const { left, top, width, height } = denormalizeRect(rect, viewport.width, viewport.height);

      const style = {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`
      };

      if (annotation.type === 'highlight') {
        // Evidenziatura pura - solo sfondo colorato
        style.backgroundColor = annotation.color;
        style.opacity = annotation.opacity || ANNOTATION_OPACITY.highlight;
      } else {
        // Note, flashcard, dictionary, keyword - bordo + sfondo leggero
        style.border = `2px solid ${annotation.color}`;
        style.backgroundColor = annotation.color;
        style.opacity = annotation.opacity || ANNOTATION_OPACITY.note;
      }

      return (
        <div
          key={`${annotation.id}-${idx}`}
          className={`annotation-rect ${annotation.type}`}
          style={style}
          onContextMenu={(e) => handleAnnotationContextMenu(e, annotation)}
        />
      );
    });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-gray-500">Caricamento...</span>
      </div>
    );
  }

  return (
    <div className="pdf-viewer-layout">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-300 p-2 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-30"
          >
            ←
          </button>
          <span className="text-sm font-medium">
            Pagina {currentPage} / {numPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
            disabled={currentPage === numPages}
            className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-30"
          >
            →
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
            className="p-2 hover:bg-gray-100 rounded"
          >
            🔍-
          </button>
          <span className="text-sm font-mono w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(s => Math.min(4, s + 0.1))}
            className="p-2 hover:bg-gray-100 rounded"
          >
            🔍+
          </button>
        </div>
      </div>

      {/* Area Documento */}
      <div
        className="pdf-content-area"
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
      >
        <div ref={pageContainerRef} className="pdf-page-container">
          {/* Gutter Layer (icone a sinistra) */}
          <div ref={gutterLayerRef} className="pdf-gutter-layer">
            {viewport && pageAnnotations
              .filter(a => a.gutterIconId) // Solo annotazioni con icona gutter
              .map(annotation => (
                <div
                  key={`gutter-${annotation.id}`}
                  className={`gutter-icon ${annotation.type}`}
                  style={{
                    top: `${getGutterYPosition(annotation, viewport.height)}px`,
                    borderColor: annotation.color
                  }}
                  onClick={() => handleGutterIconClick(annotation)}
                  title={`Vai alla nota (pagina ${annotation.pageNumber})`}
                >
                  {getEmojiForIcon(annotation.gutterIconId)}
                </div>
              ))}
          </div>

          {/* Canvas (PDF rendering) */}
          <canvas ref={canvasRef} className="pdf-page-canvas" />

          {/* Highlights Layer */}
          <div ref={highlightsLayerRef} className="pdf-highlights-layer">
            {pageAnnotations.map(annotation => renderAnnotationRects(annotation))}
          </div>

          {/* Text Layer (selezione) */}
          <div ref={textLayerRef} className="textLayer" />
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && contextMenuType && (
        <ContextMenu
          type={contextMenuType}
          position={contextMenu}
          onAddNote={handleAddNote}
          onHighlight={handleHighlight}
          onCreateFlashcard={handleCreateFlashcard}
          onCreateDictionary={handleCreateDictionary}
          onCreateKeyword={handleCreateKeyword}
          onDelete={handleDelete}
          onClose={closeContextMenu}
          documentDefaults={documentDefaults}
          customIconColors={customIconColors}
          customActionColors={customActionColors}
        />
      )}
    </div>
  );
}

export default PDFViewer;
