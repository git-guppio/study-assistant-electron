# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Study Assistant is an Electron desktop app for studying PDF documents with integrated note-taking, mind mapping, and summary features. It can be launched standalone or from a Calibre plugin with book metadata.

## Development Commands

```bash
# Install dependencies
npm install

# Development mode (runs Vite dev server + Electron concurrently)
npm start

# Build frontend only
npm run build

# Package for distribution
npm run package              # Current platform
npm run package:win          # Windows
npm run package:mac          # macOS
npm run package:linux        # Linux
```

## Architecture

### Process Communication Model

The app follows Electron's **context isolation** pattern with three separate processes:

1. **Main Process** ([electron/main.js](electron/main.js))
   - Handles window creation and lifecycle
   - Parses CLI arguments from Calibre plugin (`--book-id`, `--title`, `--authors`, `--file`, `--format`)
   - Exposes IPC handlers for file I/O and system dialogs
   - Manages PDF file reading via `fs.readFileSync`

2. **Preload Script** ([electron/preload.js](electron/preload.js))
   - Creates secure `window.electronAPI` bridge using `contextBridge`
   - Only exposes whitelisted methods to renderer

3. **Renderer Process** ([src/](src/))
   - React app built with Vite
   - NO direct Node.js access (security)
   - All system operations go through `window.electronAPI`

### State Management

The app uses React's built-in state management:

- **App.jsx**: Top-level state
  - `bookInfo`: Book metadata from CLI args
  - `pdfPath`: Path to PDF file
  - `selectedText`: Text selected from PDF (flows to NotesEditor)
  - `highlights`: Array of PDF highlights
  - `activeTab`: Current tab ('notes' | 'mindmap' | 'summary')

### Data Flow: PDF Text Selection

This is the core interaction pattern:

```
1. User selects text in PDFViewer
   ↓
2. PDFViewer.handleMouseUp() captures selection + page number
   ↓
3. Shows context menu "Add to notes"
   ↓
4. onClick → calls onTextSelection(data)
   ↓
5. App.handleTextSelection() updates state + switches to 'notes' tab
   ↓
6. NotesEditor receives selectedText via props
   ↓
7. useEffect triggers editor.insertContent() with blockquote
```

### PDF Rendering Architecture

**Critical Implementation Details:**

- Uses PDF.js with **dual-layer rendering** ([src/components/PDFViewer.jsx](src/components/PDFViewer.jsx)):
  1. **Canvas Layer**: Visual rendering of PDF page
  2. **Text Layer**: Invisible, selectable text overlay (REQUIRED for text selection)

- Both layers MUST use identical viewport/scale to stay synchronized
- Text layer uses CSS variable `--scale-factor` for proper positioning
- HiDPI support via `devicePixelRatio` scaling on canvas

### Database Layer

Current: **localStorage mock** ([src/database/db.js](src/database/db.js))
- Keys: `notes_{bookId}`, `highlights_{bookId}`, `mindmap_{bookId}`, `summary_{bookId}`
- All data stored as JSON strings

Future: SQLite via IPC (main process only, not renderer)

### Component Hierarchy

```
App.jsx (bookInfo, selectedText, activeTab)
├── PDFViewer (left panel, 60% width)
│   ├── Canvas layer (PDF rendering)
│   └── Text layer (selection)
├── NotesEditor (right panel tab 1)
│   └── TipTap editor with toolbar
├── MindMap (right panel tab 2)
│   └── React Flow
└── SummaryEditor (right panel tab 3)
    └── TipTap editor
```

## Key Technical Constraints

### Electron IPC Pattern

Always use this pattern for new IPC features:

**Main process:**
```javascript
ipcMain.handle('method-name', async (event, args) => {
  // logic here
  return result;
});
```

**Preload:**
```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  methodName: (args) => ipcRenderer.invoke('method-name', args),
});
```

**Renderer:**
```javascript
const result = await window.electronAPI.methodName(args);
```

### PDF.js Configuration

- Worker source: CDN (`//cdnjs.cloudflare.com/ajax/libs/pdf.js/{version}/pdf.worker.min.js`)
- CMap URL required for proper text extraction: `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/`
- Always set `cMapPacked: true`

### TipTap Editor Extensions

Standard configuration used across NotesEditor and SummaryEditor:
- StarterKit (basic formatting)
- Image (URL-based)
- Link (with `openOnClick: false`)
- Highlight (multicolor support)

## Storage Keys by Feature

When adding new features that need persistence:

- **Notes**: `notes_{bookId}` - Array of `{id, content, pageNumber, selectionText, pdfCoordinates, createdAt, updatedAt}`
- **Highlights**: `highlights_{bookId}` - Array of `{id, pageNumber, text, color, coordinates, noteId, createdAt}`
- **Mindmap**: `mindmap_{bookId}` - Object `{data, updatedAt}`
- **Summary**: `summary_{bookId}` - Object `{content, updatedAt}`

## Calibre Integration

The app is designed to receive book metadata via CLI arguments:

```bash
electron . --book-id "123" --title "Book Title" --authors "Author Name" --file "C:/path/to/book.pdf" --format "PDF"
```

Parsing happens in [electron/main.js:15-41](electron/main.js#L15-L41).

## Build Configuration

- **Vite**: Development server on port 5173, builds to `dist/`
- **electron-builder**: Packages `dist/` + `electron/` folder
- **Base path**: Set to `./` for relative paths in production
- Dev detection: `process.env.NODE_ENV === 'development' || !app.isPackaged`

## Testing the App

```bash
# With a sample PDF
npm start -- --book-id "test" --file "C:/path/to/sample.pdf" --title "Test Book"

# Standalone (no PDF)
npm start
```

## Current Implementation Status

Fully implemented:
- PDF rendering with zoom and navigation
- Text selection from PDF
- Automatic insertion of selected text into notes as blockquotes
- Rich text note editor with formatting toolbar
- Mind map with React Flow
- Summary editor
- localStorage-based persistence

Not yet implemented:
- Persistent PDF highlights (rendered on canvas)
- SQLite database (currently uses localStorage)
- Bidirectional PDF ↔ notes linking
- Export to PDF
- Full-text search
