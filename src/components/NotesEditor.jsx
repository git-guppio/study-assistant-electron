import { useEffect, forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import { PdfNoteBlock } from '../extensions/PdfNoteBlock';
import { getDatabase } from '../database/db';

const NotesEditor = forwardRef(function NotesEditor({ bookId, dbReady, onDeleteNote, onNavigateToPdf }, ref) {

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: false,
      }),
      Highlight.configure({
        multicolor: true,
      }),
      PdfNoteBlock.configure({
        onDeleteNote: onDeleteNote,
        onNavigateToPdf: onNavigateToPdf,
      }),
    ],
    content: '<p>Inizia a scrivere le tue note qui...</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
  });

  // Esponi metodi via ref
  useImperativeHandle(ref, () => ({
    // Inserisce un nuovo blocco nota nella posizione corretta (ordinato per pagina e posizione Y)
    insertPdfNoteBlock: (noteData) => {
      if (!editor) return;

      const newBlock = {
        type: 'pdfNoteBlock',
        attrs: {
          noteId: noteData.id,
          annotationId: noteData.annotationId,
          pageNumber: noteData.pageNumber,
          positionY: noteData.positionY || 0,
          selectionText: noteData.selectionText,
          color: noteData.color,
          gutterIconId: noteData.gutterIconId,
          comment: noteData.comment || '',
        },
      };

      // Trova la posizione corretta per inserire il nuovo blocco
      const { doc } = editor.state;
      let insertPosition = doc.content.size; // Default: fine documento
      let found = false;

      const newPage = noteData.pageNumber || 0;
      const newY = noteData.positionY || 0;

      // Scansiona tutti i nodi per trovare dove inserire
      doc.descendants((node, pos) => {
        // Se già trovata la posizione, non continuare
        if (found) return false;

        if (node.type.name === 'pdfNoteBlock') {
          const existingPage = node.attrs.pageNumber || 0;
          const existingY = node.attrs.positionY || 0;

          console.log('🔍 Comparing:', { newPage, newY, existingPage, existingY, pos });

          // Se il nuovo blocco viene prima di questo (pagina minore, o stessa pagina con Y minore)
          if (newPage < existingPage || (newPage === existingPage && newY < existingY)) {
            insertPosition = pos;
            found = true;
            return false; // Stop descending
          }
        }
        return true; // Continua a cercare
      });

      console.log('📝 Insert position calculated:', insertPosition, 'found:', found);

      // Inserisci nella posizione calcolata
      editor
        .chain()
        .insertContentAt(insertPosition, newBlock)
        .run();

      console.log('📝 Note block inserted at position', insertPosition, ':', noteData.id);
    },

    // Rimuove un blocco nota
    removePdfNoteBlock: (noteId) => {
      if (!editor) return;

      const { state, view } = editor;
      const { doc, tr } = state;
      let found = false;

      doc.descendants((node, pos) => {
        if (node.type.name === 'pdfNoteBlock' && node.attrs.noteId === noteId) {
          // Usa deleteRange invece di setTextSelection per nodi atom
          const transaction = tr.delete(pos, pos + node.nodeSize);
          view.dispatch(transaction);
          found = true;
          console.log('🗑️ Note block removed:', noteId);
          return false; // Stop iteration
        }
      });

      if (!found) {
        console.warn('⚠️ Note block not found in editor:', noteId);
      }
    },

    // Scrolla a un blocco nota e lo evidenzia
    scrollToBlock: (noteId) => {
      console.log('🔍 Scroll to note:', noteId);

      // Trova l'elemento nel DOM usando data-note-id
      const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);

      if (noteElement) {
        // Scrolla all'elemento
        noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Aggiungi classe per flash animation
        noteElement.classList.add('note-flash');

        // Rimuovi classe dopo l'animazione
        setTimeout(() => {
          noteElement.classList.remove('note-flash');
        }, 2000);
      } else {
        console.warn('⚠️ Note element not found in DOM:', noteId);
      }
    }
  }), [editor]);

  // Carica note esistenti e le inserisce come blocchi
  useEffect(() => {
    if (editor && dbReady) {
      console.log('📥 Editor AND DB ready, loading notes...', { bookId, dbReady });
      loadNotes();
    } else {
      console.log('⏳ Waiting for editor and DB...', { editor: !!editor, dbReady });
    }
  }, [editor, dbReady]);


  const loadNotes = async () => {
    const db = getDatabase();
    if (!db || !editor) {
      console.log('⚠️ LoadNotes skipped - db or editor not ready', { db: !!db, editor: !!editor });
      return;
    }

    try {
      console.log('📥 Loading notes from database...');
      const savedNotes = await db.getNotes();
      console.log('📥 Retrieved notes:', savedNotes.length, savedNotes);

      // Carica le note come blocchi TipTap
      if (savedNotes.length > 0) {
        // Costruisci un array di tutti i blocchi da inserire
        const blocks = [];

        savedNotes.forEach((note) => {
          console.log('📝 Processing note:', note.id, {
            annotationId: note.annotationId,
            annotation: note.annotation,
            hasAnnotation: !!note.annotation
          });

          if (note.annotationId) {
            const annotation = note.annotation;
            // Estrai positionY dalle coordinate salvate
            const positionY = note.pdfCoordinates?.y || 0;

            blocks.push({
              type: 'pdfNoteBlock',
              attrs: {
                noteId: note.id,
                annotationId: note.annotationId,
                pageNumber: note.pageNumber || 1,
                positionY: positionY,
                selectionText: note.selectionText || '',
                color: annotation?.color || '#22c55e',
                gutterIconId: annotation?.gutterIconId || 'note',
                comment: note.comment || '',
              },
            });
          }
        });

        // Ordina i blocchi per pagina e poi per posizione Y
        blocks.sort((a, b) => {
          const pageA = a.attrs.pageNumber;
          const pageB = b.attrs.pageNumber;
          if (pageA !== pageB) return pageA - pageB;
          return a.attrs.positionY - b.attrs.positionY;
        });

        console.log('✏️ Setting editor content with', blocks.length, 'blocks');

        // Inserisci tutti i blocchi in una volta sola
        editor.commands.setContent(blocks);

        console.log('📚 Loaded', blocks.length, 'notes as blocks');
      } else {
        console.log('📚 No notes found in database');
      }
    } catch (error) {
      console.error('❌ Error loading notes:', error);
    }
  };

  const addImage = () => {
    const url = prompt('Inserisci URL immagine:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const addLink = () => {
    const url = prompt('Inserisci URL:');
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  if (!editor) {
    return <div className="p-4">Caricamento editor...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-2 bg-gray-50">
        <div className="flex flex-wrap gap-1">
          {/* Text Formatting */}
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 ${
              editor.isActive('bold') ? 'bg-gray-300' : 'bg-white'
            }`}
            title="Grassetto"
          >
            <strong>B</strong>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 ${
              editor.isActive('italic') ? 'bg-gray-300' : 'bg-white'
            }`}
            title="Corsivo"
          >
            <em>I</em>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 ${
              editor.isActive('strike') ? 'bg-gray-300' : 'bg-white'
            }`}
            title="Barrato"
          >
            <s>S</s>
          </button>

          <div className="w-px bg-gray-300 mx-1"></div>

          {/* Headings */}
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 ${
              editor.isActive('heading', { level: 1 }) ? 'bg-gray-300' : 'bg-white'
            }`}
            title="Titolo 1"
          >
            H1
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 ${
              editor.isActive('heading', { level: 2 }) ? 'bg-gray-300' : 'bg-white'
            }`}
            title="Titolo 2"
          >
            H2
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 ${
              editor.isActive('heading', { level: 3 }) ? 'bg-gray-300' : 'bg-white'
            }`}
            title="Titolo 3"
          >
            H3
          </button>

          <div className="w-px bg-gray-300 mx-1"></div>

          {/* Lists */}
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 ${
              editor.isActive('bulletList') ? 'bg-gray-300' : 'bg-white'
            }`}
            title="Elenco puntato"
          >
            • List
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 ${
              editor.isActive('orderedList') ? 'bg-gray-300' : 'bg-white'
            }`}
            title="Elenco numerato"
          >
            1. List
          </button>

          <div className="w-px bg-gray-300 mx-1"></div>

          {/* Other */}
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 ${
              editor.isActive('blockquote') ? 'bg-gray-300' : 'bg-white'
            }`}
            title="Citazione"
          >
            " Quote
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 ${
              editor.isActive('highlight') ? 'bg-gray-300' : 'bg-white'
            }`}
            title="Evidenzia"
          >
            Highlight
          </button>
          <button
            onClick={addImage}
            className="px-2 py-1 text-sm rounded hover:bg-gray-200 bg-white"
            title="Inserisci immagine"
          >
            Immagine
          </button>
          <button
            onClick={addLink}
            className="px-2 py-1 text-sm rounded hover:bg-gray-200 bg-white"
            title="Inserisci link"
          >
            Link
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
});

export default NotesEditor;
