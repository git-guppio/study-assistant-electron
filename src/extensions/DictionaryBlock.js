import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import DictionaryBlockComponent from '../components/DictionaryBlockComponent';

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
});
