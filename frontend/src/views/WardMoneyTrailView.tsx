import React, { useEffect, useState } from 'react';
import {
  TrendingUp, AlertTriangle, ShieldAlert, ArrowRight,
  RotateCcw, Building2, Wrench, ChevronRight
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <div className="w-9 h-9 border-2 border-accent-teal border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm">Reconciling Ward {wardCode} money trail...</p>
      </div>
    );
  }

  if (error || !trail || !wardDetail) {
    return (
      <div className="max-w-4xl mx-auto my-12 p-6 bg-navy-900 border border-rose-500/30 rounded-xl text-center">
        <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
        <h3 className="text-lg font-bold text-white mb-1">Failed to load Ward {wardCode} financial trail</h3>
        <p className="text-xs text-slate-400 mb-4">{error || 'Data unavailable'}</p>
      </div>
    );
  }

  const selectedContractor = trail.contractor_expenditure.find(c => c.contractor_id === selectedContractorId);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Ward Header */}
      <div className="p-6 bg-navy-900 border border-slate-800 rounded-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-accent-teal/20 text-accent-teal border border-accent-teal/30">
                BMC Ward {trail.ward_code}
              </span>
              <span className="text-xs text-slate-400">{wardDetail.zone} Zone</span>
              <EvidenceBadge provenance={trail.provenance} />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              {trail.ward_name}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Localities: {wardDetail.localities.join(', ')} • Asst Commissioner Office: {wardDetail.assistant_commissioner_office}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateAudits(wardCode)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-accent-rose/15 hover:bg-accent-rose/25 text-rose-300 border border-accent-rose/30 transition-colors"
            >
              <ShieldAlert className="w-4 h-4 text-accent-rose" />
              View Ward Audit Findings
            </button>
          </div>
        </div>

        {/* Financial KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-slate-800">
          <div className="p-3.5 bg-navy-950/80 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Monsoon Repair Budget</span>
            <span className="text-xl font-bold font-mono text-white mt-0.5 block">
              ₹{trail.monsoon_repair_budget_inr_2025.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">Sanctioned allocation (Jun-Sep)</span>
          </div>

          <div className="p-3.5 bg-navy-950/80 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Recorded Billed Spend</span>
            <span className="text-xl font-bold font-mono text-accent-teal mt-0.5 block">
              ₹{trail.total_recorded_work_order_expenditure_inr.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">
              {trail.budget_utilization_pct}% utilization ({trail.total_work_orders} work orders)
            </span>
          </div>

          <div className="p-3.5 bg-navy-950/80 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Failed Fix Expenditure</span>
            <span className="text-xl font-bold font-mono text-accent-rose mt-0.5 block">
              ₹{trail.reopened_expenditure_inr.toLocaleString()}
            </span>
            <span className="text-[10px] text-rose-300/80 block mt-1">
              {trail.reopened_rate_pct}% reopen rate ({trail.reopened_jobs_count} jobs)
            </span>
          </div>

          <div className="p-3.5 bg-navy-950/80 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">DLP Warranty Breach Spend</span>
            <span className="text-xl font-bold font-mono text-accent-amber mt-0.5 block">
              ₹{trail.dlp_breach_expenditure_inr.toLocaleString()}
            </span>
            <span className="text-[10px] text-amber-300/80 block mt-1">
              {trail.dlp_breach_jobs_count} jobs on roads under DLP
            </span>
          </div>
        </div>

        <div className="mt-4 p-2.5 bg-navy-950/60 rounded-lg text-[11px] text-slate-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent-teal shrink-0"></span>
          <span>
            Financial Transparency Note: Figures represent recorded billed costs submitted on municipal work orders, not verified treasury disbursements.
          </span>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Contractor Breakdown & Drill-Down (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Contractors Section */}
          <div className="p-5 bg-navy-900 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-accent-teal" />
                  Contractor-wise Expenditure Breakdown
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click any contractor card to reveal constituent work orders
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {trail.contractor_expenditure.length} Contractors Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {trail.contractor_expenditure.map(c => {
                const isSelected = selectedContractorId === c.contractor_id;
                return (
                  <div
                    key={c.contractor_id}
                    onClick={() => setSelectedContractorId(isSelected ? null : c.contractor_id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-navy-800 border-accent-teal shadow-lg shadow-accent-teal/10'
                        : 'bg-navy-950 hover:bg-navy-850 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-mono font-bold text-slate-300">{c.contractor_id}</span>
                      <span className="text-xs font-mono font-bold text-accent-teal">
                        ₹{c.total_recorded_billed_cost_inr.toLocaleString()}
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-white line-clamp-1">{c.contractor_name}</h4>
                    <div className="flex items-center justify-between mt-2.5 text-[11px] text-slate-400">
                      <span>{c.work_order_count} jobs (avg ₹{c.average_job_cost_inr.toLocaleString()})</span>
                      {c.reopened_jobs_count > 0 && (
                        <span className="text-rose-400 font-medium">{c.reopened_jobs_count} reopened</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Drill-Down Work Orders List for Selected Contractor */}
            {selectedContractor && (
              <div className="mt-5 pt-5 border-t border-slate-800 animate-fadeIn">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Work Orders for {selectedContractor.contractor_name} ({selectedContractor.work_order_ids.length})
                  </h4>
                  <span className="text-xs text-slate-400">Click work order to inspect evidence</span>
                </div>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                  {selectedContractor.work_order_ids.map(woId => (
                    <button
                      key={woId}
                      onClick={() => onSelectWorkOrder(woId)}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded bg-navy-950 hover:bg-navy-800 border border-slate-800 hover:border-accent-teal text-slate-300 hover:text-white transition-colors"
                    >
                      <span>{woId}</span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Repair Methods Expenditure */}
          <div className="p-5 bg-navy-900 border border-slate-800 rounded-2xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-accent-emerald" />
              Repair Method Expenditure & Benchmarks
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 font-medium">Repair Method</th>
                    <th className="py-2.5 font-medium">Unit</th>
                    <th className="py-2.5 font-medium">Standard Benchmark</th>
                    <th className="py-2.5 font-medium">Jobs</th>
                    <th className="py-2.5 font-medium">Avg Cost</th>
                    <th className="py-2.5 font-medium text-right">Total Recorded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {trail.repair_method_expenditure.map(m => (
                    <tr key={m.repair_method} className="hover:bg-navy-850/50 transition-colors">
                      <td className="py-2.5 font-medium text-slate-200">{m.repair_method}</td>
                      <td className="py-2.5 text-slate-400 font-mono">{m.unit}</td>
                      <td className="py-2.5 text-slate-300 font-mono">
                        {m.standard_rate_inr ? `₹${m.standard_rate_inr.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-2.5 text-slate-300">{m.work_order_count}</td>
                      <td className="py-2.5 text-slate-300 font-mono">₹{m.average_job_cost_inr.toLocaleString()}</td>
                      <td className="py-2.5 text-right font-mono font-bold text-slate-100">
                        ₹{m.total_recorded_billed_cost_inr.toLocaleString()}
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
          <div className="p-5 bg-navy-900 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent-teal" />
                Road Asset Spend ({trail.road_expenditure.length})
              </h3>
              <span className="text-[11px] text-slate-400">Click to open Passport</span>
            </div>

            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {trail.road_expenditure.map(r => (
                <div
                  key={r.road_id}
                  onClick={() => onSelectRoad(r.road_id)}
                  className="p-3 bg-navy-950 hover:bg-navy-850 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-accent-teal">{r.road_id}</span>
                    <span className="font-mono text-xs font-bold text-slate-100">
                      ₹{r.total_recorded_expenditure_inr.toLocaleString()}
                    </span>
                  </div>
                  <h4 className="text-xs font-medium text-slate-200 group-hover:text-accent-teal transition-colors line-clamp-1">
                    {r.road_name}
                  </h4>
                  <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                    <span>{r.surface} • {r.work_order_count} work orders</span>
                    {r.under_dlp && (
                      <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                        Under DLP
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
