import React, { useState } from 'react';

function DocumentListHeader({
  searchQuery,
  onSearchChange,
  sortBy,
  sortDir,
  onSortChange
}) {
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  const sortOptions = [
    { value: 'last_opened_at', label: 'Ultimo accesso', icon: '🕐' },
    { value: 'created_at', label: 'Data importazione', icon: '📅' },
    { value: 'title', label: 'Titolo', icon: '🔤' },
    { value: 'authors', label: 'Autore', icon: '👤' }
  ];

  const currentSort = sortOptions.find(opt => opt.value === sortBy);

  const handleSortSelect = (value) => {
    if (value === sortBy) {
      // Toggle direction
      onSortChange(value, sortDir === 'ASC' ? 'DESC' : 'ASC');
    } else {
      // Default direction per tipo
      const defaultDir = value === 'title' || value === 'authors' ? 'ASC' : 'DESC';
      onSortChange(value, defaultDir);
    }
    setSortMenuOpen(false);
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center space-x-4">
      {/* Search Input */}
      <div className="flex-1 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cerca documenti..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Sort Dropdown */}
      <div className="relative">
        <button
          onClick={() => setSortMenuOpen(!sortMenuOpen)}
          className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
        >
          <span className="text-gray-500">Ordina:</span>
          <span className="font-medium text-gray-700">{currentSort?.label}</span>
          <span className="text-gray-400">{sortDir === 'ASC' ? '↑' : '↓'}</span>
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {sortMenuOpen && (
          <>
            {/* Overlay per chiudere */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setSortMenuOpen(false)}
            />
            {/* Menu */}
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSortSelect(option.value)}
                  className={`w-full px-4 py-2 text-sm text-left flex items-center justify-between hover:bg-gray-100 ${
                    sortBy === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <span>{option.icon}</span>
                    <span>{option.label}</span>
                  </span>
                  {sortBy === option.value && (
                    <span className="text-blue-500">{sortDir === 'ASC' ? '↑' : '↓'}</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default DocumentListHeader;
