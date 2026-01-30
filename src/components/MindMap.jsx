import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { getDatabase } from '../database/db';
import MindMapSelector from './MindMapSelector';
import MindMapDialog from './MindMapDialog';
import MindMapContextMenu from './MindMapContextMenu';
import MindMapImageNode from './MindMapImageNode';
import MindMapTextNode from './MindMapTextNode';
import { showConfirmDialog } from '../utils/confirmDialog';

// Nodo iniziale per nuove mappe
const createInitialNodes = (color = '#3b82f6') => {
  const style = {
    background: color,
    color: 'white',
    border: `2px solid ${darkenColor(color, 20)}`,
    borderRadius: '8px',
    padding: '10px',
    fontSize: '14px',
    fontWeight: 'bold',
  };
  return [
    {
      id: '1',
      type: 'textNode',
      data: { label: 'Concetto Principale', style },
      position: { x: 250, y: 25 },
      // Non impostare node.style per nodi custom - usa solo data.style
    },
  ];
};

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

// Componente interno che usa useReactFlow
function MindMapInner({ bookId }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { screenToFlowPosition } = useReactFlow();
  const flowRef = useRef(null);

  // Multi-mindmap state
  const [mindmaps, setMindmaps] = useState([]);
  const [selectedMapId, setSelectedMapId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditingMap, setIsEditingMap] = useState(false);
  const [editingMapId, setEditingMapId] = useState(null);

  // Auto-save con debounce
  const saveTimeoutRef = useRef(null);
  const hasChangesRef = useRef(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState({
    isOpen: false,
    position: { x: 0, y: 0 },
    flowPosition: { x: 0, y: 0 },
    type: null,
    targetId: null,
    currentStyle: null,
    isImageNode: false
  });

  // Handler per resize immagini
  const handleImageResize = useCallback((nodeId, dimensions) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId && node.type === 'imageNode') {
          return {
            ...node,
            data: {
              ...node.data,
              width: dimensions.width,
              height: dimensions.height
            }
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  // Handler per cambio label dei nodi testo
  const handleLabelChange = useCallback((nodeId, newLabel) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              label: newLabel
            }
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  // Tipi di nodo custom
  const nodeTypes = useMemo(() => ({
    textNode: (props) => (
      <MindMapTextNode
        {...props}
        data={{ ...props.data, onLabelChange: handleLabelChange }}
      />
    ),
    imageNode: (props) => (
      <MindMapImageNode
        {...props}
        data={{ ...props.data, onResize: handleImageResize }}
      />
    )
  }), [handleImageResize, handleLabelChange]);

  // Carica lista mappe all'avvio
  useEffect(() => {
    loadMindmaps();
  }, [bookId]);

  // Auto-save quando cambiano nodes o edges
  useEffect(() => {
    if (!selectedMapId || loading) return;

    hasChangesRef.current = true;

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

  // Handler per Ctrl+V (incolla immagine)
  useEffect(() => {
    const handlePaste = async (e) => {
      if (!flowRef.current?.contains(document.activeElement) &&
          document.activeElement !== flowRef.current) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            const base64 = await blobToBase64(blob);
            const centerPosition = screenToFlowPosition({
              x: window.innerWidth / 2,
              y: window.innerHeight / 2
            });
            addImageNode(base64, centerPosition);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [screenToFlowPosition]);

  // Handler per tasto DEL (elimina nodi selezionati)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Verifica che il focus sia nel canvas della mappa
      if (!flowRef.current?.contains(document.activeElement) &&
          document.activeElement !== flowRef.current) {
        return;
      }

      // Ignora se siamo in un input o textarea
      if (document.activeElement?.tagName === 'INPUT' ||
          document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();

        // Trova nodi selezionati
        const selectedNodes = nodes.filter(node => node.selected);

        if (selectedNodes.length > 0) {
          const selectedIds = selectedNodes.map(n => n.id);

          // Rimuovi nodi selezionati
          setNodes(nds => nds.filter(node => !node.selected));

          // Rimuovi anche gli edge collegati ai nodi eliminati
          setEdges(eds => eds.filter(edge =>
            !selectedIds.includes(edge.source) && !selectedIds.includes(edge.target)
          ));
        }

        // Trova edge selezionati
        const selectedEdges = edges.filter(edge => edge.selected);
        if (selectedEdges.length > 0) {
          setEdges(eds => eds.filter(edge => !edge.selected));
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [nodes, edges, setNodes, setEdges]);

  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const addImageNode = useCallback((imageData, position) => {
    const newNode = {
      id: `img_${Date.now()}`,
      type: 'imageNode',
      position: position,
      data: {
        image: imageData,
        width: 150,
        height: 150
      }
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  const loadMindmaps = async () => {
    setLoading(true);
    const db = getDatabase();
    if (db) {
      const maps = await db.getAllMindmaps();
      setMindmaps(maps);

      if (maps.length > 0) {
        const mostRecent = maps[0];
        setSelectedMapId(mostRecent.id);
        loadMapData(mostRecent);
      } else {
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

  const handleSelectMap = async (id) => {
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

  const handleNewMap = () => {
    setIsEditingMap(false);
    setEditingMapId(null);
    setDialogOpen(true);
  };

  const handleEditMap = (id) => {
    setIsEditingMap(true);
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

  const handleDialogSave = async ({ name, color }) => {
    const db = getDatabase();
    if (!db) return;

    if (!isEditingMap) {
      // Nuova mappa
      const newMap = await db.createMindmap(name, color);
      if (newMap) {
        const updatedMaps = await db.getAllMindmaps();
        setMindmaps(updatedMaps);
        setSelectedMapId(newMap.id);
        loadMapData(newMap);
      }
    } else if (editingMapId) {
      // Modifica mappa esistente
      await db.updateMindmapInfo(editingMapId, { name, color });
      const updatedMaps = await db.getAllMindmaps();
      setMindmaps(updatedMaps);

      // Aggiorna colore nodo principale se è la mappa corrente
      if (editingMapId === selectedMapId) {
        setNodes(nds => nds.map(node => {
          // Il nodo principale è quello con id '1'
          if (node.id === '1' && node.type === 'textNode') {
            const currentStyle = node.data?.style || {};
            return {
              ...node,
              style: undefined,
              data: {
                ...node.data,
                style: {
                  ...currentStyle,
                  background: color,
                  border: `2px solid ${darkenColor(color, 20)}`,
                }
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
      flowPosition: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
      type: 'node',
      targetId: node.id,
      currentStyle: node.data?.style || node.style || {},
      isImageNode: node.type === 'imageNode'
    });
  }, [screenToFlowPosition]);

  const onEdgeContextMenu = useCallback((event, edge) => {
    event.preventDefault();
    setContextMenu({
      isOpen: true,
      position: { x: event.clientX, y: event.clientY },
      flowPosition: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
      type: 'edge',
      targetId: edge.id,
      currentStyle: edge.style || {},
      isImageNode: false
    });
  }, [screenToFlowPosition]);

  const onPaneContextMenu = useCallback((event) => {
    event.preventDefault();
    const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    setContextMenu({
      isOpen: true,
      position: { x: event.clientX, y: event.clientY },
      flowPosition: flowPos,
      type: 'pane',
      targetId: null,
      currentStyle: null,
      isImageNode: false
    });
  }, [screenToFlowPosition]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Update node style
  const handleUpdateNode = useCallback((nodeId, styleUpdates) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          const currentStyle = node.data?.style || node.style || {};
          const newStyle = {
            ...currentStyle,
            ...styleUpdates
          };
          return {
            ...node,
            // Rimuovi node.style per evitare doppia cornice
            style: undefined,
            data: {
              ...node.data,
              style: newStyle
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
          const updatedEdge = {
            ...edge,
            style: {
              ...edge.style,
              ...styleUpdates
            }
          };

          // Se viene cambiato il colore della linea, aggiorna anche il colore della freccia
          if (styleUpdates.stroke) {
            updatedEdge.markerEnd = {
              type: MarkerType.ArrowClosed,
              color: styleUpdates.stroke
            };
          }

          return updatedEdge;
        }
        return edge;
      })
    );
  }, [setEdges]);

  // Elimina nodo
  const handleDeleteNode = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    // Elimina anche gli edge collegati
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
  }, [setNodes, setEdges]);

  // Duplica nodo
  const handleDuplicateNode = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const newNode = {
      ...node,
      id: `${node.type === 'imageNode' ? 'img' : 'node'}_${Date.now()}`,
      position: {
        x: node.position.x + 50,
        y: node.position.y + 50
      },
      data: { ...node.data },
      // Non impostare node.style per textNode per evitare doppia cornice
      style: node.type === 'imageNode' && node.style ? { ...node.style } : undefined
    };

    setNodes((nds) => [...nds, newNode]);
  }, [nodes, setNodes]);

  // Elimina edge
  const handleDeleteEdge = useCallback((edgeId) => {
    setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
  }, [setEdges]);

  // Aggiungi nodo in una posizione specifica
  const handleAddNodeAtPosition = useCallback((position) => {
    const selectedMap = mindmaps.find(m => m.id === selectedMapId);
    const mapColor = selectedMap?.color || '#3b82f6';

    const style = {
      background: lightenColor(mapColor, 80),
      border: `2px solid ${mapColor}`,
      borderRadius: '8px',
      padding: '10px',
      fontSize: '12px',
    };

    const newNode = {
      id: `node_${Date.now()}`,
      type: 'textNode',
      data: { label: 'Nuovo concetto', style },
      position: position,
      // Non impostare node.style per nodi custom - usa solo data.style
    };

    setNodes((nds) => [...nds, newNode]);
  }, [setNodes, mindmaps, selectedMapId]);

  // Incolla immagine da clipboard in una posizione
  const handlePasteImageAtPosition = useCallback(async (position) => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find(type => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const base64 = await blobToBase64(blob);
          addImageNode(base64, position);
          return;
        }
      }
      console.log('[MindMap] Nessuna immagine negli appunti');
    } catch (err) {
      console.error('[MindMap] Errore lettura clipboard:', err);
    }
  }, [addImageNode]);

  // Carica immagine da file
  const handleAddImageFromFile = useCallback((position) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const base64 = await blobToBase64(file);
        addImageNode(base64, position);
      }
    };
    input.click();
  }, [addImageNode]);

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
      {/* Toolbar compatta */}
      <div className="border-b border-gray-200 p-2 bg-gray-50">
        <div className="flex items-center justify-between">
          <MindMapSelector
            mindmaps={mindmaps}
            selectedId={selectedMapId}
            onSelect={handleSelectMap}
            onNew={handleNewMap}
            onEdit={handleEditMap}
            onDelete={handleDeleteMap}
          />

          <div className="text-xs text-gray-500">
            {nodes.length} nodi • {edges.length} collegamenti
          </div>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 bg-gray-50" ref={flowRef} tabIndex={0}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
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
              if (node.type === 'imageNode') return '#94a3b8';
              // Usa il colore dal data.style se disponibile
              const bgColor = node.data?.style?.background;
              if (bgColor) {
                // Se è rgba, estrai il colore base
                if (bgColor.startsWith('rgba')) {
                  const match = bgColor.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
                  if (match) {
                    return `rgb(${match[1]}, ${match[2]}, ${match[3]})`;
                  }
                }
                return bgColor;
              }
              return selectedMap?.color || '#3b82f6';
            }}
            style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
            }}
          />
          <Background color="#e5e7eb" gap={16} />
        </ReactFlow>
      </div>

      {/* Dialog */}
      <MindMapDialog
        isOpen={dialogOpen}
        isEditing={isEditingMap}
        initialName={editingMapId ? mindmaps.find(m => m.id === editingMapId)?.name : ''}
        initialColor={editingMapId ? mindmaps.find(m => m.id === editingMapId)?.color : '#3b82f6'}
        onClose={() => setDialogOpen(false)}
        onSave={handleDialogSave}
      />

      {/* Context Menu */}
      <MindMapContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        flowPosition={contextMenu.flowPosition}
        type={contextMenu.type}
        targetId={contextMenu.targetId}
        currentStyle={contextMenu.currentStyle}
        isImageNode={contextMenu.isImageNode}
        onClose={closeContextMenu}
        onUpdateNode={handleUpdateNode}
        onUpdateEdge={handleUpdateEdge}
        onAddNode={handleAddNodeAtPosition}
        onAddImage={handleAddImageFromFile}
        onPasteImage={handlePasteImageAtPosition}
        onDeleteNode={handleDeleteNode}
        onDuplicateNode={handleDuplicateNode}
        onDeleteEdge={handleDeleteEdge}
      />
    </div>
  );
}

// Wrapper con ReactFlowProvider
function MindMap({ bookId }) {
  return (
    <ReactFlowProvider>
      <MindMapInner bookId={bookId} />
    </ReactFlowProvider>
  );
}

export default MindMap;
