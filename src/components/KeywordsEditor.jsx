import { useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import { KeywordBlock } from '../extensions/KeywordBlock';
import { ImageWithDelete } from '../extensions/ImageWithDelete';
import { getDatabase } from '../database/db';
import { useEditorContext } from '../contexts/EditorContext';

const KeywordsEditor = forwardRef(function KeywordsEditor({ bookId, pdfDir, dbReady, onDeleteKeyword, onNavigateToPdf }, ref) {

  // Context per gestire l'editor attivo (principale o MiniEditor)
  const { registerMainEditor, activeEditor, activeMiniEditorId } = useEditorContext();

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
      KeywordBlock.configure({
        onDeleteKeyword: onDeleteKeyword,
        onNavigateToPdf: onNavigateToPdf,
        pdfDir: pdfDir,
        bookId: bookId,
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] p-4',
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
    insertKeywordBlock: (keywordData) => {
      if (!editor) return;

      const newBlock = {
        type: 'keywordBlock',
        attrs: {
          keywordId: keywordData.id,
          annotationId: keywordData.annotationId,
          pageNumber: keywordData.pageNumber,
          positionY: keywordData.positionY || 0,
          term: keywordData.term,
          color: keywordData.color,
          comment: keywordData.comment || '',
        },
      };

      const { doc } = editor.state;
      let insertPosition = doc.content.size;
      let found = false;

      const newPage = keywordData.pageNumber || 0;
      const newY = keywordData.positionY || 0;

      doc.descendants((node, pos) => {
        if (found) return false;

        if (node.type.name === 'keywordBlock') {
          const existingPage = node.attrs.pageNumber || 0;
          const existingY = node.attrs.positionY || 0;

          if (newPage < existingPage || (newPage === existingPage && newY < existingY)) {
            insertPosition = pos;
            found = true;
            return false;
          }
        }
        return true;
      });

      editor
        .chain()
        .insertContentAt(insertPosition, newBlock)
        .run();

      console.log('🔑 Keyword block inserted at position', insertPosition, ':', keywordData.id);
    },

    removeKeywordBlock: (keywordId) => {
      if (!editor) return;

      const { state, view } = editor;
      const { doc, tr } = state;
      let found = false;

      doc.descendants((node, pos) => {
        if (node.type.name === 'keywordBlock' && node.attrs.keywordId === keywordId) {
          const transaction = tr.delete(pos, pos + node.nodeSize);
          view.dispatch(transaction);
          found = true;
          console.log('🗑️ Keyword block removed:', keywordId);
          return false;
        }
      });

      if (!found) {
        console.warn('⚠️ Keyword block not found in editor:', keywordId);
      }
    },

    scrollToBlock: (keywordId) => {
      const keywordElement = document.querySelector(`[data-keyword-id="${keywordId}"]`);

      if (keywordElement) {
        keywordElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        keywordElement.classList.add('keyword-flash');
        setTimeout(() => {
          keywordElement.classList.remove('keyword-flash');
        }, 2000);
      }
    },

    // Scrolla al blocco usando annotationId (per navigazione dal gutter)
    scrollToBlockByAnnotationId: (annotationId) => {
      const element = document.querySelector(`.keyword-block[data-annotation-id="${annotationId}"]`);

      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('keyword-flash');
        setTimeout(() => {
          element.classList.remove('keyword-flash');
        }, 2000);
      }
    }
  }), [editor]);

  // Carica keywords esistenti
  useEffect(() => {
    if (editor && dbReady && pdfDir) {
      loadKeywords();
    }
  }, [editor, dbReady, pdfDir]);

  const loadKeywords = async () => {
    const db = getDatabase();
    if (!db || !editor) return;

    try {
      const keywords = await db.getKeywords();
      const annotations = await db.getAnnotations();

      if (keywords.length > 0) {
        const blocks = [];

        keywords.forEach((kw) => {
          // Il database usa 'keyword' come nome campo, ma nel frontend usiamo 'term'
          const term = kw.keyword || kw.term || '';

          // Trova l'annotazione collegata
          const annotation = annotations.find(a =>
            a.type === 'keyword' && a.text === term && a.pageNumber === kw.pageNumber
          );

          blocks.push({
            type: 'keywordBlock',
            attrs: {
              keywordId: kw.id,
              annotationId: annotation?.id || null,
              pageNumber: kw.pageNumber || 1,
              positionY: 0,
              term: term,
              color: annotation?.color || '#f59e0b',
              comment: kw.comment || '',
            },
          });
        });

        blocks.sort((a, b) => {
          const pageA = a.attrs.pageNumber;
          const pageB = b.attrs.pageNumber;
          if (pageA !== pageB) return pageA - pageB;
          return a.attrs.term.localeCompare(b.attrs.term);
        });

        editor.commands.setContent(blocks);
        console.log('🔑 Loaded', blocks.length, 'keywords as blocks');
      }
    } catch (error) {
      console.error('❌ Error loading keywords:', error);
    }
  };

  // ============ TOOLBAR HANDLERS ============

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

  // Handler per incollare immagini dalla clipboard
  const handlePaste = useCallback(async (event) => {
    if (!editor || !window.electronAPI || !pdfDir || !bookId) return;

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

  // Registra il paste handler
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

  if (!editor) {
    return <div className="p-4">Caricamento editor parole chiave...</div>;
  }

  const isMiniEditorActive = activeMiniEditorId !== null;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="notes-editor-toolbar border-b border-gray-200 p-2 bg-gray-50 sticky top-0 z-10">
        {isMiniEditorActive && (
          <div className="text-xs text-amber-600 mb-1 font-medium">
            ✏️ Modificando nota parola chiave
          </div>
        )}

        <div className="flex flex-wrap gap-1 items-center">
          {/* Undo/Redo */}
          <button
            onClick={() => activeEditor?.chain().focus().undo().run()}
            disabled={!activeEditor?.can().undo()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed`}
            title="Annulla (Ctrl+Z)"
          >
            ↶
          </button>
          <button
            onClick={() => activeEditor?.chain().focus().redo().run()}
            disabled={!activeEditor?.can().redo()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed`}
            title="Ripeti (Ctrl+Y)"
          >
            ↷
          </button>

          <div className="w-px bg-gray-300 mx-1 h-6"></div>

          {/* Text Formatting */}
          <button
            onClick={() => activeEditor?.chain().focus().toggleBold().run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 ${
              activeEditor?.isActive('bold') ? 'bg-gray-300' : 'bg-white'
            }`}
            title="Grassetto (Ctrl+B)"
          >
            <strong>B</strong>
          </button>
          <button
            onClick={() => activeEditor?.chain().focus().toggleItalic().run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 ${
              activeEditor?.isActive('italic') ? 'bg-gray-300' : 'bg-white'
            }`}
            title="Corsivo (Ctrl+I)"
          >
            <em>I</em>
          </button>
          <button
            onClick={() => activeEditor?.chain().focus().toggleUnderline().run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 ${
              activeEditor?.isActive('underline') ? 'bg-gray-300' : 'bg-white'
            }`}
            title="Sottolineato (Ctrl+U)"
          >
            <u>U</u>
          </button>
          <button
            onClick={() => activeEditor?.chain().focus().toggleStrike().run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 ${
              activeEditor?.isActive('strike') ? 'bg-gray-300' : 'bg-white'
            }`}
            title="Barrato"
          >
            <s>S</s>
          </button>

          <div className="w-px bg-gray-300 mx-1 h-6"></div>

          {/* Lists */}
          <button
            onClick={() => activeEditor?.chain().focus().toggleBulletList().run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 ${
              activeEditor?.isActive('bulletList') ? 'bg-gray-300' : 'bg-white'
            }`}
            title="Elenco puntato"
          >
            • List
          </button>
          <button
            onClick={() => activeEditor?.chain().focus().toggleOrderedList().run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 ${
              activeEditor?.isActive('orderedList') ? 'bg-gray-300' : 'bg-white'
            }`}
            title="Elenco numerato"
          >
            1. List
          </button>

          <div className="w-px bg-gray-300 mx-1 h-6"></div>

          {/* Highlight & Links */}
          <button
            onClick={() => activeEditor?.chain().focus().toggleHighlight().run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 ${
              activeEditor?.isActive('highlight') ? 'bg-gray-300' : 'bg-white'
            }`}
            title="Evidenzia"
          >
            Highlight
          </button>
          <button
            onClick={handleAddLink}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 ${
              activeEditor?.isActive('link') ? 'bg-gray-300' : 'bg-white'
            }`}
            title="Inserisci link"
          >
            Link
          </button>

          <div className="w-px bg-gray-300 mx-1 h-6"></div>

          {/* Images */}
          <button
            onClick={handleAddImage}
            className="px-2 py-1 text-sm rounded hover:bg-gray-200 bg-white"
            title="Inserisci immagine da URL"
          >
            🖼 URL
          </button>
          <button
            onClick={handleAddImageFromFile}
            className="px-2 py-1 text-sm rounded hover:bg-gray-200 bg-white"
            title="Inserisci immagine da file"
          >
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

export default KeywordsEditor;
