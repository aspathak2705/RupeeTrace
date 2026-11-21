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
    <header className="sticky top-0 z-40 bg-white border-b-3 border-rt-ink font-body">
      {/* Top Banner Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Product Wordmark */}
          <div
            className="flex items-center gap-3 shrink-0 cursor-pointer select-none"
            onClick={() => setActiveView('money-trail')}
          >
            <div className="w-9 h-9 bg-rt-primary border-2 border-rt-ink rounded-[4px] shadow-brutal-sm flex items-center justify-center font-headline font-black text-xl text-rt-ink leading-none">
              ₹
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-headline font-extrabold text-xl text-rt-ink tracking-tight">
                  RUPEETRACE<span className="text-xs align-top">®</span>
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-[3px] bg-rt-primary border border-rt-ink text-rt-ink font-bold shadow-[1px_1px_0px_#171717]">
                  PUBLIC PROOF
                </span>
              </div>
              <p className="text-[11px] font-mono text-rt-secondary-text hidden sm:block tracking-tight">
                FOLLOW THE RUPEE. VERIFY THE REPAIR. FUND WHAT MATTERS.
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
              <Search className="w-4 h-4 text-rt-ink absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Road ID (RD0140), Work Order (WO25-00600)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-rt-canvas border-2 border-rt-ink rounded-[4px] pl-9 pr-4 py-1.5 text-xs text-rt-ink placeholder-rt-secondary-text font-mono font-medium focus:outline-none focus:bg-white focus:shadow-brutal-sm transition-all"
              />
            </form>
          </div>

          {/* Ward Selector & Role Toggle */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Ward Selector */}
            <div className="flex items-center gap-1.5 bg-rt-canvas px-2.5 py-1 rounded-[4px] border-2 border-rt-ink text-xs shadow-brutal-sm">
              <span className="text-rt-secondary-text font-bold uppercase font-mono text-[10px]">Ward:</span>
              <select
                value={selectedWard}
                onChange={(e) => setSelectedWard(e.target.value)}
                className="bg-transparent text-rt-ink font-mono font-bold focus:outline-none cursor-pointer"
              >
                {wardsList.map(w => (
                  <option key={w} value={w} className="bg-white text-rt-ink font-mono">
                    Ward {w}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Switcher */}
            <div className="flex items-center p-0.5 bg-rt-canvas rounded-[4px] border-2 border-rt-ink text-xs shadow-brutal-sm">
              <button
                onClick={() => setRole('citizen')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-[3px] font-headline font-bold transition-all text-xs ${
                  role === 'citizen'
                    ? 'bg-rt-primary border border-rt-ink text-rt-ink shadow-[1px_1px_0px_#171717]'
                    : 'text-rt-secondary-text hover:text-rt-ink'
                }`}
                title="Citizen Mode: Public asset records, community observations, and transparent timelines"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Citizen</span>
              </button>
              <button
                onClick={() => setRole('officer')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-[3px] font-headline font-bold transition-all text-xs ${
                  role === 'officer'
                    ? 'bg-rt-mint border border-rt-ink text-rt-ink shadow-[1px_1px_0px_#171717]'
                    : 'text-rt-secondary-text hover:text-rt-ink'
                }`}
                title="Ward Officer Mode: Administrative audit review, technical clarifications, remedial notices"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Officer</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <nav className="flex items-center space-x-1.5 overflow-x-auto py-2.5 border-t-2 border-rt-ink/20 no-scrollbar text-xs font-headline">
          {[
            { id: 'money-trail', label: 'Ward Money Trail', icon: TrendingUp },
            { id: 'passport', label: 'Road Passport', icon: Compass, badge: 'SIGNATURE', badgeColor: 'bg-rt-primary' },
            { id: 'graph', label: 'Visual Money Trace Graph', icon: GitBranch, badge: 'SIGNATURE', badgeColor: 'bg-rt-mint' },
            { id: 'audits', label: 'Repair Auditor', icon: ShieldAlert },
            { id: 'contractors', label: 'Contractor Scorecards', icon: Users },
            { id: 'next-rupee', label: 'Next Rupee Planner', icon: Award },
            { id: 'cases', label: 'Cases & Observations', icon: MessageSquare }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeView === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] whitespace-nowrap transition-all font-bold ${
                  isActive
                    ? 'bg-rt-primary text-rt-ink border-2 border-rt-ink shadow-brutal-sm'
                    : 'bg-white hover:bg-rt-canvas text-rt-ink border border-rt-ink/40 hover:border-rt-ink'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[9px] font-mono px-1 py-0.2 rounded-[2px] border border-rt-ink ${tab.badgeColor} text-rt-ink ml-0.5`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
