import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert, AlertTriangle, FileText, CheckCircle2,
  ExternalLink, Filter, HelpCircle, Layers, ArrowUpRight,
  TrendingUp, Clock, AlertOctagon, Scale, Search
} from 'lucide-react';
import { api } from '../api/client';
import { AuditFinding, WardSummary } from '../types';
import { EvidenceBadge } from '../components/EvidenceBadge';

interface AuditsInvestigationViewProps {
  initialWard?: string;
  onOpenPassport: (roadId: string) => void;
  onOpenWorkOrder: (woId: string) => void;
}

export const AuditsInvestigationView: React.FC<AuditsInvestigationViewProps> = ({
  initialWard,
  onOpenPassport,
  onOpenWorkOrder
}) => {
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [wards, setWards] = useState<WardSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedWard, setSelectedWard] = useState<string>(initialWard || 'ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [wardsData, findingsData] = await Promise.all([
          api.getWards(),
          api.getAuditFindings({ limit: 400 })
        ]);
        setWards(wardsData);
        setFindings(findingsData);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load audit findings');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filtered findings
  const filteredFindings = useMemo(() => {
    return findings.filter(f => {
      if (selectedWard !== 'ALL' && f.ward_code !== selectedWard) return false;
      if (selectedType !== 'ALL' && f.finding_type !== selectedType) return false;
      if (selectedSeverity !== 'ALL' && f.severity !== selectedSeverity) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          f.finding_id.toLowerCase().includes(q) ||
          f.work_order_id.toLowerCase().includes(q) ||
          f.road_id.toLowerCase().includes(q) ||
          f.contractor_id.toLowerCase().includes(q) ||
          f.reason.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [findings, selectedWard, selectedType, selectedSeverity, searchQuery]);

  // Aggregate stats
  const stats = useMemo(() => {
    const highCount = findings.filter(f => f.severity === 'HIGH').length;
    const rateCount = findings.filter(f => f.finding_type === 'RATE_CARD_DEVIATION').length;
    const dupCount = findings.filter(f => f.finding_type === 'DUPLICATE_WORK_ORDER').length;
    const dlpCount = findings.filter(f => f.finding_type === 'DLP_EXPENDITURE').length;
    const slaCount = findings.filter(f => f.finding_type === 'SLA_DURABILITY_BREACH').length;

    // Calculate sum of flagged billed cost (deduplicating work orders)
    const flaggedWos = new Set<string>();
    let flaggedSpend = 0;
    findings.forEach(f => {
      if (f.calculation?.billed_cost_inr && !flaggedWos.has(f.work_order_id)) {
        flaggedWos.add(f.work_order_id);
        flaggedSpend += f.calculation.billed_cost_inr;
      }
    });

    return { highCount, rateCount, dupCount, dlpCount, slaCount, flaggedSpend };
  }, [findings]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Repair Auditor & Financial Investigation</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-950 text-rose-300 border border-rose-800">
              Deterministic Rules
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Algorithmic screening checks: rate-card deviations (&gt;20%), candidate overlapping jobs, DLP warranty expenditures, and SLA/reopened durability breaches.
          </p>
        </div>

        {/* Screening notice pill */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 max-w-sm text-[11px] text-slate-400">
          <div className="flex items-center space-x-1.5 text-amber-400 font-semibold mb-0.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Screening Thresholds Notice</span>
          </div>
          Flags are automated engineering screening indicators, not final legal or criminal conclusions.
        </div>
      </div>

      {/* Aggregate KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-[11px] text-slate-400 font-medium">Total Flagged Findings</div>
          <div className="text-xl font-bold text-white font-mono mt-1">{findings.length}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Across all 24 wards</div>
        </div>

        <div className="bg-slate-900 border border-rose-950/80 rounded-xl p-4">
          <div className="text-[11px] text-rose-300 font-medium">High Priority Review</div>
          <div className="text-xl font-bold text-rose-400 font-mono mt-1">{stats.highCount}</div>
          <div className="text-[10px] text-rose-400/70 mt-0.5">&gt;30% variance or DLP breach</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-[11px] text-amber-400 font-medium">Rate Card Deviations</div>
          <div className="text-xl font-bold text-white font-mono mt-1">{stats.rateCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">&gt;20% benchmark variance</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-[11px] text-teal-400 font-medium">DLP Warranty Spend</div>
          <div className="text-xl font-bold text-white font-mono mt-1">{stats.dlpCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Jobs on active DLP roads</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-[11px] text-indigo-400 font-medium">Flagged Billed Spend</div>
          <div className="text-xl font-bold text-teal-300 font-mono mt-1">
            ₹{(stats.flaggedSpend / 10000000).toFixed(2)} Cr
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Recorded cost under review</div>
        </div>
      </div>

      {/* Control & Filter Strip */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
        {/* Finding Type Tab Bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          {[
            { id: 'ALL', label: 'All Checks' },
            { id: 'RATE_CARD_DEVIATION', label: 'Rate-Card Deviations' },
            { id: 'DUPLICATE_WORK_ORDER', label: 'Possible Duplicate Jobs' },
            { id: 'DLP_EXPENDITURE', label: 'DLP Warranty Breaches' },
            { id: 'SLA_DURABILITY_BREACH', label: 'SLA & Durability Breaches' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                selectedType === tab.id
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Secondary Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Ward selector */}
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400 font-medium">Ward:</span>
              <select
                value={selectedWard}
                onChange={e => setSelectedWard(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2.5 py-1 focus:outline-none focus:border-teal-500 font-mono"
              >
                <option value="ALL">All Wards (24)</option>
                {wards.map(w => (
                  <option key={w.ward_code} value={w.ward_code}>
                    Ward {w.ward_code} ({w.ward_name})
                  </option>
                ))}
              </select>
            </div>

            {/* Severity selector */}
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400 font-medium">Severity:</span>
              <select
                value={selectedSeverity}
                onChange={e => setSelectedSeverity(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2.5 py-1 focus:outline-none focus:border-teal-500"
              >
                <option value="ALL">All Severities</option>
                <option value="HIGH">High Priority</option>
                <option value="MEDIUM">Medium</option>
              </select>
            </div>
          </div>

          {/* Search box */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search WO, Road, Contractor..."
              className="w-64 bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded pl-7 pr-3 py-1 focus:outline-none focus:border-teal-500 font-mono"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1.5" />
          </div>
        </div>
      </div>

      {/* Findings List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-3">
          <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Running deterministic audit evaluations...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-950/30 border border-rose-800 rounded-xl text-center">
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      ) : filteredFindings.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl">
          <CheckCircle2 className="w-8 h-8 text-teal-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-white">No Audit Findings Match Selected Filters</p>
          <p className="text-xs text-slate-400 mt-1">Try resetting the ward or audit check type filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs text-slate-400 font-medium">
            Showing <strong className="text-white">{filteredFindings.length}</strong> findings requiring review:
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredFindings.map(finding => {
              const isHigh = finding.severity === 'HIGH';

              return (
                <div
                  key={finding.finding_id}
                  className={`bg-slate-900 border rounded-xl p-5 transition shadow-sm space-y-4 ${
                    isHigh
                      ? 'border-rose-900/60 hover:border-rose-600/80 bg-rose-950/10'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Finding Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono text-xs font-bold text-white bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                        {finding.finding_id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          isHigh
                            ? 'bg-rose-950 text-rose-300 border-rose-800'
                            : 'bg-amber-950 text-amber-300 border-amber-800'
                        }`}
                      >
                        {finding.status}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                        {finding.finding_type}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs font-mono">
                      <span className="text-slate-400">Ward:</span>
                      <span className="text-white font-bold">{finding.ward_code}</span>
                    </div>
                  </div>

                  {/* Context & Entities Strip */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Work Order:</span>
                      <button
                        onClick={() => onOpenWorkOrder(finding.work_order_id)}
                        className="text-amber-400 hover:text-amber-300 font-bold flex items-center space-x-1"
                      >
                        <span>{finding.work_order_id}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Road Asset:</span>
                      <button
                        onClick={() => onOpenPassport(finding.road_id)}
                        className="text-teal-400 hover:text-teal-300 font-bold flex items-center space-x-1"
                      >
                        <span>{finding.road_id}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Contractor:</span>
                      <span className="text-slate-200">{finding.contractor_id}</span>
                    </div>
                  </div>

                  {/* Finding Explanation */}
                  <div className="space-y-1.5 text-xs">
                    <div className="text-slate-300 font-medium leading-relaxed">
                      {finding.reason}
                    </div>

                    {/* Calculation Details */}
                    {finding.calculation?.formula && (
                      <div className="p-2.5 bg-slate-950 rounded border border-slate-800 font-mono text-[11px] text-teal-300">
                        <strong className="text-slate-400 font-sans mr-2">Calculated Variance:</strong>
                        {finding.calculation.formula}
                      </div>
                    )}
                  </div>

                  {/* Recommended Action & Limitations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                    <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-teal-400 mb-1">
                        Recommended Engineering Action
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        {finding.recommended_action}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Screening Context & Limitations
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        {finding.limitations}
                      </p>
                    </div>
                  </div>

                  {/* Source Provenance Footnote */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-500">Source Records:</span>
                      {finding.source_records.map((rec, i) => (
                        <EvidenceBadge
                          key={i}
                          provenance={{ source_file: rec.file, source_record_id: rec.id }}
                        />
                      ))}
                    </div>

                    <button
                      onClick={() => onOpenWorkOrder(finding.work_order_id)}
                      className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center space-x-1"
                    >
                      <span>Open Work Order Evidence Card</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
