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
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-body pb-20">
      {/* Header */}
      <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-[3px] text-xs font-mono font-bold bg-rt-primary text-rt-ink border border-rt-ink shadow-[1.5px_1.5px_0px_#171717]">
              NEXT RUPEE PLANNER
            </span>
            <span className="text-xs font-mono font-bold bg-rt-mint text-rt-ink px-2 py-0.5 rounded border border-rt-ink">
              GREEDY OPTIMIZATION
            </span>
          </div>
          <h1 className="text-3xl font-headline font-black text-rt-ink tracking-tight">
            Next Rupee Capital Allocation Board
          </h1>
          <p className="text-xs font-mono text-rt-secondary-text mt-1 max-w-2xl">
            Algorithmic priority engine: ranks unresolved citizen defects by severity, flood risk, traffic congestion, and school/hospital proximity.
          </p>
        </div>

        {/* Ward Selector Bar */}
        <div className="flex items-center space-x-2 bg-rt-canvas border-2 border-rt-ink p-2 rounded-[4px] shadow-brutal-sm">
          <span className="text-xs font-headline font-bold text-rt-ink uppercase pl-2">Ward:</span>
          <select
            value={wardCode}
            onChange={e => setWardCode(e.target.value)}
            className="bg-white border-2 border-rt-ink text-xs text-rt-ink rounded-[3px] px-3 py-1.5 font-mono font-bold focus:outline-none"
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
            className="p-1.5 bg-white hover:bg-yellow-100 text-rt-ink rounded border border-rt-ink shadow-[1px_1px_0px_#171717] transition"
            title="Export Plan JSON"
          >
            <FileDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3 font-mono">
          <div className="w-8 h-8 border-3 border-rt-ink border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold uppercase tracking-wider text-rt-ink">Evaluating open citizen complaints & risk vectors...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rt-coral text-white border-3 border-rt-ink rounded-[4px] shadow-brutal text-center font-mono">
          <p className="font-bold">{error}</p>
        </div>
      ) : plan ? (
        <>
          {/* Ward Financial Balance Envelope */}
          <div className="bg-white border-3 border-rt-ink rounded-[6px] p-6 space-y-5 shadow-brutal">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-rt-ink pb-3">
              <div>
                <span className="text-sm font-headline font-black text-rt-ink uppercase tracking-wider block">
                  Ward {plan.ward_code} ({plan.ward_name}) Budget Allocation Envelope
                </span>
                <p className="text-xs font-mono text-rt-secondary-text mt-0.5">
                  Greedy budget allocation commits funds strictly until the available ward repair balance is exhausted.
                </p>
              </div>
              <button
                onClick={() => onNavigateToMoneyTrail(plan.ward_code)}
                className="text-xs font-headline font-bold text-rt-ink hover:underline flex items-center space-x-1"
              >
                <span>View Ward Past Ledger</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Financial Numbers Bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 font-mono">
              <div className="bg-rt-canvas p-3 rounded-[4px] border-2 border-rt-ink shadow-brutal-sm">
                <span className="text-[10px] text-rt-secondary-text uppercase font-bold block">Sanctioned Budget</span>
                <span className="text-base font-bold font-financial text-rt-ink mt-0.5 block">
                  ₹{(plan.monsoon_repair_budget_inr_2025 / 100000).toFixed(1)} L
                </span>
                <span className="text-[9px] text-rt-secondary-text block mt-0.5">Monsoon 2025</span>
              </div>

              <div className="bg-rt-canvas p-3 rounded-[4px] border-2 border-rt-ink shadow-brutal-sm">
                <span className="text-[10px] text-rt-secondary-text uppercase font-bold block">Past Work-Order Spend</span>
                <span className="text-base font-bold font-financial text-rt-ink mt-0.5 block">
                  ₹{(plan.total_recorded_spend_inr / 100000).toFixed(1)} L
                </span>
                <span className="text-[9px] text-rt-secondary-text block mt-0.5">Recorded billed cost</span>
              </div>

              <div className="bg-rt-primary p-3 rounded-[4px] border-2 border-rt-ink shadow-brutal-sm">
                <span className="text-[10px] text-rt-ink uppercase font-bold block">Available Unspent</span>
                <span className="text-base font-black font-financial text-rt-ink mt-0.5 block">
                  ₹{(plan.remaining_budget_inr / 100000).toFixed(1)} L
                </span>
                <span className="text-[9px] text-rt-ink font-bold block mt-0.5">Available for allocation</span>
              </div>

              <div className="bg-rt-mint p-3 rounded-[4px] border-2 border-rt-ink shadow-brutal-sm">
                <span className="text-[10px] text-rt-ink uppercase font-bold block">Allocated by Plan</span>
                <span className="text-base font-black font-financial text-rt-ink mt-0.5 block">
                  ₹{(plan.total_budget_allocated_inr / 100000).toFixed(1)} L
                </span>
                <span className="text-[9px] text-rt-ink font-bold block mt-0.5">
                  {plan.fully_funded_interventions_count} interventions funded
                </span>
              </div>

              <div className="bg-white p-3 rounded-[4px] border-2 border-rt-ink shadow-brutal-sm">
                <span className="text-[10px] text-rt-secondary-text uppercase font-bold block">Remaining Surplus</span>
                <span className="text-base font-bold font-financial text-rt-ink mt-0.5 block">
                  ₹{(plan.surplus_unallocated_inr / 100000).toFixed(1)} L
                </span>
                <span className="text-[9px] text-rt-secondary-text block mt-0.5">Contingency reserve</span>
              </div>
            </div>

            {/* Budget Exhaustion Bar */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-[11px] font-mono font-bold text-rt-ink">
                <span>Budget Exhaustion Progress</span>
                <span>
                  {((plan.total_budget_allocated_inr / (plan.remaining_budget_inr || 1)) * 100).toFixed(1)}% of remaining balance allocated
                </span>
              </div>
              <div className="w-full bg-rt-canvas h-4 rounded-[4px] overflow-hidden border-2 border-rt-ink flex shadow-brutal-sm">
                <div
                  className="bg-rt-ink h-full"
                  title="Past Recorded Spend"
                  style={{ width: `${(plan.total_recorded_spend_inr / plan.monsoon_repair_budget_inr_2025) * 100}%` }}
                />
                <div
                  className="bg-rt-primary h-full border-l border-rt-ink"
                  title="New Priority Allocations"
                  style={{ width: `${(plan.total_budget_allocated_inr / plan.monsoon_repair_budget_inr_2025) * 100}%` }}
                />
                <div
                  className="bg-rt-mint h-full border-l border-rt-ink"
                  title="Unallocated Surplus"
                  style={{ width: `${(plan.surplus_unallocated_inr / plan.monsoon_repair_budget_inr_2025) * 100}%` }}
                />
              </div>
              <div className="flex items-center space-x-4 text-[10px] font-mono text-rt-secondary-text pt-1">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rt-ink" />
                  <span>Past Recorded Spend</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rt-primary border border-rt-ink" />
                  <span>Planned New Allocations</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rt-mint border border-rt-ink" />
                  <span>Unallocated Surplus</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actionable Recommendations Table */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-headline font-black text-rt-ink tracking-tight uppercase">
                  Prioritized Road Repair Pipeline ({plan.recommendations.length} Candidate Assets)
                </h2>
                <p className="text-xs font-mono text-rt-secondary-text">
                  Ranked by 7 multimodal risk vectors: traffic, waterlogging depth, high tides, and school/hospital routes.
                </p>
              </div>

              <input
                type="text"
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                placeholder="Filter road, intervention, issue..."
                className="w-64 bg-white border-2 border-rt-ink text-xs text-rt-ink rounded-[4px] px-3 py-1.5 font-mono font-bold focus:outline-none focus:bg-yellow-50 focus:shadow-brutal-sm"
              />
            </div>

            <div className="space-y-4">
              {filteredRecommendations.map((rec, idx) => {
                const isFunded = rec.funding_decision.includes('Immediate Funding');
                const isTopPick = idx === 0 && isFunded;

                return (
                  <div
                    key={rec.road_id}
                    className={`border-3 rounded-[6px] p-5 space-y-4 transition shadow-brutal ${
                      isTopPick
                        ? 'bg-rt-primary border-rt-ink'
                        : isFunded
                        ? 'bg-white border-rt-ink'
                        : 'bg-rt-muted border-rt-ink opacity-85'
                    }`}
                  >
                    {/* Top Row: Rank, Priority Score, Decision Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-rt-ink pb-3">
                      <div className="flex items-center space-x-3">
                        <span className="w-8 h-8 rounded-[4px] bg-rt-ink text-white font-headline text-sm font-black flex items-center justify-center">
                          #{idx + 1}
                        </span>

                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-bold text-rt-ink bg-white px-2 py-0.5 rounded border border-rt-ink">
                              {rec.road_id}
                            </span>
                            <span className="text-base font-headline font-bold text-rt-ink">{rec.road_name}</span>
                            <button
                              onClick={() => onOpenPassport(rec.road_id)}
                              className="text-rt-ink hover:underline"
                              title="Open Road Passport"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="text-[11px] font-mono text-rt-secondary-text mt-0.5">
                            Surface: <strong className="text-rt-ink">{rec.surface}</strong> • Type: <strong className="text-rt-ink">{rec.road_type}</strong>
                            {rec.under_dlp && (
                              <span className="ml-2 px-1.5 py-0.2 rounded text-[10px] font-bold bg-rt-coral text-white border border-rt-ink">
                                DLP ACTIVE
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <span className="text-[10px] text-rt-secondary-text uppercase font-headline font-bold block">
                            Priority Score
                          </span>
                          <span className="text-xl font-black font-financial text-rt-ink">
                            {rec.priority_score.toFixed(1)}
                            <span className="text-xs text-rt-secondary-text font-normal"> / 100</span>
                          </span>
                        </div>

                        <span
                          className={`px-3 py-1 rounded-[4px] text-xs font-headline font-bold border-2 border-rt-ink ${
                            isFunded
                              ? 'bg-rt-mint text-rt-ink shadow-[1.5px_1.5px_0px_#171717]'
                              : 'bg-white text-rt-secondary-text shadow-[1.5px_1.5px_0px_#171717]'
                          }`}
                        >
                          {rec.funding_decision}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Recommended Physical Intervention & Cost */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-rt-canvas p-4 rounded-[4px] border-2 border-rt-ink text-xs shadow-brutal-sm">
                      <div className="md:col-span-2 space-y-1.5">
                        <div className="text-[10px] font-headline font-bold uppercase tracking-wider text-rt-ink flex items-center space-x-1.5">
                          <Wrench className="w-3.5 h-3.5 text-rt-ink" />
                          <span>Recommended Engineering Intervention</span>
                        </div>
                        <div className="text-sm font-headline font-bold text-rt-ink">
                          {rec.recommended_intervention}
                        </div>
                        <p className="text-rt-secondary-text text-[11px] font-body leading-relaxed">
                          {rec.recommendation_reason}
                        </p>
                      </div>

                      <div className="border-t md:border-t-0 md:border-l-2 border-rt-ink md:pl-4 space-y-1 font-mono">
                        <div className="text-[10px] font-headline font-bold uppercase tracking-wider text-rt-secondary-text">
                          Estimated Cost & Allocation
                        </div>
                        <div className="text-base font-bold font-financial text-rt-ink">
                          {rec.estimated_intervention_cost_inr
                            ? `₹${rec.estimated_intervention_cost_inr.toLocaleString('en-IN')}`
                            : 'Standard Schedule'}
                        </div>
                        <div className="text-[11px] font-bold text-rt-ink">
                          Allocated: ₹{rec.budget_allocated_inr.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-rt-secondary-text">
                          Running spent: ₹{rec.cumulative_budget_spent_inr.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    {/* Multimodal Priority Factors */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-headline font-bold uppercase tracking-wider text-rt-secondary-text">
                        Multimodal Priority Vector Breakdown:
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center text-[10px] font-mono">
                        <div className="bg-white p-2 rounded border border-rt-ink">
                          <span className="text-rt-secondary-text block text-[9px] font-bold uppercase">Severity</span>
                          <span className="text-rt-ink font-bold text-xs">{rec.score_factors.issue_severity.toFixed(1)}</span>
                        </div>
                        <div className="bg-white p-2 rounded border border-rt-ink">
                          <span className="text-rt-secondary-text block text-[9px] font-bold uppercase">Citizen Complaints</span>
                          <span className="text-rt-ink font-bold text-xs">{rec.score_factors.repeat_complaints.toFixed(1)}</span>
                        </div>
                        <div className="bg-white p-2 rounded border border-rt-ink">
                          <span className="text-rt-secondary-text block text-[9px] font-bold uppercase">Flood Exposure</span>
                          <span className="text-rt-ink font-bold text-xs">{rec.score_factors.flood_exposure.toFixed(1)}</span>
                        </div>
                        <div className="bg-white p-2 rounded border border-rt-ink">
                          <span className="text-rt-secondary-text block text-[9px] font-bold uppercase">Rain & Tides</span>
                          <span className="text-rt-ink font-bold text-xs">{rec.score_factors.rain_tide_exposure.toFixed(1)}</span>
                        </div>
                        <div className="bg-white p-2 rounded border border-rt-ink">
                          <span className="text-rt-secondary-text block text-[9px] font-bold uppercase">Traffic Impact</span>
                          <span className="text-rt-ink font-bold text-xs">{rec.score_factors.traffic_exposure.toFixed(1)}</span>
                        </div>
                        <div className="bg-white p-2 rounded border border-rt-ink">
                          <span className="text-rt-secondary-text block text-[9px] font-bold uppercase">Accident Risk</span>
                          <span className="text-rt-ink font-bold text-xs">{rec.score_factors.safety_exposure.toFixed(1)}</span>
                        </div>
                        <div className="bg-white p-2 rounded border border-rt-ink">
                          <span className="text-rt-secondary-text block text-[9px] font-bold uppercase">School/Hospital</span>
                          <span className="text-rt-ink font-bold text-xs">{rec.score_factors.nearby_facilities_exposure.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Linked Complaints Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-rt-ink/20 text-[11px] font-mono text-rt-secondary-text">
                      <div>
                        Linked Open Citizen Complaints ({rec.open_complaint_count}):{' '}
                        <span className="text-rt-ink font-bold">
                          {rec.open_complaint_ids.slice(0, 4).join(', ')}
                          {rec.open_complaint_ids.length > 4 ? ` +${rec.open_complaint_ids.length - 4} more` : ''}
                        </span>
                      </div>

                      <button
                        onClick={() => onOpenPassport(rec.road_id)}
                        className="text-xs font-headline font-bold text-rt-ink hover:underline flex items-center space-x-1"
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

          <div className="p-4 bg-rt-muted border-2 border-rt-ink rounded-[4px] text-xs font-mono text-rt-secondary-text">
            <strong>SYNTHETIC DATA DISCLAIMER:</strong> Budget allocations are mathematical models calculated on synthetic civic records. Does not represent actual BMC sanction orders.
          </div>
        </>
      ) : null}
    </div>
  );
};
