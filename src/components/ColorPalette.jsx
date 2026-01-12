import React, { useRef } from 'react';
import { COLOR_PALETTE } from '../constants/annotations';

// Esporta la palette colori dalla sorgente unica
export const PRESET_COLORS = COLOR_PALETTE.map(c => ({
  color: c.hex,
  name: c.name
}));

// Colori di default per tipo (per retrocompatibilita')
export const DEFAULT_COLORS = {
  highlight: '#eab308',  // Giallo
  outline: '#22c55e',    // Verde (default nota)
  note: '#22c55e'
};

/**
 * Componente ColorPalette per la selezione del colore
 *
 * @param {string} selectedColor - Colore attualmente selezionato
 * @param {function} onColorSelect - Callback quando un colore viene selezionato
 * @param {boolean} showCustom - Mostra il pulsante "Altro" per color picker personalizzato
 * @param {Array} colors - Array custom di colori (opzionale, default usa COLOR_PALETTE)
 */
function ColorPalette({
  selectedColor,
  onColorSelect,
  showCustom = false,
  colors = null
}) {
  const colorInputRef = useRef(null);
  const displayColors = colors || PRESET_COLORS;

  const handleCustomColorClick = () => {
    colorInputRef.current?.click();
  };

  const handleCustomColorChange = (e) => {
    onColorSelect(e.target.value);
  };

  // Normalizza i colori per il confronto (lowercase)
  const normalizeColor = (color) => color?.toLowerCase() || '';

  return (
    <div className="color-palette">
      {displayColors.map(({ color, name, hex }) => {
        const colorValue = hex || color;
        const isSelected = normalizeColor(selectedColor) === normalizeColor(colorValue);

        return (
          <button
            key={colorValue}
            type="button"
            className={`color-swatch ${isSelected ? 'selected' : ''}`}
            style={{ backgroundColor: colorValue }}
            onClick={() => onColorSelect(colorValue)}
            title={name}
            aria-label={name}
            aria-pressed={isSelected}
          />
        );
      })}

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
            value={selectedColor || '#000000'}
            onChange={handleCustomColorChange}
            style={{ display: 'none' }}
          />
        </>
      )}
    </div>
  );
}

export default ColorPalette;
