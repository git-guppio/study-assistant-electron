# 📐 SPECIFICA COMPLETA: Sistema Annotazioni Multi-livello

## 🎯 Obiettivi

1. **Ridurre friction UX**: Da 4 click a 2 click per annotazioni comuni
2. **Associazione semantica icona-colore**: Ogni icona ha un colore di default customizzabile
3. **Multi-destinazione**: Annotazioni possono andare in 5 tab diversi (Note, Flashcard, Dizionario, Keywords, o solo PDF)
4. **Sincronizzazione bidirezionale**: Eliminare da PDF elimina da tab, e viceversa
5. **Sistema scalabile**: Preparato per automazioni future basate su icone

---

## 📊 Tipologie di Annotazione

### **1. 📝 Aggiungi Nota**
- **Outline colorato** sul PDF (opacity 15%)
- **Icona personalizzabile** nel Gutter (scegli tra 6 opzioni)
- **Colore personalizzabile** (associato all'icona scelta)
- **Crea blocco TipTap** nel tab "📝 Note"
- **Switcha automaticamente** a tab Note

**Default:** Icona 📝 verde (#22c55e)

---

### **2. 🖍️ Evidenziatura**
- **Riempimento colorato** sul testo (opacity 35%)
- **NO icona Gutter**
- **NO blocco TipTap**
- **NO switch tab**

**Uso:** Marcare visivamente passaggi importanti senza annotazioni

**Default:** Giallo (#eab308)

---

### **3. 🧠 Crea Flashcard** (sotto "📚 Azioni Avanzate")
- **Outline colorato** sul PDF (opacity 15%)
- **Icona FISSA 🧠** nel Gutter
- **Colore personalizzabile** (default viola #8b5cf6)
- **Crea blocco flashcard** nel tab "🧠 Flashcard"
- **Switcha automaticamente** a tab Flashcard

**Template blocco:**
```
┌─────────────────────────────────────────┐
│ 🧠 Viola   Pag. 5   │ [PDF] │ [✕]      │
├─────────────────────────────────────────┤
│ Domanda: [editabile]                    │
├─────────────────────────────────────────┤
│ Risposta: "Testo dal PDF..."            │
└─────────────────────────────────────────┘
```

---

### **4. 📖 Inserisci in Dizionario** (sotto "📚 Azioni Avanzate")
- **Outline colorato** sul PDF (opacity 15%)
- **Icona FISSA 📖** nel Gutter
- **Colore personalizzabile** (default blu #3b82f6)
- **Crea blocco dizionario** nel tab "📖 Dizionario"
- **Switcha automaticamente** a tab Dizionario

**Template blocco:**
```
┌─────────────────────────────────────────┐
│ 📖 Blu   Pag. 5   │ [PDF] │ [✕]        │
├─────────────────────────────────────────┤
│ Termine: "Mitocondrio"                  │
├─────────────────────────────────────────┤
│ Definizione: [editabile]                │
└─────────────────────────────────────────┘
```

---

### **5. 🔑 Parola Chiave** (sotto "📚 Azioni Avanzate")
- **Outline colorato** sul PDF (opacity 15%)
- **Icona FISSA 🔑** nel Gutter
- **Colore personalizzabile** (default giallo #eab308)
- **Crea blocco keyword** nel tab "🔑 Keywords"
- **Switcha automaticamente** a tab Keywords

**Template blocco:**
```
┌─────────────────────────────────────────┐
│ 🔑 Giallo   Pag. 5   │ [PDF] │ [✕]     │
├─────────────────────────────────────────┤
│ Keyword: "Teoria della relatività"     │
├─────────────────────────────────────────┤
│ Contesto: [editabile]                   │
└─────────────────────────────────────────┘
```

---

## 🏷️ Palette Icone e Colori

### **Icone Generiche** (per "Aggiungi Nota" - personalizzabili)

```javascript
export const GENERIC_ICONS = [
  { id: 'note', emoji: '📝', label: 'Nota generica', defaultColor: '#22c55e' },     // Verde
  { id: 'important', emoji: '⭐', label: 'Molto importante', defaultColor: '#eab308' }, // Giallo
  { id: 'idea', emoji: '💡', label: 'Idea/Insight', defaultColor: '#f97316' },      // Arancio
  { id: 'question', emoji: '❓', label: 'Domanda', defaultColor: '#3b82f6' },       // Blu
  { id: 'definition', emoji: '🎯', label: 'Definizione', defaultColor: '#8b5cf6' }, // Viola
  { id: 'review', emoji: '📌', label: 'Da rivedere', defaultColor: '#ef4444' }      // Rosso
];
```

### **Icone Azioni** (FISSE, non personalizzabili)

```javascript
export const ACTION_ICONS = [
  { id: 'flashcard', emoji: '🧠', label: 'Flashcard', defaultColor: '#8b5cf6' },    // Viola
  { id: 'dictionary', emoji: '📖', label: 'Dizionario', defaultColor: '#3b82f6' },  // Blu
  { id: 'keyword', emoji: '🔑', label: 'Parola chiave', defaultColor: '#eab308' }   // Giallo
];
```

### **Palette Colori Globale**

```javascript
export const COLOR_PALETTE = [
  { id: 'yellow', hex: '#eab308', name: 'Giallo' },
  { id: 'green', hex: '#22c55e', name: 'Verde' },
  { id: 'blue', hex: '#3b82f6', name: 'Blu' },
  { id: 'orange', hex: '#f97316', name: 'Arancio' },
  { id: 'purple', hex: '#8b5cf6', name: 'Viola' },
  { id: 'red', hex: '#ef4444', name: 'Rosso' }
];
```

---

## 🎨 Menu Contestuale: Flusso Completo

### **Livello 1: Menu Principale**
```
┌────────────────────────────────────┐
│ 📝 Aggiungi nota (📝 verde)    ▼  │
│ 🖍️ Evidenziatura (giallo)      ▼  │
│ 📚 Azioni Avanzate             ▼  │
└────────────────────────────────────┘
```

### **Livello 2a: Espansione "Aggiungi Nota"**
```
┌─────────────────────────────────────┐
│ 📝 Aggiungi nota                    │
│                                     │
│ Tipo di annotazione:                │
│  ┌──┐                               │
│  │📝│  ⭐  💡  ❓  🎯  📌          │
│  └──┘                               │
│   ^                                 │
│   └─ Bordo 2px attorno icona        │
│                                     │
│ Colore: (verde per 📝)              │
│      ┌──┐                           │
│  🟨  │🟩│  🟦  🟧  🟪  🟥          │
│      └──┘                           │
│       ^                             │
│       └─ Bordo 2px attorno colore   │
│                                     │
│                [Applica]            │
└─────────────────────────────────────┘
```

### **Livello 2b: Espansione "Evidenziatura"**
```
┌─────────────────────────────────────┐
│ 🖍️ Evidenziatura                    │
│                                     │
│ Colore:                             │
│      ┌──┐                           │
│  🟨  │🟩│  🟦  🟧  🟪  🟥          │
│      └──┘                           │
│                                     │
│                [Applica]            │
└─────────────────────────────────────┘
```

### **Livello 2c: Espansione "Azioni Avanzate"**
```
┌─────────────────────────────────────┐
│ 📚 Azioni Avanzate                  │
│                                     │
│   🧠 Crea flashcard                 │
│   📖 Inserisci in dizionario        │
│   🔑 Parola chiave                  │
└─────────────────────────────────────┘
```

### **Livello 3: Espansione "🧠 Crea flashcard"**
```
┌─────────────────────────────────────┐
│ 🧠 Crea flashcard                   │
│                                     │
│ Icona: 🧠 (fissa)                   │
│                                     │
│ Colore: (viola)                     │
│      ┌──┐                           │
│  🟨  🟩  🟦  🟧  │🟪│  🟥          │
│                  └──┘               │
│                                     │
│                [Applica]            │
└─────────────────────────────────────┘
```

---

## 🗄️ Schema Database SQLite

```sql
-- 1. Default colori per documento
CREATE TABLE IF NOT EXISTS document_defaults (
  book_id TEXT PRIMARY KEY,
  highlight_color TEXT DEFAULT '#eab308',
  last_note_icon_id TEXT DEFAULT 'note',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Customizzazioni colore per icona generica (solo per "Aggiungi nota")
CREATE TABLE IF NOT EXISTS document_icon_colors (
  book_id TEXT NOT NULL,
  icon_id TEXT NOT NULL,  -- 'note', 'important', 'idea', 'question', 'definition', 'review'
  custom_color TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (book_id, icon_id)
);

-- 3. Customizzazioni colore per azione (flashcard, dictionary, keyword)
CREATE TABLE IF NOT EXISTS document_action_colors (
  book_id TEXT NOT NULL,
  action_type TEXT NOT NULL,  -- 'flashcard', 'dictionary', 'keyword'
  custom_color TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (book_id, action_type)
);

-- 4. Annotazioni (outline/highlight sul PDF)
CREATE TABLE IF NOT EXISTS annotations (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('note', 'highlight', 'flashcard', 'dictionary', 'keyword')),
  page_number INTEGER NOT NULL,
  text TEXT,
  rects TEXT NOT NULL,  -- JSON
  color TEXT NOT NULL,
  opacity REAL DEFAULT 0.15,
  gutter_icon_id TEXT,  -- '📝', '⭐', '💡', '❓', '🎯', '📌', '🧠', '📖', '🔑'
  content_id TEXT,  -- FK a notes/flashcards/dictionary_entries/keywords
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Note (tab "📝 Note")
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  content TEXT,
  comment TEXT,
  annotation_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE CASCADE
);

-- 6. Flashcards (tab "🧠 Flashcard")
CREATE TABLE IF NOT EXISTS flashcards (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  question TEXT,
  answer TEXT,
  annotation_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE CASCADE
);

-- 7. Voci dizionario (tab "📖 Dizionario")
CREATE TABLE IF NOT EXISTS dictionary_entries (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  term TEXT NOT NULL,
  definition TEXT,
  annotation_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE CASCADE
);

-- 8. Parole chiave (tab "🔑 Keywords")
CREATE TABLE IF NOT EXISTS keywords (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  context TEXT,
  annotation_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE CASCADE
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_annotations_book_page ON annotations(book_id, page_number);
CREATE INDEX IF NOT EXISTS idx_annotations_type ON annotations(type);
CREATE INDEX IF NOT EXISTS idx_notes_book ON notes(book_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_book ON flashcards(book_id);
CREATE INDEX IF NOT EXISTS idx_dictionary_book ON dictionary_entries(book_id);
CREATE INDEX IF NOT EXISTS idx_keywords_book ON keywords(book_id);
```

---

## 📁 Struttura File: Piano di Implementazione

### **🆕 File da Creare**

```
src/
├── constants/
│   └── annotations.js                 # GENERIC_ICONS, ACTION_ICONS, COLOR_PALETTE
├── extensions/
│   ├── PdfNoteBlock.js                # TipTap extension per Note
│   ├── PdfFlashcardBlock.js           # TipTap extension per Flashcard
│   ├── PdfDictionaryBlock.js          # TipTap extension per Dizionario
│   └── PdfKeywordBlock.js             # TipTap extension per Keywords
├── components/
│   ├── PdfNoteBlockComponent.jsx      # React component per blocco Note
│   ├── PdfFlashcardBlockComponent.jsx # React component per blocco Flashcard
│   ├── PdfDictionaryBlockComponent.jsx# React component per blocco Dizionario
│   ├── PdfKeywordBlockComponent.jsx   # React component per blocco Keywords
│   ├── FlashcardEditor.jsx            # Editor TipTap per tab Flashcard
│   ├── DictionaryEditor.jsx           # Editor TipTap per tab Dizionario
│   ├── KeywordsEditor.jsx             # Editor TipTap per tab Keywords
│   ├── IconPicker.jsx                 # Selector icone con bordi
│   └── ColorPicker.jsx                # Selector colori con bordi (o estendere ColorPalette)
```

### **✏️ File da Modificare**

```
src/
├── App.jsx                            # Nuovi handler, refs, tab management
├── components/
│   ├── ContextMenu.jsx                # Nuovo layout multi-livello
│   ├── PDFViewer.jsx                  # Flash animation, callback aggiornati
│   └── NotesEditor.jsx                # Registrazione PdfNoteBlock, metodi ref
├── database/
│   └── db.js                          # Metodi CRUD per nuove tabelle
├── index.css                          # Stili blocchi, animazioni, bordi
```

---

## 🔄 Flussi Principali

### **Flusso 1: Crea Nota con Icona Custom**

```
1. Utente seleziona "teoria della relatività" → Menu contestuale
2. Click "📝 Aggiungi nota ▼" → Espande icone + colori
3. Click icona 💡 → Colore si aggiorna a arancio (default)
4. [Opzionale] Click colore 🟪 → Override colore a viola
5. Click [Applica]
   ↓
6. App.handleCreateNote({ text, rects, pageNumber, icon: '💡', color: '#8b5cf6' })
   ↓
7. Salva in DB:
   - annotations: { type: 'note', gutterIconId: 'idea', color: '#8b5cf6', contentId: noteId }
   - notes: { id: noteId, content: '', comment: '', annotationId }
   - document_icon_colors: { iconId: 'idea', customColor: '#8b5cf6' }  ← Se diverso da default
   ↓
8. notesEditorRef.insertPdfNoteBlock({ noteId, annotationId, ... })
   ↓
9. setActiveTab('notes')
   ↓
10. Outline viola con icona 💡 appare nel PDF
```

---

### **Flusso 2: Crea Flashcard**

```
1. Utente seleziona "mitocondrio" → Menu contestuale
2. Click "📚 Azioni Avanzate ▼" → Mostra azioni
3. Click "🧠 Crea flashcard" → Espande colori (icona fissa 🧠)
4. [Opzionale] Cambia colore da viola (default) a blu
5. Click [Applica]
   ↓
6. App.handleCreateFlashcard({ text, rects, pageNumber, color: '#3b82f6' })
   ↓
7. Salva in DB:
   - annotations: { type: 'flashcard', gutterIconId: 'flashcard', color: '#3b82f6', contentId: flashcardId }
   - flashcards: { id: flashcardId, question: '', answer: 'mitocondrio', annotationId }
   - document_action_colors: { actionType: 'flashcard', customColor: '#3b82f6' }  ← Se diverso da default
   ↓
8. flashcardEditorRef.insertPdfFlashcardBlock({ flashcardId, annotationId, ... })
   ↓
9. setActiveTab('flashcard')
   ↓
10. Outline blu con icona 🧠 appare nel PDF
```

---

### **Flusso 3: Eliminazione Bidirezionale (da TipTap)**

```
1. Utente clicca ✕ in un blocco nota in TipTap
2. PdfNoteBlockComponent.handleDelete() → App.handleDeleteNote(noteId, annotationId)
   ↓
3. Trova annotation con annotationId
4. Elimina dal DB:
   - notes (CASCADE elimina via FK)
   - annotations
   ↓
5. Rimuove da state: setAnnotations(prev => prev.filter(a => a.id !== annotationId))
   ↓
6. TipTap rimuove automaticamente il blocco (via deleteNode)
7. PDF si aggiorna (outline scompare perché non più in state)
```

---

### **Flusso 4: Eliminazione Bidirezionale (da PDF)**

```
1. Utente click destro su outline → "Elimina annotazione"
2. PDFViewer → App.handleDeleteAnnotation(annotationId)
   ↓
3. Trova annotation con annotationId
4. Determina tipo: 'note' → contentId punta a notes table
   ↓
5. Trova noteId dall'annotation.contentId
6. notesEditorRef.removePdfNoteBlock(noteId)
   ↓
7. Elimina dal DB:
   - annotations
   - notes (CASCADE)
   ↓
8. TipTap rimuove blocco, PDF aggiorna state
```

---

### **Flusso 5: Navigazione Nota → PDF (Flash)**

```
1. Utente clicca "Vai al PDF" in blocco nota
2. App.handleNavigateToPdf({ annotationId, pageNumber })
   ↓
3. setCurrentPage(pageNumber)
4. pdfViewerRef.flashOutline(annotationId)
   ↓
5. PDFViewer imposta flashingAnnotationId state
6. CSS applica animazione:
   .annotation-rect.flashing {
     animation: outlineFlash 2.5s ease-in-out;
   }
   @keyframes outlineFlash {
     0%, 20%, 40%, 60%, 80%, 100% { opacity: 0.15; }
     10%, 30%, 50%, 70%, 90% { opacity: 0.8; }
   }
   ↓
7. Dopo 2.5s, rimuove flashingAnnotationId
```

---

### **Flusso 6: Navigazione PDF → Nota (Scroll)**

```
1. Utente clicca icona Gutter nel PDF
2. PDFViewer → App.handleGutterClick(annotation)
   ↓
3. Determina tab di destinazione:
   - annotation.type === 'note' → setActiveTab('notes')
   - annotation.type === 'flashcard' → setActiveTab('flashcard')
   - ecc.
   ↓
4. Chiama ref del tab corrispondente:
   - notesEditorRef.scrollToBlock(annotation.contentId)
   ↓
5. TipTap scrolla al blocco
6. [Opzionale] Applica highlight temporaneo (classe CSS 'highlighted' per 2s)
```

---

## 📋 Piano di Implementazione: Sequenza Step-by-Step

### **FASE 1: Sistema Base (Nota + Evidenziatura)**

#### **Step 1.1: Constants & Database Schema**
- [ ] Creare `src/constants/annotations.js`
  - Esportare `GENERIC_ICONS`
  - Esportare `ACTION_ICONS`
  - Esportare `COLOR_PALETTE`
- [ ] Aggiornare `src/database/db.js`
  - Aggiungere schema tabelle SQL (document_defaults, document_icon_colors, annotations, notes)
  - Implementare metodi CRUD:
    - `getDocumentDefaults(bookId)`
    - `createDocumentDefaults(bookId, defaults)`
    - `updateDocumentDefaults(bookId, updates)`
    - `getCustomIconColor(bookId, iconId)`
    - `upsertCustomIconColor(bookId, iconId, color)`
    - `deleteCustomIconColor(bookId, iconId)`
    - `createAnnotation(data)`
    - `deleteAnnotation(annotationId)`
    - `getAnnotations(bookId)`
    - `createNote(data)`
    - `deleteNote(noteId)`
    - `getNotes(bookId)`
- [ ] Aggiungere IPC handlers in `electron/main.js`
  - `db:getDocumentDefaults`
  - `db:updateDocumentDefaults`
  - `db:getCustomIconColor`
  - `db:upsertCustomIconColor`
  - `db:createAnnotation`
  - `db:deleteAnnotation`
  - `db:getAnnotations`
  - `db:createNote`
  - `db:deleteNote`
  - `db:getNotes`

#### **Step 1.2: UI Components (Icon & Color Pickers)**
- [ ] Creare `src/components/IconPicker.jsx`
  - Props: `icons` (array), `selectedIconId`, `onIconSelect(iconId)`
  - Renderizza griglia di emoji con bordo 2px su selezione
- [ ] Creare `src/components/ColorPicker.jsx` (o estendere ColorPalette esistente)
  - Props: `colors` (array), `selectedColor`, `onColorSelect(color)`
  - Renderizza griglia di cerchi colorati con bordo 2px su selezione

#### **Step 1.3: Context Menu Refactoring**
- [ ] Modificare `src/components/ContextMenu.jsx`
  - Stato espansione a tre livelli:
    - `expandedSection`: null | 'note' | 'highlight' | 'actions'
    - `expandedAction`: null | 'flashcard' | 'dictionary' | 'keyword'
  - Implementare submenu "Aggiungi nota":
    - Mostrare `IconPicker` con GENERIC_ICONS
    - Al click icona, aggiornare colore al default dell'icona
    - Mostrare `ColorPicker` sotto
    - Bottone [Applica] chiama `onAddNote({ iconId, color })`
  - Implementare submenu "Evidenziatura":
    - Solo `ColorPicker`
    - Bottone [Applica] chiama `onHighlight(color)`

#### **Step 1.4: PDFViewer Updates**
- [ ] Modificare `src/components/PDFViewer.jsx`
  - Aggiornare handler `handleAddToNotes` per ricevere `{ iconId, color }`
  - Aggiornare handler `handleHighlight` per ricevere `color`
  - Aggiornare rendering Gutter Layer per mostrare emoji dall'iconId
  - Aggiungere differenziazione visiva highlight (opacity 0.35) vs outline (opacity 0.15)

#### **Step 1.5: TipTap Extension per Note**
- [ ] Creare `src/extensions/PdfNoteBlock.js`
  - Estendere `Node` da TipTap
  - Attributi: `noteId`, `annotationId`, `pageNumber`, `selectionText`, `color`, `gutterIconId`, `comment`
  - Usare `ReactNodeViewRenderer` per rendering
- [ ] Creare `src/components/PdfNoteBlockComponent.jsx`
  - Header: icona emoji + colore + pagina + [Vai al PDF] + [✕]
  - Sezione citazione: blockquote read-only con testo selezionato
  - Sezione commento: textarea editabile
  - Handler delete: chiama callback `onDelete(noteId, annotationId)`

#### **Step 1.6: NotesEditor Updates**
- [ ] Modificare `src/components/NotesEditor.jsx`
  - Registrare estensione `PdfNoteBlock`
  - Esporre via ref:
    - `insertPdfNoteBlock(noteData)` - inserisce blocco alla fine
    - `removePdfNoteBlock(noteId)` - trova e rimuove blocco
    - `scrollToBlock(noteId)` - scrolla al blocco
  - Passare callback `onDeleteNote`, `onNavigateToPdf` via extension options

#### **Step 1.7: App State Management**
- [ ] Modificare `src/App.jsx`
  - Aggiungere stato `documentDefaults` (caricato dal DB all'apertura)
  - Aggiungere refs:
    - `notesEditorRef`
    - `pdfViewerRef`
  - Nuovo handler `handleCreateNote({ text, rects, pageNumber, iconId, color })`:
    1. Genera IDs
    2. Crea annotation + note nel DB (con linking bidirezionale)
    3. Aggiorna state annotations
    4. Chiama `notesEditorRef.insertPdfNoteBlock()`
    5. Switch a tab 'notes'
    6. Se colore diverso da default, salva in document_icon_colors
  - Aggiornare `handleDeleteAnnotation(annotationId)`:
    - Se annotation.type === 'note', chiama `notesEditorRef.removePdfNoteBlock()`
    - Elimina da DB
  - Nuovo handler `handleDeleteNote(noteId, annotationId)`:
    - Elimina note + annotation da DB
    - Aggiorna state
  - Nuovo handler `handleNavigateToPdf({ annotationId, pageNumber })`:
    - Cambia pagina
    - Chiama `pdfViewerRef.flashOutline(annotationId)`

#### **Step 1.8: CSS Styles**
- [ ] Aggiornare `src/index.css`
  - `.pdf-note-block` - container blocco nota
  - `.pdf-note-block-header` - header con bordo colorato a sinistra
  - `.pdf-note-block-quote` - citazione
  - `.pdf-note-block-comment` - area commento
  - `.icon-picker` - griglia icone
  - `.icon-picker-item` - singola icona con bordo su hover/selected
  - `.color-picker` - griglia colori
  - `.color-picker-item` - singolo colore con bordo su selected
  - `.annotation-rect.flashing` - animazione flash
  - `@keyframes outlineFlash` - 5 lampeggi in 2.5s

#### **Step 1.9: Testing Fase 1**
- [ ] Test creazione nota con icona default
- [ ] Test creazione nota con icona custom
- [ ] Test creazione nota con colore custom
- [ ] Test creazione evidenziatura
- [ ] Test eliminazione nota da TipTap → outline scompare
- [ ] Test eliminazione annotation da PDF → blocco TipTap scompare
- [ ] Test navigazione nota → PDF con flash
- [ ] Test navigazione Gutter icon → scroll a nota
- [ ] Test persistenza colori custom dopo reload

---

### **FASE 2: Azioni Avanzate (Flashcard, Dizionario, Keywords)**

#### **Step 2.1: Database Schema Extension**
- [ ] Aggiornare `src/database/db.js`
  - Aggiungere tabelle: document_action_colors, flashcards, dictionary_entries, keywords
  - Implementare metodi CRUD:
    - `getCustomActionColor(bookId, actionType)`
    - `upsertCustomActionColor(bookId, actionType, color)`
    - `createFlashcard(data)`
    - `deleteFlashcard(flashcardId)`
    - `getFlashcards(bookId)`
    - `createDictionaryEntry(data)`
    - `deleteDictionaryEntry(entryId)`
    - `getDictionaryEntries(bookId)`
    - `createKeyword(data)`
    - `deleteKeyword(keywordId)`
    - `getKeywords(bookId)`
- [ ] Aggiungere IPC handlers in `electron/main.js` per i metodi sopra

#### **Step 2.2: New Tab Editors**
- [ ] Creare `src/components/FlashcardEditor.jsx`
  - Editor TipTap con estensione PdfFlashcardBlock
  - Esporre ref: insertPdfFlashcardBlock, removePdfFlashcardBlock, scrollToBlock
- [ ] Creare `src/components/DictionaryEditor.jsx`
  - Editor TipTap con estensione PdfDictionaryBlock
  - Esporre ref: insertPdfDictionaryBlock, removePdfDictionaryBlock, scrollToBlock
- [ ] Creare `src/components/KeywordsEditor.jsx`
  - Editor TipTap con estensione PdfKeywordBlock
  - Esporre ref: insertPdfKeywordBlock, removePdfKeywordBlock, scrollToBlock

#### **Step 2.3: TipTap Extensions per Azioni**
- [ ] Creare `src/extensions/PdfFlashcardBlock.js`
  - Attributi: flashcardId, annotationId, pageNumber, selectionText, color, question, answer
- [ ] Creare `src/components/PdfFlashcardBlockComponent.jsx`
  - Header: 🧠 + colore + pagina + [PDF] + [✕]
  - Campo "Domanda" editabile
  - Campo "Risposta" (pre-populated con testo PDF)
- [ ] Creare `src/extensions/PdfDictionaryBlock.js`
  - Attributi: entryId, annotationId, pageNumber, term, color, definition
- [ ] Creare `src/components/PdfDictionaryBlockComponent.jsx`
  - Header: 📖 + colore + pagina + [PDF] + [✕]
  - Campo "Termine" (read-only, dal PDF)
  - Campo "Definizione" editabile
- [ ] Creare `src/extensions/PdfKeywordBlock.js`
  - Attributi: keywordId, annotationId, pageNumber, keyword, color, context
- [ ] Creare `src/components/PdfKeywordBlockComponent.jsx`
  - Header: 🔑 + colore + pagina + [PDF] + [✕]
  - Campo "Keyword" (read-only)
  - Campo "Contesto" editabile

#### **Step 2.4: Context Menu - Azioni Avanzate**
- [ ] Aggiornare `src/components/ContextMenu.jsx`
  - Aggiungere opzione "📚 Azioni Avanzate ▼"
  - Submenu con 3 azioni: 🧠 Flashcard, 📖 Dizionario, 🔑 Keyword
  - Ogni azione espande solo ColorPicker (icona fissa)
  - Callbacks: onCreateFlashcard(color), onCreateDictionary(color), onCreateKeyword(color)

#### **Step 2.5: App.jsx - Nuovi Handler**
- [ ] Aggiornare `src/App.jsx`
  - Aggiungere refs: flashcardEditorRef, dictionaryEditorRef, keywordsEditorRef
  - Aggiungere nuovi tab a activeTab state: 'flashcard', 'dictionary', 'keywords'
  - Handler `handleCreateFlashcard({ text, rects, pageNumber, color })`
  - Handler `handleCreateDictionary({ text, rects, pageNumber, color })`
  - Handler `handleCreateKeyword({ text, rects, pageNumber, color })`
  - Handler `handleDeleteFlashcard(flashcardId, annotationId)`
  - Handler `handleDeleteDictionary(entryId, annotationId)`
  - Handler `handleDeleteKeyword(keywordId, annotationId)`
  - Aggiornare `handleDeleteAnnotation` per gestire nuovi tipi
  - Aggiornare `handleGutterClick` per switchare ai nuovi tab

#### **Step 2.6: UI Tab Management**
- [ ] Aggiornare `src/App.jsx`
  - Aggiungere rendering condizionale per nuovi tab
  - Tab bar: 📝 Note | 🧠 Flashcard | 📖 Dizionario | 🔑 Keywords | 🗺️ Mindmap | 📄 Summary

#### **Step 2.7: CSS per Nuovi Blocchi**
- [ ] Aggiornare `src/index.css`
  - `.pdf-flashcard-block`
  - `.pdf-dictionary-block`
  - `.pdf-keyword-block`
  - Stili header con icone fisse

#### **Step 2.8: Testing Fase 2**
- [ ] Test creazione flashcard → appare in tab Flashcard + outline nel PDF
- [ ] Test creazione dizionario → appare in tab Dizionario
- [ ] Test creazione keyword → appare in tab Keywords
- [ ] Test eliminazione bidirezionale per ogni tipo
- [ ] Test navigazione bidirezionale per ogni tipo
- [ ] Test switch automatico a tab corretto

---

### **FASE 3: Polish & Features**

#### **Step 3.1: Flash Animation per Navigazione**
- [ ] Implementare `pdfViewerRef.flashOutline(annotationId)` in PDFViewer
  - Stato `flashingAnnotationId`
  - Applicare classe CSS `.flashing` al rect corrispondente
  - Timeout 2.5s per rimuovere

#### **Step 3.2: Scroll Highlighting in TipTap**
- [ ] Aggiornare tutti i metodi `scrollToBlock` negli editor
  - Dopo scroll, applicare classe `.highlighted` temporanea (2s)
  - CSS: background-color transitorio

#### **Step 3.3: Tooltip & Accessibility**
- [ ] Aggiungere tooltip su hover icone (label + descrizione)
- [ ] Aggiungere aria-labels per screen reader
- [ ] Keyboard shortcuts:
  - Ctrl+H → Evidenziatura rapida (colore default)
  - Ctrl+N → Nota rapida (icona default)

#### **Step 3.4: Persistenza & Loading States**
- [ ] Loading spinner durante caricamento annotazioni da DB
- [ ] Debouncing su update commenti TipTap (salva dopo 1s di inattività)

#### **Step 3.5: Error Handling**
- [ ] Toast notifications per errori DB
- [ ] Gestione conflitti (es. eliminazione concorrente)

#### **Step 3.6: Testing Finale**
- [ ] Test completo E2E di tutti i flussi
- [ ] Test con PDF molto grandi (100+ annotazioni)
- [ ] Test cambio pagina con annotazioni multiple
- [ ] Test reload app con tutte le customizzazioni

---

## 🎨 Dettagli Stilistici UI

### **Bordi Selezione (IconPicker & ColorPicker)**

```css
/* IconPicker */
.icon-picker {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}

.icon-picker-item {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-picker-item:hover {
  background-color: #f3f4f6;
}

.icon-picker-item.selected {
  border-color: #3b82f6;
  background-color: #eff6ff;
}

/* ColorPicker */
.color-picker {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.color-picker-item {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.color-picker-item.selected {
  border-color: #1f2937;
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px #1f2937;
}
```

### **Animazione Flash Outline**

```css
.annotation-rect.flashing {
  animation: outlineFlash 2.5s ease-in-out;
}

@keyframes outlineFlash {
  0%, 20%, 40%, 60%, 80%, 100% {
    opacity: 0.15;
    box-shadow: none;
  }
  10%, 30%, 50%, 70%, 90% {
    opacity: 0.8;
    box-shadow: 0 0 12px currentColor;
  }
}
```

### **Blocchi TipTap con Header Colorato**

```css
.pdf-note-block,
.pdf-flashcard-block,
.pdf-dictionary-block,
.pdf-keyword-block {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin: 16px 0;
  overflow: hidden;
  background: #fff;
}

.pdf-note-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-left: 4px solid var(--block-color);
  background: #f9fafb;
  font-size: 14px;
  font-weight: 500;
}

.pdf-note-block-quote {
  padding: 12px 16px;
  background: #f3f4f6;
  border-left: 3px solid #9ca3af;
  font-style: italic;
  color: #4b5563;
}

.pdf-note-block-comment {
  padding: 12px 16px;
  min-height: 80px;
  border: none;
  outline: none;
  resize: vertical;
}
```

---

## 🚀 Checklist Pre-Implementazione

Prima di iniziare la Fase 1, verificare:

- [ ] SQLite è configurato correttamente in Electron
- [ ] IPC handlers funzionano per lettura/scrittura DB
- [ ] TipTap è installato con versione compatibile
- [ ] React Flow è installato (per Mindmap esistente)
- [ ] PDF.js worker è bundled correttamente
- [ ] Git branch creato per feature: `feature/multi-level-annotations`

---

## 📝 Note Implementative

### **Generazione ID Unici**

```javascript
// utils/generateId.js
export function generateId(prefix = '') {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `${prefix}${timestamp}_${randomPart}`;
}

// Uso:
const annotationId = generateId('ann_');
const noteId = generateId('note_');
```

### **Gestione Colori Default**

```javascript
// utils/colorHelpers.js
import { GENERIC_ICONS, ACTION_ICONS } from '../constants/annotations';

export function getDefaultColorForIcon(iconId) {
  const icon = GENERIC_ICONS.find(i => i.id === iconId);
  return icon?.defaultColor || '#22c55e';
}

export function getDefaultColorForAction(actionType) {
  const action = ACTION_ICONS.find(a => a.id === actionType);
  return action?.defaultColor || '#8b5cf6';
}

export async function getColorForIcon(bookId, iconId) {
  const customColor = await window.electronAPI.getCustomIconColor(bookId, iconId);
  return customColor || getDefaultColorForIcon(iconId);
}

export async function getColorForAction(bookId, actionType) {
  const customColor = await window.electronAPI.getCustomActionColor(bookId, actionType);
  return customColor || getDefaultColorForAction(actionType);
}
```

### **Sincronizzazione Bidirezionale - Pattern**

```javascript
// Pattern per eliminazione sincronizzata

// Da TipTap → PDF
const handleDeleteFromTipTap = async (contentId, annotationId) => {
  // 1. Elimina dal DB (CASCADE eliminerà anche l'annotation)
  await window.electronAPI.deleteNote(contentId);

  // 2. Aggiorna state locale
  setAnnotations(prev => prev.filter(a => a.id !== annotationId));

  // 3. TipTap si aggiorna automaticamente (rimozione nodo)
  // 4. PDF si ri-renderizza (annotations filtrati)
};

// Da PDF → TipTap
const handleDeleteFromPDF = async (annotationId) => {
  // 1. Trova annotation
  const annotation = annotations.find(a => a.id === annotationId);

  // 2. Determina tipo e chiama editor corretto
  if (annotation.type === 'note') {
    notesEditorRef.current?.removePdfNoteBlock(annotation.contentId);
  } else if (annotation.type === 'flashcard') {
    flashcardEditorRef.current?.removePdfFlashcardBlock(annotation.contentId);
  }
  // ...

  // 3. Elimina dal DB
  await window.electronAPI.deleteAnnotation(annotationId);

  // 4. Aggiorna state
  setAnnotations(prev => prev.filter(a => a.id !== annotationId));
};
```

---

## 🎯 Obiettivi di Performance

- Caricamento iniziale annotazioni: < 500ms (100 annotazioni)
- Rendering singolo outline: < 16ms (60fps)
- Inserimento blocco TipTap: < 100ms
- Salvataggio DB: < 50ms
- Navigazione con flash: animazione fluida 60fps

---

## 📚 Riferimenti

- TipTap Docs: https://tiptap.dev/docs
- PDF.js API: https://mozilla.github.io/pdf.js/
- SQLite in Electron: https://github.com/WiseLibs/better-sqlite3
- React Flow: https://reactflow.dev/

---

**Fine Specifica**

Ultimo aggiornamento: 2026-01-12
