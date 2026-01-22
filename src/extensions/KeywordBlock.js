import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import KeywordBlockComponent from '../components/KeywordBlockComponent';
import { showDeleteKeywordDialog } from '../utils/confirmDialog';

/**
 * TipTap Extension per blocchi parole chiave collegati ad annotazioni PDF
 *
 * Attributi:
 * - keywordId: ID della keyword nel database
 * - annotationId: ID dell'annotazione PDF collegata
 * - pageNumber: Numero pagina PDF
 * - positionY: Posizione Y nel PDF (per ordinamento)
 * - term: Parola chiave selezionata dal PDF
 * - color: Colore dell'annotazione
 * - comment: Commento/note aggiuntive (editabile con MiniEditor)
 */
export const KeywordBlock = Node.create({
  name: 'keywordBlock',

  group: 'block',

  content: '',

  atom: true,

  addAttributes() {
    return {
      keywordId: {
        default: null,
        parseHTML: element => element.getAttribute('data-keyword-id'),
        renderHTML: attributes => {
          if (!attributes.keywordId) {
            return {};
          }
          return {
            'data-keyword-id': attributes.keywordId,
          };
        },
      },
      annotationId: {
        default: null,
        parseHTML: element => element.getAttribute('data-annotation-id'),
        renderHTML: attributes => {
          if (!attributes.annotationId) {
            return {};
          }
          return {
            'data-annotation-id': attributes.annotationId,
          };
        },
      },
      pageNumber: {
        default: 1,
        parseHTML: element => {
          const value = element.getAttribute('data-page-number');
          return value ? parseInt(value, 10) : 1;
        },
        renderHTML: attributes => {
          return {
            'data-page-number': attributes.pageNumber,
          };
        },
      },
      positionY: {
        default: 0,
        parseHTML: element => {
          const value = element.getAttribute('data-position-y');
          return value ? parseFloat(value) : 0;
        },
        renderHTML: attributes => {
          return {
            'data-position-y': attributes.positionY,
          };
        },
      },
      term: {
        default: '',
        parseHTML: element => element.getAttribute('data-term'),
        renderHTML: attributes => {
          return {
            'data-term': attributes.term,
          };
        },
      },
      color: {
        default: '#f59e0b', // Arancione per keywords
        parseHTML: element => element.getAttribute('data-color'),
        renderHTML: attributes => {
          return {
            'data-color': attributes.color,
          };
        },
      },
      comment: {
        default: '',
        parseHTML: element => element.getAttribute('data-comment'),
        renderHTML: attributes => {
          return {
            'data-comment': attributes.comment,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="keyword-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'keyword-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(KeywordBlockComponent);
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: new PluginKey('keywordBlockDelete'),
        props: {
          handleKeyDown(view, event) {
            if (event.key === 'Delete' || event.key === 'Backspace') {
              const { state } = view;
              const { selection } = state;
              const { $from, $to } = selection;

              // Verifica se la selezione contiene un blocco keyword
              let kwNode = null;
              let kwPos = null;

              state.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
                if (node.type.name === 'keywordBlock') {
                  kwNode = node;
                  kwPos = pos;
                  return false;
                }
              });

              // Se c'è un blocco keyword selezionato
              if (kwNode && kwPos !== null) {
                event.preventDefault();

                // Mostra dialog di conferma
                showDeleteKeywordDialog().then((confirmed) => {
                  if (confirmed) {
                    const { keywordId, annotationId, comment } = kwNode.attrs;

                    // Callback per eliminare dal database
                    if (extension.options.onDeleteKeyword) {
                      extension.options.onDeleteKeyword(keywordId, annotationId, comment);
                    }

                    // Elimina il nodo dall'editor
                    const tr = view.state.tr.delete(kwPos, kwPos + kwNode.nodeSize);
                    view.dispatch(tr);
                  }
                });

                return true;
              }
            }
            return false;
          },
        },
      }),
    ];
  },
});
