import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { getDatabase } from '../database/db';

function SummaryEditor({ bookId }) {
  const [loading, setLoading] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: `
      <h2>📋 Riassunto del Libro</h2>
      <p></p>
      <h3>🎯 Concetti Principali</h3>
      <ul>
        <li>Concetto 1</li>
        <li>Concetto 2</li>
        <li>Concetto 3</li>
      </ul>
      <p></p>
      <h3>💡 Punti Chiave</h3>
      <p>Scrivi qui i punti chiave...</p>
      <p></p>
      <h3>🔗 Collegamenti</h3>
      <p>Come si collegano i vari argomenti...</p>
      <p></p>
      <h3>❓ Domande per il Ripasso</h3>
      <ul>
        <li>Domanda 1?</li>
        <li>Domanda 2?</li>
      </ul>
    `,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[500px] p-6',
      },
    },
    onUpdate: ({ editor }) => {
      updateStats(editor);
    },
  });

  useEffect(() => {
    loadSummary();
  }, [bookId]);

  useEffect(() => {
    if (editor) {
      updateStats(editor);
    }
  }, [editor]);

  const updateStats = (ed) => {
    const text = ed.getText();
    setWordCount(text.split(/\s+/).filter(word => word.length > 0).length);
    setCharCount(text.length);
  };

  const loadSummary = async () => {
    const db = getDatabase();
    if (db) {
      const savedSummary = await db.getSummary();
      if (savedSummary && savedSummary.content && editor) {
        editor.commands.setContent(savedSummary.content);
      }
    }
  };

  const handleSave = async () => {
    if (!editor) return;
    
    setLoading(true);
    const content = editor.getHTML();
    const db = getDatabase();
    
    if (db) {
      await db.saveSummary(content);
    }
    
    setLoading(false);
  };

  const exportAsPDF = async () => {
    // TODO: Implementare export PDF
    alert('Funzionalità export PDF in arrivo!');
  };

  const exportAsMarkdown = () => {
    if (!editor) return;
    
    const text = editor.getText();
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'riassunto.md';
    a.click();
  };

  const insertTemplate = (type) => {
    if (!editor) return;

    let template = '';
    
    switch (type) {
      case 'chapter':
        template = `
          <h3>📖 Capitolo X</h3>
          <p><strong>Tema principale:</strong> ...</p>
          <p><strong>Punti chiave:</strong></p>
          <ul>
            <li>Punto 1</li>
            <li>Punto 2</li>
          </ul>
          <p><strong>Conclusione:</strong> ...</p>
          <p></p>
        `;
        break;
      case 'comparison':
        template = `
          <h3>⚖️ Confronto</h3>
          <table>
            <tr>
              <th>Aspetto</th>
              <th>Opzione A</th>
              <th>Opzione B</th>
            </tr>
            <tr>
              <td>Caratteristica 1</td>
              <td>...</td>
              <td>...</td>
            </tr>
          </table>
          <p></p>
        `;
        break;
      case 'timeline':
        template = `
          <h3>⏱️ Timeline / Sequenza</h3>
          <ol>
            <li><strong>Fase 1:</strong> ...</li>
            <li><strong>Fase 2:</strong> ...</li>
            <li><strong>Fase 3:</strong> ...</li>
          </ol>
          <p></p>
        `;
        break;
    }

    editor.chain().focus().insertContent(template).run();
  };

  if (!editor) {
    return <div className="p-4">Caricamento editor...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-2 bg-gray-50">
        <div className="flex flex-wrap gap-1 mb-2">
          {/* Text Formatting */}
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 ${
              editor.isActive('bold') ? 'bg-gray-300' : 'bg-white'
            }`}
          >
            <strong>B</strong>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 ${
              editor.isActive('italic') ? 'bg-gray-300' : 'bg-white'
            }`}
          >
            <em>I</em>
          </button>

          <div className="w-px bg-gray-300 mx-1"></div>

          {/* Headings */}
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 ${
              editor.isActive('heading', { level: 2 }) ? 'bg-gray-300' : 'bg-white'
            }`}
          >
            H2
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 ${
              editor.isActive('heading', { level: 3 }) ? 'bg-gray-300' : 'bg-white'
            }`}
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
          >
            • List
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 ${
              editor.isActive('orderedList') ? 'bg-gray-300' : 'bg-white'
            }`}
          >
            1. List
          </button>

          <div className="w-px bg-gray-300 mx-1"></div>

          {/* Highlight */}
          <button
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-200 ${
              editor.isActive('highlight') ? 'bg-gray-300' : 'bg-white'
            }`}
          >
            🖍️ Evidenzia
          </button>

          <div className="flex-1"></div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? '...' : '💾 Salva'}
          </button>
        </div>

        {/* Templates */}
        <div className="flex gap-2">
          <span className="text-xs text-gray-600 self-center">Template:</span>
          <button
            onClick={() => insertTemplate('chapter')}
            className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100"
          >
            📖 Capitolo
          </button>
          <button
            onClick={() => insertTemplate('comparison')}
            className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100"
          >
            ⚖️ Confronto
          </button>
          <button
            onClick={() => insertTemplate('timeline')}
            className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100"
          >
            ⏱️ Timeline
          </button>

          <div className="flex-1"></div>

          <button
            onClick={exportAsMarkdown}
            className="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            📤 MD
          </button>
          <button
            onClick={exportAsPDF}
            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
          >
            📄 PDF
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto bg-white">
        <EditorContent editor={editor} />
      </div>

      {/* Stats Bar */}
      <div className="border-t border-gray-200 p-2 bg-gray-50 flex items-center justify-between">
        <div className="flex gap-4 text-xs text-gray-600">
          <span>📝 {wordCount} parole</span>
          <span>📊 {charCount} caratteri</span>
        </div>
        <div className="text-xs text-gray-500">
          💡 Usa i template per strutturare il riassunto
        </div>
      </div>
    </div>
  );
}

export default SummaryEditor;
