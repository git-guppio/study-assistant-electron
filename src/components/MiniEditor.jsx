import React, { useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import { ImageWithDelete } from '../extensions/ImageWithDelete';
import { useEditorContext } from '../contexts/EditorContext';

/**
 * MiniEditor - Editor TipTap compatto per commenti delle note PDF
 *
 * SENZA toolbar locale - usa la toolbar principale tramite EditorContext
 * Si espande per occupare tutto lo spazio disponibile nella scheda nota
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
  noteId, // ID univoco per identificare questo MiniEditor
  onSavingChange // callback per notificare stato salvataggio
}) {
  const saveTimeoutRef = useRef(null);
  const lastSavedContentRef = useRef(content);

  // Context per registrare questo editor come attivo
  const { setMiniEditorActive, clearMiniEditorActive, activeMiniEditorId } = useEditorContext();

  // Handler per eliminare immagine da disco
  const handleDeleteImage = useCallback(async (imageUrl) => {
    if (window.electronAPI) {
      await window.electronAPI.deleteImageFromDisk(imageUrl);
      console.log('🗑️ Image deleted from mini-editor:', imageUrl);
    }
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageWithDelete.configure({
        onDeleteImage: handleDeleteImage,
      }),
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
    onFocus: () => {
      // Quando questo editor riceve focus, diventa l'editor attivo
      if (editor) {
        setMiniEditorActive(editor, noteId);
      }
    },
    onBlur: ({ event }) => {
      // Quando perde focus, controlla se il focus va a un altro elemento dentro lo stesso editor
      // Se il focus va completamente fuori, torna all'editor principale
      const relatedTarget = event.relatedTarget;

      // Se il focus va a un elemento dentro la stessa nota o toolbar, non resettare
      if (relatedTarget) {
        const isInsideNote = relatedTarget.closest?.(`[data-note-id="${noteId}"]`);
        const isInsideToolbar = relatedTarget.closest?.('.notes-editor-toolbar');
        if (isInsideNote || isInsideToolbar) {
          return;
        }
      }

      // Piccolo delay per permettere al nuovo elemento di ricevere focus
      setTimeout(() => {
        // Se nessun altro MiniEditor ha preso il focus, torna al principale
        // Questo viene gestito automaticamente quando un altro MiniEditor chiama setMiniEditorActive
      }, 100);
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
    if (!editor || !window.electronAPI || !pdfDir || !bookId) {
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

  if (!editor) {
    return <div className="mini-editor-loading">Caricamento...</div>;
  }

  // Classe per evidenziare quando questo è l'editor attivo
  const isActive = activeMiniEditorId === noteId;

  return (
    <div className={`mini-editor mini-editor-expanded ${isActive ? 'mini-editor-active' : ''}`}>
      {/* Editor Content - occupa tutto lo spazio disponibile */}
      <EditorContent editor={editor} />
    </div>
  );
}

export default MiniEditor;
