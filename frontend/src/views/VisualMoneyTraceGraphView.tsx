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

// Neo-Brutalist Category styling metadata
const CATEGORY_STYLES: Record<string, { bg: string; border: string; text: string; fill: string; dot: string; label: string }> = {
  financial: {
    bg: 'bg-rt-primary',
    border: 'border-rt-ink',
    text: 'text-rt-ink',
    fill: '#F4D63D',
    dot: 'bg-rt-ink',
    label: 'Ward Budget'
  },
  road_asset: {
    bg: 'bg-rt-mint',
    border: 'border-rt-ink',
    text: 'text-rt-ink',
    fill: '#B9D9D1',
    dot: 'bg-rt-ink',
    label: 'Road Asset'
  },
  work_order: {
    bg: 'bg-white',
    border: 'border-rt-ink',
    text: 'text-rt-ink',
    fill: '#FFFFFF',
    dot: 'bg-rt-primary',
    label: 'Work Order'
  },
  contractor: {
    bg: 'bg-rt-canvas',
    border: 'border-rt-ink',
    text: 'text-rt-ink',
    fill: '#F5EBDD',
    dot: 'bg-rt-ink',
    label: 'Contractor'
  },
  citizen: {
    bg: 'bg-rt-muted',
    border: 'border-rt-ink',
    text: 'text-rt-ink',
    fill: '#E5DED2',
    dot: 'bg-rt-ink',
    label: 'Citizen Complaint'
  },
  outcome_audit: {
    bg: 'bg-rt-coral',
    border: 'border-rt-ink',
    text: 'text-white',
    fill: '#F06A4D',
    dot: 'bg-white',
    label: 'Outcome / Audit'
  }
};

export const VisualMoneyTraceGraphView: React.FC<VisualMoneyTraceGraphViewProps> = ({
  initialFocusType = 'road',
  initialFocusId = 'RD0140',
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
  const [includeML, setIncludeML] = useState<boolean>(false);

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
  const loadGraph = async (type: 'road' | 'work_order' | 'ward', id: string, mlEnabled: boolean = includeML) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedNode(null);

      const params: { road_id?: string; work_order_id?: string; ward_code?: string; max_work_orders: number; include_ml: boolean } = {
        max_work_orders: 8,
        include_ml: mlEnabled
      };
      if (type === 'road') params.road_id = id;
      if (type === 'work_order') params.work_order_id = id;
      if (type === 'ward') params.ward_code = id;

      const data = await api.getGraph(params);
      setGraphData(data);

      // Initialize radial / layered layout around center (450, 320)
      const centerX = 450;
      const centerY = 320;
      const posMap = new Map<string, { x: number; y: number }>();

      const wardNodes = data.nodes.filter(n => n.category === 'financial');
      const roadNodes = data.nodes.filter(n => n.category === 'road_asset');
      const woNodes = data.nodes.filter(n => n.category === 'work_order');
      const contractorNodes = data.nodes.filter(n => n.category === 'contractor');
      const citizenNodes = data.nodes.filter(n => n.category === 'citizen');
      const outcomeNodes = data.nodes.filter(n => n.category === 'outcome_audit');

      if (type === 'road' && roadNodes.length > 0) {
        posMap.set(roadNodes[0].id, { x: centerX, y: centerY });
      } else if (type === 'work_order' && woNodes.length > 0) {
        posMap.set(woNodes[0].id, { x: centerX, y: centerY });
      } else if (type === 'ward' && wardNodes.length > 0) {
        posMap.set(wardNodes[0].id, { x: centerX, y: centerY });
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

      placeInCircle(wardNodes, 130, -Math.PI / 2, Math.PI);
      placeInCircle(roadNodes, 190, 0, Math.PI * 2);
      placeInCircle(woNodes, 280, 0.4, Math.PI * 2);
      placeInCircle(contractorNodes, 360, Math.PI * 0.7, Math.PI * 0.8);
      placeInCircle(citizenNodes, 380, -Math.PI * 0.6, Math.PI * 0.9);
      placeInCircle(outcomeNodes, 410, Math.PI * 0.2, Math.PI * 0.6);

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
    if (e.button !== 0 || draggedNodeId) return;
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
    <div className="flex flex-col h-[calc(100vh-8.5rem)] bg-rt-canvas text-rt-ink overflow-hidden font-body">
      {/* Top Neo-Brutalist Controls Bar */}
      <div className="bg-white border-b-3 border-rt-ink px-6 py-3 flex flex-wrap items-center justify-between gap-4 z-10 shadow-brutal-sm">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-rt-mint border-2 border-rt-ink rounded-[4px] shadow-brutal-sm flex items-center justify-center font-bold text-rt-ink">
            <Network className="w-5 h-5 text-rt-ink" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-headline font-black text-rt-ink tracking-tight uppercase">
                Visual Money Trace Board
              </h1>
              <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-mono font-bold bg-rt-primary border border-rt-ink text-rt-ink shadow-[1px_1px_0px_#171717]">
                MULTI-HOP TRACE
              </span>
            </div>
            <p className="text-xs font-mono text-rt-secondary-text">
              Deterministic links: Complaints → Work Orders → Contractors → Outcome Audits.
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
              if (val === 'road') setInputVal('RD0140');
              if (val === 'work_order') setInputVal('WO25-00600');
              if (val === 'ward') setInputVal('K/E');
            }}
            className="bg-rt-canvas border-2 border-rt-ink text-xs text-rt-ink rounded-[4px] px-2.5 py-1.5 font-mono font-bold focus:outline-none focus:bg-white"
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
              placeholder="e.g. RD0140, WO25-00600..."
              className="w-44 bg-rt-canvas border-2 border-rt-ink text-xs text-rt-ink rounded-[4px] pl-7 pr-3 py-1.5 font-mono font-bold focus:outline-none focus:bg-white focus:shadow-brutal-sm"
            />
            <Search className="w-3.5 h-3.5 text-rt-ink absolute left-2 top-2" />
          </div>

          <button
            type="submit"
            className="px-3 py-1.5 bg-rt-primary hover:bg-yellow-300 text-rt-ink text-xs font-headline font-bold border-2 border-rt-ink rounded-[4px] shadow-brutal-sm active:translate-x-[1px] active:translate-y-[1px] transition"
          >
            Trace
          </button>
        </form>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-rt-canvas border-2 border-rt-ink rounded-[4px] p-0.5 text-xs shadow-brutal-sm">
          <button
            onClick={() => setViewMode('canvas')}
            className={`px-3 py-1 rounded-[3px] font-headline font-bold transition ${
              viewMode === 'canvas' ? 'bg-rt-ink text-white' : 'text-rt-ink hover:bg-white'
            }`}
          >
            Investigation Board
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded-[3px] font-headline font-bold transition ${
              viewMode === 'list' ? 'bg-rt-ink text-white' : 'text-rt-ink hover:bg-white'
            }`}
          >
            Catalog Table
          </button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="bg-rt-muted border-b-2 border-rt-ink px-6 py-2 flex items-center justify-between text-xs overflow-x-auto">
        <div className="flex items-center space-x-2">
          <span className="text-rt-ink text-[11px] font-headline font-bold flex items-center gap-1 uppercase tracking-wider mr-2">
            <Filter className="w-3 h-3 text-rt-ink" /> Layers:
          </span>
          {Object.entries(CATEGORY_STYLES).map(([key, style]) => {
            const isActive = activeCategories[key] !== false;
            return (
              <button
                key={key}
                onClick={() => toggleCategory(key)}
                className={`px-2.5 py-1 rounded-[3px] border-2 border-rt-ink text-[11px] font-mono font-bold flex items-center space-x-1.5 transition-all shadow-[1.5px_1.5px_0px_#171717] ${
                  isActive
                    ? `${style.bg} ${style.text}`
                    : 'bg-rt-canvas text-rt-secondary-text opacity-50 line-through'
                }`}
              >
                <span className={`w-2 h-2 rounded-full border border-rt-ink ${style.dot}`} />
                <span>{style.label}</span>
              </button>
            );
          })}

          {/* Model-suggested ML edge toggle */}
          <button
            onClick={() => {
              const next = !includeML;
              setIncludeML(next);
              loadGraph(focusType, focusId, next);
            }}
            className={`px-2.5 py-1 rounded-[3px] border-2 border-rt-ink text-[11px] font-mono font-bold flex items-center space-x-1.5 transition-all shadow-[1.5px_1.5px_0px_#171717] ${
              includeML
                ? 'bg-rt-primary text-rt-ink'
                : 'bg-white text-rt-secondary-text hover:bg-rt-canvas'
            }`}
          >
            <span>⚡ ML Edges</span>
            <span className={`text-[9px] px-1 rounded border border-rt-ink ${includeML ? 'bg-rt-ink text-white' : 'bg-rt-muted text-rt-ink'}`}>
              {includeML ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        {graphData && (
          <div className="text-[11px] text-rt-secondary-text font-mono flex items-center space-x-3">
            <span>Nodes: <strong className="text-rt-ink">{visibleNodes.length}</strong></span>
            <span>Links: <strong className="text-rt-ink">{visibleEdges.length}</strong></span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex relative overflow-hidden">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3 bg-rt-canvas">
            <div className="w-8 h-8 border-3 border-rt-ink border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-mono font-bold uppercase tracking-wider text-rt-ink">
              Tracing financial relationship chain...
            </p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-rt-canvas">
            <div className="p-3 bg-rt-coral text-white rounded-[4px] border-2 border-rt-ink mb-3 shadow-brutal-sm">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-headline font-bold text-rt-ink">Graph Assembly Error</h3>
            <p className="text-xs font-mono text-rt-secondary-text max-w-md mt-1 mb-4">{error}</p>
            <button
              onClick={() => loadGraph(focusType, focusId)}
              className="px-4 py-2 bg-rt-primary text-rt-ink text-xs font-headline font-bold rounded-[4px] border-2 border-rt-ink shadow-brutal-sm hover:shadow-brutal"
            >
              Retry
            </button>
          </div>
        ) : viewMode === 'canvas' ? (
          /* Canvas Graph Renderer */
          <div className="flex-1 relative bg-rt-canvas overflow-hidden cursor-grab active:cursor-grabbing select-none">
            {/* Canvas Zoom Controls Floating */}
            <div className="absolute top-4 left-4 z-10 flex flex-col bg-white border-2 border-rt-ink rounded-[4px] p-1 shadow-brutal space-y-1">
              <button
                onClick={() => setZoom(z => Math.min(z * 1.2, 3.0))}
                title="Zoom In"
                className="p-1.5 hover:bg-rt-canvas text-rt-ink rounded font-bold"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom(z => Math.max(z * 0.8, 0.4))}
                title="Zoom Out"
                className="p-1.5 hover:bg-rt-canvas text-rt-ink rounded font-bold"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                title="Reset View"
                className="p-1.5 hover:bg-rt-canvas text-rt-ink rounded font-bold"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <div className="text-[10px] text-center font-mono font-bold text-rt-secondary-text pt-1 border-t border-rt-ink">
                {Math.round(zoom * 100)}%
              </div>
            </div>

            {/* Canvas Hint */}
            <div className="absolute bottom-4 left-4 z-10 pointer-events-none text-[11px] font-mono text-rt-ink bg-white px-3 py-1.5 rounded-[4px] border-2 border-rt-ink shadow-brutal-sm">
              Drag to pan • Scroll to zoom • Click node to inspect verified evidence dossier
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
                <marker
                  id="arrow-default"
                  viewBox="0 0 10 10"
                  refX="20"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#171717" />
                </marker>
                <marker
                  id="arrow-active"
                  viewBox="0 0 10 10"
                  refX="20"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#171717" stroke="#F4D63D" strokeWidth="1" />
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
                  const isModelSuggested = (edge as any).provenance_status === 'model-suggested';

                  const midX = (sPos.x + tPos.x) / 2;
                  const midY = (sPos.y + tPos.y) / 2;

                  return (
                    <g key={edge.id} className="transition-all">
                      <line
                        x1={sPos.x}
                        y1={sPos.y}
                        x2={tPos.x}
                        y2={tPos.y}
                        stroke={isModelSuggested ? '#F06A4D' : '#171717'}
                        strokeWidth={isConnectedToSelected ? 3 : isModelSuggested ? 2.2 : 1.8}
                        strokeDasharray={isModelSuggested ? '5 4' : edge.relation_type.includes('audit') ? '4 3' : 'none'}
                        markerEnd={isConnectedToSelected ? 'url(#arrow-active)' : 'url(#arrow-default)'}
                      />
                      {(isConnectedToSelected || isModelSuggested) && (
                        <g transform={`translate(${midX}, ${midY})`}>
                          <rect
                            x={-50}
                            y={-10}
                            width={100}
                            height={20}
                            rx={3}
                            fill={isModelSuggested ? '#B9D9D1' : '#F4D63D'}
                            stroke="#171717"
                            strokeWidth={1.5}
                          />
                          <text
                            textAnchor="middle"
                            dy={4}
                            fontSize={8.5}
                            fontWeight="bold"
                            fill="#171717"
                            className="font-mono select-none"
                          >
                            {isModelSuggested ? `[ML] ${edge.label}` : edge.label.length > 15 ? edge.label.substring(0, 13) + '…' : edge.label}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* 2. Draw Neo-Brutalist Rectangular Nodes */}
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
                      {/* Hard offset shadow rect */}
                      <rect
                        x={-42}
                        y={-22}
                        width={84}
                        height={44}
                        rx={4}
                        fill="#171717"
                        transform="translate(3, 3)"
                      />

                      {/* Main Node Box */}
                      <rect
                        x={-42}
                        y={-22}
                        width={84}
                        height={44}
                        rx={4}
                        fill={isSelected ? '#F4D63D' : style.fill}
                        stroke="#171717"
                        strokeWidth={isSelected ? 3 : 2}
                        className="transition-colors hover:brightness-105"
                      />

                      {/* Node Text inside */}
                      <text
                        textAnchor="middle"
                        dy={-2}
                        fontSize={10}
                        fontWeight="bold"
                        fill="#171717"
                        className="select-none font-mono tracking-tight"
                      >
                        {node.id.length > 10 ? node.id.substring(0, 9) + '…' : node.id}
                      </text>

                      {/* Category tag inside */}
                      <text
                        textAnchor="middle"
                        dy={12}
                        fontSize={8}
                        fontWeight="bold"
                        fill="#625F58"
                        className="select-none font-headline uppercase"
                      >
                        {style.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        ) : (
          /* Structured Tabular List Mode */
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-rt-canvas">
            <div className="bg-white border-3 border-rt-ink rounded-[4px] shadow-brutal overflow-hidden">
              <div className="px-5 py-3 border-b-2 border-rt-ink bg-rt-primary flex items-center justify-between">
                <span className="text-xs font-headline font-black text-rt-ink uppercase tracking-wider">
                  Trace Nodes Catalog ({visibleNodes.length} Entities)
                </span>
                <span className="text-xs font-mono font-bold text-rt-ink">Deterministic Evidence Links</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left font-mono">
                  <thead className="bg-rt-canvas text-rt-ink uppercase text-[10px] font-bold border-b-2 border-rt-ink">
                    <tr>
                      <th className="py-2.5 px-4">Entity ID</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4">Title / Name</th>
                      <th className="py-2.5 px-4">Financial / Key Attributes</th>
                      <th className="py-2.5 px-4">Source Provenance</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rt-muted">
                    {visibleNodes.map(node => {
                      const style = CATEGORY_STYLES[node.category] || CATEGORY_STYLES.road_asset;
                      const isSel = selectedNode?.id === node.id;
                      return (
                        <tr
                          key={node.id}
                          onClick={() => setSelectedNode(node)}
                          className={`hover:bg-yellow-50 cursor-pointer transition ${
                            isSel ? 'bg-yellow-100 font-bold' : ''
                          }`}
                        >
                          <td className="py-2.5 px-4 font-bold text-rt-ink flex items-center space-x-2">
                            <span className={`w-2 h-2 rounded-full border border-rt-ink ${style.dot}`} />
                            <span>{node.id}</span>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`px-2 py-0.5 rounded-[3px] text-[10px] font-bold border border-rt-ink ${style.bg} ${style.text}`}>
                              {style.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-headline text-rt-ink">
                            <div className="font-bold">{node.title}</div>
                            <div className="text-[11px] font-mono text-rt-secondary-text">{node.subtitle}</div>
                          </td>
                          <td className="py-2.5 px-4 text-rt-ink font-financial">
                            {node.data?.cost_inr ? `Billed: ₹${Number(node.data.cost_inr).toLocaleString('en-IN')}` :
                             node.data?.budget_inr ? `Budget: ₹${Number(node.data.budget_inr).toLocaleString('en-IN')}` :
                             node.data?.category_reported || node.data?.repair_method || '—'}
                          </td>
                          <td className="py-2.5 px-4">
                            <EvidenceBadge provenance={node.provenance} />
                          </td>
                          <td className="py-2.5 px-4 text-right font-headline">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedNode(node);
                              }}
                              className="text-rt-ink hover:underline text-xs font-bold"
                            >
                              Inspect Docket →
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

        {/* Right Slide-over Evidence Panel */}
        {selectedNode && (
          <div className="w-96 bg-white border-l-3 border-rt-ink flex flex-col z-20 shadow-brutal-xl overflow-y-auto font-body">
            {/* Panel Header */}
            <div className="p-5 border-b-2 border-rt-ink bg-rt-primary relative">
              <button
                onClick={() => setSelectedNode(null)}
                className="absolute top-4 right-4 p-1 bg-white border-2 border-rt-ink rounded text-rt-ink hover:bg-rt-canvas shadow-brutal-sm text-xs font-bold"
              >
                ✕
              </button>

              <div className="flex items-center space-x-2 mb-2">
                <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-mono font-bold bg-white text-rt-ink border border-rt-ink">
                  {CATEGORY_STYLES[selectedNode.category]?.label || selectedNode.type}
                </span>
                <span className="text-xs font-mono font-bold text-rt-ink">{selectedNode.id}</span>
              </div>

              <h2 className="text-lg font-headline font-black text-rt-ink tracking-tight">{selectedNode.title}</h2>
              <p className="text-xs font-mono text-rt-ink mt-0.5">{selectedNode.subtitle}</p>

              <div className="mt-3">
                <EvidenceBadge provenance={selectedNode.provenance} />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-4 border-b-2 border-rt-ink bg-rt-canvas space-y-2">
              {selectedNode.category === 'road_asset' && (
                <button
                  onClick={() => onOpenPassport(selectedNode.id)}
                  className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-rt-mint hover:bg-teal-200 text-rt-ink border-2 border-rt-ink rounded-[4px] text-xs font-headline font-bold shadow-brutal-sm active:translate-x-[1px] active:translate-y-[1px] transition"
                >
                  <span>Open Road Passport</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}

              {selectedNode.category === 'work_order' && (
                <button
                  onClick={() => onOpenWorkOrder(selectedNode.id)}
                  className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-rt-primary hover:bg-yellow-300 text-rt-ink border-2 border-rt-ink rounded-[4px] text-xs font-headline font-bold shadow-brutal-sm active:translate-x-[1px] active:translate-y-[1px] transition"
                >
                  <span>Inspect Work Order Evidence Docket</span>
                  <FileText className="w-3.5 h-3.5" />
                </button>
              )}

              {selectedNode.category === 'financial' && (
                <button
                  onClick={() => onNavigateToWard(selectedNode.id)}
                  className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-white hover:bg-rt-canvas text-rt-ink border-2 border-rt-ink rounded-[4px] text-xs font-headline font-bold shadow-brutal-sm active:translate-x-[1px] active:translate-y-[1px] transition"
                >
                  <span>Explore Ward Financial Trail</span>
                  <Building2 className="w-3.5 h-3.5" />
                </button>
              )}

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
                className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 bg-white hover:bg-rt-canvas text-rt-ink rounded-[4px] text-xs font-mono font-bold border border-rt-ink shadow-[1px_1px_0px_#171717] transition"
              >
                <span>Re-center Graph on this Entity</span>
                <RotateCcw className="w-3 h-3 text-rt-ink" />
              </button>
            </div>

            {/* Documented Attributes */}
            <div className="p-5 border-b-2 border-rt-ink space-y-3 font-mono">
              <h3 className="text-xs font-headline font-black text-rt-ink uppercase tracking-wider">
                Documented Attributes
              </h3>
              <div className="bg-rt-canvas rounded-[4px] border-2 border-rt-ink p-3 space-y-2 text-xs">
                {Object.entries(selectedNode.data || {}).map(([key, val]) => {
                  if (typeof val === 'object' && val !== null) return null;
                  return (
                    <div key={key} className="flex items-start justify-between gap-2 border-b border-rt-ink/10 pb-1.5 last:border-0 last:pb-0">
                      <span className="text-rt-secondary-text text-[11px] font-bold uppercase">{key.replace(/_/g, ' ')}:</span>
                      <span className="text-rt-ink font-bold text-right text-[11px] font-financial">
                        {typeof val === 'number' && (key.includes('cost') || key.includes('budget') || key.includes('inr'))
                          ? `₹${val.toLocaleString('en-IN')}`
                          : String(val)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Direct Trace Connections */}
            <div className="p-5 flex-1 space-y-4 font-mono">
              <h3 className="text-xs font-headline font-black text-rt-ink uppercase tracking-wider flex items-center justify-between">
                <span>Trace Connections</span>
                <span className="text-[10px] text-rt-secondary-text font-normal">
                  {selectedNodeEdges.incoming.length + selectedNodeEdges.outgoing.length} links
                </span>
              </h3>

              {selectedNodeEdges.outgoing.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rt-secondary-text">
                    Downstream (Funds & Executes):
                  </div>
                  {selectedNodeEdges.outgoing.map(edge => (
                    <div
                      key={edge.id}
                      onClick={() => {
                        const targetNode = graphData?.nodes.find(n => n.id === edge.target);
                        if (targetNode) setSelectedNode(targetNode);
                      }}
                      className="p-2.5 bg-rt-canvas hover:bg-yellow-100 border-2 border-rt-ink rounded-[4px] cursor-pointer transition text-xs space-y-1 shadow-brutal-sm"
                    >
                      <div className="flex items-center justify-between font-bold text-[11px]">
                        <span className="text-rt-ink">{edge.label}</span>
                        <ArrowRight className="w-3 h-3 text-rt-ink" />
                      </div>
                      <div className="text-rt-ink font-bold">{edge.target}</div>
                      <div className="text-[10px] text-rt-secondary-text">{edge.explanation}</div>
                    </div>
                  ))}
                </div>
              )}

              {selectedNodeEdges.incoming.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rt-secondary-text">
                    Upstream (Derives From):
                  </div>
                  {selectedNodeEdges.incoming.map(edge => (
                    <div
                      key={edge.id}
                      onClick={() => {
                        const sourceNode = graphData?.nodes.find(n => n.id === edge.source);
                        if (sourceNode) setSelectedNode(sourceNode);
                      }}
                      className="p-2.5 bg-rt-canvas hover:bg-yellow-100 border-2 border-rt-ink rounded-[4px] cursor-pointer transition text-xs space-y-1 shadow-brutal-sm"
                    >
                      <div className="flex items-center justify-between font-bold text-[11px]">
                        <span className="text-rt-ink">{edge.label}</span>
                        <ArrowRight className="w-3 h-3 text-rt-ink" />
                      </div>
                      <div className="text-rt-ink font-bold">{edge.source}</div>
                      <div className="text-[10px] text-rt-secondary-text">{edge.explanation}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Disclaimer */}
            <div className="p-3 bg-rt-muted border-t-2 border-rt-ink text-[10px] font-mono text-rt-secondary-text">
              Synthetic dataset record. Expenditure values represent recorded billed costs, not verified bank payments.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
