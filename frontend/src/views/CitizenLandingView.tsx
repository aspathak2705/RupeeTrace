import React, { useState, useEffect } from 'react';
import {
  Compass, CheckSquare, Vote, TrendingUp, Search,
  ArrowRight, ShieldCheck, Camera, AlertTriangle, UserCheck,
  Building, ChevronRight, Sparkles, MapPin
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RoadSummary, MoneyTrail } from '../types';
import { api } from '../api/client';

interface Props {
  currentWard: string;
  onNavigatePassport: (roadId: string) => void;
  onNavigateVerification: () => void;
  onNavigateJanmat: () => void;
  onNavigateWardOverview: () => void;
}

export const CitizenLandingView: React.FC<Props> = ({
  currentWard,
  onNavigatePassport,
  onNavigateVerification,
  onNavigateJanmat,
  onNavigateWardOverview
}) => {
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [roads, setRoads] = useState<RoadSummary[]>([]);
  const [trail, setTrail] = useState<MoneyTrail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getRoads().catch(() => []),
      api.getWardMoneyTrail(currentWard).catch(() => null)
    ])
      .then(([roadsData, trailData]) => {
        setRoads(roadsData.filter(r => r.ward_code === currentWard));
        setTrail(trailData);
      })
      .finally(() => setLoading(false));
  }, [currentWard]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchInput.trim().toUpperCase();
    if (!clean) return;
    const match = roads.find(r => r.road_id.toUpperCase() === clean || r.road_name.toUpperCase().includes(clean));
    if (match) {
      onNavigatePassport(match.road_id);
    } else {
      onNavigatePassport(clean);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8 font-body pb-20">
      
      {/* CITIZEN WELCOME HERO BANNER */}
      <div className="p-6 sm:p-8 bg-rt-primary border-3 border-rt-ink rounded-[6px] shadow-brutal-xl relative overflow-hidden">
        <div className="max-w-3xl space-y-3 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-[3px] text-xs font-mono font-black bg-white border border-rt-ink text-rt-ink flex items-center gap-1.5 shadow-[1px_1px_0px_#171717]">
              <UserCheck className="w-3.5 h-3.5" />
              AUTHENTICATED CITIZEN WORKSPACE
            </span>
            <span className="px-2.5 py-0.5 rounded-[3px] text-xs font-mono font-bold bg-rt-mint text-rt-ink border border-rt-ink">
              WARD {currentWard} RESIDENT
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-headline font-black text-rt-ink tracking-tight leading-tight">
            Welcome, {user?.name || 'Citizen Sunita Sharma'}
          </h1>
          <p className="text-sm font-mono text-rt-ink leading-relaxed">
            Follow where your tax rupees went in Ward {currentWard}. Inspect public road specifications, file photographic repair observations, verify completed works to protect contractor escrows, and cast your vote on upcoming infrastructure tenders.
          </p>

          {/* Road Search Bar */}
          <form onSubmit={handleSearchSubmit} className="pt-2 flex flex-col sm:flex-row gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-rt-ink absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search your street (e.g. Marol Maroshi Road or RD0140)..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-white border-2 border-rt-ink rounded-[4px] pl-9 pr-4 py-2.5 text-xs font-mono font-bold text-rt-ink placeholder-rt-secondary-text focus:outline-none focus:shadow-brutal-sm"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-rt-ink text-white hover:bg-neutral-800 border-2 border-rt-ink rounded-[4px] font-headline font-black text-xs uppercase tracking-wider shadow-brutal active:translate-x-[1px] active:translate-y-[1px]"
            >
              Open Road Passport &rarr;
            </button>
          </form>
        </div>
      </div>

      {/* 4 CORE CITIZEN ACTION DESTINATIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Hub 1: Public Road Passport */}
        <div
          onClick={() => onNavigatePassport('RD0140')}
          className="p-6 bg-white hover:bg-rt-canvas border-3 border-rt-ink rounded-[6px] shadow-brutal cursor-pointer transition-all flex flex-col justify-between space-y-4 group"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-10 h-10 rounded-[4px] bg-rt-primary border-2 border-rt-ink flex items-center justify-center">
                <Compass className="w-5 h-5 text-rt-ink" />
              </span>
              <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-white border border-rt-ink">
                PUBLIC PROOF
              </span>
            </div>
            <h3 className="font-headline font-black text-lg text-rt-ink group-hover:underline">
              1. Official Road Passports
            </h3>
            <p className="text-xs font-mono text-rt-secondary-text leading-relaxed">
              Every road in Ward {currentWard} has an immutable civic record: surface engineering (Asphalt/CC), defect liability warranty status, historical contractor repairs, and linked citizen complaints.
            </p>
          </div>

          <div className="pt-2 border-t border-rt-ink/20 flex items-center justify-between text-xs font-headline font-bold text-rt-ink">
            <span>Inspect Featured: Marol Maroshi Road (RD0140)</span>
            <ChevronRight className="w-4 h-4 text-rt-ink group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Hub 2: 7-Stage Repair Verification */}
        <div
          onClick={onNavigateVerification}
          className="p-6 bg-white hover:bg-rt-canvas border-3 border-rt-ink rounded-[6px] shadow-brutal cursor-pointer transition-all flex flex-col justify-between space-y-4 group"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-10 h-10 rounded-[4px] bg-rt-mint border-2 border-rt-ink flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-rt-ink" />
              </span>
              <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-rt-mint border border-rt-ink text-rt-ink">
                ESCROW PROTECTION
              </span>
            </div>
            <h3 className="font-headline font-black text-lg text-rt-ink group-hover:underline">
              2. 7-Stage Repair Verification
            </h3>
            <p className="text-xs font-mono text-rt-secondary-text leading-relaxed">
              Compare Before/After photos submitted by contractors against your actual street. If loose gravel or unbonded edges are present, flag a Discrepancy Conflict to block public payouts.
            </p>
          </div>

          <div className="pt-2 border-t border-rt-ink/20 flex items-center justify-between text-xs font-headline font-bold text-rt-ink">
            <span>Inspect Pending Repairs &amp; Verify</span>
            <ChevronRight className="w-4 h-4 text-rt-ink group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Hub 3: JANMAT Democratic Voting */}
        <div
          onClick={onNavigateJanmat}
          className="p-6 bg-white hover:bg-rt-canvas border-3 border-rt-ink rounded-[6px] shadow-brutal cursor-pointer transition-all flex flex-col justify-between space-y-4 group"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-10 h-10 rounded-[4px] bg-rt-primary border-2 border-rt-ink flex items-center justify-center">
                <Vote className="w-5 h-5 text-rt-ink" />
              </span>
              <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-white border border-rt-ink">
                PARTICIPATORY
              </span>
            </div>
            <h3 className="font-headline font-black text-lg text-rt-ink group-hover:underline">
              3. JANMAT Community Voting
            </h3>
            <p className="text-xs font-mono text-rt-secondary-text leading-relaxed">
              Democratize upcoming monsoon repair budgets. Upvote critical road surfacing proposals in Ward {currentWard} to increase their priority before official municipal tenders are sanctioned.
            </p>
          </div>

          <div className="pt-2 border-t border-rt-ink/20 flex items-center justify-between text-xs font-headline font-bold text-rt-ink">
            <span>Vote on Ward {currentWard} Proposals</span>
            <ChevronRight className="w-4 h-4 text-rt-ink group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Hub 4: Ward Public Transparency */}
        <div
          onClick={onNavigateWardOverview}
          className="p-6 bg-white hover:bg-rt-canvas border-3 border-rt-ink rounded-[6px] shadow-brutal cursor-pointer transition-all flex flex-col justify-between space-y-4 group"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-10 h-10 rounded-[4px] bg-white border-2 border-rt-ink flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-rt-ink" />
              </span>
              <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-rt-canvas border border-rt-ink">
                FINANCIAL TRUTH
              </span>
            </div>
            <h3 className="font-headline font-black text-lg text-rt-ink group-hover:underline">
              4. Ward Financial Transparency
            </h3>
            <p className="text-xs font-mono text-rt-secondary-text leading-relaxed">
              Follow macro ward funds: Total monsoon allocation (₹{trail ? (trail.monsoon_repair_budget_inr_2025 / 10000000).toFixed(2) : '0.91'} Cr), recorded billed spend, failed repeat repairs, and top contractor shares.
            </p>
          </div>

          <div className="pt-2 border-t border-rt-ink/20 flex items-center justify-between text-xs font-headline font-bold text-rt-ink">
            <span>View Ward {currentWard} Financial Summary</span>
            <ChevronRight className="w-4 h-4 text-rt-ink group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

      </div>

      {/* QUICK HIGH-RISK ROAD RADAR FOR CITIZENS */}
      <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-rt-ink pb-3">
          <div>
            <h3 className="font-headline font-black text-base text-rt-ink uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rt-coral" />
              Neighborhood Streets in Ward {currentWard}
            </h3>
            <p className="text-xs font-mono text-rt-secondary-text">
              Click any street to open its official civic record
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-rt-canvas px-2.5 py-1 rounded border border-rt-ink">
            {roads.length} Streets Documented
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {roads.slice(0, 8).map(r => (
            <div
              key={r.road_id}
              onClick={() => onNavigatePassport(r.road_id)}
              className="p-3 bg-rt-canvas hover:bg-rt-primary border-2 border-rt-ink rounded-[4px] cursor-pointer transition-all space-y-1 shadow-brutal-sm"
            >
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="font-bold bg-white px-1.5 py-0.2 rounded border border-rt-ink">
                  {r.road_id}
                </span>
                {r.under_dlp ? (
                  <span className="bg-rt-coral text-white font-bold px-1 rounded">
                    DLP Warranty
                  </span>
                ) : (
                  <span className="text-rt-secondary-text">Warranty Expired</span>
                )}
              </div>
              <h4 className="font-headline font-black text-xs text-rt-ink truncate">
                {r.road_name}
              </h4>
              <p className="text-[10px] font-mono text-rt-secondary-text">
                {r.road_type} • {r.surface} • {r.total_work_orders} Repairs
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
