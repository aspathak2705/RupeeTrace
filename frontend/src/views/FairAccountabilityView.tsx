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

const TIER_STYLES: Record<string, { bg: string; badge: string }> = {
  'Good Standing': {
    bg: 'bg-rt-mint',
    badge: 'bg-rt-mint text-rt-ink border-2 border-rt-ink'
  },
  'Standard Performance': {
    bg: 'bg-white',
    badge: 'bg-white text-rt-ink border-2 border-rt-ink'
  },
  'Review Recommended': {
    bg: 'bg-rt-primary',
    badge: 'bg-rt-primary text-rt-ink border-2 border-rt-ink'
  },
  'High Scrutiny': {
    bg: 'bg-rt-coral',
    badge: 'bg-rt-coral text-white border-2 border-rt-ink'
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
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-body pb-20">
      {/* Header */}
      <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-[3px] text-xs font-mono font-bold bg-rt-primary text-rt-ink border border-rt-ink shadow-[1.5px_1.5px_0px_#171717]">
              FAIR ACCOUNTABILITY ENGINE
            </span>
            <span className="text-xs font-mono font-bold bg-rt-mint text-rt-ink px-2 py-0.5 rounded border border-rt-ink">
              FLOOD-ADJUSTED MODEL
            </span>
          </div>
          <h1 className="text-3xl font-headline font-black text-rt-ink tracking-tight">
            Contractor Performance Scorecards
          </h1>
          <p className="text-xs font-mono text-rt-secondary-text mt-1 max-w-2xl">
            Empanelled contractor performance evaluated across turnaround speed, durability, rate compliance, and repeat repair burden — adjusted for ward waterlogging severity.
          </p>
        </div>

        {/* Methodology notice */}
        <div className="bg-rt-canvas border-2 border-rt-ink rounded-[4px] p-3 max-w-sm text-xs font-mono shadow-brutal-sm">
          <div className="flex items-center space-x-1.5 text-rt-ink font-headline font-bold mb-1 uppercase text-[11px]">
            <ShieldCheck className="w-4 h-4 text-rt-ink" />
            <span>Environmental Fairness Calibration</span>
          </div>
          Contractors operating in severely flood-prone low-lying wards receive adversity moderation to prevent crude bias.
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3 font-mono">
          <div className="w-8 h-8 border-3 border-rt-ink border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold uppercase tracking-wider text-rt-ink">Calculating composite contractor scorecards...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rt-coral text-white border-3 border-rt-ink rounded-[4px] shadow-brutal text-center font-mono">
          <p className="font-bold">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Contractor Cards List */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between text-xs text-rt-ink px-1 font-headline font-black uppercase tracking-wider">
              <span>Empanelled Contractors ({contractors.length})</span>
              <span>Composite Score</span>
            </div>

            <div className="space-y-3">
              {contractors.map((c, idx) => {
                const isSel = selectedContractor?.contractor_id === c.contractor_id;
                const tier = TIER_STYLES[c.rating_tier] || TIER_STYLES['Standard Performance'];

                return (
                  <div
                    key={c.contractor_id}
                    onClick={() => setSelectedContractor(c)}
                    className={`p-4 rounded-[4px] border-2 border-rt-ink transition-all cursor-pointer ${
                      isSel
                        ? 'bg-rt-primary shadow-brutal translate-x-[-1px] translate-y-[-1px]'
                        : 'bg-white hover:bg-rt-canvas shadow-brutal-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-rt-ink bg-white px-1.5 py-0.2 rounded border border-rt-ink">
                            #{idx + 1} {c.contractor_id}
                          </span>
                          <span className={`px-2 py-0.5 rounded-[3px] text-[10px] font-mono font-bold ${tier.badge}`}>
                            {c.rating_tier}
                          </span>
                        </div>
                        <h3 className="text-sm font-headline font-bold text-rt-ink mt-1.5">{c.contractor_name}</h3>
                      </div>

                      <div className="text-right font-financial">
                        <div className="text-2xl font-black text-rt-ink">
                          {c.composite_score.toFixed(1)}
                        </div>
                        <div className="text-[10px] text-rt-secondary-text font-mono font-bold">/ 100</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-rt-ink/20 text-[11px] font-mono">
                      <div>
                        <span className="text-rt-secondary-text block text-[9px] uppercase font-bold">Total Jobs</span>
                        <span className="text-rt-ink font-bold">{c.total_jobs}</span>
                      </div>
                      <div>
                        <span className="text-rt-secondary-text block text-[9px] uppercase font-bold">SLA Met</span>
                        <span className="text-rt-ink font-bold">
                          {c.score_breakdown.sla_performance.raw_sla_success_rate_pct.toFixed(0)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-rt-secondary-text block text-[9px] uppercase font-bold">Reopened</span>
                        <span className="text-rt-coral font-bold">
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
              <div className="bg-white border-3 border-rt-ink rounded-[6px] p-6 space-y-6 shadow-brutal">
                {/* Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-rt-ink pb-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-mono text-xs font-bold text-rt-ink bg-rt-canvas px-2 py-0.5 rounded border border-rt-ink">
                        {selectedContractor.contractor_id}
                      </span>
                      <span className={`px-2 py-0.5 rounded-[3px] text-xs font-mono font-bold ${
                        TIER_STYLES[selectedContractor.rating_tier]?.badge
                      }`}>
                        {selectedContractor.rating_tier}
                      </span>
                      <span className="text-xs text-rt-secondary-text font-mono font-bold">
                        Empanelled: {selectedContractor.empanelled_since}
                      </span>
                    </div>

                    <h2 className="text-2xl font-headline font-black text-rt-ink tracking-tight">
                      {selectedContractor.contractor_name}
                    </h2>
                    <p className="text-xs font-mono text-rt-secondary-text mt-1">
                      Active across {selectedContractor.wards_with_recorded_work.length} wards: {selectedContractor.wards_with_recorded_work.join(', ')}
                    </p>
                  </div>

                  <div className="bg-rt-canvas border-2 border-rt-ink rounded-[4px] p-4 text-center min-w-[140px] shadow-brutal-sm">
                    <span className="text-[10px] text-rt-secondary-text font-headline font-bold uppercase tracking-wider block">
                      Composite Score
                    </span>
                    <span className="text-3xl font-black font-financial text-rt-ink mt-1 block">
                      {selectedContractor.composite_score.toFixed(1)}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-rt-secondary-text">out of 100.0</span>
                  </div>
                </div>

                {/* Key Metrics Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 font-mono">
                  <div className="bg-rt-canvas p-3 rounded-[4px] border-2 border-rt-ink shadow-brutal-sm">
                    <span className="text-[10px] text-rt-secondary-text uppercase font-bold block">Recorded Billed Cost</span>
                    <span className="text-base font-bold font-financial text-rt-ink mt-0.5 block">
                      ₹{(selectedContractor.total_recorded_billed_amount_inr / 100000).toFixed(1)} L
                    </span>
                    <span className="text-[9px] text-rt-secondary-text block mt-0.5">Recorded billed spend</span>
                  </div>

                  <div className="bg-rt-canvas p-3 rounded-[4px] border-2 border-rt-ink shadow-brutal-sm">
                    <span className="text-[10px] text-rt-secondary-text uppercase font-bold block">Total Work Orders</span>
                    <span className="text-base font-bold font-financial text-rt-ink mt-0.5 block">
                      {selectedContractor.total_jobs}
                    </span>
                    <span className="text-[9px] text-rt-secondary-text block mt-0.5">Executed road repairs</span>
                  </div>

                  <div className="bg-rt-canvas p-3 rounded-[4px] border-2 border-rt-ink shadow-brutal-sm">
                    <span className="text-[10px] text-rt-secondary-text uppercase font-bold block">Reopened in 30d</span>
                    <span className="text-base font-bold font-financial text-rt-coral mt-0.5 block">
                      {selectedContractor.score_breakdown.repair_durability.reopened_jobs_count}
                    </span>
                    <span className="text-[9px] text-rt-secondary-text block mt-0.5">
                      ₹{(selectedContractor.score_breakdown.repair_durability.reopened_expenditure_inr / 100000).toFixed(1)}L cost
                    </span>
                  </div>

                  <div className="bg-rt-canvas p-3 rounded-[4px] border-2 border-rt-ink shadow-brutal-sm">
                    <span className="text-[10px] text-rt-secondary-text uppercase font-bold block">Avg Low-Lying Index</span>
                    <span className="text-base font-bold font-financial text-rt-ink mt-0.5 block">
                      {selectedContractor.contextual_factors.average_ward_low_lying_index.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-rt-secondary-text block mt-0.5">Flood risk index</span>
                  </div>
                </div>

                {/* Score Breakdown (4 pillars) */}
                <div className="space-y-4">
                  <h3 className="text-xs font-headline font-black text-rt-ink uppercase tracking-wider flex items-center justify-between border-b border-rt-ink/20 pb-2">
                    <span>Performance Pillars Breakdown (100% Weightage)</span>
                    <span className="text-[11px] font-mono text-rt-secondary-text">Deterministic Math</span>
                  </h3>

                  <div className="space-y-3">
                    {/* Pillar 1: SLA Performance */}
                    <div className="bg-rt-canvas border-2 border-rt-ink rounded-[4px] p-3.5 space-y-2 shadow-brutal-sm">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-headline font-bold text-rt-ink">
                          1. SLA Turnaround Speed (Weight: 30%)
                        </span>
                        <span className="font-mono font-bold text-rt-ink font-financial">
                          {selectedContractor.score_breakdown.sla_performance.score.toFixed(1)} / 100
                        </span>
                      </div>
                      <div className="w-full bg-white border border-rt-ink rounded-[3px] h-3 overflow-hidden">
                        <div
                          className="bg-rt-primary h-full border-r border-rt-ink"
                          style={{ width: `${selectedContractor.score_breakdown.sla_performance.score}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-rt-secondary-text font-mono">
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
                    <div className="bg-rt-canvas border-2 border-rt-ink rounded-[4px] p-3.5 space-y-2 shadow-brutal-sm">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-headline font-bold text-rt-ink">
                          2. Repair Durability & Non-Reopening (Weight: 30%)
                        </span>
                        <span className="font-mono font-bold text-rt-ink font-financial">
                          {selectedContractor.score_breakdown.repair_durability.score.toFixed(1)} / 100
                        </span>
                      </div>
                      <div className="w-full bg-white border border-rt-ink rounded-[3px] h-3 overflow-hidden">
                        <div
                          className="bg-rt-mint h-full border-r border-rt-ink"
                          style={{ width: `${selectedContractor.score_breakdown.repair_durability.score}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-rt-secondary-text font-mono">
                        <span>
                          Reopen Rate: {selectedContractor.score_breakdown.repair_durability.raw_reopen_rate_pct.toFixed(1)}%
                        </span>
                        <span>
                          {selectedContractor.score_breakdown.repair_durability.reopened_jobs_count} reopened within 30 days
                        </span>
                      </div>
                    </div>

                    {/* Pillar 3: Cost Efficiency */}
                    <div className="bg-rt-canvas border-2 border-rt-ink rounded-[4px] p-3.5 space-y-2 shadow-brutal-sm">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-headline font-bold text-rt-ink">
                          3. Rate Card Adherence & Cost Efficiency (Weight: 25%)
                        </span>
                        <span className="font-mono font-bold text-rt-ink font-financial">
                          {selectedContractor.score_breakdown.cost_efficiency.score.toFixed(1)} / 100
                        </span>
                      </div>
                      <div className="w-full bg-white border border-rt-ink rounded-[3px] h-3 overflow-hidden">
                        <div
                          className="bg-rt-primary h-full border-r border-rt-ink"
                          style={{ width: `${selectedContractor.score_breakdown.cost_efficiency.score}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-rt-secondary-text font-mono">
                        <span>
                          Avg Rate Variance: +{selectedContractor.score_breakdown.cost_efficiency.average_rate_deviation_pct.toFixed(1)}%
                        </span>
                        <span>
                          {selectedContractor.score_breakdown.cost_efficiency.overbilled_jobs_count} jobs &gt;30% above rate card
                        </span>
                      </div>
                    </div>

                    {/* Pillar 4: Repeat Repair Burden */}
                    <div className="bg-rt-canvas border-2 border-rt-ink rounded-[4px] p-3.5 space-y-2 shadow-brutal-sm">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-headline font-bold text-rt-ink">
                          4. Repeat Repair Freedom (Weight: 15%)
                        </span>
                        <span className="font-mono font-bold text-rt-ink font-financial">
                          {selectedContractor.score_breakdown.repeat_repair_burden.score.toFixed(1)} / 100
                        </span>
                      </div>
                      <div className="w-full bg-white border border-rt-ink rounded-[3px] h-3 overflow-hidden">
                        <div
                          className="bg-rt-mint h-full border-r border-rt-ink"
                          style={{ width: `${selectedContractor.score_breakdown.repeat_repair_burden.score}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-rt-secondary-text font-mono">
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
                <div className="p-4 bg-rt-muted border-2 border-rt-ink rounded-[4px] space-y-2 font-mono">
                  <div className="flex items-center space-x-2 text-xs font-headline font-bold text-rt-ink uppercase">
                    <CloudRain className="w-4 h-4 text-rt-ink" />
                    <span>Environmental Fairness Calibration</span>
                  </div>
                  <p className="text-xs text-rt-secondary-text leading-relaxed font-body">
                    {selectedContractor.contextual_factors.fairness_note}
                  </p>
                  {selectedContractor.contextual_factors.dlp_breach_jobs_recorded > 0 && (
                    <div className="text-[11px] text-rt-coral font-bold pt-1">
                      ⚠️ {selectedContractor.contextual_factors.dlp_breach_jobs_recorded} work orders executed on active DLP roads without documented warranty exemption.
                    </div>
                  )}
                </div>

                {/* Provenance & Action Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t-2 border-rt-ink text-xs">
                  <EvidenceBadge provenance={selectedContractor.provenance} />

                  <button
                    onClick={() => onNavigateToGraph('work_order', 'WO25-00600')}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-rt-primary hover:bg-yellow-300 text-rt-ink rounded-[4px] font-headline font-bold border-2 border-rt-ink shadow-brutal-sm active:translate-x-[1px] active:translate-y-[1px] transition"
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
