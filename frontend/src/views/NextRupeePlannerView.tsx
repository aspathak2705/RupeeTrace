import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass, DollarSign, ArrowRight, CheckCircle2,
  AlertCircle, ExternalLink, ShieldAlert, Sliders,
  HelpCircle, Layers, FileDown, Wrench, Building2, MapPin
} from 'lucide-react';
import { api } from '../api/client';
import { NextRupeePlan, WardSummary } from '../types';
import { EvidenceBadge } from '../components/EvidenceBadge';

interface NextRupeePlannerViewProps {
  initialWard?: string;
  onOpenPassport: (roadId: string) => void;
  onNavigateToMoneyTrail: (wardCode: string) => void;
}

export const NextRupeePlannerView: React.FC<NextRupeePlannerViewProps> = ({
  initialWard = 'K/E',
  onOpenPassport,
  onNavigateToMoneyTrail
}) => {
  const [wardCode, setWardCode] = useState<string>(initialWard);
  const [wards, setWards] = useState<WardSummary[]>([]);
  const [plan, setPlan] = useState<NextRupeePlan | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search filter inside recommendations
  const [filterQuery, setFilterQuery] = useState<string>('');

  useEffect(() => {
    const fetchWards = async () => {
      try {
        const data = await api.getWards();
        setWards(data);
      } catch (err: any) {
        console.error(err);
      }
    };
    fetchWards();
  }, []);

  const loadPlan = async (code: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getWardNextRupee(code);
      setPlan(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || `Failed to generate Next Rupee plan for ward ${code}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlan(wardCode);
  }, [wardCode]);

  const filteredRecommendations = useMemo(() => {
    if (!plan) return [];
    if (!filterQuery.trim()) return plan.recommendations;
    const q = filterQuery.toLowerCase();
    return plan.recommendations.filter(
      r =>
        r.road_id.toLowerCase().includes(q) ||
        r.road_name.toLowerCase().includes(q) ||
        r.recommended_intervention.toLowerCase().includes(q) ||
        r.context.dominant_reported_category.toLowerCase().includes(q)
    );
  }, [plan, filterQuery]);

  const downloadPlanSummary = () => {
    if (!plan) return;
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RupeeTrace_NextRupeePlan_Ward_${plan.ward_code}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-teal-500/10 text-teal-400 rounded-lg border border-teal-500/20">
              <Compass className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Next Rupee Capital Allocation Planner</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-950 text-teal-300 border border-teal-800">
              Greedy Optimization
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Algorithmic prioritization engine: ranks unresolved citizen complaints and defects by severity, flood risk, traffic volume, and school/hospital proximity.
          </p>
        </div>

        {/* Ward Selector Bar */}
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 p-2 rounded-xl">
          <span className="text-xs font-semibold text-slate-400 pl-2">Select Ward:</span>
          <select
            value={wardCode}
            onChange={e => setWardCode(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-xs text-slate-100 rounded px-3 py-1.5 focus:outline-none focus:border-teal-500 font-mono font-bold"
          >
            {wards.map(w => (
              <option key={w.ward_code} value={w.ward_code}>
                Ward {w.ward_code} — {w.ward_name}
              </option>
            ))}
          </select>
          <button
            onClick={downloadPlanSummary}
            disabled={!plan}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
            title="Export Plan JSON"
          >
            <FileDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Evaluating unresolved citizen complaints and risk vectors...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-950/30 border border-rose-800 rounded-xl text-center">
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      ) : plan ? (
        <>
          {/* Ward Financial Balance Envelope */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider">
                  Ward {plan.ward_code} ({plan.ward_name}) Budgetary Allocation Envelope
                </span>
                <div className="text-xs text-slate-400 mt-0.5">
                  Greedy budget allocation stops immediately when available balance is exhausted.
                </div>
              </div>
              <button
                onClick={() => onNavigateToMoneyTrail(plan.ward_code)}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
              >
                <span>View Ward Past Expenditure Trail</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Financial Numbers Bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 font-mono">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">Total Sanctioned Budget</span>
                <span className="text-sm font-bold text-white">
                  ₹{(plan.monsoon_repair_budget_inr_2025 / 100000).toFixed(1)} L
                </span>
                <span className="text-[9px] text-slate-500 block font-sans mt-0.5">Monsoon 2025</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">Past Work-Order Spend</span>
                <span className="text-sm font-bold text-amber-400">
                  ₹{(plan.total_recorded_spend_inr / 100000).toFixed(1)} L
                </span>
                <span className="text-[9px] text-slate-500 block font-sans mt-0.5">Recorded billed cost</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-teal-400 block font-sans font-medium">Available Unspent</span>
                <span className="text-sm font-bold text-teal-300">
                  ₹{(plan.remaining_budget_inr / 100000).toFixed(1)} L
                </span>
                <span className="text-[9px] text-slate-500 block font-sans mt-0.5">Available for allocation</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-teal-900/60">
                <span className="text-[10px] text-teal-400 block font-sans font-medium">Allocated by Plan</span>
                <span className="text-sm font-bold text-teal-400">
                  ₹{(plan.total_budget_allocated_inr / 100000).toFixed(1)} L
                </span>
                <span className="text-[9px] text-slate-500 block font-sans mt-0.5">
                  {plan.fully_funded_interventions_count} interventions funded
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">Remaining Surplus</span>
                <span className="text-sm font-bold text-slate-200">
                  ₹{(plan.surplus_unallocated_inr / 100000).toFixed(1)} L
                </span>
                <span className="text-[9px] text-slate-500 block font-sans mt-0.5">Contingency reserve</span>
              </div>
            </div>

            {/* Budget Bar visual representation */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span>Budget Exhaustion Progress</span>
                <span>
                  {((plan.total_budget_allocated_inr / (plan.remaining_budget_inr || 1)) * 100).toFixed(1)}% of remaining spent
                </span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 flex">
                <div
                  className="bg-amber-500 h-full"
                  title="Past Recorded Spend"
                  style={{ width: `${(plan.total_recorded_spend_inr / plan.monsoon_repair_budget_inr_2025) * 100}%` }}
                />
                <div
                  className="bg-teal-500 h-full"
                  title="New Priority Allocations"
                  style={{ width: `${(plan.total_budget_allocated_inr / plan.monsoon_repair_budget_inr_2025) * 100}%` }}
                />
                <div
                  className="bg-slate-700 h-full"
                  title="Unallocated Surplus"
                  style={{ width: `${(plan.surplus_unallocated_inr / plan.monsoon_repair_budget_inr_2025) * 100}%` }}
                />
              </div>
              <div className="flex items-center space-x-4 text-[10px] text-slate-400 pt-1">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                  <span>Past Recorded Spend</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-teal-500" />
                  <span>Planned New Allocations</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-700" />
                  <span>Unallocated Surplus</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actionable Recommendations Table */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white tracking-tight">
                  Prioritized Road Repair Pipeline ({plan.recommendations.length} Candidate Assets)
                </h2>
                <p className="text-xs text-slate-400">
                  Evaluated from open complaints and contextual risk models (traffic congestion, flooding history, critical hospital/school routes).
                </p>
              </div>

              <input
                type="text"
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                placeholder="Filter by road, intervention, issue..."
                className="w-64 bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded px-3 py-1.5 focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>

            <div className="space-y-3">
              {filteredRecommendations.map((rec, idx) => {
                const isFunded = rec.funding_decision.includes('Immediate Funding');

                return (
                  <div
                    key={rec.road_id}
                    className={`bg-slate-900 border rounded-xl p-5 space-y-4 transition ${
                      isFunded
                        ? 'border-teal-900/80 bg-teal-950/10 hover:border-teal-700'
                        : 'border-slate-800/80 bg-slate-900/40 opacity-80 hover:opacity-100'
                    }`}
                  >
                    {/* Top Row: Rank, Priority Score, Decision Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-mono text-xs font-bold flex items-center justify-center">
                          #{idx + 1}
                        </span>

                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-bold text-white">{rec.road_id}</span>
                            <span className="text-sm font-semibold text-slate-200">{rec.road_name}</span>
                            <button
                              onClick={() => onOpenPassport(rec.road_id)}
                              className="text-teal-400 hover:text-teal-300"
                              title="Open Road Passport"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Surface: <span className="text-slate-300">{rec.surface}</span> · Type: <span className="text-slate-300">{rec.road_type}</span>
                            {rec.under_dlp && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-800">
                                DLP ACTIVE
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        {/* Priority Score Gauge */}
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                            Priority Score
                          </div>
                          <div className="text-lg font-bold font-mono text-teal-300">
                            {rec.priority_score.toFixed(1)}
                            <span className="text-xs text-slate-500 font-normal"> / 100</span>
                          </div>
                        </div>

                        {/* Funding Decision Badge */}
                        <span
                          className={`px-2.5 py-1 rounded text-xs font-semibold border ${
                            isFunded
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {rec.funding_decision}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Recommended Physical Intervention & Cost */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950/70 p-3.5 rounded-lg border border-slate-800/80 text-xs">
                      <div className="md:col-span-2 space-y-1">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-teal-400 flex items-center space-x-1.5">
                          <Wrench className="w-3 h-3" />
                          <span>Recommended Engineering Intervention</span>
                        </div>
                        <div className="text-sm font-semibold text-white">
                          {rec.recommended_intervention}
                        </div>
                        <p className="text-slate-400 text-[11px] leading-relaxed">
                          {rec.recommendation_reason}
                        </p>
                      </div>

                      <div className="border-t md:border-t-0 md:border-l border-slate-800 md:pl-4 space-y-1 font-mono">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-sans">
                          Estimated Cost & Allocation
                        </div>
                        <div className="text-sm font-bold text-white">
                          {rec.estimated_intervention_cost_inr
                            ? `₹${rec.estimated_intervention_cost_inr.toLocaleString('en-IN')}`
                            : 'Standard Schedule'}
                        </div>
                        <div className="text-[11px] text-teal-400">
                          Allocated: ₹{rec.budget_allocated_inr.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Running spent: ₹{rec.cumulative_budget_spent_inr.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Score Factors & Context Vectors */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Multimodal Priority Vector Weights:
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center text-[10px] font-mono">
                        <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                          <span className="text-slate-500 block text-[9px] font-sans">Issue Severity</span>
                          <span className="text-teal-400 font-bold">{rec.score_factors.issue_severity.toFixed(1)}</span>
                        </div>

                        <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                          <span className="text-slate-500 block text-[9px] font-sans">Citizen Urgency</span>
                          <span className="text-teal-400 font-bold">{rec.score_factors.repeat_complaints.toFixed(1)}</span>
                        </div>

                        <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                          <span className="text-slate-500 block text-[9px] font-sans">Flood Hotspot</span>
                          <span className="text-blue-400 font-bold">{rec.score_factors.flood_exposure.toFixed(1)}</span>
                        </div>

                        <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                          <span className="text-slate-500 block text-[9px] font-sans">Rain & Tides</span>
                          <span className="text-blue-400 font-bold">{rec.score_factors.rain_tide_exposure.toFixed(1)}</span>
                        </div>

                        <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                          <span className="text-slate-500 block text-[9px] font-sans">Traffic Impact</span>
                          <span className="text-amber-400 font-bold">{rec.score_factors.traffic_exposure.toFixed(1)}</span>
                        </div>

                        <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                          <span className="text-slate-500 block text-[9px] font-sans">Accident Risk</span>
                          <span className="text-rose-400 font-bold">{rec.score_factors.safety_exposure.toFixed(1)}</span>
                        </div>

                        <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                          <span className="text-slate-500 block text-[9px] font-sans">Hosp/School Proximity</span>
                          <span className="text-indigo-400 font-bold">{rec.score_factors.nearby_facilities_exposure.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Open Complaints Footnote */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                      <div>
                        Linked Open Citizen Complaints ({rec.open_complaint_count}):{' '}
                        <span className="font-mono text-slate-300">
                          {rec.open_complaint_ids.slice(0, 4).join(', ')}
                          {rec.open_complaint_ids.length > 4 ? ` +${rec.open_complaint_ids.length - 4} more` : ''}
                        </span>
                      </div>

                      <button
                        onClick={() => onOpenPassport(rec.road_id)}
                        className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center space-x-1"
                      >
                        <span>Open Road Passport</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Synthetic Data Disclaimer */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-500">
            <strong>Synthetic Data & Policy Disclaimer:</strong> Allocations are mathematical demonstrations using greedy optimization on synthetic municipal budgets and open complaint records. Not real BMC capital sanction orders.
          </div>
        </>
      ) : null}
    </div>
  );
};
