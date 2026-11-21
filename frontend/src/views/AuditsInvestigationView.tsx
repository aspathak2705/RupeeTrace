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
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-body pb-20">
      {/* Header */}
      <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-[3px] text-xs font-mono font-bold bg-rt-coral text-white border border-rt-ink shadow-[1.5px_1.5px_0px_#171717]">
              REPAIR AUDITOR
            </span>
            <span className="text-xs font-mono font-bold bg-rt-primary text-rt-ink px-2 py-0.5 rounded border border-rt-ink">
              DETERMINISTIC RULES
            </span>
          </div>
          <h1 className="text-3xl font-headline font-black text-rt-ink tracking-tight">
            Repair Auditor & Financial Investigation
          </h1>
          <p className="text-xs font-mono text-rt-secondary-text mt-1 max-w-2xl">
            Algorithmic screening: rate-card deviations (&gt;20%), candidate overlapping jobs, DLP warranty expenditures, and SLA/durability breaches.
          </p>
        </div>

        {/* Screening notice docket */}
        <div className="bg-rt-canvas border-2 border-rt-ink rounded-[4px] p-3 max-w-sm text-xs font-mono shadow-brutal-sm">
          <div className="flex items-center space-x-1.5 text-rt-ink font-headline font-bold mb-1 uppercase text-[11px]">
            <AlertTriangle className="w-4 h-4 text-rt-coral" />
            <span>Screening Thresholds Notice</span>
          </div>
          Flags are automated engineering screening indicators, not final legal conclusions.
        </div>
      </div>

      {/* Aggregate KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white border-2 border-rt-ink rounded-[4px] p-4 shadow-brutal-sm">
          <span className="text-[10px] text-rt-secondary-text font-mono font-bold uppercase tracking-wider block">Total Flagged Findings</span>
          <span className="text-2xl font-black font-financial text-rt-ink mt-1 block">{findings.length}</span>
          <span className="text-[10px] font-mono text-rt-secondary-text block mt-1">Across all 24 wards</span>
        </div>

        <div className="bg-rt-coral text-white border-2 border-rt-ink rounded-[4px] p-4 shadow-brutal-sm">
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider block opacity-90">High Priority Review</span>
          <span className="text-2xl font-black font-financial mt-1 block">{stats.highCount}</span>
          <span className="text-[10px] font-mono opacity-80 block mt-1">&gt;30% variance or DLP</span>
        </div>

        <div className="bg-white border-2 border-rt-ink rounded-[4px] p-4 shadow-brutal-sm">
          <span className="text-[10px] text-rt-secondary-text font-mono font-bold uppercase tracking-wider block">Rate Card Deviations</span>
          <span className="text-2xl font-black font-financial text-rt-ink mt-1 block">{stats.rateCount}</span>
          <span className="text-[10px] font-mono text-rt-secondary-text block mt-1">&gt;20% benchmark variance</span>
        </div>

        <div className="bg-white border-2 border-rt-ink rounded-[4px] p-4 shadow-brutal-sm">
          <span className="text-[10px] text-rt-secondary-text font-mono font-bold uppercase tracking-wider block">DLP Warranty Spend</span>
          <span className="text-2xl font-black font-financial text-rt-ink mt-1 block">{stats.dlpCount}</span>
          <span className="text-[10px] font-mono text-rt-secondary-text block mt-1">Jobs on active DLP roads</span>
        </div>

        <div className="bg-rt-primary border-2 border-rt-ink rounded-[4px] p-4 shadow-brutal-sm">
          <span className="text-[10px] text-rt-ink font-mono font-bold uppercase tracking-wider block">Flagged Billed Spend</span>
          <span className="text-2xl font-black font-financial text-rt-ink mt-1 block">
            ₹{(stats.flaggedSpend / 10000000).toFixed(2)} Cr
          </span>
          <span className="text-[10px] font-mono text-rt-ink font-bold block mt-1">Recorded cost under review</span>
        </div>
      </div>

      {/* Control & Filter Strip */}
      <div className="bg-white border-3 border-rt-ink rounded-[6px] p-5 space-y-4 shadow-brutal">
        {/* Finding Type Tab Bar */}
        <div className="flex flex-wrap items-center gap-2 border-b-2 border-rt-ink pb-3">
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
              className={`px-3 py-1.5 rounded-[4px] text-xs font-headline font-bold border-2 border-rt-ink transition-all ${
                selectedType === tab.id
                  ? 'bg-rt-primary text-rt-ink shadow-brutal-sm'
                  : 'bg-rt-canvas text-rt-ink hover:bg-white shadow-[1px_1px_0px_#171717]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Secondary Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-rt-secondary-text font-bold uppercase text-[10px]">Ward:</span>
              <select
                value={selectedWard}
                onChange={e => setSelectedWard(e.target.value)}
                className="bg-rt-canvas border-2 border-rt-ink text-rt-ink rounded-[4px] px-2.5 py-1 font-bold focus:outline-none focus:bg-white"
              >
                <option value="ALL">All Wards (24)</option>
                {wards.map(w => (
                  <option key={w.ward_code} value={w.ward_code}>
                    Ward {w.ward_code} ({w.ward_name})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-rt-secondary-text font-bold uppercase text-[10px]">Severity:</span>
              <select
                value={selectedSeverity}
                onChange={e => setSelectedSeverity(e.target.value)}
                className="bg-rt-canvas border-2 border-rt-ink text-rt-ink rounded-[4px] px-2.5 py-1 font-bold focus:outline-none focus:bg-white"
              >
                <option value="ALL">All Severities</option>
                <option value="HIGH">High Priority</option>
                <option value="MEDIUM">Medium</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search WO, Road, Contractor..."
              className="w-64 bg-rt-canvas border-2 border-rt-ink text-xs text-rt-ink rounded-[4px] pl-7 pr-3 py-1 font-bold focus:outline-none focus:bg-white focus:shadow-brutal-sm"
            />
            <Search className="w-3.5 h-3.5 text-rt-ink absolute left-2 top-1.5" />
          </div>
        </div>
      </div>

      {/* Findings List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-3 font-mono">
          <div className="w-8 h-8 border-3 border-rt-ink border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold uppercase tracking-wider text-rt-ink">Executing deterministic audit checks...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rt-coral text-white border-3 border-rt-ink rounded-[4px] shadow-brutal text-center font-mono">
          <p className="font-bold">{error}</p>
        </div>
      ) : filteredFindings.length === 0 ? (
        <div className="p-12 text-center bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal">
          <CheckCircle2 className="w-8 h-8 text-rt-ink mx-auto mb-2" />
          <p className="text-base font-headline font-bold text-rt-ink">No Audit Findings Match Filters</p>
          <p className="text-xs font-mono text-rt-secondary-text mt-1">Try resetting the ward or audit check type filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs font-mono font-bold text-rt-secondary-text">
            SHOWING <strong className="text-rt-ink">{filteredFindings.length}</strong> FINDINGS REQUIRING SCREENING REVIEW:
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredFindings.map(finding => {
              const isHigh = finding.severity === 'HIGH';

              return (
                <div
                  key={finding.finding_id}
                  className={`bg-white border-3 rounded-[6px] p-5 transition shadow-brutal space-y-4 ${
                    isHigh ? 'border-rt-ink bg-yellow-50/30' : 'border-rt-ink'
                  }`}
                >
                  {/* Top Finding Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-rt-ink pb-3 font-mono">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white bg-rt-ink px-2.5 py-1 rounded-[3px]">
                        {finding.finding_id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-[3px] text-[11px] font-bold border border-rt-ink ${
                          isHigh
                            ? 'bg-rt-coral text-white'
                            : 'bg-rt-primary text-rt-ink'
                        }`}
                      >
                        {finding.status}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rt-canvas text-rt-ink border border-rt-ink">
                        {finding.finding_type}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs font-bold">
                      <span className="text-rt-secondary-text uppercase text-[10px]">Ward:</span>
                      <span className="text-rt-ink bg-rt-canvas px-1.5 py-0.2 rounded border border-rt-ink">{finding.ward_code}</span>
                    </div>
                  </div>

                  {/* Context Entities Strip */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-rt-canvas p-3 rounded-[4px] border-2 border-rt-ink text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-rt-secondary-text font-bold">Work Order:</span>
                      <button
                        onClick={() => onOpenWorkOrder(finding.work_order_id)}
                        className="text-rt-ink font-bold hover:underline flex items-center space-x-1"
                      >
                        <span>{finding.work_order_id}</span>
                        <ExternalLink className="w-3 h-3 text-rt-ink" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-rt-secondary-text font-bold">Road Asset:</span>
                      <button
                        onClick={() => onOpenPassport(finding.road_id)}
                        className="text-rt-ink font-bold hover:underline flex items-center space-x-1"
                      >
                        <span>{finding.road_id}</span>
                        <ExternalLink className="w-3 h-3 text-rt-ink" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-rt-secondary-text font-bold">Contractor:</span>
                      <span className="text-rt-ink font-bold">{finding.contractor_id}</span>
                    </div>
                  </div>

                  {/* Finding Explanation */}
                  <div className="space-y-2 text-xs">
                    <p className="text-rt-ink font-body font-medium leading-relaxed">
                      {finding.reason}
                    </p>

                    {/* Calculation Details */}
                    {finding.calculation?.formula && (
                      <div className="p-3 bg-yellow-50 rounded-[4px] border-2 border-rt-ink font-mono text-[11px] text-rt-ink shadow-brutal-sm">
                        <strong className="text-rt-secondary-text font-headline uppercase block mb-0.5 text-[10px]">
                          Calculated Audit Deviation:
                        </strong>
                        {finding.calculation.formula}
                      </div>
                    )}
                  </div>

                  {/* Recommended Action & Limitations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1 font-mono">
                    <div className="p-3 bg-rt-muted border border-rt-ink rounded-[4px]">
                      <div className="text-[10px] font-headline font-bold uppercase tracking-wider text-rt-ink mb-1">
                        Recommended Engineering Action
                      </div>
                      <p className="text-rt-ink text-[11px] font-body leading-relaxed">
                        {finding.recommended_action}
                      </p>
                    </div>

                    <div className="p-3 bg-rt-canvas border border-rt-ink rounded-[4px]">
                      <div className="text-[10px] font-headline font-bold uppercase tracking-wider text-rt-secondary-text mb-1">
                        Screening Context & Limitations
                      </div>
                      <p className="text-rt-secondary-text text-[11px] font-body leading-relaxed">
                        {finding.limitations}
                      </p>
                    </div>
                  </div>

                  {/* Source Records Footnote */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-rt-ink/20 text-[11px] font-mono">
                    <div className="flex items-center space-x-2">
                      <span className="text-rt-secondary-text font-bold">Source Records:</span>
                      {finding.source_records.map((rec, i) => (
                        <EvidenceBadge
                          key={i}
                          provenance={{ source_file: rec.file, source_record_id: rec.id }}
                        />
                      ))}
                    </div>

                    <button
                      onClick={() => onOpenWorkOrder(finding.work_order_id)}
                      className="text-xs font-headline font-bold text-rt-ink hover:underline flex items-center space-x-1"
                    >
                      <span>Open Work Order Evidence Docket</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-rt-ink" />
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
