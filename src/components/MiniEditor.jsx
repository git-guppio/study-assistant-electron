import React, { useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';

/**
 * MiniEditor - Editor TipTap compatto per commenti delle note PDF
 *
 * Supporta: Bold, Italic, Underline, Strike, Lists, Links, Images
 * Salvataggio automatico con debounce
 */
function MiniEditor({
  content,
  onChange,
  placeholder = 'Aggiungi un commento...',
  pdfDir,
  bookId,
  onSavingChange // callback per notificare stato salvataggio
}) {
  const saveTimeoutRef = useRef(null);
  const lastSavedContentRef = useRef(content);

  // Debug: log props ricevute
  useEffect(() => {
    console.log('🔧 MiniEditor mounted/updated:', { pdfDir, bookId, contentLength: content?.length });
  }, [pdfDir, bookId, content]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // No headings in mini editor
        codeBlock: false, // No code blocks
      }),
      Image,
      Link.configure({
        openOnClick: false,
      }),
      Highlight,
      Underline,
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'mini-editor-content',
        'data-placeholder': placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();

      // Non salvare se il contenuto non è cambiato
      if (html === lastSavedContentRef.current) return;

      // Notifica che stiamo salvando
      if (onSavingChange) onSavingChange(true);

      // Debounce save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        lastSavedContentRef.current = html;
        if (onChange) onChange(html);
        if (onSavingChange) onSavingChange(false);
      }, 1500);
    },
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Handle paste images
  const handlePaste = useCallback(async (event) => {
    console.log('🖼️ MiniEditor paste event', { editor: !!editor, electronAPI: !!window.electronAPI, pdfDir, bookId });
    if (!editor || !window.electronAPI || !pdfDir || !bookId) {
      console.log('❌ MiniEditor paste aborted - missing dependencies');
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
              console.log('🖼️ Image pasted in mini-editor:', saveResult.imageUrl);
            }
          };
          reader.readAsDataURL(file);
        } catch (error) {
          console.error('❌ Error pasting image in mini-editor:', error);
        }
        break;
      }
    }
  }, [editor, pdfDir, bookId]);

  // Register paste handler
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

  // Insert image from file
  const insertImageFromFile = useCallback(async () => {
    if (!editor || !window.electronAPI) return;

    try {
      const result = await window.electronAPI.selectImageFile();
      if (result.success && result.dataUrl) {
        const saveResult = await window.electronAPI.saveImageToDisk(
          result.dataUrl,
          pdfDir,
          bookId
        );

        if (saveResult.success) {
          editor.chain().focus().setImage({ src: saveResult.imageUrl }).run();
        }
      }
    } catch (error) {
      console.error('❌ Error inserting image:', error);
    }
  }, [editor, pdfDir, bookId]);

  if (!editor) {
    return <div className="mini-editor-loading">Caricamento...</div>;
  }

  return (
    <div className="mini-editor">
      {/* Compact Toolbar */}
      <div className="mini-editor-toolbar">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'active' : ''}
          title="Grassetto (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'active' : ''}
          title="Corsivo (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'active' : ''}
          title="Sottolineato (Ctrl+U)"
        >
          <u>U</u>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'active' : ''}
          title="Barrato"
        >
          <s>S</s>
        </button>

        <span className="mini-editor-separator"></span>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'active' : ''}
          title="Elenco puntato"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'active' : ''}
          title="Elenco numerato"
        >
          1.
        </button>

        <span className="mini-editor-separator"></span>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={editor.isActive('highlight') ? 'active' : ''}
          title="Evidenzia"
        >
          H
        </button>
        <button
          type="button"
          onClick={() => {
            const url = prompt('Inserisci URL:');
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          className={editor.isActive('link') ? 'active' : ''}
          title="Link"
        >
          🔗
        </button>
        <button
          type="button"
          onClick={insertImageFromFile}
          title="Inserisci immagine"
        >
          🖼
        </button>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}

export default MiniEditor;
