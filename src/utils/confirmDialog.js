/**
 * Utility per mostrare dialog di conferma
 */

/**
 * Mostra un dialog di conferma generico
 * @param {Object} options - Opzioni del dialog
 * @param {string} options.title - Titolo del dialog
 * @param {string} options.message - Messaggio del dialog
 * @param {string} options.confirmText - Testo del pulsante conferma (default: "Elimina")
 * @param {string} options.cancelText - Testo del pulsante annulla (default: "Annulla")
 * @param {string} options.confirmColor - Colore del pulsante conferma (default: "#dc2626")
 * @returns {Promise<boolean>} - true se confermato, false se annullato
 */
export function showConfirmDialog({
  title = '🗑️ Conferma eliminazione',
  message = 'Sei sicuro di voler procedere?',
  confirmText = 'Elimina',
  cancelText = 'Annulla',
  confirmColor = '#dc2626'
}) {
  return new Promise((resolve) => {
    // Rimuovi eventuali dialog esistenti
    const existingOverlay = document.querySelector('.confirm-dialog-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    // Crea overlay
    const overlay = document.createElement('div');
    overlay.className = 'confirm-dialog-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Crea dialog
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.style.cssText = `
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      padding: 20px;
      min-width: 300px;
      max-width: 400px;
      animation: dialogFadeIn 0.15s ease-out;
    `;

    // Aggiungi animazione CSS se non esiste
    if (!document.querySelector('#confirm-dialog-styles')) {
      const style = document.createElement('style');
      style.id = 'confirm-dialog-styles';
      style.textContent = `
        @keyframes dialogFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `;
      document.head.appendChild(style);
    }

    // Titolo
    const titleEl = document.createElement('div');
    titleEl.innerHTML = title;
    titleEl.style.cssText = `
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
      color: #1f2937;
    `;

    // Messaggio
    const messageEl = document.createElement('div');
    messageEl.innerHTML = message;
    messageEl.style.cssText = `
      font-size: 14px;
      color: #4b5563;
      margin-bottom: 20px;
      line-height: 1.5;
    `;

    // Container pulsanti
    const buttons = document.createElement('div');
    buttons.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    `;

    // Pulsante Annulla
    const cancelBtn = document.createElement('button');
    cancelBtn.innerHTML = cancelText;
    cancelBtn.style.cssText = `
      padding: 8px 16px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      background: white;
      color: #374151;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.15s;
    `;
    cancelBtn.onmouseenter = () => { cancelBtn.style.background = '#f3f4f6'; };
    cancelBtn.onmouseleave = () => { cancelBtn.style.background = 'white'; };
    cancelBtn.onclick = () => {
      overlay.remove();
      resolve(false);
    };

    // Pulsante Conferma
    const confirmBtn = document.createElement('button');
    confirmBtn.innerHTML = confirmText;
    confirmBtn.style.cssText = `
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      background: ${confirmColor};
      color: white;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.15s;
    `;
    const darkerColor = adjustBrightness(confirmColor, -20);
    confirmBtn.onmouseenter = () => { confirmBtn.style.background = darkerColor; };
    confirmBtn.onmouseleave = () => { confirmBtn.style.background = confirmColor; };
    confirmBtn.onclick = () => {
      overlay.remove();
      resolve(true);
    };

    buttons.appendChild(cancelBtn);
    buttons.appendChild(confirmBtn);

    dialog.appendChild(titleEl);
    dialog.appendChild(messageEl);
    dialog.appendChild(buttons);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Chiudi con Escape
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', handleKeyDown);
        resolve(false);
      } else if (e.key === 'Enter') {
        overlay.remove();
        document.removeEventListener('keydown', handleKeyDown);
        resolve(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // Focus sul pulsante Annulla
    setTimeout(() => cancelBtn.focus(), 0);
  });
}

/**
 * Dialog specifico per eliminazione immagine
 */
export function showDeleteImageDialog() {
  return showConfirmDialog({
    title: '🗑️ Elimina immagine',
    message: 'Sei sicuro di voler eliminare questa immagine? Il file verrà rimosso definitivamente dal disco.',
    confirmText: 'Elimina',
    confirmColor: '#dc2626'
  });
}

/**
 * Dialog specifico per eliminazione nota
 */
export function showDeleteNoteDialog() {
  return showConfirmDialog({
    title: '🗑️ Elimina nota',
    message: 'Sei sicuro di voler eliminare questa nota? Verranno eliminate anche l\'annotazione sul PDF e tutte le immagini contenute.',
    confirmText: 'Elimina',
    confirmColor: '#dc2626'
  });
}

/**
 * Dialog specifico per eliminazione voce dizionario
 */
export function showDeleteDictionaryDialog() {
  return showConfirmDialog({
    title: '🗑️ Elimina voce dizionario',
    message: 'Sei sicuro di voler eliminare questa voce? Verranno eliminate anche l\'annotazione sul PDF e tutte le immagini contenute.',
    confirmText: 'Elimina',
    confirmColor: '#8b5cf6'
  });
}

/**
 * Dialog specifico per eliminazione parola chiave
 */
export function showDeleteKeywordDialog() {
  return showConfirmDialog({
    title: '🗑️ Elimina parola chiave',
    message: 'Sei sicuro di voler eliminare questa parola chiave? Verranno eliminate anche l\'annotazione sul PDF e tutte le immagini contenute.',
    confirmText: 'Elimina',
    confirmColor: '#f59e0b'
  });
}

/**
 * Dialog specifico per eliminazione segnalibro
 */
export function showDeleteBookmarkDialog(bookmarkTitle) {
  return showConfirmDialog({
    title: '🗑️ Elimina segnalibro',
    message: `Sei sicuro di voler eliminare il segnalibro "<b>${bookmarkTitle}</b>"?`,
    confirmText: 'Elimina',
    confirmColor: '#3b82f6'
  });
}

/**
 * Utility per scurire/schiarire un colore
 */
function adjustBrightness(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}
