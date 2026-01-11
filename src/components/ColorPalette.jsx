import React, { useRef } from 'react';

// Colori predefiniti per la palette
export const PRESET_COLORS = [
  { color: '#ffff00', name: 'Giallo' },
  { color: '#ff6b6b', name: 'Rosso' },
  { color: '#4ecdc4', name: 'Verde Acqua' },
  { color: '#45b7d1', name: 'Blu' },
  { color: '#96ceb4', name: 'Verde' },
  { color: '#8b5cf6', name: 'Viola' },
];

// Colori di default per tipo
export const DEFAULT_COLORS = {
  highlight: '#ffff00',
  outline: '#8b5cf6'
};

/**
 * Componente ColorPalette per la selezione del colore
 *
 * @param {string} selectedColor - Colore attualmente selezionato
 * @param {function} onColorSelect - Callback quando un colore viene selezionato
 * @param {boolean} showCustom - Mostra il pulsante "Altro" per color picker personalizzato
 */
function ColorPalette({ selectedColor, onColorSelect, showCustom = true }) {
  const colorInputRef = useRef(null);

  const handleCustomColorClick = () => {
    colorInputRef.current?.click();
  };

  const handleCustomColorChange = (e) => {
    onColorSelect(e.target.value);
  };

  return (
    <div className="color-palette">
      {PRESET_COLORS.map(({ color, name }) => (
        <button
          key={color}
          className={`color-swatch ${selectedColor === color ? 'selected' : ''}`}
          style={{ backgroundColor: color }}
          onClick={() => onColorSelect(color)}
          title={name}
          type="button"
        />
      ))}

      {showCustom && (
        <>
          <button
            className="color-swatch custom"
            onClick={handleCustomColorClick}
            title="Altro colore..."
            type="button"
          />
          <input
            ref={colorInputRef}
            type="color"
            value={selectedColor}
            onChange={handleCustomColorChange}
            style={{ display: 'none' }}
          />
        </>
      )}
    </div>
  );
}

export default ColorPalette;
