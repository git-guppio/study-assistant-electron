import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { getDatabase } from '../database/db';
import MindMapSelector from './MindMapSelector';
import MindMapDialog from './MindMapDialog';
import MindMapContextMenu from './MindMapContextMenu';
import { showConfirmDialog } from '../utils/confirmDialog';

// Nodo iniziale per nuove mappe
const createInitialNodes = (color = '#3b82f6') => [
  {
    id: '1',
    type: 'input',
    data: { label: 'Concetto Principale' },
    position: { x: 250, y: 25 },
    style: {
      background: color,
      color: 'white',
      border: `2px solid ${darkenColor(color, 20)}`,
      borderRadius: '8px',
      padding: '10px',
      fontSize: '14px',
      fontWeight: 'bold',
    },
  },
];

const initialEdges = [];

// Utility per scurire un colore
function darkenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) - amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) - amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) - amt));
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

// Utility per schiarire un colore
function lightenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function MindMap({ bookId }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [nodeLabel, setNodeLabel] = useState('');

  // Multi-mindmap state
  const [mindmaps, setMindmaps] = useState([]);
  const [selectedMapId, setSelectedMapId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('new'); // 'new' | 'rename' | 'color'
  const [editingMapId, setEditingMapId] = useState(null);

  // Auto-save con debounce
  const saveTimeoutRef = useRef(null);
  const hasChangesRef = useRef(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState({
    isOpen: false,
    position: { x: 0, y: 0 },
    type: null, // 'node' | 'edge'
    targetId: null,
    currentStyle: null
  });

  // Carica lista mappe all'avvio
  useEffect(() => {
    loadMindmaps();
  }, [bookId]);

  // Auto-save quando cambiano nodes o edges
  useEffect(() => {
    if (!selectedMapId || loading) return;

    hasChangesRef.current = true;

    // Debounce: salva dopo 1 secondo di inattività
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (hasChangesRef.current) {
        saveCurrentMap();
        hasChangesRef.current = false;
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, edges, selectedMapId]);

  const loadMindmaps = async () => {
    setLoading(true);
    const db = getDatabase();
    if (db) {
      const maps = await db.getAllMindmaps();
      setMindmaps(maps);

      if (maps.length > 0) {
        // Seleziona la mappa più recente
        const mostRecent = maps[0]; // già ordinato per updatedAt DESC
        setSelectedMapId(mostRecent.id);
        loadMapData(mostRecent);
      } else {
        // Crea prima mappa automaticamente
        await createFirstMap();
      }
    }
    setLoading(false);
  };

  const createFirstMap = async () => {
    const db = getDatabase();
    if (db) {
      const newMap = await db.createMindmap('Mappa 1', '#3b82f6');
      if (newMap) {
        setMindmaps([newMap]);
        setSelectedMapId(newMap.id);
        loadMapData(newMap);
      }
    }
  };

  const loadMapData = (map) => {
    if (map && map.data) {
      setNodes(map.data.nodes || createInitialNodes(map.color));
      setEdges(map.data.edges || initialEdges);
    } else {
      setNodes(createInitialNodes(map?.color || '#3b82f6'));
      setEdges(initialEdges);
    }
  };

  const saveCurrentMap = async () => {
    const db = getDatabase();
    if (db && selectedMapId) {
      await db.updateMindmapData(selectedMapId, { nodes, edges });
      console.log('[MindMap] Auto-saved map', selectedMapId);
    }
  };

  // Seleziona una mappa
  const handleSelectMap = async (id) => {
    // Salva mappa corrente prima di cambiare
    if (selectedMapId && hasChangesRef.current) {
      await saveCurrentMap();
      hasChangesRef.current = false;
    }

    setSelectedMapId(id);
    const map = mindmaps.find(m => m.id === id);
    if (map) {
      loadMapData(map);
    }
  };

  // Crea nuova mappa
  const handleNewMap = () => {
    setDialogMode('new');
    setEditingMapId(null);
    setDialogOpen(true);
  };

  const handleRenameMap = (id) => {
    setDialogMode('rename');
    setEditingMapId(id);
    setDialogOpen(true);
  };

  const handleChangeColor = (id) => {
    setDialogMode('color');
    setEditingMapId(id);
    setDialogOpen(true);
  };

  const handleDeleteMap = async (id) => {
    const map = mindmaps.find(m => m.id === id);
    if (!map) return;

    const confirmed = await showConfirmDialog({
      title: '🗑️ Elimina mappa',
      message: `Sei sicuro di voler eliminare la mappa "<b>${map.name}</b>"?<br>Questa azione non può essere annullata.`,
      confirmText: 'Elimina',
      confirmColor: '#dc2626'
    });

    if (confirmed) {
      const db = getDatabase();
      if (db) {
        await db.deleteMindmap(id);

        // Ricarica lista e seleziona altra mappa
        const updatedMaps = await db.getAllMindmaps();
        setMindmaps(updatedMaps);

        if (updatedMaps.length > 0) {
          const newSelected = updatedMaps[0];
          setSelectedMapId(newSelected.id);
          loadMapData(newSelected);
        }
      }
    }
  };

  // Gestisci salvataggio dialog
  const handleDialogSave = async ({ name, color }) => {
    const db = getDatabase();
    if (!db) return;

    if (dialogMode === 'new') {
      // Genera nome sequenziale
      const existingNames = mindmaps.map(m => m.name);
      let newName = name;
      if (!name) {
        let counter = mindmaps.length + 1;
        while (existingNames.includes(`Mappa ${counter}`)) {
          counter++;
        }
        newName = `Mappa ${counter}`;
      }

      const newMap = await db.createMindmap(newName, color);
      if (newMap) {
        const updatedMaps = await db.getAllMindmaps();
        setMindmaps(updatedMaps);
        setSelectedMapId(newMap.id);
        loadMapData(newMap);
      }
    } else if (dialogMode === 'rename' && editingMapId) {
      await db.updateMindmapInfo(editingMapId, { name });
      const updatedMaps = await db.getAllMindmaps();
      setMindmaps(updatedMaps);
    } else if (dialogMode === 'color' && editingMapId) {
      await db.updateMindmapInfo(editingMapId, { color });
      const updatedMaps = await db.getAllMindmaps();
      setMindmaps(updatedMaps);

      // Aggiorna colore nodo principale se è la mappa corrente
      if (editingMapId === selectedMapId) {
        setNodes(nds => nds.map(node => {
          if (node.type === 'input') {
            return {
              ...node,
              style: {
                ...node.style,
                background: color,
                border: `2px solid ${darkenColor(color, 20)}`,
              }
            };
          }
          return node;
        }));
      }
    }

    setDialogOpen(false);
  };

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { strokeWidth: 2 },
          },
          eds
        )
      ),
    [setEdges]
  );

  // Context menu handlers
  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    setContextMenu({
      isOpen: true,
      position: { x: event.clientX, y: event.clientY },
      type: 'node',
      targetId: node.id,
      currentStyle: node.style || {}
    });
  }, []);

  const onEdgeContextMenu = useCallback((event, edge) => {
    event.preventDefault();
    setContextMenu({
      isOpen: true,
      position: { x: event.clientX, y: event.clientY },
      type: 'edge',
      targetId: edge.id,
      currentStyle: edge.style || {}
    });
  }, []);

  const onPaneContextMenu = useCallback((event) => {
    // Chiudi il menu se si clicca sullo sfondo
    event.preventDefault();
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Update node style
  const handleUpdateNode = useCallback((nodeId, styleUpdates) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            style: {
              ...node.style,
              ...styleUpdates
            }
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  // Update edge style
  const handleUpdateEdge = useCallback((edgeId, styleUpdates) => {
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === edgeId) {
          return {
            ...edge,
            style: {
              ...edge.style,
              ...styleUpdates
            }
          };
        }
        return edge;
      })
    );
  }, [setEdges]);

  const addNode = () => {
    if (!nodeLabel.trim()) return;

    const selectedMap = mindmaps.find(m => m.id === selectedMapId);
    const mapColor = selectedMap?.color || '#3b82f6';

    const newNode = {
      id: `node_${Date.now()}`,
      data: { label: nodeLabel },
      position: {
        x: Math.random() * 500 + 100,
        y: Math.random() * 400 + 100,
      },
      style: {
        background: lightenColor(mapColor, 80),
        border: `2px solid ${mapColor}`,
        borderRadius: '8px',
        padding: '10px',
        fontSize: '12px',
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setNodeLabel('');
  };

  const clearMindmap = async () => {
    const confirmed = await showConfirmDialog({
      title: '🗺️ Cancella mappa',
      message: 'Vuoi cancellare tutti i nodi e collegamenti della mappa corrente?',
      confirmText: 'Cancella',
      confirmColor: '#dc2626'
    });

    if (confirmed) {
      const selectedMap = mindmaps.find(m => m.id === selectedMapId);
      const mapColor = selectedMap?.color || '#3b82f6';
      setNodes(createInitialNodes(mapColor));
      setEdges(initialEdges);
    }
  };

  const exportAsJSON = () => {
    const selectedMap = mindmaps.find(m => m.id === selectedMapId);
    const data = {
      name: selectedMap?.name || 'mindmap',
      color: selectedMap?.color,
      nodes,
      edges,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedMap?.name || 'mindmap'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedMap = mindmaps.find(m => m.id === selectedMapId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Caricamento mappe...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-3 bg-gray-50">
        {/* Selettore mappa */}
        <MindMapSelector
          mindmaps={mindmaps}
          selectedId={selectedMapId}
          onSelect={handleSelectMap}
          onNew={handleNewMap}
          onRename={handleRenameMap}
          onChangeColor={handleChangeColor}
          onDelete={handleDeleteMap}
        />

        {/* Input nuovo nodo */}
        <div className="flex items-center gap-2 mt-3 mb-2">
          <input
            type="text"
            value={nodeLabel}
            onChange={(e) => setNodeLabel(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addNode()}
            placeholder="Aggiungi nuovo concetto..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addNode}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            ➕ Aggiungi
          </button>
        </div>

        {/* Azioni mappa */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportAsJSON}
            className="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            📤 Esporta JSON
          </button>
          <button
            onClick={clearMindmap}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          >
            🗑️ Cancella
          </button>

          <div className="flex-1"></div>

          <div className="text-xs text-gray-600">
            {nodes.length} nodi • {edges.length} collegamenti
            {hasChangesRef.current && <span className="ml-2 text-orange-500">●</span>}
          </div>
        </div>

        <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-800">
          💡 <strong>Suggerimento:</strong> Aggiungi nodi e trascinali.
          Collega i concetti cliccando e trascinando dai cerchi sui bordi dei nodi.
          <span className="ml-2 text-green-600">Salvataggio automatico attivo.</span>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 bg-gray-50">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
          onPaneContextMenu={onPaneContextMenu}
          onPaneClick={closeContextMenu}
          fitView
          attributionPosition="bottom-right"
        >
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              if (node.type === 'input') return selectedMap?.color || '#3b82f6';
              return lightenColor(selectedMap?.color || '#3b82f6', 60);
            }}
            style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
            }}
          />
          <Background color="#e5e7eb" gap={16} />
        </ReactFlow>
      </div>

      {/* Legend */}
      <div className="border-t border-gray-200 p-2 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <span>🖱️ Click & Drag: Sposta</span>
            <span>⭕ Cerchi: Collega</span>
            <span>🖱️ Dx: Modifica stile</span>
            <span>🗑️ Del: Elimina</span>
          </div>
          <div>
            <span
              className="px-2 py-1 rounded text-xs text-white"
              style={{ backgroundColor: selectedMap?.color || '#3b82f6' }}
            >
              {selectedMap?.name || 'Nodo Principale'}
            </span>
          </div>
        </div>
      </div>

      {/* Dialog */}
      <MindMapDialog
        isOpen={dialogOpen}
        mode={dialogMode}
        initialName={editingMapId ? mindmaps.find(m => m.id === editingMapId)?.name : ''}
        initialColor={editingMapId ? mindmaps.find(m => m.id === editingMapId)?.color : '#3b82f6'}
        onClose={() => setDialogOpen(false)}
        onSave={handleDialogSave}
      />

      {/* Context Menu */}
      <MindMapContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        type={contextMenu.type}
        targetId={contextMenu.targetId}
        currentStyle={contextMenu.currentStyle}
        onClose={closeContextMenu}
        onUpdateNode={handleUpdateNode}
        onUpdateEdge={handleUpdateEdge}
      />
    </div>
  );
}

export default MindMap;
