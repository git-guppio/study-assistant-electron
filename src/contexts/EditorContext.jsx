import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * EditorContext - Gestisce quale editor TipTap è attualmente attivo
 *
 * Permette alla toolbar principale di comandare l'editor corretto:
 * - Se un MiniEditor ha il focus → comanda quello
 * - Altrimenti → comanda l'editor principale
 */

const EditorContext = createContext(null);

export function EditorProvider({ children }) {
  // Editor principale (sempre disponibile)
  const [mainEditor, setMainEditor] = useState(null);

  // Editor attivo (può essere main o un MiniEditor)
  const [activeEditor, setActiveEditor] = useState(null);

  // ID del MiniEditor attivo (per evidenziazione visiva)
  const [activeMiniEditorId, setActiveMiniEditorId] = useState(null);

  // Registra l'editor principale
  const registerMainEditor = useCallback((editor) => {
    setMainEditor(editor);
    // Se non c'è un editor attivo, usa il principale
    if (!activeEditor) {
      setActiveEditor(editor);
    }
  }, [activeEditor]);

  // Quando un MiniEditor riceve focus
  const setMiniEditorActive = useCallback((editor, miniEditorId) => {
    setActiveEditor(editor);
    setActiveMiniEditorId(miniEditorId);
  }, []);

  // Quando un MiniEditor perde focus (torna al principale)
  const clearMiniEditorActive = useCallback(() => {
    setActiveEditor(mainEditor);
    setActiveMiniEditorId(null);
  }, [mainEditor]);

  // L'editor da usare per i comandi della toolbar
  const currentEditor = activeEditor || mainEditor;

  const value = {
    mainEditor,
    activeEditor: currentEditor,
    activeMiniEditorId,
    registerMainEditor,
    setMiniEditorActive,
    clearMiniEditorActive,
  };

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditorContext() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditorContext must be used within EditorProvider');
  }
  return context;
}

export default EditorContext;
