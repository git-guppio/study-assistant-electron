/**
 * Utility functions for image management in the editor
 */

/**
 * Estrae tutti gli URL delle immagini locali da contenuto HTML
 * @param {string} htmlContent - Contenuto HTML
 * @returns {string[]} - Array di URL immagini (local-image://...)
 */
export function extractLocalImageUrls(htmlContent) {
  if (!htmlContent) return [];

  const urls = [];
  // Pattern per trovare src="local-image://..." nelle immagini
  const imgRegex = /<img[^>]+src=["']?(local-image:\/\/[^"'\s>]+)["']?[^>]*>/gi;
  let match;

  while ((match = imgRegex.exec(htmlContent)) !== null) {
    urls.push(match[1]);
  }

  return urls;
}

/**
 * Estrae gli URL delle immagini da contenuto JSON TipTap
 * @param {object|string} content - Contenuto TipTap (JSON o stringa)
 * @returns {string[]} - Array di URL immagini
 */
export function extractImageUrlsFromTipTap(content) {
  if (!content) return [];

  const urls = [];

  function traverse(node) {
    if (!node) return;

    // Nodo immagine
    if (node.type === 'image' && node.attrs?.src) {
      if (node.attrs.src.startsWith('local-image://')) {
        urls.push(node.attrs.src);
      }
    }

    // Ricorsione nei figli
    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        traverse(child);
      }
    }
  }

  try {
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
    traverse(parsed);
  } catch (e) {
    // Se non è JSON valido, prova come HTML
    return extractLocalImageUrls(content);
  }

  return urls;
}

/**
 * Raccoglie tutti gli URL delle immagini usate nell'applicazione
 * @param {object} db - Database manager instance
 * @returns {Promise<string[]>} - Array di URL immagini usate
 */
export async function collectAllUsedImageUrls(db) {
  const allUrls = new Set();

  try {
    // Note - le immagini sono nel campo 'comment' (HTML del MiniEditor)
    const notes = await db.getNotes();
    for (const note of notes) {
      if (note.comment) {
        extractLocalImageUrls(note.comment).forEach(url => allUrls.add(url));
      }
    }

    // Dictionary entries - le immagini sono nel campo 'definition' (HTML del MiniEditor)
    const dictEntries = await db.getDictionaryEntries();
    for (const entry of dictEntries) {
      if (entry.definition) {
        extractLocalImageUrls(entry.definition).forEach(url => allUrls.add(url));
      }
    }

    // Keywords - le immagini sono nel campo 'comment' (HTML del MiniEditor)
    const keywords = await db.getKeywords();
    for (const kw of keywords) {
      if (kw.comment) {
        extractLocalImageUrls(kw.comment).forEach(url => allUrls.add(url));
      }
    }

    // Summary - il contenuto è HTML
    const summary = await db.getSummary();
    if (summary?.content) {
      extractLocalImageUrls(summary.content).forEach(url => allUrls.add(url));
    }

  } catch (error) {
    console.error('Error collecting used image URLs:', error);
  }

  return Array.from(allUrls);
}

/**
 * Elimina le immagini da un contenuto HTML e dal disco
 * @param {string} htmlContent - Contenuto HTML
 * @returns {Promise<void>}
 */
export async function deleteImagesFromContent(htmlContent) {
  if (!window.electronAPI) return;

  const imageUrls = extractLocalImageUrls(htmlContent);

  if (imageUrls.length > 0) {
    await window.electronAPI.deleteImagesFromDisk(imageUrls);
  }
}
