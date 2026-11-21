import React, { useEffect, useState } from 'react';
import {
  TrendingUp, AlertTriangle, ShieldAlert, ArrowRight,
  RotateCcw, Building2, Wrench, ChevronRight, FileText,
  Compass, Zap, CheckCircle2, AlertOctagon, BarChart3,
  Search, ShieldCheck, HelpCircle
} from 'lucide-react';
import { MoneyTrail, WardDetail, RoadSummary } from '../types';
import { api } from '../api/client';
import { EvidenceBadge } from '../components/EvidenceBadge';

interface Props {
  wardCode: string;
  onInvestigateRoad: (roadId: string) => void;
  onOpenWorkOrder: (woId: string) => void;
  onNavigateAccountability: (tab?: string) => void;
  onNavigateNextRupee: () => void;
  onNavigatePortal: () => void;
}

export const OverviewView: React.FC<Props> = ({
  wardCode,
  onInvestigateRoad,
  onOpenWorkOrder,
  onNavigateAccountability,
  onNavigateNextRupee,
  onNavigatePortal
}) => {
  const [trail, setTrail] = useState<MoneyTrail | null>(null);
  const [wardDetail, setWardDetail] = useState<WardDetail | null>(null);
  const [wardRoads, setWardRoads] = useState<RoadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContractorId, setSelectedContractorId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.getWardMoneyTrail(wardCode),
      api.getWardDetail(wardCode),
      api.getRoads()
    ])
      .then(([trailData, detailData, allRoads]) => {
        setTrail(trailData);
        setWardDetail(detailData);
        const filteredRoads = allRoads.filter(r => r.ward_code === wardCode);
        setWardRoads(filteredRoads.length > 0 ? filteredRoads : allRoads.slice(0, 8));
        setSelectedContractorId(null);
      })
      .catch(err => {
        console.error(err);
        setError(err.message || 'Failed to load ward data');
      })
      .finally(() => setLoading(false));
  }, [wardCode]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-rt-secondary-text font-body">
        <div className="w-10 h-10 border-3 border-rt-ink border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-mono font-bold uppercase tracking-wider text-rt-ink">
          Reconciling Ward {wardCode} Financial Ledger...
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
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-rt-primary border-2 border-rt-ink rounded font-headline font-bold text-xs"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // Identify highest risk road for the hero CTA
  const candidateRoad = wardRoads.find(r => r.under_dlp && r.total_work_orders > 1) || wardRoads[0] || { road_id: 'RD0140', road_name: 'Marol Maroshi Road' };

  const selectedContractor = trail.contractor_expenditure.find(c => c.contractor_id === selectedContractorId);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-body pb-16">
      
      {/* HERO INVESTIGATION BANNER */}
      <div className="p-6 bg-rt-primary border-3 border-rt-ink rounded-[6px] shadow-brutal relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-mono font-black bg-white border border-rt-ink text-rt-ink">
                PRIORITY INVESTIGATION • WARD {trail.ward_code}
              </span>
              <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-mono font-bold bg-rt-coral text-white border border-rt-ink">
                {trail.dlp_breach_jobs_count} DLP VIOLATIONS
              </span>
              <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-mono font-bold bg-white text-rt-coral border border-rt-coral">
                {trail.reopened_jobs_count} REPEAT REPAIRS
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-headline font-black text-rt-ink tracking-tight">
              Follow Where Mumbai&apos;s Road Money Went in {trail.ward_name}
            </h1>
            <p className="text-xs font-mono text-rt-ink leading-relaxed">
              Trace ₹{trail.total_recorded_work_order_expenditure_inr.toLocaleString('en-IN')} across {trail.total_work_orders} municipal work orders. Audit DLP warranty breaches, evaluate contractor reliability, and participate in next-cycle budget allocation.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full lg:w-auto">
            <button
              onClick={() => onInvestigateRoad(candidateRoad.road_id)}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-[4px] bg-rt-ink text-white hover:bg-neutral-800 border-2 border-rt-ink shadow-brutal font-headline font-black text-xs uppercase tracking-wider active:translate-x-[1px] active:translate-y-[1px] transition-all"
            >
              <Compass className="w-4 h-4 text-rt-primary" />
              <span>Investigate {candidateRoad.road_name.slice(0, 18)}... &rarr;</span>
            </button>
            <button
              onClick={() => onNavigateAccountability('sentinel')}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-[4px] bg-white text-rt-ink hover:bg-rt-canvas border-2 border-rt-ink shadow-brutal font-headline font-bold text-xs active:translate-x-[1px] active:translate-y-[1px] transition-all"
            >
              <ShieldAlert className="w-4 h-4 text-rt-coral" />
              <span>Audit Findings</span>
            </button>
          </div>
        </div>
      </div>

      {/* WARD FINANCIAL HEALTH DASHBOARD */}
      <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-rt-ink pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-[3px] bg-rt-canvas border border-rt-ink text-rt-ink">
                BMC {trail.ward_code} • {wardDetail.zone} ZONE
              </span>
              <EvidenceBadge provenance={trail.provenance} />
            </div>
            <h2 className="text-xl font-headline font-black text-rt-ink">
              Ward Budget Reconciliation &amp; Spend Utilization
            </h2>
            <p className="text-xs font-mono text-rt-secondary-text mt-0.5">
              Localities: {wardDetail.localities.join(', ')} • AC Office: {wardDetail.assistant_commissioner_office}
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono text-rt-secondary-text uppercase font-bold block">
              Budget Utilization
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-32 bg-rt-canvas border border-rt-ink h-3 rounded-full overflow-hidden">
                <div
                  className="bg-rt-primary h-full border-r border-rt-ink"
                  style={{ width: `${Math.min(trail.budget_utilization_pct, 100)}%` }}
                />
              </div>
              <span className="font-headline font-black text-sm text-rt-ink">
                {trail.budget_utilization_pct}%
              </span>
            </div>
          </div>
        </div>

        {/* 4 Financial Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="p-4 bg-rt-canvas border-2 border-rt-ink rounded-[4px] shadow-brutal-sm">
            <span className="text-[10px] text-rt-secondary-text uppercase font-mono font-bold tracking-wider block">
              Monsoon Budget 2025
            </span>
            <span className="text-2xl font-black font-financial text-rt-ink mt-1 block">
              ₹{trail.monsoon_repair_budget_inr_2025.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] font-mono text-rt-secondary-text block mt-1">
              Sanctioned ward limit
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
              Across {trail.total_work_orders} work orders
            </span>
          </div>

          <div className="p-4 bg-white border-2 border-rt-ink rounded-[4px] shadow-brutal-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-rt-coral uppercase font-mono font-bold tracking-wider block">
                Failed Fix Expenditure
              </span>
              <AlertTriangle className="w-3.5 h-3.5 text-rt-coral" />
            </div>
            <span className="text-2xl font-black font-financial text-rt-coral mt-1 block">
              ₹{trail.reopened_expenditure_inr.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] font-mono text-rt-coral font-bold block mt-1">
              {trail.reopened_rate_pct}% Reopen Rate ({trail.reopened_jobs_count} repeat repairs)
            </span>
          </div>

          <div className="p-4 bg-white border-2 border-rt-ink rounded-[4px] shadow-brutal-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-rt-secondary-text uppercase font-mono font-bold tracking-wider block">
                DLP Breach Disbursed
              </span>
              <ShieldAlert className="w-3.5 h-3.5 text-rt-coral" />
            </div>
            <span className="text-2xl font-black font-financial text-rt-ink mt-1 block">
              ₹{trail.dlp_breach_expenditure_inr.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] font-mono text-rt-secondary-text block mt-1">
              {trail.dlp_breach_jobs_count} repairs on active warranty roads
            </span>
          </div>
        </div>
      </div>

      {/* SPLIT SECTION: REPEAT REPAIR HOTSPOTS & TOP CONTRACTORS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Road Asset Investigation List */}
        <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal space-y-4">
          <div className="flex items-center justify-between border-b-2 border-rt-ink pb-3">
            <div>
              <h3 className="font-headline font-black text-rt-ink text-sm uppercase tracking-wider flex items-center gap-2">
                <Compass className="w-4 h-4 text-rt-ink" />
                Active Road Assets in Ward {wardCode}
              </h3>
              <p className="text-xs font-mono text-rt-secondary-text">
                Select a road to open its verified Road Passport &amp; Money Trace
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-rt-canvas px-2 py-0.5 rounded border border-rt-ink">
              {wardRoads.length} TRACKED
            </span>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {wardRoads.map(r => (
              <div
                key={r.road_id}
                onClick={() => onInvestigateRoad(r.road_id)}
                className="p-3 bg-rt-canvas hover:bg-rt-primary border-2 border-rt-ink rounded-[4px] cursor-pointer transition-all flex items-center justify-between group shadow-brutal-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-rt-ink bg-white px-1.5 py-0.2 rounded border border-rt-ink">
                      {r.road_id}
                    </span>
                    <span className="font-headline font-black text-xs text-rt-ink group-hover:underline">
                      {r.road_name}
                    </span>
                    {r.under_dlp && (
                      <span className="text-[9px] font-mono font-bold bg-rt-coral text-white px-1 rounded">
                        DLP
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono text-rt-secondary-text mt-1">
                    <span>{r.road_type} • {r.surface}</span>
                    <span>• {r.length_m} m</span>
                    <span>• {r.total_work_orders} WOs</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="font-mono font-bold text-xs text-rt-ink block">
                      ₹{r.total_spend_inr.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] font-mono text-rt-secondary-text">Recorded Spend</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-rt-ink group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => onInvestigateRoad(candidateRoad.road_id)}
            className="w-full py-2.5 bg-rt-canvas hover:bg-neutral-200 border-2 border-rt-ink rounded font-headline font-bold text-xs text-rt-ink flex items-center justify-center gap-2"
          >
            <span>Open Comprehensive Road Search in Investigate</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Top Contractors & Work Order Drill-down */}
        <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal space-y-4">
          <div className="flex items-center justify-between border-b-2 border-rt-ink pb-3">
            <div>
              <h3 className="font-headline font-black text-rt-ink text-sm uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-rt-ink" />
                Contractor Share of Recorded Spend
              </h3>
              <p className="text-xs font-mono text-rt-secondary-text">
                Click contractor card to filter their work orders
              </p>
            </div>
            <button
              onClick={() => onNavigateAccountability('scorecards')}
              className="text-xs font-headline font-bold text-rt-ink underline hover:text-neutral-600"
            >
              View Full Scorecards &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
            {trail.contractor_expenditure.map(c => {
              const isSelected = selectedContractorId === c.contractor_id;
              return (
                <div
                  key={c.contractor_id}
                  onClick={() => setSelectedContractorId(isSelected ? null : c.contractor_id)}
                  className={`p-3 rounded-[4px] border-2 border-rt-ink cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-rt-primary shadow-brutal'
                      : 'bg-rt-canvas hover:bg-white shadow-brutal-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold text-rt-ink bg-white px-1.5 py-0.2 rounded border border-rt-ink">
                      {c.contractor_id}
                    </span>
                    <span className="text-xs font-bold font-financial text-rt-ink">
                      ₹{c.total_recorded_billed_cost_inr.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <h4 className="font-headline font-bold text-xs text-rt-ink truncate">
                    {c.contractor_name}
                  </h4>
                  <div className="flex items-center justify-between text-[10px] font-mono text-rt-secondary-text mt-2 pt-1 border-t border-rt-ink/20">
                    <span>{c.work_order_count} Work Orders</span>
                    {c.reopened_jobs_count > 0 ? (
                      <span className="text-rt-coral font-bold flex items-center gap-0.5">
                        <RotateCcw className="w-3 h-3" />
                        {c.reopened_jobs_count} Reopened
                      </span>
                    ) : (
                      <span className="text-rt-mint font-bold flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3 text-rt-ink" />
                        0 Reopened
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedContractor && (
            <div className="p-3 bg-rt-primary/30 border-2 border-rt-ink rounded-[4px] text-xs font-mono space-y-1">
              <div className="font-bold text-rt-ink flex justify-between">
                <span>Selected: {selectedContractor.contractor_name}</span>
                <span className="underline cursor-pointer" onClick={() => setSelectedContractorId(null)}>Clear</span>
              </div>
              <p className="text-[11px] text-rt-ink">
                Billed ₹{selectedContractor.total_recorded_billed_cost_inr.toLocaleString('en-IN')} across {selectedContractor.work_order_count} work orders.
              </p>
              <button
                onClick={() => onNavigateAccountability('scorecards')}
                className="mt-2 text-[11px] font-bold underline text-rt-ink block"
              >
                Inspect detailed performance and penalty history in Accountability &rarr;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM ACTION TILES: FAST-FORWARD TO KEY ACTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div
          onClick={() => onInvestigateRoad('RD0140')}
          className="p-5 bg-white hover:bg-rt-primary border-3 border-rt-ink rounded-[6px] shadow-brutal cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <Compass className="w-6 h-6 text-rt-ink" />
            <ArrowRight className="w-4 h-4 text-rt-ink group-hover:translate-x-1 transition-transform" />
          </div>
          <h4 className="font-headline font-black text-sm text-rt-ink uppercase">
            2. Investigate Road Passport
          </h4>
          <p className="text-xs font-mono text-rt-secondary-text mt-1">
            Search any road, inspect material specifications, and follow the progressive visual money trace graph.
          </p>
        </div>

        <div
          onClick={() => onNavigateNextRupee()}
          className="p-5 bg-white hover:bg-rt-primary border-3 border-rt-ink rounded-[6px] shadow-brutal cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="w-6 h-6 text-rt-ink" />
            <ArrowRight className="w-4 h-4 text-rt-ink group-hover:translate-x-1 transition-transform" />
          </div>
          <h4 className="font-headline font-black text-sm text-rt-ink uppercase">
            4. Next Rupee Planner 2.0
          </h4>
          <p className="text-xs font-mono text-rt-secondary-text mt-1">
            Run Knapsack budget simulations, evaluate IRC:SP:98 material savings, and view participatory JANMAT votes.
          </p>
        </div>

        <div
          onClick={() => onNavigatePortal()}
          className="p-5 bg-white hover:bg-rt-primary border-3 border-rt-ink rounded-[6px] shadow-brutal cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <ShieldCheck className="w-6 h-6 text-rt-ink" />
            <ArrowRight className="w-4 h-4 text-rt-ink group-hover:translate-x-1 transition-transform" />
          </div>
          <h4 className="font-headline font-black text-sm text-rt-ink uppercase">
            5. Citizen Verification Portal
          </h4>
          <p className="text-xs font-mono text-rt-secondary-text mt-1">
            Verify repair work orders in 7 stages, inspect Before/After photos, and flag substandard contractor claims.
          </p>
        </div>
      </div>

    </div>
  );
};
