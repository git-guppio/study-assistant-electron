import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import PdfNoteBlockComponent from '../components/PdfNoteBlockComponent';

/**
 * TipTap Extension per blocchi nota collegati ad annotazioni PDF
 *
 * Attributi:
 * - noteId: ID della nota nel database
 * - annotationId: ID dell'annotazione PDF collegata
 * - pageNumber: Numero pagina PDF
 * - positionY: Posizione Y nel PDF (per ordinamento)
 * - selectionText: Testo selezionato dal PDF
 * - color: Colore dell'annotazione
 * - gutterIconId: ID dell'icona (es: 'note', 'important', 'idea', etc.)
 * - comment: Commento utente (editabile)
 */
export const PdfNoteBlock = Node.create({
  name: 'pdfNoteBlock',

  group: 'block',

  content: '',

  atom: true,

  addAttributes() {
    return {
      noteId: {
        default: null,
        parseHTML: element => element.getAttribute('data-note-id'),
        renderHTML: attributes => {
          if (!attributes.noteId) {
            return {};
          }
          return {
            'data-note-id': attributes.noteId,
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
      selectionText: {
        default: '',
        parseHTML: element => element.getAttribute('data-selection-text'),
        renderHTML: attributes => {
          return {
            'data-selection-text': attributes.selectionText,
          };
        },
      },
      color: {
        default: '#22c55e',
        parseHTML: element => element.getAttribute('data-color'),
        renderHTML: attributes => {
          return {
            'data-color': attributes.color,
          };
        },
      },
      gutterIconId: {
        default: 'note',
        parseHTML: element => element.getAttribute('data-gutter-icon-id'),
        renderHTML: attributes => {
          return {
            'data-gutter-icon-id': attributes.gutterIconId,
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
        tag: 'div[data-type="pdf-note-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'pdf-note-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PdfNoteBlockComponent);
  },
});
