import React from 'react';

/**
 * Componente per la selezione di icone
 *
 * Mostra una griglia di icone emoji con bordo selezionato
 *
 * @param {Array} icons - Array di oggetti icona {id, emoji, label, defaultColor}
 * @param {string} selectedIconId - ID dell'icona selezionata
 * @param {function} onIconSelect - Callback quando viene selezionata un'icona (iconId)
 * @param {boolean} disabled - Se true, disabilita la selezione
 */
function IconPicker({
  icons = [],
  selectedIconId,
  onIconSelect,
  disabled = false
}) {
  const handleClick = (iconId) => {
    if (!disabled && onIconSelect) {
      onIconSelect(iconId);
    }
  };

  return (
    <div className="icon-picker">
      {icons.map((icon) => (
        <button
          key={icon.id}
          type="button"
          className={`icon-picker-item ${selectedIconId === icon.id ? 'selected' : ''}`}
          onClick={() => handleClick(icon.id)}
          disabled={disabled}
          title={icon.label}
          aria-label={icon.label}
          aria-pressed={selectedIconId === icon.id}
        >
          <span className="icon-picker-emoji">{icon.emoji}</span>
        </button>
      ))}
    </div>
  );
}

export default IconPicker;
