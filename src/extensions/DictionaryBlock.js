import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import DictionaryBlockComponent from '../components/DictionaryBlockComponent';
import { showDeleteDictionaryDialog } from '../utils/confirmDialog';

/**
 * TipTap Extension per blocchi dizionario collegati ad annotazioni PDF
 *
 * Attributi:
 * - entryId: ID della voce dizionario nel database
 * - annotationId: ID dell'annotazione PDF collegata
 * - pageNumber: Numero pagina PDF
 * - positionY: Posizione Y nel PDF (per ordinamento)
 * - term: Termine/parola selezionata dal PDF
 * - color: Colore dell'annotazione
 * - definition: Definizione/commento (editabile con MiniEditor)
 */
export const DictionaryBlock = Node.create({
  name: 'dictionaryBlock',

  group: 'block',

  content: '',

  atom: true,

  addAttributes() {
    return {
      entryId: {
        default: null,
        parseHTML: element => element.getAttribute('data-entry-id'),
        renderHTML: attributes => {
          if (!attributes.entryId) {
            return {};
          }
          return {
            'data-entry-id': attributes.entryId,
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
        default: '#8b5cf6', // Viola per dizionario
        parseHTML: element => element.getAttribute('data-color'),
        renderHTML: attributes => {
          return {
            'data-color': attributes.color,
          };
        },
      },
      definition: {
        default: '',
        parseHTML: element => element.getAttribute('data-definition'),
        renderHTML: attributes => {
          return {
            'data-definition': attributes.definition,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="dictionary-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'dictionary-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DictionaryBlockComponent);
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: new PluginKey('dictionaryBlockDelete'),
        props: {
          handleKeyDown(view, event) {
            if (event.key === 'Delete' || event.key === 'Backspace') {
              const { state } = view;
              const { selection } = state;
              const { $from, $to } = selection;

              // Verifica se la selezione contiene un blocco dizionario
              let dictNode = null;
              let dictPos = null;

              state.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
                if (node.type.name === 'dictionaryBlock') {
                  dictNode = node;
                  dictPos = pos;
                  return false;
                }
              });

              // Se c'è un blocco dizionario selezionato
              if (dictNode && dictPos !== null) {
                event.preventDefault();

                // Mostra dialog di conferma
                showDeleteDictionaryDialog().then((confirmed) => {
                  if (confirmed) {
                    const { entryId, annotationId, definition } = dictNode.attrs;

                    // Callback per eliminare dal database
                    if (extension.options.onDeleteEntry) {
                      extension.options.onDeleteEntry(entryId, annotationId, definition);
                    }

                    // Elimina il nodo dall'editor
                    const tr = view.state.tr.delete(dictPos, dictPos + dictNode.nodeSize);
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
