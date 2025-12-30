import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import { getDatabase } from '../database/db';

function NotesEditor({ selectedText, bookId }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);

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
    ],
    content: '<p>Inizia a scrivere le tue note qui...</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
  });

  // Carica note esistenti
  useEffect(() => {
    loadNotes();
  }, [bookId]);

  // Inserisci automaticamente il testo selezionato dal PDF
  useEffect(() => {
    if (selectedText && selectedText.text && editor) {
      // Aggiungi il testo selezionato come citazione
      editor
        .chain()
        .focus()
        .insertContent([
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: selectedText.text,
                  },
                ],
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `[Pagina ${selectedText.pageNumber}]`,
              },
            ],
          },
          {
            type: 'paragraph',
          },
        ])
        .run();
    }
  }, [selectedText, editor]);

  const loadNotes = async () => {
    const db = getDatabase();
    if (db) {
      const savedNotes = await db.getNotes();
      setNotes(savedNotes);
      
      // Se ci sono note salvate, carica l'ultima
      if (savedNotes.length > 0 && editor) {
        editor.commands.setContent(savedNotes[savedNotes.length - 1].content);
      }
    }
  };

  const handleSave = async () => {
    if (!editor) return;
    
    setLoading(true);
    const content = editor.getHTML();
    const db = getDatabase();
    
    if (db) {
      await db.saveNote({
        content: content,
        pageNumber: null,
        selectionText: null,
        pdfCoordinates: null,
      });
      
      await loadNotes();
    }
    
    setLoading(false);
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
            🖍️ Highlight
          </button>
          <button
            onClick={addImage}
            className="px-2 py-1 text-sm rounded hover:bg-gray-200 bg-white"
            title="Inserisci immagine"
          >
            🖼️ Immagine
          </button>
          <button
            onClick={addLink}
            className="px-2 py-1 text-sm rounded hover:bg-gray-200 bg-white"
            title="Inserisci link"
          >
            🔗 Link
          </button>

          <div className="flex-1"></div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? '...' : '💾 Salva Note'}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto bg-white">
        <EditorContent editor={editor} />
      </div>

      {/* Info Box */}
      {selectedText && (
        <div className="border-t border-gray-200 p-3 bg-blue-50">
          <p className="text-xs text-blue-800">
            ✓ Testo dal PDF inserito come citazione (Pagina {selectedText.pageNumber})
          </p>
        </div>
      )}

      {/* Notes List */}
      {notes.length > 0 && (
        <div className="border-t border-gray-200 p-3 bg-gray-50">
          <p className="text-xs text-gray-600 mb-2">
            📝 Note salvate: {notes.length}
          </p>
          <div className="flex gap-2 overflow-x-auto">
            {notes.slice(-5).reverse().map((note, idx) => (
              <button
                key={note.id}
                onClick={() => editor.commands.setContent(note.content)}
                className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 whitespace-nowrap"
              >
                Nota {notes.length - idx}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotesEditor;
