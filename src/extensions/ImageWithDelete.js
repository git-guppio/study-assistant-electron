import Image from '@tiptap/extension-image';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { showDeleteImageDialog } from '../utils/confirmDialog';
import ResizableImageComponent from '../components/ResizableImageComponent';

/**
 * Estensione Image custom con:
 * - Menu contestuale per eliminare immagini
 * - Supporto Delete/Backspace per eliminare immagini selezionate
 * - Eliminazione file da disco quando l'immagine viene rimossa
 * - Placeholder per immagini mancanti
 */
export const ImageWithDelete = Image.extend({
  name: 'image',

  addOptions() {
    return {
      ...this.parent?.(),
      // Callback per eliminare immagine da disco
      onDeleteImage: null,
      // Callback per verificare se immagine esiste
      onCheckImageExists: null,
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: element => {
          const img = element.tagName === 'IMG' ? element : element.querySelector('img');
          const w = img?.getAttribute('width');
          return w ? parseInt(w, 10) : null;
        },
        renderHTML: attributes => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },
      height: {
        default: null,
        parseHTML: element => {
          const img = element.tagName === 'IMG' ? element : element.querySelector('img');
          const h = img?.getAttribute('height');
          return h ? parseInt(h, 10) : null;
        },
        renderHTML: attributes => {
          if (!attributes.height) return {};
          return { height: attributes.height };
        },
      },
      // Attributo per tracciare se l'immagine è mancante
      isMissing: {
        default: false,
        parseHTML: () => false,
        renderHTML: (attributes) => {
          if (attributes.isMissing) {
            return { 'data-missing': 'true' };
          }
          return {};
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent);
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: new PluginKey('imageWithDelete'),
        props: {
          // Handler per Delete/Backspace
          handleKeyDown(view, event) {
            if (event.key === 'Delete' || event.key === 'Backspace') {
              const { state } = view;
              const { selection } = state;
              const { $from, $to } = selection;

              // Verifica se la selezione contiene un'immagine
              let imageNode = null;
              let imagePos = null;

              state.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
                if (node.type.name === 'image') {
                  imageNode = node;
                  imagePos = pos;
                  return false;
                }
              });

              // Se c'è un nodo immagine selezionato
              if (imageNode && imagePos !== null) {
                const src = imageNode.attrs.src;

                // Solo per immagini locali mostra conferma
                if (src && src.startsWith('local-image://')) {
                  event.preventDefault();

                  // Mostra dialog di conferma (async)
                  showDeleteImageDialog().then((confirmed) => {
                    if (confirmed) {
                      // Elimina da disco
                      if (extension.options.onDeleteImage) {
                        extension.options.onDeleteImage(src);
                      }

                      // Elimina il nodo dall'editor
                      const tr = view.state.tr.delete(imagePos, imagePos + imageNode.nodeSize);
                      view.dispatch(tr);
                    }
                  });

                  return true;
                } else {
                  // Per immagini non locali (URL esterni), elimina senza conferma
                  const tr = state.tr.delete(imagePos, imagePos + imageNode.nodeSize);
                  view.dispatch(tr);
                  return true;
                }
              }
            }
            return false;
          },

          // Handler per click destro (menu contestuale)
          handleDOMEvents: {
            contextmenu(view, event) {
              const target = event.target;

              // Verifica se il click è su un'immagine
              if (target.tagName === 'IMG') {
                event.preventDefault();

                const src = target.getAttribute('src');
                if (!src) return false;

                // Trova la posizione del nodo immagine
                const pos = view.posAtDOM(target, 0);
                const resolvedPos = view.state.doc.resolve(pos);
                const node = resolvedPos.nodeAfter;

                if (node && node.type.name === 'image') {
                  // Crea e mostra menu contestuale
                  showImageContextMenu(event, view, pos, node, extension.options.onDeleteImage);
                  return true;
                }
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});

/**
 * Mostra menu contestuale per immagine
 */
function showImageContextMenu(event, view, pos, node, onDeleteImage) {
  // Rimuovi eventuali menu esistenti
  const existingMenu = document.querySelector('.image-context-menu');
  if (existingMenu) {
    existingMenu.remove();
  }

  // Crea il menu
  const menu = document.createElement('div');
  menu.className = 'image-context-menu';
  menu.style.cssText = `
    position: fixed;
    left: ${event.clientX}px;
    top: ${event.clientY}px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.15);
    z-index: 10000;
    min-width: 150px;
    overflow: hidden;
  `;

  // Opzione: Elimina immagine
  const deleteOption = document.createElement('div');
  deleteOption.className = 'image-context-menu-item';
  deleteOption.innerHTML = '🗑️ Elimina immagine';
  deleteOption.style.cssText = `
    padding: 8px 12px;
    cursor: pointer;
    font-size: 13px;
    color: #dc2626;
    transition: background 0.15s;
  `;
  deleteOption.onmouseenter = () => {
    deleteOption.style.background = '#fee2e2';
  };
  deleteOption.onmouseleave = () => {
    deleteOption.style.background = 'transparent';
  };
  deleteOption.onclick = async () => {
    menu.remove();

    // Mostra dialog di conferma
    const confirmed = await showDeleteImageDialog();
    if (confirmed) {
      const src = node.attrs.src;

      // Elimina da disco se è un'immagine locale
      if (src && src.startsWith('local-image://') && onDeleteImage) {
        onDeleteImage(src);
      }

      // Elimina il nodo dall'editor
      const tr = view.state.tr.delete(pos, pos + node.nodeSize);
      view.dispatch(tr);
    }
  };

  menu.appendChild(deleteOption);
  document.body.appendChild(menu);

  // Chiudi menu se si clicca altrove
  const closeMenu = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
      document.removeEventListener('contextmenu', closeMenu);
    }
  };

  setTimeout(() => {
    document.addEventListener('click', closeMenu);
    document.addEventListener('contextmenu', closeMenu);
  }, 0);
}

export default ImageWithDelete;
