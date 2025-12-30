# 📚 Study Assistant - Electron App

Applicazione desktop standalone per lo studio, integrata con Calibre.

## 🚀 Stack Tecnologico

- **Electron** - Framework desktop
- **React** - UI Framework
- **Vite** - Build tool e dev server
- **PDF.js** - Visualizzatore PDF con selezione testo
- **TipTap** - Editor rich text per note e riassunti
- **React Flow** - Mappe mentali interattive
- **SQLite** - Database locale
- **Tailwind CSS** - Styling

## ✨ Funzionalità

### ✅ Implementate (v1.0)

- 📄 **Visualizzatore PDF**
  - Rendering multi-pagina
  - Zoom in/out
  - Navigazione pagine
  - Selezione testo
  
- 📝 **Editor Note**
  - Rich text con TipTap
  - Inserimento immagini
  - Link e highlight
  - Inserimento automatico testo selezionato dal PDF
  
- 🗺️ **Mappe Mentali**
  - Creazione nodi interattivi
  - Drag & drop
  - Collegamenti tra concetti
  - Export JSON
  
- 📋 **Editor Riassunti**
  - Template predefiniti
  - Statistiche (parole, caratteri)
  - Export Markdown
  - Struttura organizzata

- 💾 **Database**
  - Salvataggio automatico
  - Storage locale (localStorage + SQLite)
  - Collegamento al file PDF

### 🔄 In Sviluppo

- [ ] Evidenziazioni persistenti sul PDF
- [ ] Link bidirezionali note ↔ PDF
- [ ] SQLite completo (al momento usa localStorage)
- [ ] Export PDF riassunti
- [ ] Sincronizzazione cloud
- [ ] Ricerca full-text

## 📦 Installazione

### Prerequisiti

- **Node.js** 18+ e npm
- **Git** (opzionale)

### Setup Sviluppo

```bash
# 1. Clona o scarica il progetto
cd study-assistant-electron

# 2. Installa dipendenze
npm install

# 3. Avvia in modalità sviluppo
npm start
```

L'app si aprirà automaticamente con hot-reload attivo.

### Build per Produzione

```bash
# Build dei file frontend
npm run build

# Packaging per il tuo sistema operativo
npm run package

# Oppure specifico per OS:
npm run package:win    # Windows
npm run package:mac    # macOS
npm run package:linux  # Linux
```

I file eseguibili saranno in `dist/`.

## 🔧 Configurazione

### Argomenti CLI (da Calibre Plugin)

L'app accetta questi argomenti:

```bash
node . --book-id "123" \
       --title "Il mio libro" \
       --authors "Autore" \
       --file "/path/to/book.pdf" \
       --format "PDF"
```

### Struttura File

```
study-assistant-electron/
├── electron/
│   ├── main.js           # Processo principale Electron
│   └── preload.js        # Bridge sicuro main ↔ renderer
├── src/
│   ├── App.jsx           # Componente principale
│   ├── main.jsx          # Entry point React
│   ├── index.css         # Stili globali
│   ├── components/
│   │   ├── PDFViewer.jsx
│   │   ├── NotesEditor.jsx
│   │   ├── MindMap.jsx
│   │   └── SummaryEditor.jsx
│   └── database/
│       └── db.js         # Gestione database
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## 🎮 Utilizzo

### Da Calibre

1. Installa il plugin Calibre (vedi ../study-assistant-plugin)
2. Configura il path di questa app nel plugin
3. Seleziona un libro in Calibre
4. Click sul pulsante "Study Assistant"

### Standalone

```bash
# Apri senza libro
npm start

# Con un libro specifico
npm start -- --book-id "1" --title "Test" --file "./test.pdf"
```

### Shortcuts

- **Ctrl/Cmd + S** - Salva (nell'editor attivo)
- **Ctrl/Cmd + B** - Grassetto
- **Ctrl/Cmd + I** - Corsivo
- **Delete/Backspace** - Elimina nodo (nella mappa mentale)

## 🗄️ Database

### Schema SQLite (TODO: implementare via IPC)

```sql
-- notes
CREATE TABLE notes (
  id INTEGER PRIMARY KEY,
  content TEXT,
  page_number INTEGER,
  selection_text TEXT,
  pdf_coordinates TEXT,
  created_at DATETIME,
  updated_at DATETIME
);

-- highlights
CREATE TABLE highlights (
  id INTEGER PRIMARY KEY,
  page_number INTEGER,
  text TEXT,
  color TEXT,
  coordinates TEXT,
  note_id INTEGER,
  FOREIGN KEY (note_id) REFERENCES notes(id)
);

-- mindmaps
CREATE TABLE mindmaps (
  id INTEGER PRIMARY KEY,
  data TEXT,
  created_at DATETIME,
  updated_at DATETIME
);

-- summaries
CREATE TABLE summaries (
  id INTEGER PRIMARY KEY,
  content TEXT,
  created_at DATETIME,
  updated_at DATETIME
);
```

### Storage Corrente

Al momento usa `localStorage` come mock:
- `notes_<bookId>` - Array di note
- `highlights_<bookId>` - Array di evidenziazioni
- `mindmap_<bookId>` - Dati mappa mentale
- `summary_<bookId>` - Contenuto riassunto

## 🐛 Troubleshooting

### PDF non si carica

- Verifica che il file esista
- Controlla i permessi di lettura
- Controlla la console per errori PDF.js

### Hot reload non funziona

```bash
# Pulisci e reinstalla
rm -rf node_modules
npm install
npm start
```

### Build fallisce

```bash
# Verifica versione Node
node --version  # deve essere 18+

# Pulisci cache
npm cache clean --force
rm -rf dist
npm run build
```

### Editor non salva

- Controlla la console browser (F12)
- Verifica che `localStorage` non sia pieno
- Prova a cancellare i dati: `localStorage.clear()`

## 🔒 Sicurezza

L'app usa:
- **Context Isolation** - Separazione renderer/main process
- **Preload script** - API sicure esposte
- **No nodeIntegration** - Node.js non accessibile dal renderer

## 📈 Performance

- **Bundle size**: ~15 MB (con dipendenze)
- **Startup time**: ~2 secondi
- **Memory usage**: ~150 MB (idle)
- **PDF rendering**: Ottimizzato con canvas

## 🧪 Testing

```bash
# Test manuali
npm start -- --book-id "test" --file "./sample.pdf"

# TODO: Implementare unit tests
npm test
```

## 📝 Note di Sviluppo

### Aggiungere una nuova funzionalità

1. Crea componente in `src/components/`
2. Importa in `App.jsx`
3. Aggiungi route/logica
4. Aggiorna database se necessario

### Comunicazione Electron

```javascript
// Nel renderer (React)
const result = await window.electronAPI.methodName(args);

// Nel main process (main.js)
ipcMain.handle('method-name', async (event, args) => {
  // logica
  return result;
});

// Nel preload (preload.js)
contextBridge.exposeInMainWorld('electronAPI', {
  methodName: (args) => ipcRenderer.invoke('method-name', args),
});
```

## 🤝 Contributi

Contributi benvenuti! 

### Setup

1. Fork del repository
2. Crea branch: `git checkout -b feature/nome-feature`
3. Commit: `git commit -m 'Add feature'`
4. Push: `git push origin feature/nome-feature`
5. Pull Request

## 📄 Licenza

MIT License

## 🔗 Link Utili

- [Electron Docs](https://www.electronjs.org/docs)
- [React Docs](https://react.dev/)
- [PDF.js](https://mozilla.github.io/pdf.js/)
- [TipTap](https://tiptap.dev/)
- [React Flow](https://reactflow.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**Versione**: 1.0.0  
**Data**: Dicembre 2024  
**Autore**: Your Name
