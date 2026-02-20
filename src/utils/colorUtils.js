/**
 * Utility per manipolazione colori
 */

/**
 * Scurisce un colore hex di una percentuale
 * @param {string} hex - Colore esadecimale (es: '#22c55e')
 * @param {number} percent - Percentuale di scurimento (0-100)
 * @returns {string} Colore scurito in formato hex
 */
export function darkenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) - amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) - amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) - amt));
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

/**
 * Schiarisce un colore hex di una percentuale
 * @param {string} hex - Colore esadecimale (es: '#22c55e')
 * @param {number} percent - Percentuale di schiarimento (0-100)
 * @returns {string} Colore schiarito in formato hex
 */
export function lightenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

/**
 * Converte un colore hex in rgba con opacity specificata
 * @param {string} hex - Colore esadecimale (es: '#22c55e')
 * @param {number} opacity - Valore opacity (0-1)
 * @returns {string} Colore in formato rgba
 */
export function hexToRgba(hex, opacity) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
