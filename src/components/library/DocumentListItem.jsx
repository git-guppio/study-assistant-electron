import React from 'react';

function DocumentListItem({ document, onClick, onContextMenu, onToggleFavorite }) {
  // Formatta l'UUID (mostra solo i primi 8 caratteri)
  const formatUuid = (uuid) => {
    if (!uuid) return '';
    return uuid.substring(0, 8);
  };

  // Formatta la data
  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Oggi';
    if (diffDays === 1) return 'Ieri';
    if (diffDays < 7) return `${diffDays} giorni fa`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} settimane fa`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} mesi fa`;
    return date.toLocaleDateString('it-IT');
  };

  // Formatta gli autori
  const formatAuthors = (authors) => {
    if (!authors || authors.length === 0) return null;
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return authors.join(' e ');
    return `${authors[0]} et al.`;
  };

  // Verifica se ci sono statistiche da mostrare
  const hasStats = () => {
    return (
      document.stat_notes > 0 ||
      document.stat_dictionary > 0 ||
      document.stat_keywords > 0 ||
      document.stat_mindmaps > 0 ||
      document.stat_bookmarks > 0 ||
      document.stat_flashcards > 0 ||
      document.stat_annotations > 0
    );
  };

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      <div className="flex items-start space-x-4">
        {/* Icona documento */}
        <div className="flex-shrink-0 w-12 h-16 bg-red-100 rounded flex items-center justify-center text-red-600 text-2xl">
          📕
        </div>

        {/* Info documento */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="text-base font-medium text-gray-900 truncate">
                {document.title}
              </h3>
              <span className="text-xs font-mono text-gray-400" title={document.id}>
                {formatUuid(document.id)}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className={`flex-shrink-0 p-1 rounded transition-colors ${
                document.is_favorite
                  ? 'text-yellow-500 hover:text-yellow-600'
                  : 'text-gray-300 hover:text-yellow-500 opacity-0 group-hover:opacity-100'
              }`}
              title={document.is_favorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
            >
              {document.is_favorite ? '⭐' : '☆'}
            </button>
          </div>

          <div className="mt-1 text-sm text-gray-500">
            {formatAuthors(document.authors) && (
              <span>{formatAuthors(document.authors)}</span>
            )}
            {document.publisher && (
              <span className="ml-2">• {document.publisher}</span>
            )}
            {document.year && (
              <span className="ml-2">• {document.year}</span>
            )}
          </div>

          <div className="mt-2 flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
            {document.last_opened_at && (
              <span>Ultimo accesso: {formatDate(document.last_opened_at)}</span>
            )}
            {document.categories && document.categories.length > 0 && (
              <div className="flex items-center space-x-1">
                {document.categories.slice(0, 2).map((cat) => (
                  <span
                    key={cat.id}
                    className="px-2 py-0.5 rounded-full text-xs"
                    style={{
                      backgroundColor: `${cat.color || '#6b7280'}20`,
                      color: cat.color || '#6b7280'
                    }}
                  >
                    {cat.name}
                  </span>
                ))}
                {document.categories.length > 2 && (
                  <span className="text-gray-400">+{document.categories.length - 2}</span>
                )}
              </div>
            )}
          </div>

          {/* Statistiche documento */}
          {hasStats() && (
            <div className="mt-2 flex items-center flex-wrap gap-2 text-xs text-gray-500">
              {document.stat_notes > 0 && (
                <span title="Note">📝 {document.stat_notes}</span>
              )}
              {document.stat_dictionary > 0 && (
                <span title="Dizionario">📖 {document.stat_dictionary}</span>
              )}
              {document.stat_keywords > 0 && (
                <span title="Parole chiave">🔑 {document.stat_keywords}</span>
              )}
              {document.stat_mindmaps > 0 && (
                <span title="Mappe mentali">🗺️ {document.stat_mindmaps}</span>
              )}
              {document.stat_bookmarks > 0 && (
                <span title="Segnalibri">🔖 {document.stat_bookmarks}</span>
              )}
              {document.stat_flashcards > 0 && (
                <span title="Flashcard">🃏 {document.stat_flashcards}</span>
              )}
              {document.stat_annotations > 0 && (
                <span title="Annotazioni">✏️ {document.stat_annotations}</span>
              )}
            </div>
          )}
        </div>

        {/* Menu button (visibile solo on hover) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onContextMenu(e);
          }}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default DocumentListItem;
