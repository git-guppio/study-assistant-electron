import React, { useState } from 'react';

function CategorySidebar({
  categories,
  selectedFilter,
  onSelectFilter,
  onAddCategory,
  onEditCategory,
  onDeleteCategory
}) {
  const [contextMenu, setContextMenu] = useState(null);

  const handleContextMenu = (e, category) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      category
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

  const predefinedFilters = [
    { id: 'all', label: 'Tutti i documenti', icon: '📚' },
    { id: 'favorites', label: 'Preferiti', icon: '⭐' },
    { id: 'recent', label: 'Recenti', icon: '🕐' }
  ];

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
      {/* Filtri predefiniti */}
      <div className="p-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
          Libreria
        </h3>
        <nav className="space-y-1">
          {predefinedFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => onSelectFilter(filter.id)}
              className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                selectedFilter === filter.id
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{filter.icon}</span>
              <span>{filter.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Separatore */}
      <div className="border-t border-gray-200 my-2"></div>

      {/* Categorie personalizzate */}
      <div className="flex-1 p-3 overflow-auto">
        <div className="flex items-center justify-between mb-2 px-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Le mie categorie
          </h3>
          <button
            onClick={onAddCategory}
            className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
            title="Aggiungi categoria"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {categories.length === 0 ? (
          <p className="text-xs text-gray-400 px-3 py-2">
            Nessuna categoria
          </p>
        ) : (
          <nav className="space-y-1">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => onSelectFilter(category.id)}
                onContextMenu={(e) => handleContextMenu(e, category)}
                className={`w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg transition-colors group ${
                  selectedFilter === category.id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color || '#6b7280' }}
                ></span>
                <span className="flex-1 text-left truncate">{category.name}</span>
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* Menu contestuale */}
      {contextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[120px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={() => {
              onEditCategory(contextMenu.category);
              closeContextMenu();
            }}
            className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          >
            <span>✏️</span>
            <span>Rinomina</span>
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Eliminare la categoria "${contextMenu.category.name}"?`)) {
                onDeleteCategory(contextMenu.category.id);
              }
              closeContextMenu();
            }}
            className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 flex items-center space-x-2"
          >
            <span>🗑️</span>
            <span>Elimina</span>
          </button>
        </div>
      )}
    </aside>
  );
}

export default CategorySidebar;
