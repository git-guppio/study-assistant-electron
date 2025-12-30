import React, { useState, useEffect } from 'react';
import PDFViewer from './components/PDFViewer';
import NotesEditor from './components/NotesEditor';
import MindMap from './components/MindMap';
import SummaryEditor from './components/SummaryEditor';
import { initDatabase } from './database/db';

function App() {
  const [bookInfo, setBookInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('notes');
  const [pdfPath, setPdfPath] = useState(null);
  const [selectedText, setSelectedText] = useState(null);
  const [highlights, setHighlights] = useState([]);

  // Carica informazioni libro all'avvio
  useEffect(() => {
    async function loadBookInfo() {
      try {
        const info = await window.electronAPI.getBookInfo();
        setBookInfo(info);
        setPdfPath(info.filePath);
        
        // Inizializza database
        if (info.filePath) {
          const pdfDir = await window.electronAPI.getPdfDirectory(info.filePath);
          await initDatabase(pdfDir, info.bookId);
        }
        
        console.log('📚 Book loaded:', info);
      } catch (error) {
        console.error('Error loading book info:', error);
      }
    }
    
    loadBookInfo();
  }, []);

  // Gestisce la selezione di testo nel PDF
  const handleTextSelection = (selection) => {
    setSelectedText(selection);
    // Cambia automaticamente alla tab Note quando si seleziona del testo
    if (selection && selection.text) {
      setActiveTab('notes');
    }
  };

  // Gestisce la creazione di un evidenziazione
  const handleCreateHighlight = (highlight) => {
    setHighlights([...highlights, highlight]);
    // Qui salveremo nel database
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'notes':
        return (
          <NotesEditor 
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
                onTextSelection={handleTextSelection}
                onCreateHighlight={handleCreateHighlight}
                highlights={highlights}
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
