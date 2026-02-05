/**
 * PDF Metadata Extractor
 * Estrae metadati dai file PDF (titolo, autore, etc.)
 */

const fs = require('fs');
const path = require('path');

// Lazy load pdf-parse per evitare problemi di caricamento
let pdfParse = null;
function getPdfParse() {
  if (!pdfParse) {
    pdfParse = require('pdf-parse');
  }
  return pdfParse;
}

/**
 * Estrae i metadati da un file PDF
 * @param {string} filePath - Percorso del file PDF
 * @returns {Promise<Object>} - Metadati estratti
 */
async function extractPdfMetadata(filePath) {
  const result = {
    title: null,
    authors: [],
    creator: null,
    producer: null,
    creationDate: null,
    modificationDate: null,
    pageCount: 0,
    success: false,
    error: null
  };

  try {
    // Verifica che il file esista
    if (!fs.existsSync(filePath)) {
      result.error = 'File non trovato';
      return result;
    }

    // Leggi il file
    const dataBuffer = fs.readFileSync(filePath);

    // Parse del PDF
    const pdf = getPdfParse();
    const data = await pdf(dataBuffer);

    // Estrai metadati
    result.pageCount = data.numpages || 0;

    if (data.info) {
      // Titolo
      if (data.info.Title) {
        result.title = cleanMetadataString(data.info.Title);
      }

      // Autore (può essere una stringa o array)
      if (data.info.Author) {
        const authorStr = cleanMetadataString(data.info.Author);
        // Prova a separare più autori (separati da virgola, "and", "&", ";")
        result.authors = parseAuthors(authorStr);
      }

      // Creator (software usato per creare il PDF)
      if (data.info.Creator) {
        result.creator = cleanMetadataString(data.info.Creator);
      }

      // Producer (software usato per produrre il PDF)
      if (data.info.Producer) {
        result.producer = cleanMetadataString(data.info.Producer);
      }

      // Date
      if (data.info.CreationDate) {
        result.creationDate = parsePdfDate(data.info.CreationDate);
      }
      if (data.info.ModDate) {
        result.modificationDate = parsePdfDate(data.info.ModDate);
      }
    }

    // Se non c'è titolo, usa il nome del file
    if (!result.title) {
      result.title = getTitleFromFilename(filePath);
    }

    result.success = true;
  } catch (error) {
    console.error('[PdfMetadata] Errore estrazione:', error);
    result.error = error.message;

    // Fallback: usa il nome del file come titolo
    result.title = getTitleFromFilename(filePath);
    result.success = true; // Considera comunque successo con fallback
  }

  return result;
}

/**
 * Pulisce una stringa di metadato
 */
function cleanMetadataString(str) {
  if (!str) return null;

  // Converti in stringa se necessario
  let cleaned = String(str);

  // Rimuovi caratteri nulli e whitespace extra
  cleaned = cleaned.replace(/\0/g, '').trim();

  // Rimuovi prefissi comuni dei metadati PDF
  cleaned = cleaned.replace(/^D:/, '');

  // Se la stringa è vuota dopo la pulizia, ritorna null
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Parsa una stringa di autori in un array
 */
function parseAuthors(authorStr) {
  if (!authorStr) return [];

  // Separatori comuni per più autori
  const separators = /[,;&]|\band\b|\be\b/gi;

  const authors = authorStr
    .split(separators)
    .map(a => a.trim())
    .filter(a => a.length > 0);

  return authors.length > 0 ? authors : [authorStr];
}

/**
 * Parsa una data in formato PDF
 * Formato: D:YYYYMMDDHHmmSSOHH'mm'
 */
function parsePdfDate(dateStr) {
  if (!dateStr) return null;

  try {
    // Rimuovi prefisso D: se presente
    let str = String(dateStr).replace(/^D:/, '');

    // Estrai componenti
    const year = parseInt(str.substring(0, 4));
    const month = parseInt(str.substring(4, 6)) - 1;
    const day = parseInt(str.substring(6, 8));
    const hour = parseInt(str.substring(8, 10)) || 0;
    const minute = parseInt(str.substring(10, 12)) || 0;
    const second = parseInt(str.substring(12, 14)) || 0;

    if (isNaN(year)) return null;

    const date = new Date(year, month || 0, day || 1, hour, minute, second);
    return date.toISOString();
  } catch {
    return null;
  }
}

/**
 * Estrae un titolo dal nome del file
 */
function getTitleFromFilename(filePath) {
  const basename = path.basename(filePath, path.extname(filePath));

  // Sostituisci underscore e trattini con spazi
  let title = basename.replace(/[_-]/g, ' ');

  // Rimuovi numeri all'inizio (spesso sono codici)
  title = title.replace(/^\d+\s*/, '');

  // Capitalizza la prima lettera di ogni parola
  title = title.replace(/\b\w/g, c => c.toUpperCase());

  return title.trim() || basename;
}

/**
 * Calcola l'hash di un file per identificazione univoca
 */
async function calculateFileHash(filePath) {
  const crypto = require('crypto');

  return new Promise((resolve, reject) => {
    try {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Estrae l'anno da una data
 */
function extractYearFromDate(dateStr) {
  if (!dateStr) return null;

  try {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    return year > 1900 && year < 2100 ? year : null;
  } catch {
    return null;
  }
}

module.exports = {
  extractPdfMetadata,
  calculateFileHash,
  getTitleFromFilename,
  extractYearFromDate
};
