import React, { useState, useEffect, useRef } from 'react';
import IconPicker from './IconPicker';
import ColorPalette from './ColorPalette';
import {
  GENERIC_ICONS,
  ACTION_ICONS,
  getDefaultColorForIcon,
  getDefaultColorForAction,
  DEFAULT_HIGHLIGHT_COLOR,
  DEFAULT_NOTE_ICON,
  ANNOTATION_OPACITY
} from '../constants/annotations';

/**
 * Menu contestuale multi-livello per annotazioni PDF
 *
 * Due modalita':
 * - selection: dopo selezione testo (Aggiungi nota, Evidenziatura, Azioni Avanzate)
 * - annotation: click destro su annotazione esistente (Elimina)
 *
 * @param {string} type - 'selection' | 'annotation'
 * @param {{ x: number, y: number }} position - Posizione del menu
 * @param {function} onAddNote - Callback per aggiungere nota (riceve { iconId, color })
 * @param {function} onHighlight - Callback per creare highlight (riceve color)
 * @param {function} onCreateFlashcard - Callback per creare flashcard (riceve color)
 * @param {function} onCreateDictionary - Callback per creare voce dizionario (riceve color)
 * @param {function} onCreateKeyword - Callback per creare keyword (riceve color)
 * @param {function} onDelete - Callback per eliminare annotazione
 * @param {function} onClose - Callback per chiudere il menu
 * @param {object} documentDefaults - Default del documento { lastNoteIconId, highlightColor }
 * @param {object} customIconColors - Mappa iconId -> colore custom
 * @param {object} customActionColors - Mappa actionType -> colore custom
 */
function ContextMenu({
  type,
  position,
  onAddNote,
  onHighlight,
  onCreateFlashcard,
  onCreateDictionary,
  onCreateKeyword,
  onDelete,
  onClose,
  documentDefaults = {},
  customIconColors = {},
  customActionColors = {}
}) {
  // Stato espansione menu
  const [expandedSection, setExpandedSection] = useState(null); // null | 'note' | 'highlight' | 'actions'
  const [expandedAction, setExpandedAction] = useState(null);   // null | 'flashcard' | 'dictionary' | 'keyword'

  // Stato selezione per "Aggiungi Nota"
  const lastIconId = documentDefaults.lastNoteIconId || DEFAULT_NOTE_ICON;
  const [selectedIconId, setSelectedIconId] = useState(lastIconId);
  const [selectedNoteColor, setSelectedNoteColor] = useState(
    customIconColors[lastIconId] || getDefaultColorForIcon(lastIconId)
  );

  // Stato selezione per "Evidenziatura"
  const [selectedHighlightColor, setSelectedHighlightColor] = useState(
    documentDefaults.highlightColor || DEFAULT_HIGHLIGHT_COLOR
  );

  // Stato selezione per azioni (colore per tipo)
  const [actionColors, setActionColors] = useState({
    flashcard: customActionColors.flashcard || getDefaultColorForAction('flashcard'),
    dictionary: customActionColors.dictionary || getDefaultColorForAction('dictionary'),
    keyword: customActionColors.keyword || getDefaultColorForAction('keyword')
  });

  const menuRef = useRef(null);

  // Chiudi menu quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (expandedAction) {
          setExpandedAction(null);
        } else if (expandedSection) {
          setExpandedSection(null);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, expandedSection, expandedAction]);

  // Aggiorna colore quando cambia l'icona selezionata
  useEffect(() => {
    const newColor = customIconColors[selectedIconId] || getDefaultColorForIcon(selectedIconId);
    setSelectedNoteColor(newColor);
  }, [selectedIconId, customIconColors]);

  // Calcola posizione per evitare overflow fuori schermo
  const getAdjustedPosition = () => {
    const menuWidth = 280;
    const menuHeight = expandedSection ? 350 : 160;
    const padding = 10;

    let x = position.x;
    let y = position.y + 5;

    // Evita overflow a destra
    if (x + menuWidth > window.innerWidth - padding) {
      x = window.innerWidth - menuWidth - padding;
    }

    // Evita overflow in basso
    if (y + menuHeight > window.innerHeight - padding) {
      y = position.y - menuHeight - 5;
    }

    return { x: Math.max(padding, x), y: Math.max(padding, y) };
  };

  const adjustedPosition = getAdjustedPosition();

  // Handler per click su voce menu principale - ESEGUE AZIONE IMMEDIATAMENTE
  const handleSectionClick = (section) => {
    executeAction(section);
  };

  // Handler per click su freccia espansione - ESPANDE/COMPRIME SUBMENU
  const handleSectionExpandClick = (e, section) => {
    e.stopPropagation(); // Evita che si attivi anche handleSectionClick
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
      setExpandedAction(null);
    }
  };

  // Handler per click su azione avanzata - ESEGUE AZIONE IMMEDIATAMENTE
  const handleActionClick = (action) => {
    executeAction(action);
  };

  // Handler per click su freccia azione avanzata - ESPANDE/COMPRIME SUBMENU
  const handleActionExpandClick = (e, action) => {
    e.stopPropagation();
    if (expandedAction === action) {
      setExpandedAction(null);
    } else {
      setExpandedAction(action);
    }
  };

  // Esegue l'azione corrispondente
  const executeAction = (action) => {
    switch (action) {
      case 'note':
        if (onAddNote) {
          onAddNote({
            iconId: selectedIconId,
            color: selectedNoteColor,
            opacity: ANNOTATION_OPACITY.note
          });
        }
        onClose();
        break;

      case 'highlight':
        if (onHighlight) {
          onHighlight(selectedHighlightColor);
        }
        onClose();
        break;

      case 'flashcard':
        if (onCreateFlashcard) {
          onCreateFlashcard(actionColors.flashcard);
        }
        onClose();
        break;

      case 'dictionary':
        if (onCreateDictionary) {
          onCreateDictionary(actionColors.dictionary);
        }
        onClose();
        break;

      case 'keyword':
        if (onCreateKeyword) {
          onCreateKeyword(actionColors.keyword);
        }
        onClose();
        break;

      default:
        break;
    }
  };

  // Handler per selezione icona
  const handleIconSelect = (iconId) => {
    setSelectedIconId(iconId);
  };

  // Handler per selezione colore nota
  const handleNoteColorSelect = (color) => {
    setSelectedNoteColor(color);
  };

  // Handler per selezione colore highlight
  const handleHighlightColorSelect = (color) => {
    setSelectedHighlightColor(color);
  };

  // Handler per selezione colore azione
  const handleActionColorSelect = (actionType, color) => {
    setActionColors(prev => ({ ...prev, [actionType]: color }));
  };

  // Ottiene l'emoji dall'iconId
  const getEmojiForIconId = (iconId) => {
    const icon = GENERIC_ICONS.find(i => i.id === iconId);
    return icon?.emoji || '📝';
  };

  // Ottiene info azione
  const getActionInfo = (actionType) => {
    return ACTION_ICONS.find(a => a.id === actionType);
  };

  // Render per menu selezione testo
  const renderSelectionMenu = () => (
    <>
      {/* AGGIUNGI NOTA */}
      <div className="context-menu-section">
        <div className={`context-menu-item ${expandedSection === 'note' ? 'expanded' : ''}`}>
          <button
            className="context-menu-item-main"
            onClick={() => handleSectionClick('note')}
          >
            <span className="context-menu-icon">{getEmojiForIconId(selectedIconId)}</span>
            <span className="context-menu-label">Aggiungi nota</span>
            <span
              className="context-menu-color-preview"
              style={{ backgroundColor: selectedNoteColor }}
            />
          </button>
          <button
            className="context-menu-expand-btn"
            onClick={(e) => handleSectionExpandClick(e, 'note')}
            title="Personalizza"
          >
            <span className="context-menu-arrow">{expandedSection === 'note' ? '▼' : '▶'}</span>
          </button>
        </div>

        {expandedSection === 'note' && (
          <div className="context-menu-submenu">
            <div className="submenu-section">
              <label className="submenu-label">Tipo di annotazione:</label>
              <IconPicker
                icons={GENERIC_ICONS}
                selectedIconId={selectedIconId}
                onIconSelect={handleIconSelect}
              />
            </div>

            <div className="submenu-section">
              <label className="submenu-label">Colore:</label>
              <ColorPalette
                selectedColor={selectedNoteColor}
                onColorSelect={handleNoteColorSelect}
              />
            </div>

            <button
              className="context-menu-apply-btn"
              onClick={() => executeAction('note')}
            >
              Applica
            </button>
          </div>
        )}
      </div>

      <div className="context-menu-divider" />

      {/* EVIDENZIATURA */}
      <div className="context-menu-section">
        <div className={`context-menu-item ${expandedSection === 'highlight' ? 'expanded' : ''}`}>
          <button
            className="context-menu-item-main"
            onClick={() => handleSectionClick('highlight')}
          >
            <span className="context-menu-icon">🖍️</span>
            <span className="context-menu-label">Evidenziatura</span>
            <span
              className="context-menu-color-preview"
              style={{ backgroundColor: selectedHighlightColor }}
            />
          </button>
          <button
            className="context-menu-expand-btn"
            onClick={(e) => handleSectionExpandClick(e, 'highlight')}
            title="Personalizza"
          >
            <span className="context-menu-arrow">{expandedSection === 'highlight' ? '▼' : '▶'}</span>
          </button>
        </div>

        {expandedSection === 'highlight' && (
          <div className="context-menu-submenu">
            <div className="submenu-section">
              <label className="submenu-label">Colore:</label>
              <ColorPalette
                selectedColor={selectedHighlightColor}
                onColorSelect={handleHighlightColorSelect}
              />
            </div>

            <button
              className="context-menu-apply-btn"
              onClick={() => executeAction('highlight')}
            >
              Applica
            </button>
          </div>
        )}
      </div>

      <div className="context-menu-divider" />

      {/* AZIONI AVANZATE */}
      <div className="context-menu-section">
        <div
          className={`context-menu-item context-menu-item-expandable ${expandedSection === 'actions' ? 'expanded' : ''}`}
          onClick={() => setExpandedSection(expandedSection === 'actions' ? null : 'actions')}
        >
          <span className="context-menu-icon">📚</span>
          <span className="context-menu-label">Azioni Avanzate</span>
          <span className="context-menu-arrow">{expandedSection === 'actions' ? '▼' : '▶'}</span>
        </div>

        {expandedSection === 'actions' && (
          <div className="context-menu-submenu actions-submenu">
            {/* Flashcard */}
            <div className="action-item-wrapper">
              <div className={`context-menu-item sub-item ${expandedAction === 'flashcard' ? 'expanded' : ''}`}>
                <button
                  className="context-menu-item-main"
                  onClick={() => handleActionClick('flashcard')}
                >
                  <span className="context-menu-icon">🧠</span>
                  <span className="context-menu-label">Crea flashcard</span>
                  <span
                    className="context-menu-color-preview"
                    style={{ backgroundColor: actionColors.flashcard }}
                  />
                </button>
                <button
                  className="context-menu-expand-btn"
                  onClick={(e) => handleActionExpandClick(e, 'flashcard')}
                  title="Personalizza"
                >
                  <span className="context-menu-arrow">{expandedAction === 'flashcard' ? '▼' : '▶'}</span>
                </button>
              </div>

              {expandedAction === 'flashcard' && (
                <div className="context-menu-action-submenu">
                  <div className="submenu-section">
                    <label className="submenu-label">
                      Icona: <span className="fixed-icon">🧠</span> (fissa)
                    </label>
                  </div>
                  <div className="submenu-section">
                    <label className="submenu-label">Colore:</label>
                    <ColorPalette
                      selectedColor={actionColors.flashcard}
                      onColorSelect={(c) => handleActionColorSelect('flashcard', c)}
                    />
                  </div>
                  <button
                    className="context-menu-apply-btn"
                    onClick={() => executeAction('flashcard')}
                  >
                    Applica
                  </button>
                </div>
              )}
            </div>

            {/* Dizionario */}
            <div className="action-item-wrapper">
              <div className={`context-menu-item sub-item ${expandedAction === 'dictionary' ? 'expanded' : ''}`}>
                <button
                  className="context-menu-item-main"
                  onClick={() => handleActionClick('dictionary')}
                >
                  <span className="context-menu-icon">📖</span>
                  <span className="context-menu-label">Inserisci in dizionario</span>
                  <span
                    className="context-menu-color-preview"
                    style={{ backgroundColor: actionColors.dictionary }}
                  />
                </button>
                <button
                  className="context-menu-expand-btn"
                  onClick={(e) => handleActionExpandClick(e, 'dictionary')}
                  title="Personalizza"
                >
                  <span className="context-menu-arrow">{expandedAction === 'dictionary' ? '▼' : '▶'}</span>
                </button>
              </div>

              {expandedAction === 'dictionary' && (
                <div className="context-menu-action-submenu">
                  <div className="submenu-section">
                    <label className="submenu-label">
                      Icona: <span className="fixed-icon">📖</span> (fissa)
                    </label>
                  </div>
                  <div className="submenu-section">
                    <label className="submenu-label">Colore:</label>
                    <ColorPalette
                      selectedColor={actionColors.dictionary}
                      onColorSelect={(c) => handleActionColorSelect('dictionary', c)}
                    />
                  </div>
                  <button
                    className="context-menu-apply-btn"
                    onClick={() => executeAction('dictionary')}
                  >
                    Applica
                  </button>
                </div>
              )}
            </div>

            {/* Keyword */}
            <div className="action-item-wrapper">
              <div className={`context-menu-item sub-item ${expandedAction === 'keyword' ? 'expanded' : ''}`}>
                <button
                  className="context-menu-item-main"
                  onClick={() => handleActionClick('keyword')}
                >
                  <span className="context-menu-icon">🔑</span>
                  <span className="context-menu-label">Parola chiave</span>
                  <span
                    className="context-menu-color-preview"
                    style={{ backgroundColor: actionColors.keyword }}
                  />
                </button>
                <button
                  className="context-menu-expand-btn"
                  onClick={(e) => handleActionExpandClick(e, 'keyword')}
                  title="Personalizza"
                >
                  <span className="context-menu-arrow">{expandedAction === 'keyword' ? '▼' : '▶'}</span>
                </button>
              </div>

              {expandedAction === 'keyword' && (
                <div className="context-menu-action-submenu">
                  <div className="submenu-section">
                    <label className="submenu-label">
                      Icona: <span className="fixed-icon">🔑</span> (fissa)
                    </label>
                  </div>
                  <div className="submenu-section">
                    <label className="submenu-label">Colore:</label>
                    <ColorPalette
                      selectedColor={actionColors.keyword}
                      onColorSelect={(c) => handleActionColorSelect('keyword', c)}
                    />
                  </div>
                  <button
                    className="context-menu-apply-btn"
                    onClick={() => executeAction('keyword')}
                  >
                    Applica
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );

  // Render per menu annotazione esistente
  const renderAnnotationMenu = () => (
    <button
      className="context-menu-item danger"
      onClick={() => {
        if (onDelete) onDelete();
        onClose();
      }}
    >
      <span className="context-menu-icon">🗑️</span>
      <span className="context-menu-label">Elimina annotazione</span>
    </button>
  );

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        top: adjustedPosition.y,
        left: adjustedPosition.x
      }}
    >
      {type === 'selection' && renderSelectionMenu()}
      {type === 'annotation' && renderAnnotationMenu()}
    </div>
  );
}

export default ContextMenu;
