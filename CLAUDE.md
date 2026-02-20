# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Study Assistant is an Electron-based desktop application for studying PDFs. It integrates PDF viewing with note-taking, annotations, mind maps, flashcards, and a dictionary. The app is designed to work with Calibre ebook management software.

## Development Commands

```bash
# Start development (Vite dev server + Electron)
npm start

# Build for production
npm run build

# Package for distribution
npm run package          # Auto-detect OS
npm run package:win      # Windows
npm run package:mac      # macOS
npm run package:linux    # Linux
```

The dev server runs on `localhost:5173`. Electron loads from the dev server in development and from `dist/index.html` in production.

## Architecture

### Process Model (Electron)

```
Main Process (main-process/main.js)
├── Window management
├── IPC handlers for all database operations
├── File dialogs and system integration
├── CLI argument parsing (--book-id, --title, --file)
│
└── Preload Bridge (main-process/preload.js)
    └── Exposes window.electronAPI to renderer
        └── React Renderer (src/App.jsx)
            ├── PDFViewer (left 60%)
            └── Tabbed panels (right 40%): Notes, MindMap, Summary
```

**Security**: Context isolation is enabled. The renderer cannot access Node.js directly; all system operations go through IPC handlers exposed via the preload script.

### Key Modules

- **main-process/database.js**: SQLite database management using sql.js. Stores one `.db` file per book in the PDF's directory.
- **src/database/db.js**: DatabaseManager class that wraps IPC calls for the renderer.
- **src/components/PDFViewer.jsx**: PDF rendering with PDF.js, handles zoom, navigation, text selection, and annotation overlays.
- **src/components/NotesEditor.jsx**: TipTap-based rich text editor with custom PDF note blocks.
- **src/extensions/PdfNoteBlock.js**: Custom TipTap extension for embedding PDF annotations in notes.

### Database Schema

The SQLite database stores: `notes`, `annotations`, `highlights`, `mindmaps`, `summaries`, `flashcards`, `dictionary_entries`, `keywords`, `document_defaults`, `custom_icon_colors`, `custom_action_colors`.

### Annotation System

Annotations appear as gutter icons on the PDF's left margin. Types include highlights, notes, flashcards, dictionary entries, and keywords. Each annotation links to a specific page and optional text selection coordinates.


## Start Application
Use two terminal:
Terminal 1
- taskkill /f /im node.exe
- npm run dev
Terminal 2
- npx electron . --book-id "1" --title "Test Book" --authors "Test Author" --file "C:\Test_PDF\The_Universal_Computer.pdf" --format "PDF"

## Tech Stack

- **Electron 28** + **React 18** + **Vite 5**
- **PDF.js 3.11** for PDF rendering
- **TipTap 2.1** for rich text editing
- **React Flow 11** for mind maps
- **sql.js 1.13** for SQLite in Node.js
- **Tailwind CSS 3.4** for styling
