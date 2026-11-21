import React from 'react';
import {
  TrendingUp, Compass, ShieldAlert, Users, Award, GitBranch,
  Search, ShieldCheck, UserCheck, MessageSquare
} from 'lucide-react';

interface Props {
  activeView: string;
  setActiveView: (view: string) => void;
  selectedWard: string;
  setSelectedWard: (ward: string) => void;
  role: 'citizen' | 'officer';
  setRole: (role: 'citizen' | 'officer') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearchSubmit: (query: string) => void;
  wardsList: string[];
}

export const Navbar: React.FC<Props> = ({
  activeView,
  setActiveView,
  selectedWard,
  setSelectedWard,
  role,
  setRole,
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  wardsList
}) => {
  return (
    <header className="sticky top-0 z-40 bg-navy-900/95 backdrop-blur-md border-b border-slate-800">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => setActiveView('money-trail')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-accent-teal to-accent-emerald flex items-center justify-center shadow-lg shadow-accent-teal/20">
              <span className="text-white font-bold text-lg leading-none">₹</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white tracking-tight">RupeeTrace</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-accent-teal/15 text-accent-teal border border-accent-teal/30">
                  Phase 3 Demo
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Follow the Rupee. Verify the Repair. Fund What Matters.
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md hidden md:block">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSearchSubmit(searchQuery);
              }}
              className="relative"
            >
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Road ID (RD0058), Work Order (WO25-00045), or Locality..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-navy-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent-teal/60 transition-colors"
              />
            </form>
          </div>

          {/* Ward Selector & Role Toggle */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Ward Selector */}
            <div className="flex items-center gap-1.5 bg-navy-950 px-2.5 py-1 rounded-lg border border-slate-800 text-xs">
              <span className="text-slate-400 font-medium">Ward:</span>
              <select
                value={selectedWard}
                onChange={(e) => setSelectedWard(e.target.value)}
                className="bg-transparent text-slate-200 font-mono font-bold focus:outline-none cursor-pointer"
              >
                {wardsList.map(w => (
                  <option key={w} value={w} className="bg-navy-900 text-slate-200">
                    Ward {w}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Switcher */}
            <div className="flex items-center p-0.5 bg-navy-950 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setRole('citizen')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                  role === 'citizen'
                    ? 'bg-accent-teal/20 text-accent-teal font-semibold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Citizen View: Anonymized public records, citizen observations, public passports"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Citizen</span>
              </button>
              <button
                onClick={() => setRole('officer')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                  role === 'officer'
                    ? 'bg-accent-emerald/20 text-accent-emerald font-semibold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Municipal Officer View: Audit investigation, contractor oversight, response dispatch"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Officer</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 overflow-x-auto py-2 border-t border-slate-800/80 no-scrollbar text-xs">
          <button
            onClick={() => setActiveView('money-trail')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeView === 'money-trail'
                ? 'bg-navy-800 text-accent-teal font-semibold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-navy-850'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Ward Money Trail
          </button>

          <button
            onClick={() => setActiveView('passport')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeView === 'passport'
                ? 'bg-navy-800 text-accent-teal font-semibold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-navy-850'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-accent-emerald" />
            Road Passport
            <span className="text-[10px] px-1 py-0.2 rounded bg-accent-emerald/15 text-accent-emerald ml-0.5">Signature</span>
          </button>

          <button
            onClick={() => setActiveView('graph')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeView === 'graph'
                ? 'bg-navy-800 text-accent-teal font-semibold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-navy-850'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-accent-teal" />
            Visual Money Trace Graph
            <span className="text-[10px] px-1 py-0.2 rounded bg-accent-teal/15 text-accent-teal ml-0.5">Signature</span>
          </button>

          <button
            onClick={() => setActiveView('audits')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeView === 'audits'
                ? 'bg-navy-800 text-accent-teal font-semibold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-navy-850'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-accent-rose" />
            Repair Auditor
          </button>

          <button
            onClick={() => setActiveView('contractors')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeView === 'contractors'
                ? 'bg-navy-800 text-accent-teal font-semibold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-navy-850'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Contractor Scorecards
          </button>

          <button
            onClick={() => setActiveView('next-rupee')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeView === 'next-rupee'
                ? 'bg-navy-800 text-accent-teal font-semibold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-navy-850'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-accent-amber" />
            Next Rupee Planner
          </button>

          <button
            onClick={() => setActiveView('cases')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeView === 'cases'
                ? 'bg-navy-800 text-accent-teal font-semibold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-navy-850'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Cases & Observations
          </button>
        </nav>
      </div>
    </header>
  );
};
