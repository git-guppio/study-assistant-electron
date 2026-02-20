import React, { useState, useEffect, useRef } from 'react';
import PDFViewer from './components/PDFViewer';
import NotesEditor from './components/NotesEditor';
import DictionaryEditor from './components/DictionaryEditor';
import KeywordsEditor from './components/KeywordsEditor';
import BookmarksEditor from './components/BookmarksEditor';
import MindMap from './components/MindMap';
import SummaryEditor from './components/SummaryEditor';
import WelcomeScreen from './components/WelcomeScreen';
import FirstRunWizard from './components/FirstRunWizard';
import SettingsDialog from './components/SettingsDialog';
import BackupDialog from './components/BackupDialog';
import { initDatabase, getDatabase } from './database/db';
import { initLibrary, getLibrary } from './database/libraryDb';
import { EditorProvider } from './contexts/EditorContext';
import { collectAllUsedImageUrls, extractLocalImageUrls } from './utils/imageUtils';

// View states
const VIEW_LOADING = 'loading';
const VIEW_FIRST_RUN = 'first_run';
const VIEW_LIBRARY = 'library';
const VIEW_DOCUMENT = 'document';

function App() {
  // View state
  const [currentView, setCurrentView] = useState(VIEW_LOADING);

  // Document state
  const [currentDocument, setCurrentDocument] = useState(null);
  const [activeTab, setActiveTab] = useState('notes');
  const [pdfPath, setPdfPath] = useState(null);
  const [pdfDir, setPdfDir] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [dbReady, setDbReady] = useState(false);

  // Document defaults and custom colors
  const [documentDefaults, setDocumentDefaults] = useState({});
  const [customIconColors, setCustomIconColors] = useState({});
  const [customActionColors, setCustomActionColors] = useState({});

  // Bookmarks state
  const [bookmarks, setBookmarks] = useState([]);
  const [currentPdfPage, setCurrentPdfPage] = useState(1);

  // Settings dialog
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Backup dialog
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [currentDbPath, setCurrentDbPath] = useState(null);

  // Refs per comunicazione tra componenti
  const notesEditorRef = useRef(null);
  const dictionaryEditorRef = useRef(null);
  const keywordsEditorRef = useRef(null);
  const bookmarksEditorRef = useRef(null);
  const pdfViewerRef = useRef(null);

  // Inizializzazione all'avvio
  useEffect(() => {
    async function initialize() {
      try {
        // Verifica se esiste già un path configurato in config.json
        const isConfigured = await window.electronAPI.configIsLibraryConfigured();

        if (isConfigured) {
          // Ottieni il path dalla configurazione
          const savedPath = await window.electronAPI.configGetLibraryPath();
          console.log('📚 Library path from config:', savedPath);

          // Inizializza la libreria con il path salvato
          await initLibrary(savedPath);

          // Crea backup automatico della libreria all'avvio
          try {
            const backupResult = await window.electronAPI.libraryBackupCreate();
            if (backupResult.success) {
              console.log('📦 Auto-backup libreria creato:', backupResult.timestamp);
            }
          } catch (err) {
            console.warn('Backup libreria non riuscito:', err);
          }

          setCurrentView(VIEW_LIBRARY);
        } else {
          // Prima esecuzione: mostra wizard
          setCurrentView(VIEW_FIRST_RUN);
        }
      } catch (error) {
        console.error('Error during initialization:', error);
        setCurrentView(VIEW_FIRST_RUN);
      }
    }

    initialize();
  }, []);

  // Completamento wizard prima esecuzione
  const handleWizardComplete = async (libraryPath) => {
    try {
      // Salva il path nella configurazione
      await window.electronAPI.configSetLibraryPath(libraryPath);
      console.log('📚 Library path saved to config:', libraryPath);

      // Inizializza la libreria
      await initLibrary(libraryPath);
      setCurrentView(VIEW_LIBRARY);
    } catch (error) {
      console.error('Error completing wizard:', error);
    }
  };

  // Callback per quando il path della libreria viene cambiato dalle impostazioni
  const handleLibraryPathChanged = async (newPath) => {
    try {
      // Reinizializza la libreria con il nuovo path
      await initLibrary(newPath);
      // Forza refresh della view
      setCurrentView(VIEW_LOADING);
      setTimeout(() => setCurrentView(VIEW_LIBRARY), 100);
    } catch (error) {
      console.error('Error reinitializing library:', error);
    }
  };

  // Apertura documento dalla libreria
  const handleOpenDocument = async (document) => {
    setCurrentDocument(document);
    setPdfPath(document.file_path);

    // Ottieni il percorso del database per questo documento
    const library = getLibrary();
    const documentDbPath = await library.getDocumentDatabasePath(document.id);

    if (documentDbPath) {
      // Estrai la directory dal percorso del database (usa lastIndexOf per evitare require path)
      const lastSlash = Math.max(documentDbPath.lastIndexOf('/'), documentDbPath.lastIndexOf('\\'));
      const dbDir = documentDbPath.substring(0, lastSlash);

      setPdfDir(dbDir);

      // Inizializza il database del documento (con documentId per auto-backup)
      await initDatabase(dbDir, document.id, document.id);

      // Salva il percorso del DB per i backup
      setCurrentDbPath(documentDbPath);

      // Carica mappa immagini dalla cartella della libreria (non dalla cartella del PDF)
      try {
        await window.electronAPI.loadImagesMap(dbDir, document.id);
      } catch (e) {
        console.log('No images map to load');
      }

      setDbReady(true);
      setCurrentView(VIEW_DOCUMENT);

      console.log('📚 Document opened:', document.title);
    }
  };

  // Ripristino backup riuscito - ricarica il database
  const handleBackupRestoreSuccess = async () => {
    console.log('🔄 Backup restored - reloading database...');

    // Chiudi e riapri il database per caricare i dati ripristinati
    const db = getDatabase();
    if (db) {
      await db.close();
    }

    // Reinizializza il database
    if (currentDocument && pdfDir) {
      await initDatabase(pdfDir, currentDocument.id, currentDocument.id);

      // Ricarica annotations, defaults, bookmarks
      const annotations = await db.getAnnotations();
      setAnnotations(annotations);

      const defaults = await db.getDocumentDefaults();
      setDocumentDefaults(defaults);

      const iconColors = await db.getAllCustomIconColors();
      setCustomIconColors(iconColors);

      const actionColors = await db.getAllCustomActionColors();
      setCustomActionColors(actionColors);

      const bookmarks = await db.getAllBookmarks();
      setBookmarks(bookmarks);

      console.log('✅ Database reloaded after backup restore');
    }
  };

  // Ritorno alla libreria
  const handleBackToLibrary = async () => {
    // Prima di chiudere, aggiorna le statistiche del documento nella libreria
    if (currentDocument?.id) {
      try {
        const stats = await window.electronAPI.getDocumentStatistics();
        await window.electronAPI.libraryUpdateDocumentStatistics(currentDocument.id, stats);
        console.log('📊 Statistics updated for document:', currentDocument.id, stats);
      } catch (error) {
        console.error('Error updating statistics:', error);
      }
    }

    // Chiudi il database del documento corrente
    const db = getDatabase();
    if (db) {
      await db.close();
    }

    // Reset state
    setCurrentDocument(null);
    setPdfPath(null);
    setPdfDir(null);
    setAnnotations([]);
    setDbReady(false);
    setDocumentDefaults({});
    setCustomIconColors({});
    setCustomActionColors({});
    setBookmarks([]);
    setCurrentPdfPage(1);
    setActiveTab('notes');

    setCurrentView(VIEW_LIBRARY);
  };

  // Carica annotazioni, defaults e colori custom quando il database è pronto
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

          // Carica segnalibri
          const savedBookmarks = await db.getBookmarks();
          setBookmarks(savedBookmarks || []);
          console.log('🔖 Bookmarks loaded:', savedBookmarks?.length || 0);
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

      // Salva il colore highlight come preferenza
      await db.updateDocumentDefaults({ highlightColor: annotationData.color });
      setDocumentDefaults(prev => ({ ...prev, highlightColor: annotationData.color }));

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

      // 4. Salva l'ultima icona usata e il colore associato come preferenze
      await db.updateDocumentDefaults({ lastNoteIconId: annotationData.gutterIconId });
      setDocumentDefaults(prev => ({ ...prev, lastNoteIconId: annotationData.gutterIconId }));
      await db.upsertCustomIconColor(annotationData.gutterIconId, annotationData.color);
      setCustomIconColors(prev => ({ ...prev, [annotationData.gutterIconId]: annotationData.color }));

      setAnnotations(prev => [...prev, newAnnotation]);

      // 5. Inserisci il blocco nota nel TipTap editor
      if (notesEditorRef.current?.insertPdfNoteBlock) {
        notesEditorRef.current.insertPdfNoteBlock({
          id: newNote.id,
          annotationId: newAnnotation.id,
          pageNumber: annotationData.pageNumber,
          positionY: annotationData.rects[0]?.y || 0,
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
      const newFlashcard = await db.saveFlashcard({
        front: annotationData.text,
        back: '',
        pageNumber: annotationData.pageNumber
      });

      const newAnnotation = await db.saveAnnotation({
        type: 'flashcard',
        pageNumber: annotationData.pageNumber,
        text: annotationData.text,
        color: annotationData.color,
        opacity: annotationData.opacity,
        rects: annotationData.rects,
        gutterIconId: 'flashcard',
        noteId: null
      });

      setAnnotations(prev => [...prev, newAnnotation]);

      // Salva il colore flashcard come preferenza
      await db.upsertCustomActionColor('flashcard', annotationData.color);
      setCustomActionColors(prev => ({ ...prev, flashcard: annotationData.color }));

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
      const newEntry = await db.saveDictionaryEntry({
        term: annotationData.text,
        definition: '',
        pageNumber: annotationData.pageNumber
      });

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

      if (dictionaryEditorRef.current?.insertDictionaryBlock) {
        dictionaryEditorRef.current.insertDictionaryBlock({
          id: newEntry.id,
          annotationId: newAnnotation.id,
          pageNumber: annotationData.pageNumber,
          positionY: annotationData.rects[0]?.y || 0,
          term: annotationData.text,
          color: annotationData.color,
          definition: '',
        });
      }

      // Salva il colore dictionary come preferenza
      await db.upsertCustomActionColor('dictionary', annotationData.color);
      setCustomActionColors(prev => ({ ...prev, dictionary: annotationData.color }));

      setActiveTab('dictionary');
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
      const newKeyword = await db.saveKeyword({
        term: annotationData.text,
        pageNumber: annotationData.pageNumber
      });

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

      if (keywordsEditorRef.current?.insertKeywordBlock) {
        keywordsEditorRef.current.insertKeywordBlock({
          id: newKeyword.id,
          annotationId: newAnnotation.id,
          pageNumber: annotationData.pageNumber,
          positionY: annotationData.rects[0]?.y || 0,
          term: annotationData.text,
          color: annotationData.color,
          comment: '',
        });
      }

      // Salva il colore keyword come preferenza
      await db.upsertCustomActionColor('keyword', annotationData.color);
      setCustomActionColors(prev => ({ ...prev, keyword: annotationData.color }));

      setActiveTab('keywords');
      console.log('🔑 Keyword created:', newKeyword.id, newAnnotation.id);
    } catch (error) {
      console.error('Error creating keyword:', error);
    }
  };

  // Elimina un'annotazione dal PDF
  const handleDeleteAnnotation = async (annotationId) => {
    const db = getDatabase();
    if (!db) return;

    try {
      const annotation = annotations.find(a => a.id === annotationId);

      if (annotation?.type === 'note' && annotation.noteId) {
        if (notesEditorRef.current?.removePdfNoteBlock) {
          notesEditorRef.current.removePdfNoteBlock(annotation.noteId);
        }
      }

      await db.deleteAnnotation(annotationId);
      setAnnotations(prev => prev.filter(a => a.id !== annotationId));
    } catch (error) {
      console.error('Error deleting annotation:', error);
    }
  };

  // Click su gutter icon
  const handleGutterClick = (annotation) => {
    if (annotation.type === 'note' && annotation.noteId) {
      setActiveTab('notes');
      setTimeout(() => {
        if (notesEditorRef.current?.scrollToBlock) {
          notesEditorRef.current.scrollToBlock(annotation.noteId);
        }
      }, 100);
    } else if (annotation.type === 'dictionary') {
      setActiveTab('dictionary');
      setTimeout(() => {
        if (dictionaryEditorRef.current?.scrollToBlockByAnnotationId) {
          dictionaryEditorRef.current.scrollToBlockByAnnotationId(annotation.id);
        }
      }, 100);
    } else if (annotation.type === 'keyword') {
      setActiveTab('keywords');
      setTimeout(() => {
        if (keywordsEditorRef.current?.scrollToBlockByAnnotationId) {
          keywordsEditorRef.current.scrollToBlockByAnnotationId(annotation.id);
        }
      }, 100);
    }
  };

  // Elimina nota da TipTap
  const handleDeleteNote = async (noteId, annotationId, noteContent) => {
    const db = getDatabase();
    if (!db) return;

    try {
      if (noteContent && window.electronAPI) {
        const imageUrls = extractLocalImageUrls(noteContent);
        if (imageUrls.length > 0) {
          await window.electronAPI.deleteImagesFromDisk(imageUrls);
        }
      }

      await db.deleteNote(noteId);
      setAnnotations(prev => prev.filter(a => a.id !== annotationId));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  // Elimina voce dizionario
  const handleDeleteDictionaryEntry = async (entryId, annotationId, definitionContent) => {
    const db = getDatabase();
    if (!db) return;

    try {
      if (definitionContent && window.electronAPI) {
        const imageUrls = extractLocalImageUrls(definitionContent);
        if (imageUrls.length > 0) {
          await window.electronAPI.deleteImagesFromDisk(imageUrls);
        }
      }

      await db.deleteDictionaryEntry(entryId);
      if (annotationId) {
        await db.deleteAnnotation(annotationId);
        setAnnotations(prev => prev.filter(a => a.id !== annotationId));
      }
    } catch (error) {
      console.error('Error deleting dictionary entry:', error);
    }
  };

  // Elimina keyword
  const handleDeleteKeyword = async (keywordId, annotationId, commentContent) => {
    const db = getDatabase();
    if (!db) return;

    try {
      if (commentContent && window.electronAPI) {
        const imageUrls = extractLocalImageUrls(commentContent);
        if (imageUrls.length > 0) {
          await window.electronAPI.deleteImagesFromDisk(imageUrls);
        }
      }

      await db.deleteKeyword(keywordId);
      if (annotationId) {
        await db.deleteAnnotation(annotationId);
        setAnnotations(prev => prev.filter(a => a.id !== annotationId));
      }
    } catch (error) {
      console.error('Error deleting keyword:', error);
    }
  };

  // Handler per segnalibri
  const handleAddBookmark = (pageNumber, existingBookmark) => {
    if (bookmarksEditorRef.current?.openDialog) {
      bookmarksEditorRef.current.openDialog(pageNumber, existingBookmark);
      setActiveTab('bookmarks');
    }
  };

  const handlePdfPageChange = (pageNumber) => {
    setCurrentPdfPage(pageNumber);
  };

  const currentPageBookmark = bookmarks.find(b => b.pageNumber === currentPdfPage) || null;

  // Naviga al PDF da blocco nota
  const handleNavigateToPdf = ({ annotationId, pageNumber }) => {
    if (pdfViewerRef.current) {
      pdfViewerRef.current.goToPage(pageNumber);
      setTimeout(() => {
        pdfViewerRef.current?.flashOutline(annotationId);
      }, 100);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'bookmarks':
        return (
          <BookmarksEditor
            ref={bookmarksEditorRef}
            bookId={currentDocument?.id}
            dbReady={dbReady}
            onNavigateToPdf={handleNavigateToPdf}
            currentPage={currentPdfPage}
            onBookmarksChange={setBookmarks}
          />
        );
      case 'notes':
        return (
          <EditorProvider>
            <NotesEditor
              ref={notesEditorRef}
              bookId={currentDocument?.id}
              pdfDir={pdfDir}
              dbReady={dbReady}
              onDeleteNote={handleDeleteNote}
              onNavigateToPdf={handleNavigateToPdf}
            />
          </EditorProvider>
        );
      case 'dictionary':
        return (
          <EditorProvider>
            <DictionaryEditor
              ref={dictionaryEditorRef}
              bookId={currentDocument?.id}
              pdfDir={pdfDir}
              dbReady={dbReady}
              onDeleteEntry={handleDeleteDictionaryEntry}
              onNavigateToPdf={handleNavigateToPdf}
            />
          </EditorProvider>
        );
      case 'keywords':
        return (
          <EditorProvider>
            <KeywordsEditor
              ref={keywordsEditorRef}
              bookId={currentDocument?.id}
              pdfDir={pdfDir}
              dbReady={dbReady}
              onDeleteKeyword={handleDeleteKeyword}
              onNavigateToPdf={handleNavigateToPdf}
            />
          </EditorProvider>
        );
      case 'mindmap':
        return <MindMap bookId={currentDocument?.id} />;
      case 'summary':
        return <SummaryEditor bookId={currentDocument?.id} />;
      default:
        return null;
    }
  };

  // Render based on current view
  if (currentView === VIEW_LOADING) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <span className="text-4xl">📚</span>
          <p className="mt-4 text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (currentView === VIEW_FIRST_RUN) {
    return <FirstRunWizard onComplete={handleWizardComplete} />;
  }

  if (currentView === VIEW_LIBRARY) {
    return (
      <>
        <WelcomeScreen
          onOpenDocument={handleOpenDocument}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <SettingsDialog
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onLibraryPathChanged={handleLibraryPathChanged}
        />
      </>
    );
  }

  // VIEW_DOCUMENT
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header / Menu Bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBackToLibrary}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="Torna alla libreria"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-800">
            📚 Study Assistant
          </h1>
          {currentDocument && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">{currentDocument.title}</span>
              {currentDocument.authors && currentDocument.authors.length > 0 && (
                <span className="ml-2">• {currentDocument.authors.join(', ')}</span>
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
          <button
            className="px-3 py-1 text-sm bg-amber-500 text-white rounded hover:bg-amber-600"
            onClick={() => setBackupDialogOpen(true)}
            title="Gestisci backup del database"
          >
            📦 Backup
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
                currentPageBookmark={currentPageBookmark}
                onAddBookmark={handleAddBookmark}
                onPageChange={handlePdfPageChange}
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
          <div className="flex border-b border-gray-200 overflow-x-auto">
            <button
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'bookmarks'
                  ? 'text-red-600 border-b-2 border-red-600 bg-red-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('bookmarks')}
            >
              🔖 Segnalibri
            </button>
            <button
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'notes'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('notes')}
            >
              📝 Note
            </button>
            <button
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'dictionary'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('dictionary')}
            >
              📖 Dizionario
            </button>
            <button
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'keywords'
                  ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('keywords')}
            >
              🔑 Parole Chiave
            </button>
            <button
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'mindmap'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('mindmap')}
            >
              🗺️ Mappa
            </button>
            <button
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
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
          {pdfPath && (
            <span>📁 {pdfPath}</span>
          )}
        </div>
        <div>
          <span>{annotations.length} annotazioni</span>
        </div>
      </footer>

      {/* Backup Dialog */}
      {backupDialogOpen && currentDocument && currentDbPath && (
        <BackupDialog
          documentId={currentDocument.id}
          currentDbPath={currentDbPath}
          onClose={() => setBackupDialogOpen(false)}
          onRestoreSuccess={handleBackupRestoreSuccess}
        />
      )}
    </div>
  );
}

export default App;
