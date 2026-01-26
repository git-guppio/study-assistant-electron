import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import ContextMenu from './ContextMenu';
import { getSelectionRects, denormalizeRect, getGutterYPosition, findAnnotationAtPoint } from '../utils/coordinates';
import { getEmojiForIcon, ANNOTATION_OPACITY } from '../constants/annotations';

// Configurazione Worker - bundled localmente per supporto offline
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  '/pdf.worker.min.js',
  import.meta.url
).href;

const PDFViewer = forwardRef(function PDFViewer({
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
  customActionColors = {},
  currentPageBookmark = null,
  onAddBookmark,
  onPageChange
}, ref) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(false);
  const [viewport, setViewport] = useState(null);
  const [flashingAnnotationId, setFlashingAnnotationId] = useState(null);

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
  const contentAreaRef = useRef(null);
  const renderTaskRef = useRef(null);
  const flashTimeoutRef = useRef(null);
  // Traccia la posizione di scroll desiderata e la pagina di destinazione
  // forPage permette di applicare lo scroll solo quando la pagina corretta è renderizzata
  const scrollPositionRef = useRef({ position: 'top', forPage: null });

  // Esponi metodi via ref per navigazione da Note -> PDF
  useImperativeHandle(ref, () => ({
    // Vai a una pagina specifica
    goToPage: (pageNumber) => {
      if (pageNumber >= 1 && pageNumber <= numPages) {
        scrollPositionRef.current = { position: 'top', forPage: pageNumber };
        setCurrentPage(pageNumber);
      }
    },
    // Flash animazione su un'annotazione
    flashOutline: (annotationId) => {
      // Pulisci timeout precedente
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }

      setFlashingAnnotationId(annotationId);

      // Rimuovi flash dopo 2.5s
      flashTimeoutRef.current = setTimeout(() => {
        setFlashingAnnotationId(null);
      }, 2500);
    },
    // Getter per la pagina corrente
    getCurrentPage: () => currentPage
  }), [numPages, currentPage]);

  // Filtra annotazioni per la pagina corrente
  const pageAnnotations = annotations.filter(a => a.pageNumber === currentPage);

  // Raggruppa icone gutter per posizione Y (soglia 20px per considerarle sulla stessa riga)
  const GUTTER_GROUP_THRESHOLD = 20; // pixel
  const gutterAnnotations = pageAnnotations.filter(a => a.gutterIconId);

  const groupedGutterIcons = React.useMemo(() => {
    if (!viewport) return [];

    // Calcola posizione Y per ogni annotazione e raggruppa
    const annotationsWithY = gutterAnnotations.map(a => ({
      annotation: a,
      yPos: getGutterYPosition(a, viewport.height)
    }));

    // Ordina per Y
    annotationsWithY.sort((a, b) => a.yPos - b.yPos);

    // Raggruppa annotazioni vicine
    const groups = [];
    let currentGroup = null;

    for (const item of annotationsWithY) {
      if (!currentGroup || Math.abs(item.yPos - currentGroup.yPos) > GUTTER_GROUP_THRESHOLD) {
        // Nuovo gruppo
        currentGroup = {
          yPos: item.yPos,
          annotations: [item.annotation]
        };
        groups.push(currentGroup);
      } else {
        // Aggiungi al gruppo esistente
        currentGroup.annotations.push(item.annotation);
      }
    }

    return groups;
  }, [gutterAnnotations, viewport]);

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

  // Notifica il cambio pagina al componente padre
  useEffect(() => {
    if (onPageChange) {
      onPageChange(currentPage);
    }
  }, [currentPage, onPageChange]);

  // Rendering Pagina e Text Layer (Sincronizzato)
  useEffect(() => {
    if (!pdfDoc) return;

    let cancelled = false;

    const renderPage = async () => {
      try {
        // Cancella render precedente e attendi che sia completato
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          try {
            await renderTaskRef.current.promise;
          } catch (e) {
            // Ignora errore di cancellazione
          }
          renderTaskRef.current = null;
        }

        // Se questo effect è stato cancellato nel frattempo, esci
        if (cancelled) return;

        const page = await pdfDoc.getPage(currentPage);
        if (cancelled) return;

        const vp = page.getViewport({ scale });

        const canvas = canvasRef.current;
        const textLayerDiv = textLayerRef.current;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;

        // 1. Configurazione Canvas (HiDPI)
        canvas.width = Math.floor(vp.width * dpr);
        canvas.height = Math.floor(vp.height * dpr);
        canvas.style.width = `${vp.width}px`;
        canvas.style.height = `${vp.height}px`;

        // Imposta viewport DOPO le dimensioni del canvas, così lo scroll effect
        // può calcolare correttamente scrollHeight
        setViewport(vp);

        const context = canvas.getContext('2d');
        const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null;

        renderTaskRef.current = page.render({
          canvasContext: context,
          viewport: vp,
          transform: transform,
          // Disabilita le annotazioni native del PDF (evidenziazioni, commenti, note di altri programmi)
          annotationMode: pdfjsLib.AnnotationMode.DISABLE
        });
        await renderTaskRef.current.promise;

        if (cancelled) return;

        // 2. Configurazione Text Layer
        if (textLayerDiv) {
          textLayerDiv.innerHTML = '';
          textLayerDiv.style.width = `${vp.width}px`;
          textLayerDiv.style.height = `${vp.height}px`;
          textLayerDiv.style.setProperty('--scale-factor', scale);

          const textContent = await page.getTextContent();
          if (cancelled) return;

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

    // Cleanup: cancella questo render se l'effect viene ri-eseguito
    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfDoc, currentPage, scale]);

  // Posiziona lo scroll dopo il rendering della pagina (quando si cambia pagina)
  useEffect(() => {
    if (!contentAreaRef.current || !viewport) return;

    const container = contentAreaRef.current;
    const { position, forPage } = scrollPositionRef.current;

    // Applica lo scroll solo se è per la pagina corrente (evita di applicare prima che il render sia completo)
    if (forPage === currentPage) {
      // Usa setTimeout per assicurarsi che il DOM sia completamente aggiornato
      setTimeout(() => {
        const scrollTarget = container.scrollHeight - container.clientHeight;
        if (position === 'bottom') {
          // Scrolla alla fine della pagina
          container.scrollTop = scrollTarget;
        } else {
          // Scrolla all'inizio della pagina
          container.scrollTop = 0;
        }
      }, 50);
      // Reset dopo aver applicato
      scrollPositionRef.current = { position: 'top', forPage: null };
    } else if (forPage === null) {
      // Comportamento di default per cambi pagina senza scroll position specificato
      container.scrollTop = 0;
    }
  }, [viewport, currentPage]);

  // Registra evento wheel con passive: false per poter usare preventDefault
  useEffect(() => {
    const container = contentAreaRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtTop = scrollTop <= 0;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1; // -1 per tolleranza
      const canScroll = scrollHeight > clientHeight;

      // Se la pagina non richiede scroll, cambia pagina direttamente
      if (!canScroll) {
        e.preventDefault();
        if (e.deltaY > 0 && currentPage < numPages) {
          // Scroll verso il basso -> pagina successiva (mostra dall'alto)
          scrollPositionRef.current = { position: 'top', forPage: currentPage + 1 };
          setCurrentPage(p => p + 1);
        } else if (e.deltaY < 0 && currentPage > 1) {
          // Scroll verso l'alto -> pagina precedente (mostra dal basso)
          scrollPositionRef.current = { position: 'bottom', forPage: currentPage - 1 };
          setCurrentPage(p => p - 1);
        }
        return;
      }

      // Se la pagina richiede scroll, cambia pagina solo ai bordi
      if (e.deltaY > 0 && isAtBottom && currentPage < numPages) {
        // Al bordo inferiore, scroll verso il basso -> pagina successiva (mostra dall'alto)
        e.preventDefault();
        scrollPositionRef.current = { position: 'top', forPage: currentPage + 1 };
        setCurrentPage(p => p + 1);
      } else if (e.deltaY < 0 && isAtTop && currentPage > 1) {
        // Al bordo superiore, scroll verso l'alto -> pagina precedente (mostra dal basso)
        e.preventDefault();
        scrollPositionRef.current = { position: 'bottom', forPage: currentPage - 1 };
        setCurrentPage(p => p - 1);
      }
      // Altrimenti, lascia lo scroll normale
    };

    // Registra con passive: false per permettere preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [currentPage, numPages]);

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

      // Aggiungi classe flashing se questa annotazione sta lampeggiando
      const isFlashing = flashingAnnotationId === annotation.id;

      return (
        <div
          key={`${annotation.id}-${idx}`}
          className={`annotation-rect ${annotation.type}${isFlashing ? ' flashing' : ''}`}
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
            onClick={() => {
              const newPage = Math.max(1, currentPage - 1);
              scrollPositionRef.current = { position: 'top', forPage: newPage };
              setCurrentPage(newPage);
            }}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-30"
          >
            ←
          </button>
          <span className="text-sm font-medium">
            Pagina {currentPage} / {numPages}
          </span>
          <button
            onClick={() => {
              const newPage = Math.min(numPages, currentPage + 1);
              scrollPositionRef.current = { position: 'top', forPage: newPage };
              setCurrentPage(newPage);
            }}
            disabled={currentPage === numPages}
            className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-30"
          >
            →
          </button>

          {/* Pulsante Segnalibro */}
          <button
            onClick={() => onAddBookmark && onAddBookmark(currentPage, currentPageBookmark)}
            className={`ml-4 px-3 py-1 rounded transition-colors ${
              currentPageBookmark
                ? 'bg-amber-100 hover:bg-amber-200 text-amber-700'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
            title={currentPageBookmark ? 'Modifica segnalibro' : 'Aggiungi segnalibro'}
          >
            🔖
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
        ref={contentAreaRef}
        className="pdf-content-area"
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
      >
        <div ref={pageContainerRef} className="pdf-page-container">
          {/* Gutter Layer (icone a sinistra) */}
          <div ref={gutterLayerRef} className="pdf-gutter-layer">
            {viewport && groupedGutterIcons.map((group, groupIndex) => (
              <div
                key={`gutter-group-${groupIndex}`}
                className="gutter-icon-group"
                style={{ top: `${group.yPos}px` }}
              >
                {group.annotations.map((annotation, idx) => (
                  <div
                    key={`gutter-${annotation.id}`}
                    className={`gutter-icon ${annotation.type}`}
                    style={{
                      left: `${idx * 16}px`, // 50% di 32px (larghezza icona)
                      zIndex: idx + 1, // Ultima icona sopra (più recente)
                      borderColor: annotation.color
                    }}
                    onClick={() => handleGutterIconClick(annotation)}
                    title={`Vai alla nota (pagina ${annotation.pageNumber})`}
                  >
                    {getEmojiForIcon(annotation.gutterIconId)}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Bookmark Ribbon (segnalibro) */}
          {currentPageBookmark && (
            <div
              className="pdf-bookmark-ribbon"
              style={{ backgroundColor: currentPageBookmark.color }}
              title={currentPageBookmark.title}
              onClick={() => onAddBookmark && onAddBookmark(currentPage, currentPageBookmark)}
            >
              <div
                className="pdf-bookmark-ribbon-fold"
                style={{ borderTopColor: currentPageBookmark.color }}
              />
            </div>
          )}

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
});

export default PDFViewer;
