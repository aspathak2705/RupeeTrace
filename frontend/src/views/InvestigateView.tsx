import React, { useState, useEffect } from 'react';
import {
  Compass, GitBranch, Table, Search, ShieldAlert,
  ArrowRight, FileText, ChevronRight, Layers, CheckCircle2,
  AlertTriangle, Filter, ExternalLink, QrCode
} from 'lucide-react';
import { RoadPassportView } from './RoadPassportView';
import { VisualMoneyTraceGraphView } from './VisualMoneyTraceGraphView';
import { RoadSummary, WorkOrder } from '../types';
import { api } from '../api/client';

interface Props {
  currentRoadId: string;
  onSelectRoad: (roadId: string) => void;
  onSelectWorkOrder: (woId: string) => void;
  onNavigateToWard: (wardCode: string) => void;
  onNavigateCreateCase?: (roadId: string) => void;
  initialMode?: 'passport' | 'graph' | 'ledger';
}

export const InvestigateView: React.FC<Props> = ({
  currentRoadId,
  onSelectRoad,
  onSelectWorkOrder,
  onNavigateToWard,
  onNavigateCreateCase,
  initialMode = 'passport'
}) => {
  const [mode, setMode] = useState<'passport' | 'graph' | 'ledger'>(initialMode);
  const [searchInput, setSearchInput] = useState<string>(currentRoadId);
  const [allRoads, setAllRoads] = useState<RoadSummary[]>([]);
  const [filteredRoads, setFilteredRoads] = useState<RoadSummary[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [ledgerWorkOrders, setLedgerWorkOrders] = useState<WorkOrder[]>([]);
  const [loadingLedger, setLoadingLedger] = useState<boolean>(false);

  // Sync search input when currentRoadId changes externally
  useEffect(() => {
    setSearchInput(currentRoadId);
  }, [currentRoadId]);

  // Load all roads for fast autocomplete
  useEffect(() => {
    api.getRoads()
      .then(roads => setAllRoads(roads))
      .catch(err => console.error('Error fetching roads for search:', err));
  }, []);

  // Filter roads as user types
  useEffect(() => {
    if (!searchInput.trim()) {
      setFilteredRoads(allRoads.slice(0, 10));
      return;
    }
    const q = searchInput.toLowerCase();
    const matches = allRoads.filter(r =>
      r.road_id.toLowerCase().includes(q) ||
      r.road_name.toLowerCase().includes(q) ||
      r.ward_code.toLowerCase().includes(q)
    );
    setFilteredRoads(matches.slice(0, 8));
  }, [searchInput, allRoads]);

  // Fetch work orders when in ledger mode
  useEffect(() => {
    if (mode === 'ledger') {
      setLoadingLedger(true);
      api.getRoadWorkOrders(currentRoadId)
        .then(wos => setLedgerWorkOrders(wos))
        .catch(err => {
          console.error('Error loading ledger work orders:', err);
          setLedgerWorkOrders([]);
        })
        .finally(() => setLoadingLedger(false));
    }
  }, [mode, currentRoadId]);

  const handleSelectAutocomplete = (roadId: string) => {
    setSearchInput(roadId);
    setIsSearchOpen(false);
    onSelectRoad(roadId);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchInput.trim().toUpperCase();
    if (!clean) return;
    const match = allRoads.find(r => r.road_id.toUpperCase() === clean || r.road_name.toUpperCase().includes(clean));
    if (match) {
      onSelectRoad(match.road_id);
    } else {
      onSelectRoad(clean);
    }
    setIsSearchOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* UNIFIED INVESTIGATION TOP CONTROL BAR */}
      <div className="bg-white border-b-3 border-rt-ink sticky top-16 z-30 shadow-brutal-sm font-body">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Road Search / Autocomplete Bar */}
          <div className="relative flex-1 max-w-lg">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-4 h-4 text-rt-ink absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Road ID (RD0140) or Name (Marol Maroshi Rd)..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                className="w-full bg-rt-canvas border-2 border-rt-ink rounded-[4px] pl-9 pr-20 py-2 text-xs font-mono font-bold text-rt-ink placeholder-rt-secondary-text focus:outline-none focus:bg-white focus:shadow-brutal-sm"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-rt-primary border border-rt-ink rounded-[3px] font-headline font-black text-[10px] text-rt-ink uppercase hover:bg-yellow-300"
              >
                Inspect
              </button>
            </form>

            {/* Autocomplete Dropdown */}
            {isSearchOpen && filteredRoads.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-rt-ink rounded-[4px] shadow-brutal-lg max-h-60 overflow-y-auto z-50 font-body">
                <div className="p-1.5 bg-rt-canvas border-b border-rt-ink text-[10px] font-mono font-bold text-rt-secondary-text uppercase flex justify-between">
                  <span>Matching Road Assets ({filteredRoads.length})</span>
                  <span className="cursor-pointer text-rt-coral" onClick={() => setIsSearchOpen(false)}>Close</span>
                </div>
                {filteredRoads.map(r => (
                  <div
                    key={r.road_id}
                    onClick={() => handleSelectAutocomplete(r.road_id)}
                    className="p-2.5 hover:bg-rt-primary border-b border-rt-ink/20 cursor-pointer flex items-center justify-between transition-colors text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-rt-ink bg-white px-1.5 py-0.2 rounded border border-rt-ink mr-2">
                        {r.road_id}
                      </span>
                      <span className="font-headline font-black text-rt-ink">{r.road_name}</span>
                      <span className="text-[10px] font-mono text-rt-secondary-text ml-2">Ward {r.ward_code}</span>
                    </div>
                    <span className="font-mono text-[11px] text-rt-ink font-bold">
                      ₹{r.total_spend_inr.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Investigation Mode Switcher */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setMode('passport')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[4px] border-2 border-rt-ink font-headline font-black text-xs transition-all whitespace-nowrap ${
                mode === 'passport'
                  ? 'bg-rt-primary text-rt-ink shadow-brutal-sm'
                  : 'bg-white hover:bg-rt-canvas text-rt-ink'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>ROAD PASSPORT</span>
              <span className="text-[9px] bg-white px-1 py-0.2 rounded border border-rt-ink font-mono font-bold">
                PROVENANCE
              </span>
            </button>

            <button
              onClick={() => setMode('graph')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[4px] border-2 border-rt-ink font-headline font-black text-xs transition-all whitespace-nowrap ${
                mode === 'graph'
                  ? 'bg-rt-primary text-rt-ink shadow-brutal-sm'
                  : 'bg-white hover:bg-rt-canvas text-rt-ink'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>MONEY TRACE GRAPH</span>
              <span className="text-[9px] bg-rt-mint px-1 py-0.2 rounded border border-rt-ink font-mono font-bold text-rt-ink">
                VISUAL FLOW
              </span>
            </button>

            <button
              onClick={() => setMode('ledger')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[4px] border-2 border-rt-ink font-headline font-black text-xs transition-all whitespace-nowrap ${
                mode === 'ledger'
                  ? 'bg-rt-primary text-rt-ink shadow-brutal-sm'
                  : 'bg-white hover:bg-rt-canvas text-rt-ink'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>FORENSIC LEDGER</span>
              <span className="text-[9px] bg-white px-1 py-0.2 rounded border border-rt-ink font-mono font-bold">
                TABULAR
              </span>
            </button>
          </div>

        </div>
      </div>

      {/* MODE 1: ROAD PASSPORT */}
      {mode === 'passport' && (
        <RoadPassportView
          roadId={currentRoadId}
          onSelectWorkOrder={onSelectWorkOrder}
          onNavigateGraph={() => setMode('graph')}
          onNavigateCreateCase={onNavigateCreateCase}
        />
      )}

      {/* MODE 2: VISUAL MONEY TRACE GRAPH */}
      {mode === 'graph' && (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
          <div className="p-4 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-body">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs bg-rt-primary px-2 py-0.5 rounded border border-rt-ink text-rt-ink">
                  ACTIVE ROAD: {currentRoadId}
                </span>
                <span className="font-mono text-xs text-rt-secondary-text">
                  Force-directed money trail centered on this asset
                </span>
              </div>
              <h2 className="font-headline font-black text-lg text-rt-ink mt-1">
                Interactive Money Flow &amp; Entity Relationships
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setMode('passport')}
                className="px-3 py-1.5 bg-rt-canvas hover:bg-neutral-200 border-2 border-rt-ink rounded font-headline font-bold text-xs"
              >
                &larr; Back to Road Passport
              </button>
              <button
                onClick={() => setMode('ledger')}
                className="px-3 py-1.5 bg-white hover:bg-rt-canvas border-2 border-rt-ink rounded font-headline font-bold text-xs"
              >
                Switch to Table View
              </button>
            </div>
          </div>

          <VisualMoneyTraceGraphView
            initialFocusType="road"
            initialFocusId={currentRoadId}
            onOpenPassport={(id) => {
              onSelectRoad(id);
              setMode('passport');
            }}
            onOpenWorkOrder={onSelectWorkOrder}
            onNavigateToWard={onNavigateToWard}
          />
        </div>
      )}

      {/* MODE 3: STRUCTURED FORENSIC LEDGER */}
      {mode === 'ledger' && (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-body">
          <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-rt-ink pb-4">
              <div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-[3px] bg-rt-primary border border-rt-ink text-rt-ink">
                  FORENSIC LEDGER • {currentRoadId}
                </span>
                <h2 className="text-2xl font-headline font-black text-rt-ink mt-1">
                  Itemized Work Order &amp; Expenditure Table
                </h2>
                <p className="text-xs font-mono text-rt-secondary-text">
                  Direct ledger view of all municipal work orders, billings, and contractor allocations for this road.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMode('passport')}
                  className="px-3 py-1.5 bg-rt-primary border-2 border-rt-ink rounded font-headline font-bold text-xs"
                >
                  View Road Passport &rarr;
                </button>
              </div>
            </div>

            {loadingLedger ? (
              <div className="py-16 text-center">
                <div className="w-8 h-8 border-3 border-rt-ink border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="font-mono text-xs text-rt-secondary-text">Loading itemized work orders...</p>
              </div>
            ) : ledgerWorkOrders.length === 0 ? (
              <div className="p-8 text-center bg-rt-canvas border-2 border-rt-ink rounded font-mono text-xs">
                No recorded work orders found for road {currentRoadId}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border-2 border-rt-ink">
                  <thead className="bg-rt-canvas border-b-2 border-rt-ink text-rt-ink font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3 border-r border-rt-ink">Work Order ID</th>
                      <th className="p-3 border-r border-rt-ink">Contractor</th>
                      <th className="p-3 border-r border-rt-ink">Repair Method</th>
                      <th className="p-3 border-r border-rt-ink text-right">Cost (INR)</th>
                      <th className="p-3 border-r border-rt-ink text-center">Warranty (DLP)</th>
                      <th className="p-3 border-r border-rt-ink text-center">Reopened 30d</th>
                      <th className="p-3 text-center">Evidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rt-ink/20 bg-white">
                    {ledgerWorkOrders.map(wo => (
                      <tr key={wo.work_order_id} className="hover:bg-rt-primary/20 transition-colors">
                        <td className="p-3 border-r border-rt-ink font-bold text-rt-ink">
                          {wo.work_order_id}
                        </td>
                        <td className="p-3 border-r border-rt-ink">
                          <span className="font-bold block">{wo.contractor_name}</span>
                          <span className="text-[10px] text-rt-secondary-text">{wo.contractor_id}</span>
                        </td>
                        <td className="p-3 border-r border-rt-ink">
                          {wo.repair_method}
                        </td>
                        <td className="p-3 border-r border-rt-ink text-right font-bold font-financial">
                          ₹{wo.cost_inr.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 border-r border-rt-ink text-center">
                          {wo.is_dlp_breach ? (
                            <span className="px-2 py-0.5 rounded bg-rt-coral text-white font-bold text-[10px]">
                              BREACH
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-rt-canvas text-rt-ink text-[10px]">
                              Valid
                            </span>
                          )}
                        </td>
                        <td className="p-3 border-r border-rt-ink text-center">
                          {wo.reopened_within_30d ? (
                            <span className="text-rt-coral font-bold text-[10px]">YES</span>
                          ) : (
                            <span className="text-rt-secondary-text text-[10px]">No</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => onSelectWorkOrder(wo.work_order_id)}
                            className="px-2 py-1 bg-rt-canvas hover:bg-rt-primary border border-rt-ink rounded text-[10px] font-bold"
                          >
                            Inspect Audit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
