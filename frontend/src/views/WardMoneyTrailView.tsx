import React, { useEffect, useState } from 'react';
import {
  TrendingUp, AlertTriangle, ShieldAlert, ArrowRight,
  RotateCcw, Building2, Wrench, ChevronRight, FileText, Compass
} from 'lucide-react';
import { MoneyTrail, WardDetail } from '../types';
import { api } from '../api/client';
import { EvidenceBadge } from '../components/EvidenceBadge';

interface Props {
  wardCode: string;
  onSelectRoad: (roadId: string) => void;
  onSelectWorkOrder: (woId: string) => void;
  onNavigateAudits: (wardCode: string) => void;
}

export const WardMoneyTrailView: React.FC<Props> = ({
  wardCode,
  onSelectRoad,
  onSelectWorkOrder,
  onNavigateAudits
}) => {
  const [trail, setTrail] = useState<MoneyTrail | null>(null);
  const [wardDetail, setWardDetail] = useState<WardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContractorId, setSelectedContractorId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.getWardMoneyTrail(wardCode),
      api.getWardDetail(wardCode)
    ])
      .then(([trailData, detailData]) => {
        setTrail(trailData);
        setWardDetail(detailData);
        setSelectedContractorId(null);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [wardCode]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-rt-secondary-text font-body">
        <div className="w-10 h-10 border-3 border-rt-ink border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-mono font-bold uppercase tracking-wider text-rt-ink">
          Reconciling Ward {wardCode} Ledger...
        </p>
      </div>
    );
  }

  if (error || !trail || !wardDetail) {
    return (
      <div className="max-w-4xl mx-auto my-12 p-6 bg-white border-3 border-rt-ink rounded-[4px] shadow-brutal text-center font-body">
        <AlertTriangle className="w-8 h-8 text-rt-coral mx-auto mb-2" />
        <h3 className="text-xl font-headline font-black text-rt-ink mb-1">Failed to load Ward {wardCode} financial trail</h3>
        <p className="text-xs font-mono text-rt-secondary-text mb-4">{error || 'Data unavailable'}</p>
      </div>
    );
  }

  const selectedContractor = trail.contractor_expenditure.find(c => c.contractor_id === selectedContractorId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-body pb-16">
      {/* Ward Investigative Header */}
      <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-[3px] bg-rt-primary border border-rt-ink text-rt-ink shadow-[1.5px_1.5px_0px_#171717]">
                BMC WARD {trail.ward_code}
              </span>
              <span className="text-xs font-mono font-bold text-rt-ink bg-rt-canvas px-2 py-0.5 rounded border border-rt-ink">
                {wardDetail.zone} ZONE
              </span>
              <EvidenceBadge provenance={trail.provenance} />
            </div>

            <h1 className="text-3xl sm:text-4xl font-headline font-black text-rt-ink tracking-tight">
              {trail.ward_name} Financial Trail
            </h1>
            <p className="text-xs font-mono text-rt-secondary-text mt-1.5">
              Localities: <span className="text-rt-ink font-semibold">{wardDetail.localities.join(', ')}</span> • AC Office: {wardDetail.assistant_commissioner_office}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateAudits(wardCode)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-headline font-bold rounded-[4px] bg-rt-coral text-white border-2 border-rt-ink shadow-brutal-sm hover:shadow-brutal active:translate-x-[1px] active:translate-y-[1px] transition-all"
            >
              <ShieldAlert className="w-4 h-4 text-white" />
              <span>Inspect Ward Audit Findings</span>
            </button>
          </div>
        </div>

        {/* Large Financial Metric Blocks */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t-2 border-rt-ink">
          <div className="p-4 bg-rt-canvas border-2 border-rt-ink rounded-[4px] shadow-brutal-sm">
            <span className="text-[10px] text-rt-secondary-text uppercase font-mono font-bold tracking-wider block">
              Monsoon Repair Budget
            </span>
            <span className="text-2xl font-bold font-financial text-rt-ink mt-1 block">
              ₹{trail.monsoon_repair_budget_inr_2025.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] font-mono text-rt-secondary-text block mt-1">
              Sanctioned allocation (2025)
            </span>
          </div>

          <div className="p-4 bg-rt-primary border-2 border-rt-ink rounded-[4px] shadow-brutal-sm">
            <span className="text-[10px] text-rt-ink uppercase font-mono font-bold tracking-wider block">
              Recorded Billed Spend
            </span>
            <span className="text-2xl font-black font-financial text-rt-ink mt-1 block">
              ₹{trail.total_recorded_work_order_expenditure_inr.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] font-mono text-rt-ink font-bold block mt-1">
              {trail.budget_utilization_pct}% utilization ({trail.total_work_orders} WOs)
            </span>
          </div>

          <div className="p-4 bg-white border-2 border-rt-ink rounded-[4px] shadow-brutal-sm">
            <span className="text-[10px] text-rt-coral uppercase font-mono font-bold tracking-wider block">
              Failed Fix Expenditure
            </span>
            <span className="text-2xl font-bold font-financial text-rt-coral mt-1 block">
              ₹{trail.reopened_expenditure_inr.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] font-mono text-rt-secondary-text block mt-1">
              {trail.reopened_rate_pct}% reopen rate ({trail.reopened_jobs_count} jobs)
            </span>
          </div>

          <div className="p-4 bg-white border-2 border-rt-ink rounded-[4px] shadow-brutal-sm">
            <span className="text-[10px] text-rt-secondary-text uppercase font-mono font-bold tracking-wider block">
              DLP Warranty Breach Spend
            </span>
            <span className="text-2xl font-bold font-financial text-rt-ink mt-1 block">
              ₹{trail.dlp_breach_expenditure_inr.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] font-mono text-rt-secondary-text block mt-1">
              {trail.dlp_breach_jobs_count} jobs on active DLP roads
            </span>
          </div>
        </div>

        <div className="mt-4 p-2.5 bg-rt-muted border border-rt-ink rounded-[3px] text-[11px] font-mono text-rt-secondary-text flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rt-primary border border-rt-ink shrink-0"></span>
          <span>
            <strong>FINANCIAL NOTE:</strong> Figures represent recorded billed costs submitted on municipal work orders, not verified treasury disbursements.
          </span>
        </div>
      </div>

      {/* Main Grid: Contractors & Repair Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Contractor Breakdown (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Contractors Section */}
          <div className="p-5 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal">
            <div className="flex items-center justify-between mb-4 border-b-2 border-rt-ink pb-3">
              <div>
                <h3 className="text-sm font-headline font-black text-rt-ink uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-rt-ink" />
                  Contractor-wise Expenditure Breakdown
                </h3>
                <p className="text-xs font-mono text-rt-secondary-text mt-0.5">
                  Click any contractor card to reveal constituent work orders
                </p>
              </div>
              <span className="text-xs font-mono font-bold bg-rt-canvas px-2 py-0.5 rounded border border-rt-ink">
                {trail.contractor_expenditure.length} ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {trail.contractor_expenditure.map(c => {
                const isSelected = selectedContractorId === c.contractor_id;
                return (
                  <div
                    key={c.contractor_id}
                    onClick={() => setSelectedContractorId(isSelected ? null : c.contractor_id)}
                    className={`p-4 rounded-[4px] border-2 border-rt-ink cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-rt-primary shadow-brutal translate-x-[-1px] translate-y-[-1px]'
                        : 'bg-white hover:bg-rt-canvas shadow-brutal-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5 font-mono">
                      <span className="text-xs font-bold text-rt-ink bg-white px-1.5 py-0.2 rounded border border-rt-ink">
                        {c.contractor_id}
                      </span>
                      <span className="text-sm font-black font-financial text-rt-ink">
                        ₹{c.total_recorded_billed_cost_inr.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <h4 className="text-sm font-headline font-bold text-rt-ink line-clamp-1">{c.contractor_name}</h4>
                    <div className="flex items-center justify-between mt-2.5 text-[11px] font-mono text-rt-secondary-text">
                      <span>{c.work_order_count} jobs (avg ₹{c.average_job_cost_inr.toLocaleString('en-IN')})</span>
                      {c.reopened_jobs_count > 0 && (
                        <span className="text-rt-coral font-bold">{c.reopened_jobs_count} reopened</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Contractor Drill-Down Work Orders List */}
            {selectedContractor && (
              <div className="mt-5 p-4 bg-rt-canvas border-2 border-rt-ink rounded-[4px] space-y-3">
                <div className="flex items-center justify-between border-b border-rt-ink/20 pb-2">
                  <h4 className="text-xs font-headline font-black text-rt-ink uppercase">
                    Work Orders by {selectedContractor.contractor_name} ({selectedContractor.work_order_ids.length})
                  </h4>
                  <button
                    onClick={() => setSelectedContractorId(null)}
                    className="text-xs font-mono font-bold text-rt-secondary-text hover:text-rt-ink"
                  >
                    [Close]
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedContractor.work_order_ids.map(woId => (
                    <button
                      key={woId}
                      onClick={() => onSelectWorkOrder(woId)}
                      className="px-2.5 py-1 text-xs font-mono font-bold bg-white hover:bg-rt-primary border border-rt-ink rounded-[3px] text-rt-ink shadow-[1px_1px_0px_#171717] transition-all flex items-center space-x-1"
                    >
                      <span>{woId}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Repair Method Expenditure */}
          <div className="p-5 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal">
            <h3 className="text-sm font-headline font-black text-rt-ink uppercase tracking-wider mb-4 border-b-2 border-rt-ink pb-3 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-rt-ink" />
              Expenditure by Repair Technique
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left font-mono">
                <thead className="bg-rt-canvas text-rt-ink uppercase text-[10px] font-bold border-b-2 border-rt-ink">
                  <tr>
                    <th className="py-2.5 px-3">Repair Method</th>
                    <th className="py-2.5 px-3">Schedule Rate</th>
                    <th className="py-2.5 px-3">Total Spend</th>
                    <th className="py-2.5 px-3">Jobs</th>
                    <th className="py-2.5 px-3 text-right">Avg Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-b border-rt-ink divide-rt-muted">
                  {trail.repair_method_expenditure.map(m => (
                    <tr key={m.repair_method} className="hover:bg-yellow-50/60 transition-colors">
                      <td className="py-2.5 px-3 font-headline font-bold text-rt-ink">{m.repair_method}</td>
                      <td className="py-2.5 px-3 text-rt-secondary-text">
                        {m.standard_rate_inr ? `₹${m.standard_rate_inr} ${m.unit}` : 'Standard'}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-rt-ink font-financial">
                        ₹{m.total_recorded_billed_cost_inr.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3">{m.work_order_count}</td>
                      <td className="py-2.5 px-3 text-right font-financial">
                        ₹{m.average_job_cost_inr.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Linked Road Assets (1 Col) */}
        <div className="space-y-6">
          <div className="p-5 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal">
            <div className="flex items-center justify-between mb-4 border-b-2 border-rt-ink pb-3">
              <div>
                <h3 className="text-sm font-headline font-black text-rt-ink uppercase tracking-wider flex items-center gap-2">
                  <Compass className="w-4 h-4 text-rt-ink" />
                  Linked Road Assets
                </h3>
                <p className="text-[11px] font-mono text-rt-secondary-text mt-0.5">
                  Click to open persistent Road Passport
                </p>
              </div>
              <span className="text-xs font-mono font-bold bg-rt-canvas px-2 py-0.5 rounded border border-rt-ink">
                {trail.road_expenditure.length} ROADS
              </span>
            </div>

            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {trail.road_expenditure.map(r => (
                <div
                  key={r.road_id}
                  onClick={() => onSelectRoad(r.road_id)}
                  className="p-3 bg-rt-canvas hover:bg-rt-primary border-2 border-rt-ink rounded-[4px] shadow-brutal-sm cursor-pointer transition-all duration-75 active:translate-x-[1px] active:translate-y-[1px]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-bold text-rt-ink bg-white px-1.5 py-0.2 rounded border border-rt-ink">
                      {r.road_id}
                    </span>
                    <span className="text-xs font-mono font-bold font-financial text-rt-ink">
                      ₹{r.total_recorded_expenditure_inr.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <h4 className="text-xs font-headline font-bold text-rt-ink line-clamp-1">{r.road_name}</h4>
                  <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-rt-secondary-text">
                    <span>{r.work_order_count} WOs • {r.surface}</span>
                    {r.under_dlp && (
                      <span className="px-1 py-0.2 rounded bg-rt-coral text-white font-bold text-[9px]">
                        DLP ACTIVE
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
