import React, { useState, useEffect, useRef } from 'react';
import PDFViewer from './components/PDFViewer';
import NotesEditor from './components/NotesEditor';
import MindMap from './components/MindMap';
import SummaryEditor from './components/SummaryEditor';
import { initDatabase, getDatabase } from './database/db';

function App() {
  const [bookInfo, setBookInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('notes');
  const [pdfPath, setPdfPath] = useState(null);
  const [selectedText, setSelectedText] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [dbReady, setDbReady] = useState(false);

  // Ref per NotesEditor (per scroll-to-note)
  const notesEditorRef = useRef(null);

  // Carica informazioni libro all'avvio
  useEffect(() => {
    async function loadBookInfo() {
      try {
        const info = await window.electronAPI.getBookInfo();
        setBookInfo(info);
        setPdfPath(info.filePath);

        // Inizializza database
        if (info.filePath && info.bookId) {
          const pdfDir = await window.electronAPI.getPdfDirectory(info.filePath);
          if (pdfDir) {
            await initDatabase(pdfDir, info.bookId);
            setDbReady(true);
          }
        } else {
          // Fallback: usa la directory userData per il database
          const appDataPath = await window.electronAPI.getAppDataPath();
          const fallbackBookId = info.bookId || 'default';
          await initDatabase(appDataPath, fallbackBookId);
          setDbReady(true);
        }

        console.log('📚 Book loaded:', info);
      } catch (error) {
        console.error('Error loading book info:', error);
      }
    }

    loadBookInfo();
  }, []);

  // Carica annotazioni quando il database e' pronto
  useEffect(() => {
    async function loadAnnotations() {
      const db = getDatabase();
      if (db) {
        try {
          const savedAnnotations = await db.getAnnotations();
          setAnnotations(savedAnnotations);
          console.log('📍 Annotations loaded:', savedAnnotations.length);
        } catch (error) {
          console.error('Error loading annotations:', error);
        }
      }
    }

    if (dbReady) {
      loadAnnotations();
    }
  }, [dbReady]);

  // Gestisce la selezione di testo nel PDF (per "Aggiungi alle note")
  const handleTextSelection = (selection) => {
    setSelectedText(selection);
    if (selection && selection.text) {
      setActiveTab('notes');
    }
  };

  // Crea un Highlight (senza nota collegata)
  const handleCreateHighlight = async (annotationData) => {
    const db = getDatabase();
    if (!db) return;

    try {
      const newAnnotation = await db.saveAnnotation({
        type: 'highlight',
        pageNumber: annotationData.pageNumber,
        text: annotationData.text,
        color: annotationData.color,
        opacity: annotationData.opacity || 0.35,
        rects: annotationData.rects,
        noteId: null
      });

      setAnnotations(prev => [...prev, newAnnotation]);
      console.log('🖍️ Highlight created:', newAnnotation.id);
    } catch (error) {
      console.error('Error creating highlight:', error);
    }
  };

  // Crea un Outline + Nota collegata automaticamente
  const handleCreateOutline = async (annotationData) => {
    const db = getDatabase();
    if (!db) return;

    try {
      // 1. Crea la nota con il testo selezionato
      const noteContent = `<blockquote><p>${annotationData.text}</p></blockquote><p><em>[Pagina ${annotationData.pageNumber}]</em></p>`;

      const newNote = await db.saveNote({
        content: noteContent,
        pageNumber: annotationData.pageNumber,
        selectionText: annotationData.text,
        pdfCoordinates: {
          x: annotationData.rects[0]?.x || 0,
          y: annotationData.rects[0]?.y || 0,
          pageNumber: annotationData.pageNumber
        }
      });

      // 2. Crea l'outline con riferimento alla nota
      const newAnnotation = await db.saveAnnotation({
        type: 'outline',
        pageNumber: annotationData.pageNumber,
        text: annotationData.text,
        color: annotationData.color,
        opacity: annotationData.opacity || 0.08,
        rects: annotationData.rects,
        noteId: newNote.id
      });

      // 3. Aggiorna la nota con riferimento all'annotazione
      await db.updateNote(newNote.id, {
        annotationId: newAnnotation.id
      });

      setAnnotations(prev => [...prev, newAnnotation]);

      // 4. Switch alla tab note
      setActiveTab('notes');

      console.log('📌 Outline + Note created:', newAnnotation.id, newNote.id);
    } catch (error) {
      console.error('Error creating outline:', error);
    }
  };

  // Elimina un'annotazione
  const handleDeleteAnnotation = async (annotationId) => {
    const db = getDatabase();
    if (!db) return;

    try {
      await db.deleteAnnotation(annotationId);
      setAnnotations(prev => prev.filter(a => a.id !== annotationId));
      console.log('🗑️ Annotation deleted:', annotationId);
    } catch (error) {
      console.error('Error deleting annotation:', error);
    }
  };

  // Click su gutter icon -> scrolla alla nota
  const handleGutterClick = (annotation) => {
    if (annotation.noteId) {
      setActiveTab('notes');
      // Usa un piccolo delay per assicurarsi che la tab sia visibile
      setTimeout(() => {
        if (notesEditorRef.current?.scrollToNote) {
          notesEditorRef.current.scrollToNote(annotation.noteId);
        }
      }, 100);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'notes':
        return (
          <NotesEditor
            ref={notesEditorRef}
            selectedText={selectedText}
            bookId={bookInfo?.bookId}
          />
        );
      case 'mindmap':
        return (
          <MindMap
            bookId={bookInfo?.bookId}
          />
        );
      case 'summary':
        return (
          <SummaryEditor
            bookId={bookInfo?.bookId}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header / Menu Bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold text-gray-800">
            📚 Study Assistant
          </h1>
          {bookInfo && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">{bookInfo.title}</span>
              {bookInfo.authors && (
                <span className="ml-2">• {bookInfo.authors}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500 mr-2">
            {annotations.length} annotazioni
          </span>
          <button
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => {/* TODO: Implement save */}}
          >
            💾 Salva
          </button>
          <button
            className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            onClick={() => {/* TODO: Implement export */}}
          >
            📤 Esporta
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - PDF Viewer */}
        <div className="w-3/5 bg-gray-50 border-r border-gray-200 flex flex-col">
          <div className="bg-white border-b border-gray-200 px-4 py-2">
            <h2 className="text-sm font-medium text-gray-700">
              📄 Documento PDF
            </h2>
          </div>
          <div className="flex-1 overflow-auto">
            {pdfPath ? (
              <PDFViewer
                filePath={pdfPath}
                annotations={annotations}
                onTextSelection={handleTextSelection}
                onCreateHighlight={handleCreateHighlight}
                onCreateOutline={handleCreateOutline}
                onDeleteAnnotation={handleDeleteAnnotation}
                onGutterClick={handleGutterClick}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <p className="text-lg mb-2">📄</p>
                  <p>Nessun PDF caricato</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Tabs */}
        <div className="w-2/5 bg-white flex flex-col">
          {/* Tab Headers */}
          <div className="flex border-b border-gray-200">
            <button
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'notes'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('notes')}
            >
              📝 Note
            </button>
            <button
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'mindmap'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('mindmap')}
            >
              🗺️ Mappa
            </button>
            <button
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'summary'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('summary')}
            >
              📋 Riassunto
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto">
            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <footer className="bg-white border-t border-gray-200 px-4 py-1 text-xs text-gray-600 flex items-center justify-between">
        <div>
          {bookInfo?.filePath && (
            <span>📁 {bookInfo.filePath}</span>
          )}
        </div>
        <div>
          {selectedText && (
            <span className="text-blue-600">
              ✓ Testo selezionato: {selectedText.text.substring(0, 30)}...
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}

export default App;
