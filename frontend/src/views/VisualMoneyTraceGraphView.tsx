import React, { useState, useEffect, useRef } from 'react';
import {
  Compass, Wrench, Building2, MessageSquare, ShieldAlert,
  Search, ZoomIn, ZoomOut, RotateCcw, Filter, Layers,
  ExternalLink, FileText, ArrowRight, Info, CheckCircle2,
  AlertTriangle, Table, Network, Sparkles, CheckSquare,
  ChevronRight, Maximize2, Shield, Eye
} from 'lucide-react';
import { api } from '../api/client';
import { GraphNode, GraphEdge, EntityInvestigationResponse } from '../types';
import { EvidenceBadge } from '../components/EvidenceBadge';

interface Props {
  initialMode?: 'road' | 'work_order' | 'contractor' | 'complaint' | 'ward' | 'audit';
  initialEntityId?: string;
  onOpenPassport: (roadId: string) => void;
  onOpenWorkOrder: (woId: string) => void;
  onNavigateToWard: (wardCode: string) => void;
}

const MODES = [
  { id: 'road', label: 'Road Asset', icon: Compass, placeholder: 'Road ID (e.g. RD0140)', defaultId: 'RD0140' },
  { id: 'work_order', label: 'Work Order', icon: Wrench, placeholder: 'Work Order ID (e.g. WO25-00600)', defaultId: 'WO25-00600' },
  { id: 'contractor', label: 'Contractor', icon: Building2, placeholder: 'Contractor ID (e.g. CT01)', defaultId: 'CT01' },
  { id: 'complaint', label: 'Citizen Complaint', icon: MessageSquare, placeholder: 'Complaint ID (e.g. BMC25-000005)', defaultId: 'BMC25-000005' },
  { id: 'ward', label: 'Ward Budget', icon: Shield, placeholder: 'Ward Code (e.g. K/E)', defaultId: 'K/E' },
  { id: 'audit', label: 'Audit Finding', icon: ShieldAlert, placeholder: 'Finding ID (e.g. AUD-01)', defaultId: 'AUD-01' }
];

const CATEGORY_STYLES: Record<string, { bg: string; border: string; text: string; fill: string; dot: string; label: string }> = {
  financial: { bg: 'bg-rt-primary', border: 'border-rt-ink', text: 'text-rt-ink', fill: '#FFDE59', dot: 'bg-rt-ink', label: 'Ward Budget' },
  road_asset: { bg: 'bg-rt-mint', border: 'border-rt-ink', text: 'text-rt-ink', fill: '#B9D9D1', dot: 'bg-rt-ink', label: 'Road Asset' },
  work_order: { bg: 'bg-white', border: 'border-rt-ink', text: 'text-rt-ink', fill: '#FFFFFF', dot: 'bg-rt-primary', label: 'Work Order' },
  contractor: { bg: 'bg-rt-canvas', border: 'border-rt-ink', text: 'text-rt-ink', fill: '#F8F9FA', dot: 'bg-rt-ink', label: 'Contractor' },
  citizen: { bg: 'bg-white', border: 'border-rt-ink', text: 'text-rt-ink', fill: '#FFFFFF', dot: 'bg-rt-ink', label: 'Citizen Complaint' },
  outcome_audit: { bg: 'bg-rt-coral', border: 'border-rt-ink', text: 'text-white', fill: '#FF3B30', dot: 'bg-white', label: 'Audit Finding' }
};

export const VisualMoneyTraceGraphView: React.FC<Props> = ({
  initialMode = 'road',
  initialEntityId = 'RD0140',
  onOpenPassport,
  onOpenWorkOrder,
  onNavigateToWard
}) => {
  const [mode, setMode] = useState<string>(initialMode);
  const [entityId, setEntityId] = useState<string>(initialEntityId);
  const [searchInput, setSearchInput] = useState<string>(initialEntityId);
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);
  const [includeML, setIncludeML] = useState<boolean>(false);
  const [graphData, setGraphData] = useState<EntityInvestigationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Inspector & View toggles
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'table'>('graph');

  // Node position map
  const [nodesPos, setNodesPos] = useState<Map<string, { x: number; y: number }>>(new Map());

  // Pan & Zoom
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Category filter toggles
  const [categoryFilter, setCategoryFilter] = useState<Record<string, boolean>>({
    financial: true,
    road_asset: true,
    work_order: true,
    contractor: true,
    citizen: true,
    outcome_audit: true
  });

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Load scoped investigation graph
  const loadInvestigation = async (m: string, id: string, expanded: string[], ml: boolean) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.investigateEntityGraph({
        mode: m,
        entity_id: id,
        expanded_nodes: expanded,
        include_ml: ml
      });
      setGraphData(data);

      // Compute radial positions centered around the Root Entity Node (450, 320)
      const centerX = 450;
      const centerY = 320;
      const posMap = new Map<string, { x: number; y: number }>();

      // 1. Root at exact center
      posMap.set(data.root_id, { x: centerX, y: centerY });

      // 2. Separate remaining nodes into categories
      const otherNodes = data.nodes.filter(n => n.id !== data.root_id);
      const radius = 220;
      const step = otherNodes.length > 0 ? (Math.PI * 2) / otherNodes.length : 0;

      otherNodes.forEach((node, idx) => {
        const angle = -Math.PI / 2 + idx * step;
        posMap.set(node.id, {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius
        });
      });

      setNodesPos(posMap);
      setPan({ x: 0, y: 0 });
      setZoom(1);

      // Set initial inspector selection to Root Node
      const rootNode = data.nodes.find(n => n.id === data.root_id) || data.nodes[0] || null;
      setSelectedNode(rootNode);
      setSelectedEdge(null);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to assemble scoped investigation graph');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvestigation(mode, entityId, expandedNodes, includeML);
  }, [mode, entityId, expandedNodes, includeML]);

  const handleModeChange = (newMode: string) => {
    const config = MODES.find(m => m.id === newMode);
    const newId = config ? config.defaultId : 'RD0140';
    setMode(newMode);
    setEntityId(newId);
    setSearchInput(newId);
    setExpandedNodes([]);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchInput.trim().toUpperCase();
    if (!clean) return;
    setEntityId(clean);
    setExpandedNodes([]);
  };

  const handleExpandNode = (nodeId: string) => {
    if (!expandedNodes.includes(nodeId)) {
      setExpandedNodes(prev => [...prev, nodeId]);
    }
  };

  const handleRecenter = (newNodeId: string, newModeSuggestion?: string) => {
    if (newModeSuggestion && MODES.some(m => m.id === newModeSuggestion)) {
      setMode(newModeSuggestion);
    } else if (newNodeId.startsWith('RD')) {
      setMode('road');
    } else if (newNodeId.startsWith('WO')) {
      setMode('work_order');
    } else if (newNodeId.startsWith('CT')) {
      setMode('contractor');
    } else if (newNodeId.startsWith('BMC') || newNodeId.startsWith('CMP')) {
      setMode('complaint');
    }
    setEntityId(newNodeId);
    setSearchInput(newNodeId);
    setExpandedNodes([]);
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  // Filter visible nodes and edges
  const visibleNodes = (graphData?.nodes || []).filter(n => categoryFilter[n.category] ?? true);
  const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
  const visibleEdges = (graphData?.edges || []).filter(e =>
    visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
  );

  return (
    <div className="space-y-6 font-body pb-16">
      
      {/* 1. TOP INVESTIGATION CONTROL BAR */}
      <div className="p-5 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal space-y-4">
        
        {/* Row 1: Mode Switcher Pills */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b-2 border-rt-ink pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono font-bold text-xs bg-rt-primary px-2 py-0.5 rounded border border-rt-ink text-rt-ink">
                SCOPED INVESTIGATION BOARD
              </span>
              <span className="font-mono text-xs text-rt-secondary-text hidden sm:inline">
                Entity-Specific Provenance &bull; No Global Hairballs
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-headline font-black text-rt-ink">
              Follow Money, Contracts &amp; Outcomes from a Specific Entity
            </h2>
          </div>

          {/* Investigation Mode Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {MODES.map(m => {
              const Icon = m.icon;
              const isActive = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => handleModeChange(m.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border-2 border-rt-ink font-headline font-bold text-xs transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-rt-primary text-rt-ink shadow-brutal-sm font-black'
                      : 'bg-white hover:bg-rt-canvas text-rt-ink'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Entity Search & Sample Selectors */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-rt-ink absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={`Enter ${MODES.find(m => m.id === mode)?.placeholder || 'Entity ID'}...`}
              className="w-full bg-rt-canvas border-2 border-rt-ink rounded-[4px] pl-9 pr-24 py-2 text-xs font-mono font-bold text-rt-ink placeholder-rt-secondary-text focus:outline-none focus:bg-white focus:shadow-brutal-sm"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-rt-primary hover:bg-yellow-300 border border-rt-ink rounded-[3px] font-headline font-black text-[10px] text-rt-ink uppercase"
            >
              Start &rarr;
            </button>
          </form>

          {/* Quick entity sample buttons */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-[11px] font-mono">
            <span className="text-rt-secondary-text font-bold uppercase text-[10px]">Quick:</span>
            {[
              { label: 'Marol Rd (RD0140)', m: 'road', id: 'RD0140' },
              { label: 'WO (+129% Var)', m: 'work_order', id: 'WO25-00600' },
              { label: 'Apex Infra (CT01)', m: 'contractor', id: 'CT01' },
              { label: 'Ward K/E Budget', m: 'ward', id: 'K/E' }
            ].map(s => (
              <button
                key={s.id}
                onClick={() => {
                  setMode(s.m);
                  setEntityId(s.id);
                  setSearchInput(s.id);
                  setExpandedNodes([]);
                }}
                className={`px-2 py-1 rounded border border-rt-ink font-bold whitespace-nowrap hover:bg-rt-primary transition-colors ${
                  entityId === s.id ? 'bg-rt-primary' : 'bg-rt-canvas text-rt-ink'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* 2. INVESTIGATION CANVAS & CONTEXTUAL DETAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left 3 Cols: Visual Graph or Table View */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Canvas Toolbar & Category Filters */}
          <div className="p-3 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-rt-canvas p-0.5 rounded border border-rt-ink font-headline">
              <button
                onClick={() => setViewMode('graph')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-all ${
                  viewMode === 'graph' ? 'bg-rt-primary border border-rt-ink text-rt-ink font-black shadow-brutal-sm' : 'text-rt-secondary-text hover:text-rt-ink'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span>Interactive Board</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-all ${
                  viewMode === 'table' ? 'bg-rt-primary border border-rt-ink text-rt-ink font-black shadow-brutal-sm' : 'text-rt-secondary-text hover:text-rt-ink'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Structured Table</span>
              </button>
            </div>

            {/* Candidate ML Toggle (Strictly separated per Req D) */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none font-mono text-[11px] font-bold bg-rt-canvas px-2.5 py-1 rounded border border-rt-ink hover:bg-neutral-200">
              <input
                type="checkbox"
                checked={includeML}
                onChange={(e) => setIncludeML(e.target.checked)}
                className="rounded border-rt-ink accent-rt-primary cursor-pointer"
              />
              <Sparkles className="w-3 h-3 text-rt-coral" />
              <span>Show Candidate ML Suggestions</span>
            </label>

            {/* Canvas Controls */}
            {viewMode === 'graph' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setZoom(z => Math.min(z + 0.15, 2.0))}
                  className="p-1.5 bg-rt-canvas hover:bg-neutral-200 border border-rt-ink rounded"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-rt-ink" />
                </button>
                <button
                  onClick={() => setZoom(z => Math.max(z - 0.15, 0.5))}
                  className="p-1.5 bg-rt-canvas hover:bg-neutral-200 border border-rt-ink rounded"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5 text-rt-ink" />
                </button>
                <button
                  onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                  className="p-1.5 bg-rt-canvas hover:bg-neutral-200 border border-rt-ink rounded"
                  title="Reset to Viewport Center"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-rt-ink" />
                </button>
                <button
                  onClick={() => setExpandedNodes([])}
                  className="px-2 py-1 bg-rt-canvas hover:bg-rt-coral hover:text-white border border-rt-ink rounded text-[10px] font-bold"
                  title="Collapse progressive expansions"
                >
                  Collapse Extensions
                </button>
              </div>
            )}

          </div>

          {/* ML Candidate Active Notice Banner */}
          {includeML && (
            <div className="p-2.5 bg-rt-coral/10 border-2 border-rt-coral rounded-[4px] text-xs font-mono text-rt-coral flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  <strong>ML CANDIDATE LAYER ACTIVE:</strong> Dashed edges represent probabilistic semantic similarity matches. They are strictly derived suggestions, NOT confirmed municipal relationships.
                </span>
              </div>
            </div>
          )}

          {/* VIEW A: INTERACTIVE SVG BOARD */}
          {viewMode === 'graph' && (
            <div className="relative bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal overflow-hidden h-[620px] select-none">
              
              {/* Helpful click instruction header */}
              <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-sm border-2 border-rt-ink rounded-[4px] p-2 text-[11px] font-mono shadow-brutal-sm space-y-0.5">
                <div className="font-bold text-rt-ink flex items-center gap-1">
                  <Info className="w-3 h-3 text-rt-primary" />
                  <span>Interactive Provenance Rules:</span>
                </div>
                <div className="text-rt-secondary-text">&bull; Center node = <strong>Investigation Root ({graphData?.root_id})</strong></div>
                <div className="text-rt-secondary-text">&bull; Click any node to open contextual evidence in inspector</div>
                <div className="text-rt-secondary-text">&bull; Click <strong>(+) Expand</strong> on node to reveal adjacent records</div>
              </div>

              {loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-20 font-body">
                  <div className="w-10 h-10 border-3 border-rt-ink border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="font-mono text-xs text-rt-ink font-bold uppercase">
                    Scoping Relationships for {entityId}...
                  </p>
                </div>
              ) : error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center font-body">
                  <AlertTriangle className="w-8 h-8 text-rt-coral mb-2" />
                  <h4 className="font-headline font-black text-sm text-rt-ink">{error}</h4>
                  <button onClick={() => handleModeChange(mode)} className="mt-3 px-3 py-1.5 bg-rt-primary border border-rt-ink rounded text-xs font-bold">
                    Reset to Default Asset
                  </button>
                </div>
              ) : (
                <svg
                  ref={svgRef}
                  className="w-full h-full cursor-grab active:cursor-grabbing"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                >
                  <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                    
                    {/* Render Edges */}
                    {visibleEdges.map(e => {
                      const sp = nodesPos.get(e.source);
                      const tp = nodesPos.get(e.target);
                      if (!sp || !tp) return null;

                      const isSelected = selectedEdge?.id === e.id;
                      const isML = e.is_ml;

                      return (
                        <g key={e.id} onClick={() => setSelectedEdge(e)} className="cursor-pointer group">
                          <line
                            x1={sp.x}
                            y1={sp.y}
                            x2={tp.x}
                            y2={tp.y}
                            stroke={isSelected ? '#121316' : isML ? '#FF3B30' : '#8E8E93'}
                            strokeWidth={isSelected ? 3.5 : isML ? 2 : 2}
                            strokeDasharray={isML ? '5,5' : undefined}
                            className="transition-all"
                          />

                          {/* Edge midpoint label pill */}
                          <foreignObject
                            x={(sp.x + tp.x) / 2 - 50}
                            y={(sp.y + tp.y) / 2 - 12}
                            width={100}
                            height={24}
                          >
                            <div className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold text-center truncate border ${
                              isML
                                ? 'bg-rt-coral text-white border-rt-coral'
                                : isSelected
                                ? 'bg-rt-ink text-white border-rt-ink'
                                : 'bg-white text-rt-ink border-rt-ink/40 group-hover:border-rt-ink'
                            }`}>
                              {e.label}
                            </div>
                          </foreignObject>
                        </g>
                      );
                    })}

                    {/* Render Nodes */}
                    {visibleNodes.map(n => {
                      const pos = nodesPos.get(n.id) || { x: 450, y: 320 };
                      const isRoot = n.id === graphData?.root_id;
                      const isSelected = selectedNode?.id === n.id;
                      const style = CATEGORY_STYLES[n.category] || CATEGORY_STYLES.work_order;
                      const isExpanded = expandedNodes.includes(n.id);

                      return (
                        <g
                          key={n.id}
                          transform={`translate(${pos.x}, ${pos.y})`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNode(n);
                            setSelectedEdge(null);
                          }}
                          className="cursor-pointer transition-transform"
                        >
                          {/* Node Box */}
                          <foreignObject x={-80} y={-38} width={160} height={76}>
                            <div className={`h-full p-2 rounded-[5px] border-3 border-rt-ink flex flex-col justify-between transition-all ${
                              isSelected
                                ? 'ring-4 ring-rt-ink shadow-brutal-lg'
                                : isRoot
                                ? 'shadow-brutal-lg'
                                : 'shadow-brutal-sm hover:shadow-brutal'
                            } ${style.bg}`}>
                              
                              <div className="flex items-center justify-between font-mono text-[9px] font-bold">
                                <span className="bg-white/80 px-1 rounded border border-rt-ink truncate max-w-[90px] text-rt-ink">
                                  {n.id}
                                </span>
                                {isRoot ? (
                                  <span className="bg-rt-ink text-white px-1 rounded font-black">
                                    ROOT
                                  </span>
                                ) : isExpanded ? (
                                  <span className="bg-rt-mint text-rt-ink px-1 rounded font-black">
                                    EXPANDED
                                  </span>
                                ) : (
                                  <span className="text-rt-ink/70">
                                    {style.label}
                                  </span>
                                )}
                              </div>

                              <div className="font-headline font-black text-xs text-rt-ink truncate mt-0.5">
                                {n.title}
                              </div>

                              <div className="font-mono text-[9px] text-rt-ink/80 truncate">
                                {n.subtitle}
                              </div>

                            </div>
                          </foreignObject>
                        </g>
                      );
                    })}

                  </g>
                </svg>
              )}

              {/* Bottom Entity Category Legend */}
              <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-sm border-2 border-rt-ink rounded-[4px] p-2 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-rt-ink">Filter Layers:</span>
                  {Object.entries(CATEGORY_STYLES).map(([catKey, catStyle]) => (
                    <button
                      key={catKey}
                      onClick={() => setCategoryFilter(prev => ({ ...prev, [catKey]: !prev[catKey] }))}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded border border-rt-ink transition-opacity ${
                        categoryFilter[catKey] ? 'opacity-100 font-bold ' + catStyle.bg : 'opacity-40 bg-white'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full border border-rt-ink ${catStyle.dot}`} />
                      <span>{catStyle.label}</span>
                    </button>
                  ))}
                </div>

                <div className="text-rt-secondary-text">
                  Showing <strong>{visibleNodes.length}</strong> nodes, <strong>{visibleEdges.length}</strong> evidence relationships
                </div>
              </div>

            </div>
          )}

          {/* VIEW B: STRUCTURED FORENSIC TABLE ALTERNATIVE */}
          {viewMode === 'table' && (
            <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal space-y-4">
              <div className="flex items-center justify-between border-b-2 border-rt-ink pb-3 font-body">
                <div>
                  <h3 className="font-headline font-black text-base text-rt-ink">
                    Structured Forensic Provenance Ledger
                  </h3>
                  <p className="text-xs font-mono text-rt-secondary-text">
                    Tabular ledger of all revealed entities and contractual ties for root {graphData?.root_id}.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold bg-rt-canvas px-2.5 py-1 rounded border border-rt-ink">
                  {visibleNodes.length} Records
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border-2 border-rt-ink">
                  <thead className="bg-rt-canvas border-b-2 border-rt-ink text-rt-ink font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5 border-r border-rt-ink">Identifier</th>
                      <th className="p-2.5 border-r border-rt-ink">Entity Type</th>
                      <th className="p-2.5 border-r border-rt-ink">Title / Designation</th>
                      <th className="p-2.5 border-r border-rt-ink">Details</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rt-ink/20 bg-white">
                    {visibleNodes.map(n => {
                      const isRoot = n.id === graphData?.root_id;
                      return (
                        <tr key={n.id} className={`hover:bg-rt-primary/20 transition-colors ${isRoot ? 'bg-rt-primary/30 font-bold' : ''}`}>
                          <td className="p-2.5 border-r border-rt-ink font-bold text-rt-ink">
                            {n.id} {isRoot && <span className="text-[9px] bg-rt-ink text-white px-1 rounded ml-1">ROOT</span>}
                          </td>
                          <td className="p-2.5 border-r border-rt-ink">
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-rt-canvas border border-rt-ink">
                              {n.type}
                            </span>
                          </td>
                          <td className="p-2.5 border-r border-rt-ink font-bold">
                            {n.title}
                          </td>
                          <td className="p-2.5 border-r border-rt-ink text-rt-secondary-text">
                            {n.subtitle}
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              onClick={() => {
                                setSelectedNode(n);
                                setViewMode('graph');
                              }}
                              className="px-2 py-1 bg-rt-canvas hover:bg-rt-primary border border-rt-ink rounded text-[10px] font-bold"
                            >
                              Inspect in Board
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Right 1 Col: Contextual Details Inspector */}
        <div className="space-y-4">
          
          <div className="p-5 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal space-y-4">
            <div className="flex items-center justify-between border-b-2 border-rt-ink pb-3 font-body">
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-rt-ink" />
                <h3 className="font-headline font-black text-sm uppercase tracking-wider text-rt-ink">
                  Entity Inspector
                </h3>
              </div>
              {selectedNode && (
                <span className="text-[10px] font-mono font-bold bg-rt-canvas px-1.5 py-0.5 rounded border border-rt-ink">
                  {selectedNode.type}
                </span>
              )}
            </div>

            {selectedNode ? (
              <div className="space-y-4 font-body">
                
                {/* Node Identity */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-rt-primary px-2 py-0.5 rounded border border-rt-ink text-rt-ink">
                      {selectedNode.id}
                    </span>
                    {selectedNode.id === graphData?.root_id && (
                      <span className="text-[10px] font-mono font-black bg-rt-ink text-white px-1.5 py-0.5 rounded">
                        INVESTIGATION ROOT
                      </span>
                    )}
                  </div>
                  <h4 className="font-headline font-black text-lg text-rt-ink pt-1">
                    {selectedNode.title}
                  </h4>
                  <p className="text-xs font-mono text-rt-secondary-text">
                    {selectedNode.subtitle}
                  </p>
                </div>

                {/* Evidence & Provenance Badge */}
                {selectedNode.provenance && (
                  <div className="pt-1">
                    <EvidenceBadge provenance={selectedNode.provenance} />
                  </div>
                )}

                {/* Key Entity Attributes Table */}
                <div className="p-3 bg-rt-canvas border-2 border-rt-ink rounded-[4px] space-y-1.5 text-xs font-mono">
                  <span className="font-headline font-bold text-[10px] text-rt-secondary-text uppercase block border-b border-rt-ink/20 pb-1">
                    Documented Record Attributes
                  </span>
                  {Object.entries(selectedNode.data || {}).map(([k, v]) => {
                    if (typeof v === 'object' || v === null || v === undefined) return null;
                    return (
                      <div key={k} className="flex justify-between py-0.5">
                        <span className="text-rt-secondary-text capitalize">{k.replace(/_/g, ' ')}:</span>
                        <span className="font-bold text-rt-ink text-right truncate max-w-[140px]">
                          {typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Progressive Graph Action: EXPAND CONNECTIONS */}
                {selectedNode.id !== graphData?.root_id && (
                  <div className="space-y-2 pt-2 border-t border-rt-ink/20">
                    <button
                      onClick={() => handleExpandNode(selectedNode.id)}
                      className="w-full py-2.5 bg-rt-primary hover:bg-yellow-300 border-2 border-rt-ink rounded font-headline font-black text-xs uppercase text-rt-ink shadow-brutal-sm flex items-center justify-center gap-1.5 active:translate-x-[1px] active:translate-y-[1px]"
                    >
                      <span>Expand Connections (+)</span>
                    </button>

                    <button
                      onClick={() => handleRecenter(selectedNode.id)}
                      className="w-full py-2 bg-rt-canvas hover:bg-neutral-200 border-2 border-rt-ink rounded font-headline font-bold text-xs text-rt-ink flex items-center justify-center gap-1"
                    >
                      <span>Re-Center Investigation Here &rarr;</span>
                    </button>
                  </div>
                )}

                {/* Rest-of-product deep links (Requirement F) */}
                <div className="pt-2 border-t border-rt-ink/20 space-y-2">
                  <span className="font-headline font-bold text-[10px] text-rt-secondary-text uppercase block">
                    Verified Product Integrations
                  </span>
                  
                  {selectedNode.category === 'road_asset' && (
                    <button
                      onClick={() => onOpenPassport(selectedNode.id)}
                      className="w-full py-2 bg-rt-mint hover:bg-emerald-200 border-2 border-rt-ink rounded font-headline font-bold text-xs text-rt-ink flex items-center justify-center gap-1.5 shadow-[1px_1px_0px_#171717]"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Open Official Road Passport</span>
                    </button>
                  )}

                  {selectedNode.category === 'work_order' && (
                    <button
                      onClick={() => onOpenWorkOrder(selectedNode.id)}
                      className="w-full py-2 bg-rt-coral text-white hover:bg-red-600 border-2 border-rt-ink rounded font-headline font-bold text-xs flex items-center justify-center gap-1.5 shadow-[1px_1px_0px_#171717]"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Inspect Work Order Evidence</span>
                    </button>
                  )}

                  {selectedNode.category === 'financial' && selectedNode.data?.ward_code && (
                    <button
                      onClick={() => onNavigateToWard(selectedNode.data.ward_code)}
                      className="w-full py-2 bg-white hover:bg-rt-canvas border-2 border-rt-ink rounded font-headline font-bold text-xs text-rt-ink flex items-center justify-center gap-1.5"
                    >
                      <span>Open Ward Money Trail</span>
                    </button>
                  )}
                </div>

              </div>
            ) : (
              <div className="py-12 text-center font-mono text-xs text-rt-secondary-text">
                Select any node on the board to inspect its relationships and evidence.
              </div>
            )}

          </div>

          {/* Selected Edge Explanation Inspector */}
          {selectedEdge && (
            <div className="p-4 bg-rt-canvas border-2 border-rt-ink rounded-[6px] shadow-brutal-sm space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-rt-ink/20 pb-1.5">
                <span className="font-bold text-rt-ink">Relationship Tie</span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border border-rt-ink ${
                  selectedEdge.is_ml ? 'bg-rt-coral text-white' : 'bg-white text-rt-ink'
                }`}>
                  {selectedEdge.is_ml ? 'ML CANDIDATE' : 'DETERMINISTIC RECORD'}
                </span>
              </div>
              <div className="font-bold text-rt-ink text-sm">
                {selectedEdge.label}
              </div>
              <p className="text-rt-secondary-text leading-relaxed text-[11px]">
                {selectedEdge.explanation}
              </p>
              {selectedEdge.is_ml && (
                <div className="text-[10px] text-rt-coral font-bold pt-1 border-t border-rt-coral/20">
                  Confidence Score: {intToPct(selectedEdge.confidence_score)} &bull; Derived similarity match only.
                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

function intToPct(val?: number): string {
  if (val === undefined || val === null) return 'N/A';
  return `${Math.round(val * 100)}%`;
}
