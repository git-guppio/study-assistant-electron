import React, { useState } from 'react';
import DocumentListItem from './DocumentListItem';

function DocumentList({
  documents,
  onOpenDocument,
  onEditDocument,
  onDeleteDocument,
  onToggleFavorite
}) {
  const [contextMenu, setContextMenu] = useState(null);

  const handleContextMenu = (e, document) => {
    e.preventDefault();

    // Calcola posizione per evitare che il menu esca dallo schermo
    const menuWidth = 200; // Larghezza approssimativa del menu
    const menuHeight = 200; // Altezza approssimativa del menu
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let x = e.clientX;
    let y = e.clientY;

    // Se il menu esce a destra, aprilo verso sinistra
    if (x + menuWidth > windowWidth) {
      x = windowWidth - menuWidth - 10;
    }

    // Se il menu esce in basso, aprilo verso l'alto
    if (y + menuHeight > windowHeight) {
      y = windowHeight - menuHeight - 10;
    }

    setContextMenu({
      x,
      y,
      document
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  // Chiudi menu contestuale quando si clicca fuori
  React.useEffect(() => {
    const handleClick = () => closeContextMenu();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <DocumentListItem
          key={doc.id}
          document={doc}
          onClick={() => onOpenDocument(doc)}
          onContextMenu={(e) => handleContextMenu(e, doc)}
          onToggleFavorite={() => onToggleFavorite(doc.id)}
        />
      ))}

      {/* Menu contestuale */}
      {contextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[160px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={() => {
              onOpenDocument(contextMenu.document);
              closeContextMenu();
            }}
            className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          >
            <span>📄</span>
            <span>Apri</span>
          </button>
          <button
            onClick={() => {
              onToggleFavorite(contextMenu.document.id);
              closeContextMenu();
            }}
            className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          >
            <span>{contextMenu.document.is_favorite ? '⭐' : '☆'}</span>
            <span>{contextMenu.document.is_favorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}</span>
          </button>
          <div className="border-t border-gray-200 my-1"></div>
          <button
            onClick={() => {
              onEditDocument(contextMenu.document);
              closeContextMenu();
            }}
            className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          >
            <span>✏️</span>
            <span>Modifica metadati</span>
          </button>
          <button
            onClick={() => {
              onDeleteDocument(contextMenu.document);
              closeContextMenu();
            }}
            className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 flex items-center space-x-2"
          >
            <span>🗑️</span>
            <span>Elimina</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default DocumentList;
