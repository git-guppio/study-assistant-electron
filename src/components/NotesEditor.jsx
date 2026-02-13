import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import { PdfNoteBlock } from '../extensions/PdfNoteBlock';
import { ImageWithDelete } from '../extensions/ImageWithDelete';
import { getDatabase } from '../database/db';
import { useEditorContext } from '../contexts/EditorContext';

const NotesEditor = forwardRef(function NotesEditor({ bookId, pdfDir, dbReady, onDeleteNote, onNavigateToPdf }, ref) {

  // Context per gestire l'editor attivo (principale o MiniEditor)
  const { registerMainEditor, activeEditor, activeMiniEditorId } = useEditorContext();

  // Stato dropdown stile testo
  const [showHeadingDropdown, setShowHeadingDropdown] = useState(false);
  const headingDropdownRef = useRef(null);

  // Handler per eliminare immagine da disco
  const handleDeleteImage = useCallback(async (imageUrl) => {
    if (window.electronAPI) {
      await window.electronAPI.deleteImageFromDisk(imageUrl);
      console.log('🗑️ Image deleted from editor:', imageUrl);
    }
  }, []);

  // Editor principale
  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageWithDelete.configure({
        onDeleteImage: handleDeleteImage,
      }),
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
      // Impedisci inserimento testo nei gap tra i blocchi nota
      handleTextInput: () => true,
      handleKeyDown: (view, event) => {
        // Permetti Delete/Backspace (gestiti dal plugin PdfNoteBlock per eliminazione note)
        if (event.key === 'Delete' || event.key === 'Backspace') return false;
        // Permetti navigazione
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
             'Home', 'End', 'PageUp', 'PageDown', 'Escape', 'Tab'].includes(event.key)) return false;
        // Permetti Ctrl/Cmd + A, Z, Y, C (select all, undo, redo, copy)
        if ((event.ctrlKey || event.metaKey) && ['a', 'z', 'y', 'c'].includes(event.key.toLowerCase())) return false;
        // Blocca Enter e tutti i tasti che generano contenuto
        if (event.key === 'Enter' || event.key.length === 1) return true;
        return false;
      },
    },
  }, [pdfDir, bookId]);

  // Registra l'editor principale nel context quando viene creato
  useEffect(() => {
    if (editor) {
      registerMainEditor(editor);
    }
  }, [editor, registerMainEditor]);

  // Esponi metodi via ref
  useImperativeHandle(ref, () => ({
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

      const { doc } = editor.state;
      let insertPosition = null;
      let lastBlockEndPos = null;
      let foundInsertBefore = false;

      const newPage = noteData.pageNumber || 0;
      const newY = noteData.positionY || 0;

      doc.descendants((node, pos) => {
        if (foundInsertBefore) return false;

        if (node.type.name === 'pdfNoteBlock') {
          const existingPage = node.attrs.pageNumber || 0;
          const existingY = node.attrs.positionY || 0;

          if (newPage < existingPage || (newPage === existingPage && newY < existingY)) {
            insertPosition = pos;
            foundInsertBefore = true;
            return false;
          }
          // Track position immediately after this block
          lastBlockEndPos = pos + node.nodeSize;
        }
        return true;
      });

      if (!foundInsertBefore) {
        if (lastBlockEndPos !== null) {
          // Insert after the last pdfNoteBlock
          insertPosition = lastBlockEndPos;
        } else {
          // No pdfNoteBlocks exist yet - replace all content
          editor.commands.setContent([newBlock]);
          console.log('📝 Note block inserted (first block):', noteData.id);
          setTimeout(() => {
            const noteElement = document.querySelector(`[data-note-id="${noteData.id}"]`);
            if (noteElement) {
              noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              noteElement.classList.add('note-flash');
              setTimeout(() => noteElement.classList.remove('note-flash'), 2000);
              const miniEditorContent = noteElement.querySelector('.mini-editor-content');
              if (miniEditorContent) miniEditorContent.focus();
            }
          }, 100);
          return;
        }
      }

      editor
        .chain()
        .insertContentAt(insertPosition, newBlock)
        .run();

      console.log('📝 Note block inserted at position', insertPosition, ':', noteData.id);

      // Dopo l'inserimento, fai scroll, evidenzia e dai focus
      setTimeout(() => {
        const noteElement = document.querySelector(`[data-note-id="${noteData.id}"]`);
        if (noteElement) {
          // Scroll alla nota
          noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // Evidenzia con animazione flash
          noteElement.classList.add('note-flash');
          setTimeout(() => {
            noteElement.classList.remove('note-flash');
          }, 2000);

          // Focus sul MiniEditor della nota
          const miniEditorContent = noteElement.querySelector('.mini-editor-content');
          if (miniEditorContent) {
            setTimeout(() => {
              miniEditorContent.focus();
            }, 300); // Piccolo delay per permettere allo scroll di completarsi
          }
        }
      }, 100); // Attendi che il DOM sia aggiornato
    },

    removePdfNoteBlock: (noteId) => {
      if (!editor) return;

      const { state, view } = editor;
      const { doc, tr } = state;
      let found = false;

      doc.descendants((node, pos) => {
        if (node.type.name === 'pdfNoteBlock' && node.attrs.noteId === noteId) {
          const transaction = tr.delete(pos, pos + node.nodeSize);
          view.dispatch(transaction);
          found = true;
          console.log('🗑️ Note block removed:', noteId);
          return false;
        }
      });

      if (!found) {
        console.warn('⚠️ Note block not found in editor:', noteId);
      }
    },

    scrollToBlock: (noteId) => {
      const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);

      if (noteElement) {
        noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        noteElement.classList.add('note-flash');
        setTimeout(() => {
          noteElement.classList.remove('note-flash');
        }, 2000);

        // Attiva la nota: focus sul MiniEditor per renderla la nota attiva
        setTimeout(() => {
          const miniEditorContent = noteElement.querySelector('.mini-editor-content');
          if (miniEditorContent) miniEditorContent.focus();
        }, 300);
      }
    }
  }), [editor]);

  // Carica note esistenti
  useEffect(() => {
    if (editor && dbReady && pdfDir) {
      loadNotes();
    }
  }, [editor, dbReady, pdfDir]);

  const loadNotes = async () => {
    const db = getDatabase();
    if (!db || !editor) return;

    try {
      const savedNotes = await db.getNotes();

      if (savedNotes.length > 0) {
        const blocks = [];

        savedNotes.forEach((note) => {
          if (note.annotationId) {
            const annotation = note.annotation;
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

        blocks.sort((a, b) => {
          const pageA = a.attrs.pageNumber;
          const pageB = b.attrs.pageNumber;
          if (pageA !== pageB) return pageA - pageB;
          return a.attrs.positionY - b.attrs.positionY;
        });

        editor.commands.setContent(blocks);
        console.log('📚 Loaded', blocks.length, 'notes as blocks');
      }
    } catch (error) {
      console.error('❌ Error loading notes:', error);
    }
  };

  // ============ TOOLBAR HANDLERS ============
  // Questi usano activeEditor dal context (può essere editor principale o MiniEditor)

  const handleAddImage = () => {
    const url = prompt('Inserisci URL immagine:');
    if (url && activeEditor) {
      activeEditor.chain().focus().setImage({ src: url }).run();
    }
  };

  const handleAddLink = () => {
    const url = prompt('Inserisci URL:');
    if (url && activeEditor) {
      activeEditor.chain().focus().setLink({ href: url }).run();
    }
  };

  const handleAddImageFromFile = useCallback(async () => {
    if (!activeEditor || !window.electronAPI) return;

    try {
      const result = await window.electronAPI.selectImageFile();
      if (result.success && result.dataUrl) {
        const saveResult = await window.electronAPI.saveImageToDisk(
          result.dataUrl,
          pdfDir,
          bookId
        );

        if (saveResult.success) {
          activeEditor.chain().focus().setImage({ src: saveResult.imageUrl }).run();
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
  }, [activeEditor, pdfDir, bookId]);

  // Handler per incollare immagini dalla clipboard (solo editor principale)
  const handlePaste = useCallback(async (event) => {
    if (!editor || !window.electronAPI || !pdfDir || !bookId) return;

    // Se un MiniEditor è attivo, lascia che gestisca lui
    if (event.target.closest('.mini-editor')) {
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
          const reader = new FileReader();
          reader.onload = async (e) => {
            const dataUrl = e.target?.result;
            if (typeof dataUrl !== 'string') return;

            const saveResult = await window.electronAPI.saveImageToDisk(
              dataUrl,
              pdfDir,
              bookId
            );

            if (saveResult.success) {
              editor.chain().focus().setImage({ src: saveResult.imageUrl }).run();
              console.log('🖼️ Image pasted from clipboard:', saveResult.imageUrl);
            }
          };
          reader.readAsDataURL(file);
        } catch (error) {
          console.error('❌ Error processing pasted image:', error);
        }

        break;
      }
    }
  }, [editor, pdfDir, bookId]);

  // Registra il paste handler sull'editor principale
  useEffect(() => {
    if (!editor) return;

    const editorElement = editor.view.dom;
    if (editorElement) {
      editorElement.addEventListener('paste', handlePaste);
      return () => {
        editorElement.removeEventListener('paste', handlePaste);
      };
    }
  }, [editor, handlePaste]);

  // Chiudi dropdown stile testo cliccando fuori
  useEffect(() => {
    if (!showHeadingDropdown) return;
    const handleClickOutside = (e) => {
      if (headingDropdownRef.current && !headingDropdownRef.current.contains(e.target)) {
        setShowHeadingDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHeadingDropdown]);

  if (!editor) {
    return <div className="p-4">Caricamento editor...</div>;
  }

  // Indica se un MiniEditor è attivo (per feedback visivo nella toolbar)
  const isMiniEditorActive = activeMiniEditorId !== null;

  // Calcola il testo da mostrare nel dropdown stile testo
  const getHeadingLabel = () => {
    if (activeEditor?.isActive('heading', { level: 1 })) return 'Titolo 1';
    if (activeEditor?.isActive('heading', { level: 2 })) return 'Titolo 2';
    if (activeEditor?.isActive('heading', { level: 3 })) return 'Titolo 3';
    return 'Paragrafo';
  };

  // Classe condivisa per tutti i pulsanti della toolbar
  const btnBase = 'px-2 py-1 text-sm rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed';
  const btnActive = (condition) => `${btnBase} ${condition ? 'bg-gray-300 font-semibold' : 'bg-white'}`;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar - comanda l'editor attivo (principale o MiniEditor) */}
      <div className="notes-editor-toolbar border-b border-gray-200 px-2 pt-2 pb-1 bg-gray-50 sticky top-0 z-10">

        {/* Indicatore editor attivo */}
        {isMiniEditorActive && (
          <div className="text-xs text-blue-600 mb-1 font-medium">
            ✏️ Modificando commento nota
          </div>
        )}

        {/* Intestazione toolbar: Riga azioni note + Righe formattazione */}
        <div className="flex items-center justify-between mb-1">
          {/* Undo / Redo */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => activeEditor?.chain().focus().undo().run()}
              disabled={!activeEditor?.can().undo()}
              className={`${btnBase} bg-white`}
              title="Annulla (Ctrl+Z)"
            >↶</button>
            <button
              onClick={() => activeEditor?.chain().focus().redo().run()}
              disabled={!activeEditor?.can().redo()}
              className={`${btnBase} bg-white`}
              title="Ripeti (Ctrl+Y)"
            >↷</button>
          </div>

          {/* Espandi / Comprimi note (spostati dall'area formattazione) */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('expandAllNotes'))}
              className={`${btnBase} bg-white text-xs text-gray-500`}
              title="Espandi tutte le note"
            >⊞ Espandi</button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('collapseAllNotes'))}
              className={`${btnBase} bg-white text-xs text-gray-500`}
              title="Comprimi tutte le note"
            >⊟ Comprimi</button>
          </div>
        </div>

        {/* Riga 1: Stile testo | Formattazione carattere | Liste */}
        <div className="flex items-center gap-1 flex-wrap">

          {/* Dropdown stile testo */}
          <div className="relative" ref={headingDropdownRef}>
            <button
              onClick={() => setShowHeadingDropdown(v => !v)}
              className={`${btnBase} bg-white min-w-[100px] text-left flex items-center justify-between gap-1`}
              title="Stile testo"
            >
              <span>{getHeadingLabel()}</span>
              <span className="text-gray-400 text-xs">▾</span>
            </button>
            {showHeadingDropdown && (
              <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-20 min-w-[140px]">
                <button
                  onClick={() => { activeEditor?.chain().focus().setParagraph().run(); setShowHeadingDropdown(false); }}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 ${!activeEditor?.isActive('heading') ? 'font-semibold bg-gray-50' : ''}`}
                >Paragrafo</button>
                <button
                  onClick={() => { activeEditor?.chain().focus().toggleHeading({ level: 1 }).run(); setShowHeadingDropdown(false); }}
                  className={`w-full text-left px-3 py-1.5 text-lg font-bold hover:bg-gray-100 ${activeEditor?.isActive('heading', { level: 1 }) ? 'bg-gray-50' : ''}`}
                >Titolo 1</button>
                <button
                  onClick={() => { activeEditor?.chain().focus().toggleHeading({ level: 2 }).run(); setShowHeadingDropdown(false); }}
                  className={`w-full text-left px-3 py-1.5 text-base font-bold hover:bg-gray-100 ${activeEditor?.isActive('heading', { level: 2 }) ? 'bg-gray-50' : ''}`}
                >Titolo 2</button>
                <button
                  onClick={() => { activeEditor?.chain().focus().toggleHeading({ level: 3 }).run(); setShowHeadingDropdown(false); }}
                  className={`w-full text-left px-3 py-1.5 text-sm font-semibold hover:bg-gray-100 ${activeEditor?.isActive('heading', { level: 3 }) ? 'bg-gray-50' : ''}`}
                >Titolo 3</button>
              </div>
            )}
          </div>

          <div className="w-px bg-gray-300 mx-0.5 h-6 self-center"></div>

          {/* Formattazione carattere - molto usata */}
          <button onClick={() => activeEditor?.chain().focus().toggleBold().run()}
            className={btnActive(activeEditor?.isActive('bold'))} title="Grassetto (Ctrl+B)">
            <strong>B</strong>
          </button>
          <button onClick={() => activeEditor?.chain().focus().toggleItalic().run()}
            className={btnActive(activeEditor?.isActive('italic'))} title="Corsivo (Ctrl+I)">
            <em>I</em>
          </button>
          <button onClick={() => activeEditor?.chain().focus().toggleUnderline().run()}
            className={btnActive(activeEditor?.isActive('underline'))} title="Sottolineato (Ctrl+U)">
            <u>U</u>
          </button>
          <button onClick={() => activeEditor?.chain().focus().toggleHighlight().run()}
            className={btnActive(activeEditor?.isActive('highlight'))} title="Evidenzia">
            Evidenzia
          </button>

          <div className="w-px bg-gray-300 mx-0.5 h-6 self-center"></div>

          {/* Liste - molto usate */}
          <button onClick={() => activeEditor?.chain().focus().toggleBulletList().run()}
            className={btnActive(activeEditor?.isActive('bulletList'))} title="Elenco puntato">
            • Lista
          </button>
          <button onClick={() => activeEditor?.chain().focus().toggleOrderedList().run()}
            className={btnActive(activeEditor?.isActive('orderedList'))} title="Elenco numerato">
            1. Lista
          </button>
        </div>

        {/* Riga 2: Azioni occasionali/rare */}
        <div className="flex items-center gap-1 flex-wrap mt-1">

          {/* Formattazione carattere occasionale */}
          <button onClick={() => activeEditor?.chain().focus().toggleStrike().run()}
            className={btnActive(activeEditor?.isActive('strike'))} title="Barrato">
            <s>S</s>
          </button>
          <button onClick={() => activeEditor?.chain().focus().toggleCode().run()}
            className={`${btnActive(activeEditor?.isActive('code'))} font-mono`} title="Codice inline">
            {'</>'}
          </button>

          <div className="w-px bg-gray-300 mx-0.5 h-6 self-center"></div>

          {/* Blocchi occasionali */}
          <button onClick={() => activeEditor?.chain().focus().toggleBlockquote().run()}
            className={btnActive(activeEditor?.isActive('blockquote'))} title="Citazione">
            " "
          </button>
          <button onClick={() => activeEditor?.chain().focus().toggleCodeBlock().run()}
            className={`${btnActive(activeEditor?.isActive('codeBlock'))} font-mono`} title="Blocco codice">
            {'{ }'}
          </button>
          <button onClick={() => activeEditor?.chain().focus().setHorizontalRule().run()}
            className={`${btnBase} bg-white`} title="Linea orizzontale">
            ―
          </button>

          <div className="w-px bg-gray-300 mx-0.5 h-6 self-center"></div>

          {/* Link e immagini */}
          <button onClick={handleAddLink}
            className={btnActive(activeEditor?.isActive('link'))} title="Inserisci link">
            Link
          </button>
          <button onClick={handleAddImage}
            className={`${btnBase} bg-white`} title="Inserisci immagine da URL">
            🖼 URL
          </button>
          <button onClick={handleAddImageFromFile}
            className={`${btnBase} bg-white`} title="Inserisci immagine da file">
            🖼 File
          </button>
        </div>
      </div>

      {/* Editor principale */}
      <div className="flex-1 overflow-auto bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
});

export default NotesEditor;
