import React, { useState, useEffect } from 'react';
import {
  Award, ShieldCheck, AlertTriangle, TrendingUp,
  FileText, ExternalLink, HelpCircle, ArrowUpRight,
  Info, BarChart3, CheckCircle2, CloudRain, Hammer
} from 'lucide-react';
import { api } from '../api/client';
import { ContractorScorecard } from '../types';
import { EvidenceBadge } from '../components/EvidenceBadge';

interface FairAccountabilityViewProps {
  onOpenWorkOrder: (woId: string) => void;
  onNavigateToGraph: (type: 'work_order' | 'road' | 'ward', id: string) => void;
}

const TIER_STYLES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  'Good Standing': {
    bg: 'bg-emerald-950/30',
    border: 'border-emerald-700/60',
    text: 'text-emerald-300',
    badge: 'bg-emerald-950 text-emerald-300 border-emerald-700'
  },
  'Standard Performance': {
    bg: 'bg-blue-950/30',
    border: 'border-blue-700/60',
    text: 'text-blue-300',
    badge: 'bg-blue-950 text-blue-300 border-blue-700'
  },
  'Review Recommended': {
    bg: 'bg-amber-950/30',
    border: 'border-amber-700/60',
    text: 'text-amber-300',
    badge: 'bg-amber-950 text-amber-300 border-amber-700'
  },
  'High Scrutiny': {
    bg: 'bg-rose-950/30',
    border: 'border-rose-700/60',
    text: 'text-rose-300',
    badge: 'bg-rose-950 text-rose-300 border-rose-700'
  }
};

export const FairAccountabilityView: React.FC<FairAccountabilityViewProps> = ({
  onOpenWorkOrder,
  onNavigateToGraph
}) => {
  const [contractors, setContractors] = useState<ContractorScorecard[]>([]);
  const [selectedContractor, setSelectedContractor] = useState<ContractorScorecard | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContractors = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getContractors();
        // Sort descending by composite score
        data.sort((a, b) => b.composite_score - a.composite_score);
        setContractors(data);
        if (data.length > 0) setSelectedContractor(data[0]);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load contractor scorecards');
      } finally {
        setLoading(false);
      }
    };
    fetchContractors();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
              <Award className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Fair Contractor Accountability</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-950 text-blue-300 border border-blue-800">
              Context-Adjusted Model
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Empanelled contractor performance evaluated across SLA speed, repair durability, cost efficiency, and repeat repair burden — adjusted for ward low-lying flood indices.
          </p>
        </div>

        {/* Methodology Pill */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 max-w-md text-[11px] text-slate-400">
          <div className="flex items-center space-x-1.5 text-blue-400 font-semibold mb-0.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Fair Accountability Methodology</span>
          </div>
          Contractors operating in severely flood-prone low-lying wards receive adversity moderation to avoid penalizing difficult operating conditions.
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Calculating composite contractor scorecards...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-950/30 border border-rose-800 rounded-xl text-center">
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Contractor Cards List */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-semibold uppercase tracking-wider">
              <span>Empanelled Contractors ({contractors.length})</span>
              <span>Composite Score</span>
            </div>

            <div className="space-y-2.5">
              {contractors.map(c => {
                const isSel = selectedContractor?.contractor_id === c.contractor_id;
                const tierStyle = TIER_STYLES[c.rating_tier] || TIER_STYLES['Standard Performance'];

                return (
                  <div
                    key={c.contractor_id}
                    onClick={() => setSelectedContractor(c)}
                    className={`p-4 rounded-xl border transition cursor-pointer ${
                      isSel
                        ? 'bg-slate-900 border-blue-500 shadow-md ring-1 ring-blue-500/30'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-white">{c.contractor_id}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${tierStyle.badge}`}>
                            {c.rating_tier}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-slate-200 mt-1">{c.contractor_name}</h3>
                      </div>

                      <div className="text-right">
                        <div className="text-xl font-bold font-mono text-white">
                          {c.composite_score.toFixed(1)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">/ 100.0</div>
                      </div>
                    </div>

                    {/* Quick stats mini-row */}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-[11px] font-mono">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Total Jobs:</span>
                        <span className="text-slate-300 font-semibold">{c.total_jobs}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">SLA Met:</span>
                        <span className="text-teal-400 font-semibold">
                          {c.score_breakdown.sla_performance.raw_sla_success_rate_pct.toFixed(0)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Reopened:</span>
                        <span className="text-amber-400 font-semibold">
                          {c.score_breakdown.repair_durability.reopened_jobs_count}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detailed Scorecard Inspection */}
          <div className="lg:col-span-2">
            {selectedContractor ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                {/* Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono text-xs font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {selectedContractor.contractor_id}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${
                          TIER_STYLES[selectedContractor.rating_tier]?.badge
                        }`}
                      >
                        {selectedContractor.rating_tier}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Empanelled: {selectedContractor.empanelled_since}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-white tracking-tight mt-1.5">
                      {selectedContractor.contractor_name}
                    </h2>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Active across {selectedContractor.wards_with_recorded_work.length} wards: {selectedContractor.wards_with_recorded_work.join(', ')}
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center min-w-[130px]">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      Composite Score
                    </div>
                    <div className="text-3xl font-bold font-mono text-teal-300 mt-1">
                      {selectedContractor.composite_score.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">out of 100.0</div>
                  </div>
                </div>

                {/* Key Metrics Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">Recorded Billed Cost</span>
                    <span className="text-sm font-bold text-white">
                      ₹{(selectedContractor.total_recorded_billed_amount_inr / 100000).toFixed(1)} Lakh
                    </span>
                    <span className="text-[9px] text-slate-500 block font-sans mt-0.5">Recorded billed spend</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">Total Work Orders</span>
                    <span className="text-sm font-bold text-white">{selectedContractor.total_jobs}</span>
                    <span className="text-[9px] text-slate-500 block font-sans mt-0.5">Executed road repairs</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">Reopened Within 30d</span>
                    <span className="text-sm font-bold text-amber-400">
                      {selectedContractor.score_breakdown.repair_durability.reopened_jobs_count}
                    </span>
                    <span className="text-[9px] text-slate-500 block font-sans mt-0.5">
                      ₹{(selectedContractor.score_breakdown.repair_durability.reopened_expenditure_inr / 100000).toFixed(1)}L cost
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">Avg Low-Lying Index</span>
                    <span className="text-sm font-bold text-blue-400">
                      {selectedContractor.contextual_factors.average_ward_low_lying_index.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-slate-500 block font-sans mt-0.5">Waterlogging exposure</span>
                  </div>
                </div>

                {/* Score Breakdown (4 pillars) */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Performance Pillars Breakdown (100% Weightage)</span>
                    <span className="text-[11px] text-slate-500 font-normal">Deterministic formula</span>
                  </h3>

                  <div className="space-y-3">
                    {/* Pillar 1: SLA Performance */}
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200">
                          1. SLA Turnaround Speed (Weight: 30%)
                        </span>
                        <span className="font-mono font-bold text-teal-400">
                          {selectedContractor.score_breakdown.sla_performance.score.toFixed(1)} / 100
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${selectedContractor.score_breakdown.sla_performance.score}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>
                          Success Rate: {selectedContractor.score_breakdown.sla_performance.raw_sla_success_rate_pct.toFixed(1)}%
                        </span>
                        <span>
                          {selectedContractor.score_breakdown.sla_performance.jobs_meeting_sla} met /{' '}
                          {selectedContractor.score_breakdown.sla_performance.jobs_breaching_sla} breached
                        </span>
                      </div>
                    </div>

                    {/* Pillar 2: Repair Durability */}
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200">
                          2. Repair Durability & Non-Reopening (Weight: 30%)
                        </span>
                        <span className="font-mono font-bold text-teal-400">
                          {selectedContractor.score_breakdown.repair_durability.score.toFixed(1)} / 100
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${selectedContractor.score_breakdown.repair_durability.score}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>
                          Reopen Rate: {selectedContractor.score_breakdown.repair_durability.raw_reopen_rate_pct.toFixed(1)}%
                        </span>
                        <span>
                          {selectedContractor.score_breakdown.repair_durability.reopened_jobs_count} reopened within 30 days
                        </span>
                      </div>
                    </div>

                    {/* Pillar 3: Cost Efficiency */}
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200">
                          3. Rate Card Adherence & Cost Efficiency (Weight: 25%)
                        </span>
                        <span className="font-mono font-bold text-teal-400">
                          {selectedContractor.score_breakdown.cost_efficiency.score.toFixed(1)} / 100
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${selectedContractor.score_breakdown.cost_efficiency.score}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>
                          Avg Rate Variance: +{selectedContractor.score_breakdown.cost_efficiency.average_rate_deviation_pct.toFixed(1)}%
                        </span>
                        <span>
                          {selectedContractor.score_breakdown.cost_efficiency.overbilled_jobs_count} jobs &gt;30% above rate card
                        </span>
                      </div>
                    </div>

                    {/* Pillar 4: Repeat Repair Burden */}
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200">
                          4. Repeat Repair Freedom (Weight: 15%)
                        </span>
                        <span className="font-mono font-bold text-teal-400">
                          {selectedContractor.score_breakdown.repeat_repair_burden.score.toFixed(1)} / 100
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${selectedContractor.score_breakdown.repeat_repair_burden.score}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>
                          Repeat Road Share: {selectedContractor.score_breakdown.repeat_repair_burden.repeat_repair_burden_pct.toFixed(1)}%
                        </span>
                        <span>
                          {selectedContractor.score_breakdown.repeat_repair_burden.jobs_on_repeated_roads} jobs on repeatedly repaired roads
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fairness Note & Environmental Context */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400">
                    <CloudRain className="w-4 h-4" />
                    <span>Environmental Fairness Calibration</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedContractor.contextual_factors.fairness_note}
                  </p>
                  {selectedContractor.contextual_factors.dlp_breach_jobs_recorded > 0 && (
                    <div className="text-[11px] text-rose-400 font-mono pt-1">
                      ⚠️ {selectedContractor.contextual_factors.dlp_breach_jobs_recorded} work orders executed on active DLP roads without recorded warranty waiver.
                    </div>
                  )}
                </div>

                {/* Provenance & Action Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
                  <EvidenceBadge provenance={selectedContractor.provenance} />

                  <button
                    onClick={() => onNavigateToGraph('work_order', 'WO_0001')}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium border border-slate-700 transition"
                  >
                    <span>View in Money Trace Graph</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
