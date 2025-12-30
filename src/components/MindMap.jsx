import React, { useState, useCallback, useEffect } from 'react';
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

const initialNodes = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Concetto Principale' },
    position: { x: 250, y: 25 },
    style: {
      background: '#3b82f6',
      color: 'white',
      border: '2px solid #1e40af',
      borderRadius: '8px',
      padding: '10px',
      fontSize: '14px',
      fontWeight: 'bold',
    },
  },
];

const initialEdges = [];

function MindMap({ bookId }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [loading, setLoading] = useState(false);
  const [nodeLabel, setNodeLabel] = useState('');

  useEffect(() => {
    loadMindmap();
  }, [bookId]);

  const loadMindmap = async () => {
    const db = getDatabase();
    if (db) {
      const savedMindmap = await db.getMindmap();
      if (savedMindmap && savedMindmap.data) {
        setNodes(savedMindmap.data.nodes || initialNodes);
        setEdges(savedMindmap.data.edges || initialEdges);
      }
    }
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

  const addNode = () => {
    if (!nodeLabel.trim()) return;

    const newNode = {
      id: `node_${Date.now()}`,
      data: { label: nodeLabel },
      position: {
        x: Math.random() * 500 + 100,
        y: Math.random() * 400 + 100,
      },
      style: {
        background: '#f0f9ff',
        border: '2px solid #3b82f6',
        borderRadius: '8px',
        padding: '10px',
        fontSize: '12px',
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setNodeLabel('');
  };

  const handleSave = async () => {
    setLoading(true);
    const db = getDatabase();
    if (db) {
      await db.saveMindmap({
        nodes,
        edges,
      });
    }
    setLoading(false);
  };

  const clearMindmap = () => {
    if (confirm('Vuoi cancellare tutta la mappa mentale?')) {
      setNodes(initialNodes);
      setEdges(initialEdges);
    }
  };

  const exportAsJSON = () => {
    const data = {
      nodes,
      edges,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mindmap.json';
    a.click();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-3 bg-gray-50">
        <div className="flex items-center gap-2 mb-2">
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

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? '...' : '💾 Salva Mappa'}
          </button>
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
          </div>
        </div>

        <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-800">
          💡 <strong>Suggerimento:</strong> Aggiungi nodi e trascinali. 
          Collega i concetti cliccando e trascinando dai cerchi sui bordi dei nodi.
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
          fitView
          attributionPosition="bottom-right"
        >
          <Controls />
          <MiniMap 
            nodeColor={(node) => {
              if (node.type === 'input') return '#3b82f6';
              return '#f0f9ff';
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
            <span>🖱️ Click & Drag: Sposta nodi</span>
            <span>⭕ Cerchi: Crea collegamenti</span>
            <span>🗑️ Delete/Backspace: Elimina</span>
          </div>
          <div>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
              Nodo Principale
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MindMap;
