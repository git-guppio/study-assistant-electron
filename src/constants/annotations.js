/**
 * Costanti per il sistema di annotazioni multi-livello
 *
 * Questo file contiene tutte le definizioni per icone, colori e tipi
 * di annotazioni supportati dall'applicazione.
 */

// ==================== ICONE GENERICHE ====================
// Usate per "Aggiungi Nota" - l'utente puo' scegliere quale icona usare

export const GENERIC_ICONS = [
  {
    id: 'note',
    emoji: '📝',
    label: 'Nota generica',
    defaultColor: '#22c55e',  // Verde
    description: 'Appunto generico o commento libero'
  },
  {
    id: 'important',
    emoji: '⭐',
    label: 'Molto importante',
    defaultColor: '#eab308',  // Giallo
    description: 'Concetto chiave da ricordare assolutamente'
  },
  {
    id: 'idea',
    emoji: '💡',
    label: 'Idea/Insight',
    defaultColor: '#f97316',  // Arancio
    description: 'Intuizione personale o spunto creativo'
  },
  {
    id: 'question',
    emoji: '❓',
    label: 'Domanda',
    defaultColor: '#3b82f6',  // Blu
    description: 'Punto da approfondire o dubbio da risolvere'
  },
  {
    id: 'definition',
    emoji: '🎯',
    label: 'Definizione',
    defaultColor: '#8b5cf6',  // Viola
    description: 'Termine tecnico o concetto da memorizzare'
  },
  {
    id: 'review',
    emoji: '📌',
    label: 'Da rivedere',
    defaultColor: '#ef4444',  // Rosso
    description: 'Passaggio da rileggere successivamente'
  }
];

// ==================== ICONE AZIONI ====================
// Icone fisse per le azioni avanzate (Flashcard, Dizionario, Keywords)

export const ACTION_ICONS = [
  {
    id: 'flashcard',
    emoji: '🧠',
    label: 'Flashcard',
    defaultColor: '#8b5cf6',  // Viola
    description: 'Crea una flashcard per memorizzazione'
  },
  {
    id: 'dictionary',
    emoji: '📖',
    label: 'Dizionario',
    defaultColor: '#3b82f6',  // Blu
    description: 'Aggiungi termine al dizionario personale'
  },
  {
    id: 'keyword',
    emoji: '🔑',
    label: 'Parola chiave',
    defaultColor: '#eab308',  // Giallo
    description: 'Marca come parola chiave importante'
  }
];

// ==================== PALETTE COLORI ====================
// Colori disponibili per tutte le annotazioni

export const COLOR_PALETTE = [
  { id: 'yellow', hex: '#eab308', name: 'Giallo' },
  { id: 'green', hex: '#22c55e', name: 'Verde' },
  { id: 'blue', hex: '#3b82f6', name: 'Blu' },
  { id: 'orange', hex: '#f97316', name: 'Arancio' },
  { id: 'purple', hex: '#8b5cf6', name: 'Viola' },
  { id: 'red', hex: '#ef4444', name: 'Rosso' }
];

// ==================== TIPI DI ANNOTAZIONE ====================

export const ANNOTATION_TYPES = {
  NOTE: 'note',           // Nota con outline + icona Gutter + blocco TipTap
  HIGHLIGHT: 'highlight', // Solo evidenziatura visiva (no Gutter, no TipTap)
  FLASHCARD: 'flashcard', // Flashcard (icona fissa 🧠)
  DICTIONARY: 'dictionary', // Voce dizionario (icona fissa 📖)
  KEYWORD: 'keyword'      // Parola chiave (icona fissa 🔑)
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Trova un'icona generica per ID
 * @param {string} iconId - ID dell'icona (es: 'note', 'important')
 * @returns {object|null} Oggetto icona o null
 */
export function getIconById(iconId) {
  return GENERIC_ICONS.find(icon => icon.id === iconId) ||
         ACTION_ICONS.find(icon => icon.id === iconId) ||
         null;
}

/**
 * Ottiene l'emoji per un dato iconId
 * @param {string} iconId - ID dell'icona
 * @returns {string} Emoji o '📝' come fallback
 */
export function getEmojiForIcon(iconId) {
  const icon = getIconById(iconId);
  return icon?.emoji || '📝';
}

/**
 * Ottiene il colore di default per un'icona
 * @param {string} iconId - ID dell'icona
 * @returns {string} Colore hex o verde come fallback
 */
export function getDefaultColorForIcon(iconId) {
  const icon = getIconById(iconId);
  return icon?.defaultColor || '#22c55e';
}

/**
 * Ottiene il colore di default per un tipo di azione
 * @param {string} actionType - Tipo azione ('flashcard', 'dictionary', 'keyword')
 * @returns {string} Colore hex
 */
export function getDefaultColorForAction(actionType) {
  const action = ACTION_ICONS.find(a => a.id === actionType);
  return action?.defaultColor || '#8b5cf6';
}

/**
 * Trova un colore nella palette per hex
 * @param {string} hex - Colore esadecimale
 * @returns {object|null} Oggetto colore o null
 */
export function getColorByHex(hex) {
  return COLOR_PALETTE.find(c => c.hex.toLowerCase() === hex.toLowerCase()) || null;
}

/**
 * Verifica se un iconId appartiene alle azioni (icone fisse)
 * @param {string} iconId - ID dell'icona
 * @returns {boolean}
 */
export function isActionIcon(iconId) {
  return ACTION_ICONS.some(a => a.id === iconId);
}

/**
 * Verifica se un iconId appartiene alle icone generiche (personalizzabili)
 * @param {string} iconId - ID dell'icona
 * @returns {boolean}
 */
export function isGenericIcon(iconId) {
  return GENERIC_ICONS.some(i => i.id === iconId);
}

// ==================== DEFAULTS ====================

export const DEFAULT_HIGHLIGHT_COLOR = '#eab308'; // Giallo
export const DEFAULT_NOTE_ICON = 'note';
export const DEFAULT_NOTE_COLOR = '#22c55e'; // Verde

// Opacity per i diversi tipi di annotazione
export const ANNOTATION_OPACITY = {
  highlight: 0.35,  // Evidenziatura piena
  note: 0.15,       // Outline semi-trasparente
  flashcard: 0.15,
  dictionary: 0.15,
  keyword: 0.15
};
