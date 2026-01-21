import { useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import { PdfNoteBlock } from '../extensions/PdfNoteBlock';
import { getDatabase } from '../database/db';

const NotesEditor = forwardRef(function NotesEditor({ bookId, pdfDir, dbReady, onDeleteNote, onNavigateToPdf }, ref) {

  // Aspetta che pdfDir e bookId siano disponibili prima di creare l'editor
  // Questo è necessario perché TipTap non aggiorna le extension options dopo la creazione
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
      Underline,
      PdfNoteBlock.configure({
        onDeleteNote: onDeleteNote,
        onNavigateToPdf: onNavigateToPdf,
        pdfDir: pdfDir,
        bookId: bookId,
      }),
    ],
    content: '<p>Inizia a scrivere le tue note qui...</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
  }, [pdfDir, bookId]); // Ricrea l'editor quando pdfDir o bookId cambiano

  // Log per debug
  useEffect(() => {
    console.log('🔧 NotesEditor props:', { pdfDir, bookId, dbReady, hasEditor: !!editor });
  }, [pdfDir, bookId, dbReady, editor]);

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
  // Attende che pdfDir sia disponibile perché l'editor viene ricreato quando cambia pdfDir
  useEffect(() => {
    if (editor && dbReady && pdfDir) {
      console.log('📥 Editor AND DB ready, loading notes...', { bookId, pdfDir, dbReady });
      loadNotes();
    } else {
      console.log('⏳ Waiting for editor, DB and pdfDir...', { editor: !!editor, dbReady, pdfDir });
    }
  }, [editor, dbReady, pdfDir]);


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

  // Inserisce immagine da file locale (via dialog)
  const addImageFromFile = useCallback(async () => {
    if (!editor || !window.electronAPI) return;

    try {
      const result = await window.electronAPI.selectImageFile();
      if (result.success && result.dataUrl) {
        // Salva l'immagine su disco
        const saveResult = await window.electronAPI.saveImageToDisk(
          result.dataUrl,
          pdfDir,
          bookId
        );

        if (saveResult.success) {
          // Usa l'URL con custom protocol per caricamento sicuro
          editor.chain().focus().setImage({ src: saveResult.imageUrl }).run();
          console.log('🖼️ Image inserted from file:', saveResult.imageUrl);
        } else {
          console.error('❌ Failed to save image:', saveResult.error);
          alert('Errore nel salvare l\'immagine: ' + saveResult.error);
        }
      }
    } catch (error) {
      console.error('❌ Error selecting image:', error);
      alert('Errore nella selezione dell\'immagine');
    }
  }, [editor, pdfDir, bookId]);

  // Handler per incollare immagini dalla clipboard
  const handlePaste = useCallback(async (event) => {
    if (!editor || !window.electronAPI || !pdfDir || !bookId) return;

    // Verifica che l'evento provenga dall'editor principale, non dal MiniEditor
    // Il MiniEditor è dentro .mini-editor, l'editor principale no
    const target = event.target;
    if (target.closest('.mini-editor')) {
      // L'evento proviene da un MiniEditor, lascia che lo gestisca lui
      return;
    }

    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        event.preventDefault();

        const file = item.getAsFile();
        if (!file) continue;

        try {
          // Converti il file in base64
          const reader = new FileReader();
          reader.onload = async (e) => {
            const dataUrl = e.target?.result;
            if (typeof dataUrl !== 'string') return;

            // Salva l'immagine su disco
            const saveResult = await window.electronAPI.saveImageToDisk(
              dataUrl,
              pdfDir,
              bookId
            );

            if (saveResult.success) {
              editor.chain().focus().setImage({ src: saveResult.imageUrl }).run();
              console.log('🖼️ Image pasted from clipboard:', saveResult.imageUrl);
            } else {
              console.error('❌ Failed to save pasted image:', saveResult.error);
            }
          };
          reader.readAsDataURL(file);
        } catch (error) {
          console.error('❌ Error processing pasted image:', error);
        }

        break; // Processa solo la prima immagine
      }
    }
  }, [editor, pdfDir, bookId]);

  // Registra il paste handler sull'editor principale
  useEffect(() => {
    if (!editor) return;

    // Usa editor.view.dom per ottenere l'elemento DOM specifico di questo editor
    const editorElement = editor.view.dom;
    if (editorElement) {
      editorElement.addEventListener('paste', handlePaste);
      return () => {
        editorElement.removeEventListener('paste', handlePaste);
      };
    }
  }, [editor, handlePaste]);

  if (!editor) {
    return <div className="p-4">Caricamento editor...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-2 bg-gray-50">
        <div className="flex flex-wrap gap-1 items-center">
          {/* Undo/Redo */}
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed`}
            title="Annulla (Ctrl+Z)"
          >
            ↶
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed`}
            title="Ripeti (Ctrl+Y)"
          >
            ↷
          </button>

          <div className="w-px bg-gray-300 mx-1 h-6"></div>

          {/* Text Formatting */}
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 ${
              editor.isActive('bold') ? 'bg-gray-300' : 'bg-white'
            }`}
            title="Grassetto (Ctrl+B)"
          >
            <strong>B</strong>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 ${
              editor.isActive('italic') ? 'bg-gray-300' : 'bg-white'
            }`}
            title="Corsivo (Ctrl+I)"
          >
            <em>I</em>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 ${
              editor.isActive('underline') ? 'bg-gray-300' : 'bg-white'
            }`}
            title="Sottolineato (Ctrl+U)"
          >
            <u>U</u>
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
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 font-mono ${
              editor.isActive('code') ? 'bg-gray-300' : 'bg-white'
            }`}
            title="Codice inline"
          >
            {'</>'}
          </button>

          <div className="w-px bg-gray-300 mx-1 h-6"></div>

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

          <div className="w-px bg-gray-300 mx-1 h-6"></div>

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

          <div className="w-px bg-gray-300 mx-1 h-6"></div>

          {/* Blocks */}
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
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 font-mono ${
              editor.isActive('codeBlock') ? 'bg-gray-300' : 'bg-white'
            }`}
            title="Blocco codice"
          >
            {'{ }'}
          </button>
          <button
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="px-2 py-1 text-sm rounded hover:bg-gray-200 bg-white"
            title="Linea orizzontale"
          >
            ―
          </button>

          <div className="w-px bg-gray-300 mx-1 h-6"></div>

          {/* Highlight & Links */}
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
            onClick={addLink}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 ${
              editor.isActive('link') ? 'bg-gray-300' : 'bg-white'
            }`}
            title="Inserisci link"
          >
            Link
          </button>

          <div className="w-px bg-gray-300 mx-1 h-6"></div>

          {/* Images */}
          <button
            onClick={addImage}
            className="px-2 py-1 text-sm rounded hover:bg-gray-200 bg-white"
            title="Inserisci immagine da URL"
          >
            🖼 URL
          </button>
          <button
            onClick={addImageFromFile}
            className="px-2 py-1 text-sm rounded hover:bg-gray-200 bg-white"
            title="Inserisci immagine da file"
          >
            🖼 File
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
