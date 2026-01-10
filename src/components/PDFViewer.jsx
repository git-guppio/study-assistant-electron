import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configurazione Worker - bundled localmente per supporto offline
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  '/pdf.worker.min.js',
  import.meta.url
).href;

function PDFViewer({ filePath, onTextSelection }) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const renderTaskRef = useRef(null);

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
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
            cMapPacked: true,
          }).promise;
          setPdfDoc(doc);
          setNumPages(doc.numPages);
        }
      } catch (err) { console.error("Errore caricamento:", err); }
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
        // Usiamo lo stesso viewport per entrambi i layer
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        const textLayerDiv = textLayerRef.current;
        const dpr = window.devicePixelRatio || 1;

        // 1. Configurazione Canvas (HiDPI)
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        const context = canvas.getContext('2d');
        const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null;

        renderTaskRef.current = page.render({
          canvasContext: context,
          viewport: viewport,
          transform: transform
        });
        await renderTaskRef.current.promise;

        // 2. Configurazione Text Layer (Fondamentale per la selezione)
        if (textLayerDiv) {
          textLayerDiv.innerHTML = '';
          // Impostiamo le dimensioni esatte del viewport
          textLayerDiv.style.width = `${viewport.width}px`;
          textLayerDiv.style.height = `${viewport.height}px`;

          // PDF.js usa questa variabile per posizionare gli span del testo
          textLayerDiv.style.setProperty('--scale-factor', scale);

          const textContent = await page.getTextContent();
          await pdfjsLib.renderTextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport: viewport,
            textDivs: []
          }).promise;
        }
      } catch (err) {
        if (err.name !== 'RenderingCancelledException') console.error(err);
      }
    };

    renderPage();
  }, [pdfDoc, currentPage, scale]);

  const handleMouseUp = (e) => {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        data: { text, pageNumber: currentPage }
      });
    } else {
      setContextMenu(null);
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center">Caricamento...</div>;

  return (
    <div className="pdf-viewer-layout">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-300 p-2 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-30"
          >←</button>
          <span className="text-sm font-medium">Pagina {currentPage} / {numPages}</span>
          <button
            onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
            disabled={currentPage === numPages}
            className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-30"
          >→</button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-2 hover:bg-gray-100 rounded">🔍-</button>
          <span className="text-sm font-mono w-12 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(4, s + 0.1))} className="p-2 hover:bg-gray-100 rounded">🔍+</button>
        </div>
      </div>

      {/* Area Documento */}
      <div className="pdf-content-area" onMouseUp={handleMouseUp}>
        <div className="pdf-page-container">
          <canvas ref={canvasRef} className="pdf-page-canvas" />
          {/* Il TextLayer è il livello che cattura il mouse */}
          <div ref={textLayerRef} className="textLayer" />
        </div>
      </div>

      {/* Menu Contestuale */}
      {contextMenu && (
        <div
          className="fixed bg-white shadow-2xl border border-gray-200 rounded-md py-1 z-50 min-w-[160px]"
          style={{ top: contextMenu.y + 10, left: contextMenu.x }}
        >
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50"
            onClick={() => {
              onTextSelection(contextMenu.data);
              setContextMenu(null);
            }}
          >
            📝 Aggiungi alle note
          </button>
        </div>
      )}
    </div>
  );
}

export default PDFViewer;
