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
  const [pdfDir, setPdfDir] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [dbReady, setDbReady] = useState(false);

  // Document defaults and custom colors
  const [documentDefaults, setDocumentDefaults] = useState({});
  const [customIconColors, setCustomIconColors] = useState({});
  const [customActionColors, setCustomActionColors] = useState({});

  // Refs per comunicazione tra componenti
  const notesEditorRef = useRef(null);
  const pdfViewerRef = useRef(null);

  // Carica informazioni libro all'avvio
  useEffect(() => {
    async function loadBookInfo() {
      try {
        const info = await window.electronAPI.getBookInfo();
        setBookInfo(info);
        setPdfPath(info.filePath);

        // Inizializza database
        if (info.filePath && info.bookId) {
          const dir = await window.electronAPI.getPdfDirectory(info.filePath);
          if (dir) {
            setPdfDir(dir);
            await initDatabase(dir, info.bookId);

            // Carica mappa immagini esistenti per il custom protocol
            const imagesResult = await window.electronAPI.loadImagesMap(dir, info.bookId);
            console.log('🖼️ Images map loaded:', imagesResult);

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

  // Carica annotazioni, defaults e colori custom quando il database e' pronto
  useEffect(() => {
    async function loadData() {
      const db = getDatabase();
      if (db) {
        try {
          // Carica annotazioni
          const savedAnnotations = await db.getAnnotations();
          setAnnotations(savedAnnotations);
          console.log('📍 Annotations loaded:', savedAnnotations.length);

          // Carica document defaults
          const defaults = await db.getDocumentDefaults();
          if (defaults) {
            setDocumentDefaults(defaults);
            console.log('⚙️ Document defaults loaded:', defaults);
          }

          // Carica colori custom icone
          const iconColors = await db.getAllCustomIconColors();
          if (iconColors && iconColors.length > 0) {
            const iconColorsMap = {};
            iconColors.forEach(({ iconId, color }) => {
              iconColorsMap[iconId] = color;
            });
            setCustomIconColors(iconColorsMap);
            console.log('🎨 Custom icon colors loaded:', iconColorsMap);
          }

          // Carica colori custom azioni
          const actionColors = await db.getAllCustomActionColors();
          if (actionColors && actionColors.length > 0) {
            const actionColorsMap = {};
            actionColors.forEach(({ actionType, color }) => {
              actionColorsMap[actionType] = color;
            });
            setCustomActionColors(actionColorsMap);
            console.log('🎨 Custom action colors loaded:', actionColorsMap);
          }
        } catch (error) {
          console.error('Error loading data:', error);
        }
      }
    }

    if (dbReady) {
      loadData();
    }
  }, [dbReady]);

  // Crea un Highlight (senza nota collegata, no gutter icon)
  const handleHighlight = async (annotationData) => {
    const db = getDatabase();
    if (!db) return;

    try {
      const newAnnotation = await db.saveAnnotation({
        type: 'highlight',
        pageNumber: annotationData.pageNumber,
        text: annotationData.text,
        color: annotationData.color,
        opacity: annotationData.opacity,
        rects: annotationData.rects,
        gutterIconId: null,
        noteId: null
      });

      setAnnotations(prev => [...prev, newAnnotation]);
      console.log('🖍️ Highlight created:', newAnnotation.id);
    } catch (error) {
      console.error('Error creating highlight:', error);
    }
  };

  // Crea una Nota con icona + outline
  const handleAddNote = async (annotationData) => {
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

      // 2. Crea l'annotazione con riferimento alla nota
      const newAnnotation = await db.saveAnnotation({
        type: 'note',
        pageNumber: annotationData.pageNumber,
        text: annotationData.text,
        color: annotationData.color,
        opacity: annotationData.opacity,
        rects: annotationData.rects,
        gutterIconId: annotationData.gutterIconId,
        noteId: newNote.id
      });

      // 3. Aggiorna la nota con riferimento all'annotazione
      await db.updateNote(newNote.id, {
        annotationId: newAnnotation.id
      });

      // 4. Salva l'ultima icona usata nei document defaults
      await db.updateDocumentDefaults({ lastNoteIconId: annotationData.gutterIconId });
      setDocumentDefaults(prev => ({ ...prev, lastNoteIconId: annotationData.gutterIconId }));

      setAnnotations(prev => [...prev, newAnnotation]);

      // 5. Inserisci il blocco nota nel TipTap editor
      if (notesEditorRef.current?.insertPdfNoteBlock) {
        notesEditorRef.current.insertPdfNoteBlock({
          id: newNote.id,
          annotationId: newAnnotation.id,
          pageNumber: annotationData.pageNumber,
          positionY: annotationData.rects[0]?.y || 0,  // Per ordinamento
          selectionText: annotationData.text,
          color: annotationData.color,
          gutterIconId: annotationData.gutterIconId,
          comment: '',
        });
      }

      // 6. Switch alla tab note
      setActiveTab('notes');

      console.log('📝 Note created:', newAnnotation.id, newNote.id);
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  // Crea una Flashcard
  const handleCreateFlashcard = async (annotationData) => {
    const db = getDatabase();
    if (!db) return;

    try {
      // 1. Crea la flashcard nel database
      const newFlashcard = await db.saveFlashcard({
        front: annotationData.text,
        back: '', // L'utente compilera' dopo
        pageNumber: annotationData.pageNumber
      });

      // 2. Crea l'annotazione con riferimento alla flashcard
      const newAnnotation = await db.saveAnnotation({
        type: 'flashcard',
        pageNumber: annotationData.pageNumber,
        text: annotationData.text,
        color: annotationData.color,
        opacity: annotationData.opacity,
        rects: annotationData.rects,
        gutterIconId: 'flashcard',
        noteId: null // Flashcard non ha nota collegata, ha flashcardId
      });

      setAnnotations(prev => [...prev, newAnnotation]);

      // 3. Switch alla tab flashcards (quando sara' implementata)
      // setActiveTab('flashcards');

      console.log('🧠 Flashcard created:', newFlashcard.id, newAnnotation.id);
    } catch (error) {
      console.error('Error creating flashcard:', error);
    }
  };

  // Crea una voce Dizionario
  const handleCreateDictionary = async (annotationData) => {
    const db = getDatabase();
    if (!db) return;

    try {
      // 1. Crea la voce dizionario
      const newEntry = await db.saveDictionaryEntry({
        term: annotationData.text,
        definition: '', // L'utente compilera' dopo
        pageNumber: annotationData.pageNumber
      });

      // 2. Crea l'annotazione
      const newAnnotation = await db.saveAnnotation({
        type: 'dictionary',
        pageNumber: annotationData.pageNumber,
        text: annotationData.text,
        color: annotationData.color,
        opacity: annotationData.opacity,
        rects: annotationData.rects,
        gutterIconId: 'dictionary',
        noteId: null
      });

      setAnnotations(prev => [...prev, newAnnotation]);

      // 3. Switch alla tab dizionario (quando sara' implementata)
      // setActiveTab('dictionary');

      console.log('📖 Dictionary entry created:', newEntry.id, newAnnotation.id);
    } catch (error) {
      console.error('Error creating dictionary entry:', error);
    }
  };

  // Crea una Keyword
  const handleCreateKeyword = async (annotationData) => {
    const db = getDatabase();
    if (!db) return;

    try {
      // 1. Crea la keyword
      const newKeyword = await db.saveKeyword({
        term: annotationData.text,
        pageNumber: annotationData.pageNumber
      });

      // 2. Crea l'annotazione
      const newAnnotation = await db.saveAnnotation({
        type: 'keyword',
        pageNumber: annotationData.pageNumber,
        text: annotationData.text,
        color: annotationData.color,
        opacity: annotationData.opacity,
        rects: annotationData.rects,
        gutterIconId: 'keyword',
        noteId: null
      });

      setAnnotations(prev => [...prev, newAnnotation]);

      // 3. Switch alla tab keywords (quando sara' implementata)
      // setActiveTab('keywords');

      console.log('🔑 Keyword created:', newKeyword.id, newAnnotation.id);
    } catch (error) {
      console.error('Error creating keyword:', error);
    }
  };

  // Elimina un'annotazione dal PDF (click destro sul PDF)
  const handleDeleteAnnotation = async (annotationId) => {
    const db = getDatabase();
    if (!db) return;

    try {
      // Trova l'annotazione per determinare il tipo
      const annotation = annotations.find(a => a.id === annotationId);
      console.log('🗑️ Deleting annotation:', annotationId, annotation);

      if (annotation?.type === 'note' && annotation.noteId) {
        console.log('📝 This is a note annotation, removing TipTap block:', annotation.noteId);
        // Se è una nota, rimuovi anche il blocco TipTap
        if (notesEditorRef.current?.removePdfNoteBlock) {
          notesEditorRef.current.removePdfNoteBlock(annotation.noteId);
          console.log('✅ TipTap block removal called');
        } else {
          console.warn('⚠️ notesEditorRef.current.removePdfNoteBlock not available');
        }
      } else {
        console.log('ℹ️ Not a note annotation or no noteId:', { type: annotation?.type, noteId: annotation?.noteId });
      }

      // Elimina dal DB
      await db.deleteAnnotation(annotationId);
      setAnnotations(prev => prev.filter(a => a.id !== annotationId));
      console.log('✅ Annotation deleted from DB and state:', annotationId);
    } catch (error) {
      console.error('❌ Error deleting annotation:', error);
    }
  };

  // Click su gutter icon -> scrolla alla nota
  const handleGutterClick = (annotation) => {
    if (annotation.noteId) {
      setActiveTab('notes');
      // Usa un piccolo delay per assicurarsi che la tab sia visibile
      setTimeout(() => {
        if (notesEditorRef.current?.scrollToBlock) {
          notesEditorRef.current.scrollToBlock(annotation.noteId);
        }
      }, 100);
    }
  };

  // Elimina nota da TipTap -> elimina anche annotation dal PDF
  const handleDeleteNote = async (noteId, annotationId) => {
    const db = getDatabase();
    if (!db) return;

    try {
      // Elimina dal DB (CASCADE elimina anche l'annotazione)
      await db.deleteNote(noteId);

      // Rimuovi annotation dallo state
      setAnnotations(prev => prev.filter(a => a.id !== annotationId));

      console.log('🗑️ Note and annotation deleted:', noteId, annotationId);
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  // Naviga al PDF da blocco nota TipTap
  const handleNavigateToPdf = ({ annotationId, pageNumber }) => {
    console.log('📄 Navigate to PDF:', { annotationId, pageNumber });

    if (pdfViewerRef.current) {
      // 1. Vai alla pagina corretta
      pdfViewerRef.current.goToPage(pageNumber);

      // 2. Flash l'annotazione (con piccolo delay per dare tempo al rendering della pagina)
      setTimeout(() => {
        pdfViewerRef.current?.flashOutline(annotationId);
      }, 100);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'notes':
        return (
          <NotesEditor
            ref={notesEditorRef}
            bookId={bookInfo?.bookId}
            pdfDir={pdfDir}
            dbReady={dbReady}
            onDeleteNote={handleDeleteNote}
            onNavigateToPdf={handleNavigateToPdf}
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
                ref={pdfViewerRef}
                filePath={pdfPath}
                annotations={annotations}
                onAddNote={handleAddNote}
                onHighlight={handleHighlight}
                onCreateFlashcard={handleCreateFlashcard}
                onCreateDictionary={handleCreateDictionary}
                onCreateKeyword={handleCreateKeyword}
                onDeleteAnnotation={handleDeleteAnnotation}
                onGutterClick={handleGutterClick}
                documentDefaults={documentDefaults}
                customIconColors={customIconColors}
                customActionColors={customActionColors}
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
          <span>{annotations.length} annotazioni</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
