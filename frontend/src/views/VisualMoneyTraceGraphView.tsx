import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Network, Search, ZoomIn, ZoomOut, RotateCcw, Filter,
  Layers, ExternalLink, ShieldAlert, FileText, ArrowRight,
  Info, CheckCircle2, AlertTriangle, ListFilter, Building2, MapPin
} from 'lucide-react';
import { api } from '../api/client';
import { GraphData, GraphNode, GraphEdge } from '../types';
import { EvidenceBadge } from '../components/EvidenceBadge';

interface VisualMoneyTraceGraphViewProps {
  initialFocusType?: 'road' | 'work_order' | 'ward';
  initialFocusId?: string;
  onOpenPassport: (roadId: string) => void;
  onOpenWorkOrder: (woId: string) => void;
  onNavigateToWard: (wardCode: string) => void;
}

// Category styling metadata
const CATEGORY_STYLES: Record<string, { bg: string; border: string; text: string; fill: string; dot: string; label: string }> = {
  financial: {
    bg: 'bg-indigo-950/80',
    border: 'border-indigo-500/60',
    text: 'text-indigo-300',
    fill: '#6366f1',
    dot: 'bg-indigo-400',
    label: 'Ward Budget'
  },
  road_asset: {
    bg: 'bg-teal-950/80',
    border: 'border-teal-500/60',
    text: 'text-teal-300',
    fill: '#14b8a6',
    dot: 'bg-teal-400',
    label: 'Road Asset'
  },
  work_order: {
    bg: 'bg-amber-950/80',
    border: 'border-amber-500/60',
    text: 'text-amber-300',
    fill: '#f59e0b',
    dot: 'bg-amber-400',
    label: 'Work Order'
  },
  contractor: {
    bg: 'bg-blue-950/80',
    border: 'border-blue-500/60',
    text: 'text-blue-300',
    fill: '#3b82f6',
    dot: 'bg-blue-400',
    label: 'Contractor'
  },
  citizen: {
    bg: 'bg-emerald-950/80',
    border: 'border-emerald-500/60',
    text: 'text-emerald-300',
    fill: '#10b981',
    dot: 'bg-emerald-400',
    label: 'Citizen Complaint'
  },
  outcome_audit: {
    bg: 'bg-rose-950/80',
    border: 'border-rose-500/60',
    text: 'text-rose-300',
    fill: '#f43f5e',
    dot: 'bg-rose-400',
    label: 'Outcome / Audit'
  }
};

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export const VisualMoneyTraceGraphView: React.FC<VisualMoneyTraceGraphViewProps> = ({
  initialFocusType = 'road',
  initialFocusId = 'RD_KE_01',
  onOpenPassport,
  onOpenWorkOrder,
  onNavigateToWard
}) => {
  const [focusType, setFocusType] = useState<'road' | 'work_order' | 'ward'>(initialFocusType);
  const [focusId, setFocusId] = useState<string>(initialFocusId);
  const [inputVal, setInputVal] = useState<string>(initialFocusId);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter toggles
  const [activeCategories, setActiveCategories] = useState<Record<string, boolean>>({
    financial: true,
    road_asset: true,
    work_order: true,
    contractor: true,
    citizen: true,
    outcome_audit: true
  });

  // Selected node for slide-over inspection
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // View mode: 'canvas' or 'list'
  const [viewMode, setViewMode] = useState<'canvas' | 'list'>('canvas');

  // Canvas pan & zoom state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Node positions in simulation
  const [nodesPos, setNodesPos] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Fetch graph data
  const loadGraph = async (type: 'road' | 'work_order' | 'ward', id: string) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedNode(null);

      const params: { road_id?: string; work_order_id?: string; ward_code?: string; max_work_orders: number } = {
        max_work_orders: 8
      };
      if (type === 'road') params.road_id = id;
      if (type === 'work_order') params.work_order_id = id;
      if (type === 'ward') params.ward_code = id;

      const data = await api.getGraph(params);
      setGraphData(data);

      // Initialize radial / layered layout around center (400, 300)
      const centerX = 450;
      const centerY = 320;
      const posMap = new Map<string, { x: number; y: number }>();

      // Group nodes by category to create a logical radial/hierarchical orbit
      const wardNodes = data.nodes.filter(n => n.category === 'financial');
      const roadNodes = data.nodes.filter(n => n.category === 'road_asset');
      const woNodes = data.nodes.filter(n => n.category === 'work_order');
      const contractorNodes = data.nodes.filter(n => n.category === 'contractor');
      const citizenNodes = data.nodes.filter(n => n.category === 'citizen');
      const outcomeNodes = data.nodes.filter(n => n.category === 'outcome_audit');

      // Place root or main hub at center
      let hubPlaced = false;
      if (type === 'road' && roadNodes.length > 0) {
        posMap.set(roadNodes[0].id, { x: centerX, y: centerY });
        hubPlaced = true;
      } else if (type === 'work_order' && woNodes.length > 0) {
        posMap.set(woNodes[0].id, { x: centerX, y: centerY });
        hubPlaced = true;
      } else if (type === 'ward' && wardNodes.length > 0) {
        posMap.set(wardNodes[0].id, { x: centerX, y: centerY });
        hubPlaced = true;
      }

      const placeInCircle = (items: GraphNode[], radius: number, startAngle: number = 0, angleSpan: number = Math.PI * 2) => {
        const step = items.length > 1 ? angleSpan / items.length : 0;
        items.forEach((item, idx) => {
          if (!posMap.has(item.id)) {
            const angle = startAngle + idx * step;
            posMap.set(item.id, {
              x: centerX + Math.cos(angle) * radius,
              y: centerY + Math.sin(angle) * radius
            });
          }
        });
      };

      // Place categories at concentric rings
      placeInCircle(wardNodes, 120, -Math.PI / 2, Math.PI);
      placeInCircle(roadNodes, 180, 0, Math.PI * 2);
      placeInCircle(woNodes, 270, 0.4, Math.PI * 2);
      placeInCircle(contractorNodes, 360, Math.PI * 0.7, Math.PI * 0.8);
      placeInCircle(citizenNodes, 380, -Math.PI * 0.6, Math.PI * 0.9);
      placeInCircle(outcomeNodes, 400, Math.PI * 0.2, Math.PI * 0.6);

      // Catch-all for any unplaced
      data.nodes.forEach((n, idx) => {
        if (!posMap.has(n.id)) {
          posMap.set(n.id, {
            x: centerX + (idx % 2 === 0 ? 250 : -250),
            y: centerY + (idx * 30 - 150)
          });
        }
      });

      setNodesPos(posMap);
      setPan({ x: 0, y: 0 });
      setZoom(1);

      // Default select the root node or first work order
      const initialSel = data.nodes.find(n => n.id.toLowerCase() === id.toLowerCase()) || data.nodes[0];
      if (initialSel) setSelectedNode(initialSel);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to construct money trace graph');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGraph(focusType, focusId);
  }, [focusType, focusId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      setFocusId(inputVal.trim());
    }
  };

  // Filtered nodes and edges
  const visibleNodes = useMemo(() => {
    if (!graphData) return [];
    return graphData.nodes.filter(n => activeCategories[n.category] !== false);
  }, [graphData, activeCategories]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map(n => n.id)), [visibleNodes]);

  const visibleEdges = useMemo(() => {
    if (!graphData) return [];
    return graphData.edges.filter(
      e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    );
  }, [graphData, visibleNodeIds]);

  // Connected edges for the selected node
  const selectedNodeEdges = useMemo(() => {
    if (!selectedNode || !graphData) return { incoming: [], outgoing: [] };
    const incoming = graphData.edges.filter(e => e.target === selectedNode.id);
    const outgoing = graphData.edges.filter(e => e.source === selectedNode.id);
    return { incoming, outgoing };
  }, [selectedNode, graphData]);

  // Pan & Zoom handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom(prev => Math.min(Math.max(prev * factor, 0.4), 3.0));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || draggedNodeId) return; // Only primary button and not dragging node
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedNodeId && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const rawX = (e.clientX - rect.left - pan.x) / zoom;
      const rawY = (e.clientY - rect.top - pan.y) / zoom;
      setNodesPos(prev => {
        const next = new Map(prev);
        next.set(draggedNodeId, { x: rawX, y: rawY });
        return next;
      });
      return;
    }

    if (!isPanning) return;
    setPan({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedNodeId(null);
  };

  const toggleCategory = (cat: string) => {
    setActiveCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Controls Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-4 z-10">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-teal-500/10 text-teal-400 rounded-lg border border-teal-500/20">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-semibold text-white tracking-tight">Visual Money Trace Graph</h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-teal-950 border border-teal-800 text-teal-300">
                Deterministic Linkage
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive civic-finance subgraph: citizen complaints → work orders → contractors → outcome audits.
            </p>
          </div>
        </div>

        {/* Pivot Search Form */}
        <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2">
          <select
            value={focusType}
            onChange={e => {
              const val = e.target.value as 'road' | 'work_order' | 'ward';
              setFocusType(val);
              if (val === 'road') setInputVal('RD_KE_01');
              if (val === 'work_order') setInputVal('WO_0001');
              if (val === 'ward') setInputVal('K/E');
            }}
            className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-teal-500"
          >
            <option value="road">Road ID</option>
            <option value="work_order">Work Order ID</option>
            <option value="ward">Ward Code</option>
          </select>

          <div className="relative">
            <input
              type="text"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder="e.g. RD_KE_01, WO_0001..."
              className="w-44 bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded pl-7 pr-3 py-1.5 focus:outline-none focus:border-teal-500 font-mono"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
          </div>

          <button
            type="submit"
            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium rounded transition"
          >
            Trace
          </button>
        </form>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded p-0.5 text-xs">
          <button
            onClick={() => setViewMode('canvas')}
            className={`px-3 py-1 rounded font-medium transition ${
              viewMode === 'canvas' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Graph Canvas
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded font-medium transition ${
              viewMode === 'list' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Structured List
          </button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-6 py-2 flex items-center justify-between text-xs overflow-x-auto">
        <div className="flex items-center space-x-2">
          <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1 uppercase tracking-wider mr-2">
            <Filter className="w-3 h-3 text-slate-400" /> Filter Layers:
          </span>
          {Object.entries(CATEGORY_STYLES).map(([key, style]) => {
            const isActive = activeCategories[key] !== false;
            return (
              <button
                key={key}
                onClick={() => toggleCategory(key)}
                className={`px-2.5 py-1 rounded-full border text-[11px] font-medium flex items-center space-x-1.5 transition ${
                  isActive
                    ? `${style.bg} ${style.border} ${style.text}`
                    : 'bg-slate-900/40 border-slate-800 text-slate-500 line-through'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                <span>{style.label}</span>
              </button>
            );
          })}
        </div>

        {graphData && (
          <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-3">
            <span>Nodes: <strong className="text-slate-200">{visibleNodes.length}</strong></span>
            <span>Links: <strong className="text-slate-200">{visibleEdges.length}</strong></span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex relative overflow-hidden">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3 bg-slate-950">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-medium tracking-wide">Tracing financial relationship graph...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20 mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-white">Graph Assembly Error</h3>
            <p className="text-xs text-slate-400 max-w-md mt-1 mb-4">{error}</p>
            <button
              onClick={() => loadGraph(focusType, focusId)}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded border border-slate-700"
            >
              Retry
            </button>
          </div>
        ) : viewMode === 'canvas' ? (
          /* Canvas Graph Renderer */
          <div className="flex-1 relative bg-slate-950 overflow-hidden cursor-grab active:cursor-grabbing select-none">
            {/* Canvas Zoom Controls Floating */}
            <div className="absolute top-4 left-4 z-10 flex flex-col bg-slate-900/90 border border-slate-800 rounded-lg p-1 shadow-xl space-y-1 backdrop-blur-sm">
              <button
                onClick={() => setZoom(z => Math.min(z * 1.2, 3.0))}
                title="Zoom In"
                className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom(z => Math.max(z * 0.8, 0.4))}
                title="Zoom Out"
                className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                title="Reset View"
                className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <div className="text-[10px] text-center font-mono text-slate-500 pt-1 border-t border-slate-800">
                {Math.round(zoom * 100)}%
              </div>
            </div>

            {/* Canvas Hint */}
            <div className="absolute bottom-4 left-4 z-10 pointer-events-none text-[11px] text-slate-500 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800/80">
              Drag canvas to pan · Scroll to zoom · Click node to inspect evidence · Drag node to reposition
            </div>

            <svg
              ref={svgRef}
              className="w-full h-full"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onWheel={handleWheel}
            >
              <defs>
                {/* Edge Arrowhead markers */}
                <marker
                  id="arrow-default"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#475569" />
                </marker>
                <marker
                  id="arrow-active"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#14b8a6" />
                </marker>
              </defs>

              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {/* 1. Draw Edges */}
                {visibleEdges.map(edge => {
                  const sPos = nodesPos.get(edge.source);
                  const tPos = nodesPos.get(edge.target);
                  if (!sPos || !tPos) return null;

                  const isConnectedToSelected =
                    selectedNode && (edge.source === selectedNode.id || edge.target === selectedNode.id);

                  // Calculate mid-point for edge label
                  const midX = (sPos.x + tPos.x) / 2;
                  const midY = (sPos.y + tPos.y) / 2;

                  return (
                    <g key={edge.id} className="transition-all">
                      <line
                        x1={sPos.x}
                        y1={sPos.y}
                        x2={tPos.x}
                        y2={tPos.y}
                        stroke={isConnectedToSelected ? '#14b8a6' : '#334155'}
                        strokeWidth={isConnectedToSelected ? 2.5 : 1.2}
                        strokeDasharray={edge.relation_type.includes('audit') ? '4 3' : 'none'}
                        markerEnd={isConnectedToSelected ? 'url(#arrow-active)' : 'url(#arrow-default)'}
                      />
                      {/* Edge Label pill on hover or connection */}
                      {isConnectedToSelected && (
                        <g transform={`translate(${midX}, ${midY})`}>
                          <rect
                            x={-40}
                            y={-9}
                            width={80}
                            height={18}
                            rx={4}
                            fill="#0f172a"
                            stroke="#14b8a6"
                            strokeWidth={0.8}
                          />
                          <text
                            textAnchor="middle"
                            dy={3.5}
                            fontSize={9}
                            fill="#94a3b8"
                            className="font-mono select-none"
                          >
                            {edge.label.length > 14 ? edge.label.substring(0, 12) + '...' : edge.label}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* 2. Draw Nodes */}
                {visibleNodes.map(node => {
                  const pos = nodesPos.get(node.id) || { x: 300, y: 300 };
                  const isSelected = selectedNode?.id === node.id;
                  const style = CATEGORY_STYLES[node.category] || CATEGORY_STYLES.road_asset;

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      className="cursor-pointer"
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedNode(node);
                      }}
                      onMouseDown={e => {
                        e.stopPropagation();
                        setDraggedNodeId(node.id);
                      }}
                    >
                      {/* Pulse circle for selected */}
                      {isSelected && (
                        <circle
                          r={34}
                          fill="none"
                          stroke={style.fill}
                          strokeWidth={2}
                          strokeDasharray="4 3"
                          className="animate-spin"
                          style={{ animationDuration: '8s' }}
                        />
                      )}

                      {/* Main Node Body */}
                      <circle
                        r={24}
                        fill={isSelected ? '#0f172a' : '#1e293b'}
                        stroke={isSelected ? style.fill : '#475569'}
                        strokeWidth={isSelected ? 3 : 1.5}
                        className="transition-all hover:stroke-teal-400"
                      />

                      {/* Inner category icon / initial */}
                      <circle
                        r={6}
                        cy={-8}
                        fill={style.fill}
                      />

                      {/* Node Text inside / below */}
                      <text
                        textAnchor="middle"
                        dy={8}
                        fontSize={10}
                        fontWeight="bold"
                        fill="#f8fafc"
                        className="select-none font-mono tracking-tight"
                      >
                        {node.id.length > 9 ? node.id.substring(0, 8) + '…' : node.id}
                      </text>

                      {/* Outer Subtitle Pill */}
                      <g transform="translate(0, 36)">
                        <rect
                          x={-55}
                          y={-9}
                          width={110}
                          height={18}
                          rx={9}
                          fill="#090d16"
                          stroke={isSelected ? style.fill : '#334155'}
                          strokeWidth={0.8}
                        />
                        <text
                          textAnchor="middle"
                          dy={3.5}
                          fontSize={9}
                          fill={isSelected ? '#f8fafc' : '#94a3b8'}
                          className="select-none font-medium truncate"
                        >
                          {node.title.length > 17 ? node.title.substring(0, 16) + '…' : node.title}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        ) : (
          /* Structured Tabular List Mode */
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Trace Nodes Tabular Catalog ({visibleNodes.length} Entities)
                </span>
                <span className="text-xs text-slate-500">Deterministic links from repository files</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4">Entity ID</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4">Title / Name</th>
                      <th className="py-2.5 px-4">Key Attributes</th>
                      <th className="py-2.5 px-4">Source Provenance</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {visibleNodes.map(node => {
                      const style = CATEGORY_STYLES[node.category] || CATEGORY_STYLES.road_asset;
                      const isSel = selectedNode?.id === node.id;
                      return (
                        <tr
                          key={node.id}
                          onClick={() => setSelectedNode(node)}
                          className={`hover:bg-slate-800/40 cursor-pointer transition ${
                            isSel ? 'bg-slate-800/60' : ''
                          }`}
                        >
                          <td className="py-2.5 px-4 font-bold text-white flex items-center space-x-2">
                            <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                            <span>{node.id}</span>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-medium border ${style.bg} ${style.border} ${style.text}`}>
                              {style.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-sans text-slate-200">
                            <div>{node.title}</div>
                            <div className="text-[11px] text-slate-400">{node.subtitle}</div>
                          </td>
                          <td className="py-2.5 px-4 text-slate-300">
                            {node.data?.cost_inr ? `Recorded Cost: ₹${Number(node.data.cost_inr).toLocaleString('en-IN')}` :
                             node.data?.budget_inr ? `Budget: ₹${Number(node.data.budget_inr).toLocaleString('en-IN')}` :
                             node.data?.category_reported || node.data?.repair_method || '—'}
                          </td>
                          <td className="py-2.5 px-4 font-sans">
                            <EvidenceBadge provenance={node.provenance} />
                          </td>
                          <td className="py-2.5 px-4 text-right font-sans">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedNode(node);
                              }}
                              className="text-teal-400 hover:text-teal-300 text-xs font-medium"
                            >
                              Inspect Details →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Right Slide-over Node Detail Panel */}
        {selectedNode && (
          <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col z-20 shadow-2xl overflow-y-auto">
            {/* Panel Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-900/90 relative">
              <button
                onClick={() => setSelectedNode(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 text-xs"
              >
                ✕
              </button>

              <div className="flex items-center space-x-2 mb-2">
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                    CATEGORY_STYLES[selectedNode.category]?.bg
                  } ${CATEGORY_STYLES[selectedNode.category]?.border} ${
                    CATEGORY_STYLES[selectedNode.category]?.text
                  }`}
                >
                  {CATEGORY_STYLES[selectedNode.category]?.label || selectedNode.type}
                </span>
                <span className="text-xs font-mono text-slate-400">{selectedNode.id}</span>
              </div>

              <h2 className="text-base font-semibold text-white tracking-tight">{selectedNode.title}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{selectedNode.subtitle}</p>

              <div className="mt-3">
                <EvidenceBadge provenance={selectedNode.provenance} />
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="p-4 border-b border-slate-800/80 bg-slate-950/50 flex flex-wrap gap-2">
              {selectedNode.category === 'road_asset' && (
                <button
                  onClick={() => onOpenPassport(selectedNode.id)}
                  className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-teal-600 hover:bg-teal-500 text-white rounded text-xs font-medium transition shadow-sm"
                >
                  <span>Open Road Passport</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}

              {selectedNode.category === 'work_order' && (
                <button
                  onClick={() => onOpenWorkOrder(selectedNode.id)}
                  className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-medium transition shadow-sm"
                >
                  <span>Inspect Work Order Evidence</span>
                  <FileText className="w-3.5 h-3.5" />
                </button>
              )}

              {selectedNode.category === 'financial' && (
                <button
                  onClick={() => onNavigateToWard(selectedNode.id)}
                  className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition shadow-sm"
                >
                  <span>Explore Ward Financial Trail</span>
                  <Building2 className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Re-center / Pivot Button */}
              <button
                onClick={() => {
                  if (selectedNode.category === 'road_asset') {
                    setFocusType('road');
                    setFocusId(selectedNode.id);
                    setInputVal(selectedNode.id);
                  } else if (selectedNode.category === 'work_order') {
                    setFocusType('work_order');
                    setFocusId(selectedNode.id);
                    setInputVal(selectedNode.id);
                  } else if (selectedNode.category === 'financial') {
                    setFocusType('ward');
                    setFocusId(selectedNode.id);
                    setInputVal(selectedNode.id);
                  }
                }}
                className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium border border-slate-700 transition"
              >
                <span>Re-center Graph on this Entity</span>
                <RotateCcw className="w-3 h-3 text-slate-400" />
              </button>
            </div>

            {/* Attributes Section */}
            <div className="p-5 border-b border-slate-800 space-y-3">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Documented Attributes
              </h3>
              <div className="bg-slate-950 rounded-lg border border-slate-800 p-3 space-y-2 text-xs">
                {Object.entries(selectedNode.data || {}).map(([key, val]) => {
                  if (typeof val === 'object' && val !== null) return null;
                  return (
                    <div key={key} className="flex items-start justify-between gap-2 border-b border-slate-900 pb-1.5 last:border-0 last:pb-0">
                      <span className="text-slate-400 font-mono text-[11px] capitalize">{key.replace(/_/g, ' ')}:</span>
                      <span className="text-slate-200 font-mono font-medium text-right text-[11px]">
                        {typeof val === 'number' && key.includes('cost') || key.includes('budget') || key.includes('inr')
                          ? `₹${val.toLocaleString('en-IN')}`
                          : String(val)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Traceability Connections */}
            <div className="p-5 flex-1 space-y-4">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Direct Trace Connections</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  {selectedNodeEdges.incoming.length + selectedNodeEdges.outgoing.length} links
                </span>
              </h3>

              {/* Outgoing relationships */}
              {selectedNodeEdges.outgoing.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Downstream Links (Funds & Executes):
                  </div>
                  {selectedNodeEdges.outgoing.map(edge => (
                    <div
                      key={edge.id}
                      onClick={() => {
                        const targetNode = graphData?.nodes.find(n => n.id === edge.target);
                        if (targetNode) setSelectedNode(targetNode);
                      }}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800/70 border border-slate-800 rounded-lg cursor-pointer transition text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="text-teal-400 font-medium">{edge.label}</span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                      </div>
                      <div className="text-slate-300 font-medium">{edge.target}</div>
                      <div className="text-[11px] text-slate-500">{edge.explanation}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Incoming relationships */}
              {selectedNodeEdges.incoming.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Upstream Links (Derives From):
                  </div>
                  {selectedNodeEdges.incoming.map(edge => (
                    <div
                      key={edge.id}
                      onClick={() => {
                        const sourceNode = graphData?.nodes.find(n => n.id === edge.source);
                        if (sourceNode) setSelectedNode(sourceNode);
                      }}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800/70 border border-slate-800 rounded-lg cursor-pointer transition text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="text-indigo-400 font-medium">{edge.label}</span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                      </div>
                      <div className="text-slate-300 font-medium">{edge.source}</div>
                      <div className="text-[11px] text-slate-500">{edge.explanation}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Disclaimer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-500 leading-tight">
              Synthetic dataset record. Expenditure values represent recorded billed costs, not verified bank payments.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
