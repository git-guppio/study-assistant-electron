/**
 * Utilities per la gestione delle coordinate delle annotazioni PDF
 *
 * Sistema di coordinate:
 * - Storage: coordinate normalizzate (0-1) relative alle dimensioni della pagina
 * - Rendering: coordinate pixel basate sul viewport corrente
 */

/**
 * Converte una selezione del browser in coordinate normalizzate (0-1)
 *
 * @param {Selection} selection - Oggetto Selection del browser
 * @param {HTMLElement} container - Container della pagina PDF (.pdf-page-container)
 * @param {Object} viewport - Viewport PDF.js { width, height }
 * @returns {Array<{x: number, y: number, width: number, height: number}>} Array di rettangoli normalizzati
 */
export function getSelectionRects(selection, container, viewport) {
  if (!selection || selection.rangeCount === 0 || !container || !viewport) {
    return [];
  }

  const range = selection.getRangeAt(0);
  const clientRects = range.getClientRects();
  const containerRect = container.getBoundingClientRect();

  const normalizedRects = [];

  for (let i = 0; i < clientRects.length; i++) {
    const rect = clientRects[i];

    // Converti da coordinate viewport a coordinate relative al container
    const relativeX = rect.left - containerRect.left;
    const relativeY = rect.top - containerRect.top;

    // Normalizza a range 0-1
    const normalized = {
      x: Math.max(0, Math.min(1, relativeX / viewport.width)),
      y: Math.max(0, Math.min(1, relativeY / viewport.height)),
      width: Math.max(0, Math.min(1, rect.width / viewport.width)),
      height: Math.max(0, Math.min(1, rect.height / viewport.height))
    };

    // Ignora rettangoli troppo piccoli (artefatti di selezione)
    if (normalized.width > 0.001 && normalized.height > 0.001) {
      normalizedRects.push(normalized);
    }
  }

  // Unisci rettangoli adiacenti sulla stessa riga
  return mergeAdjacentRects(normalizedRects);
}

/**
 * Converte coordinate normalizzate in pixel per il rendering
 *
 * @param {Object} rect - Rettangolo normalizzato { x, y, width, height }
 * @param {number} viewportWidth - Larghezza viewport corrente in pixel
 * @param {number} viewportHeight - Altezza viewport corrente in pixel
 * @returns {Object} Rettangolo in pixel { left, top, width, height }
 */
export function denormalizeRect(rect, viewportWidth, viewportHeight) {
  return {
    left: rect.x * viewportWidth,
    top: rect.y * viewportHeight,
    width: rect.width * viewportWidth,
    height: rect.height * viewportHeight
  };
}

/**
 * Calcola la posizione Y per l'icona nel gutter
 * Usa la coordinata Y del primo rettangolo dell'annotazione
 *
 * @param {Object} annotation - Annotazione con array rects
 * @param {number} viewportHeight - Altezza viewport corrente in pixel
 * @returns {number} Posizione top in pixel
 */
export function getGutterYPosition(annotation, viewportHeight) {
  if (!annotation.rects || annotation.rects.length === 0) {
    return 0;
  }
  // Usa il primo rettangolo per posizionare l'icona
  const firstRect = annotation.rects[0];
  return firstRect.y * viewportHeight;
}

/**
 * Unisce rettangoli adiacenti sulla stessa riga per ridurre il numero di elementi DOM
 *
 * @param {Array} rects - Array di rettangoli normalizzati
 * @returns {Array} Array di rettangoli uniti
 */
function mergeAdjacentRects(rects) {
  if (rects.length <= 1) return rects;

  // Ordina per Y poi per X
  const sorted = [...rects].sort((a, b) => {
    const yDiff = a.y - b.y;
    if (Math.abs(yDiff) < 0.01) { // Stessa riga (tolleranza 1%)
      return a.x - b.x;
    }
    return yDiff;
  });

  const merged = [];
  let current = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const rect = sorted[i];

    // Verifica se sulla stessa riga (Y simile) e adiacente (X vicino)
    const sameRow = Math.abs(rect.y - current.y) < 0.01;
    const adjacent = rect.x <= current.x + current.width + 0.01;

    if (sameRow && adjacent) {
      // Espandi il rettangolo corrente
      const newRight = Math.max(current.x + current.width, rect.x + rect.width);
      current.width = newRight - current.x;
      current.height = Math.max(current.height, rect.height);
    } else {
      // Salva il corrente e inizia uno nuovo
      merged.push(current);
      current = { ...rect };
    }
  }

  merged.push(current);
  return merged;
}

/**
 * Calcola il bounding box che contiene tutti i rettangoli
 * Utile per centrare la vista su un'annotazione
 *
 * @param {Array} rects - Array di rettangoli normalizzati
 * @returns {Object} Bounding box { x, y, width, height }
 */
export function getBoundingBox(rects) {
  if (!rects || rects.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const rect of rects) {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Verifica se un punto (click) interseca un rettangolo
 *
 * @param {number} x - Coordinata X normalizzata del click
 * @param {number} y - Coordinata Y normalizzata del click
 * @param {Object} rect - Rettangolo normalizzato
 * @returns {boolean}
 */
export function pointInRect(x, y, rect) {
  return x >= rect.x &&
         x <= rect.x + rect.width &&
         y >= rect.y &&
         y <= rect.y + rect.height;
}

/**
 * Trova l'annotazione sotto un punto di click
 *
 * @param {number} clientX - Coordinata X del click (client)
 * @param {number} clientY - Coordinata Y del click (client)
 * @param {HTMLElement} container - Container della pagina PDF
 * @param {Object} viewport - Viewport { width, height }
 * @param {Array} annotations - Array di annotazioni
 * @returns {Object|null} Annotazione trovata o null
 */
export function findAnnotationAtPoint(clientX, clientY, container, viewport, annotations) {
  if (!container || !viewport || !annotations) return null;

  const containerRect = container.getBoundingClientRect();

  // Converti click in coordinate normalizzate
  const normalizedX = (clientX - containerRect.left) / viewport.width;
  const normalizedY = (clientY - containerRect.top) / viewport.height;

  // Cerca in ordine inverso (le annotazioni più recenti sono sopra)
  for (let i = annotations.length - 1; i >= 0; i--) {
    const annotation = annotations[i];
    for (const rect of annotation.rects) {
      if (pointInRect(normalizedX, normalizedY, rect)) {
        return annotation;
      }
    }
  }

  return null;
}
