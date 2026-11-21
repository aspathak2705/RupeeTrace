import React from 'react';
import {
  TrendingUp, Compass, ShieldAlert, Award,
  Search, ShieldCheck, UserCheck, CheckSquare,
  Sparkles, Network, Vote, Lock, LogIn
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Props {
  activeView: string;
  setActiveView: (view: string) => void;
  selectedWard: string;
  setSelectedWard: (ward: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearchSubmit: (query: string) => void;
  wardsList: string[];
  onOpenAssistant: () => void;
  onOpenLogin: () => void;
}

export const Navbar: React.FC<Props> = ({
  activeView,
  setActiveView,
  selectedWard,
  setSelectedWard,
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  wardsList,
  onOpenAssistant,
  onOpenLogin
}) => {
  const { user, isOfficer } = useAuth();

  const citizenTabs = [
    { id: 'citizen-home', label: '1. Citizen Home', icon: Compass },
    { id: 'overview', label: '2. Ward Transparency', icon: TrendingUp },
    { id: 'investigate', label: '3. Road Passport', icon: Compass, badge: 'PUBLIC SPECS', badgeColor: 'bg-rt-primary' },
    { id: 'portal', label: '4. Report & 7-Stage Verify', icon: CheckSquare, badge: 'ESCROW PROOF', badgeColor: 'bg-rt-mint' },
    { id: 'janmat', label: '5. JANMAT Community Voting', icon: Vote, badge: 'DEMOCRATIC', badgeColor: 'bg-rt-primary' }
  ];

  const officerTabs = [
    { id: 'overview', label: '1. Ward Overview & Money Trail', icon: TrendingUp },
    { id: 'investigate', label: '2. Visual Money Trace Board', icon: Network, badge: '6 MODES', badgeColor: 'bg-rt-primary' },
    { id: 'accountability', label: '3. DLP Sentinel & Audits', icon: ShieldAlert, badge: 'FORENSIC', badgeColor: 'bg-rt-coral text-white' },
    { id: 'next-rupee', label: '4. Next Rupee & Simulator', icon: Award, badge: 'PLANNER 2.0', badgeColor: 'bg-rt-primary' },
    { id: 'portal', label: '5. Field Verification Triage', icon: CheckSquare, badge: 'OFFICER DISPOSITION', badgeColor: 'bg-rt-mint' }
  ];

  const currentTabs = isOfficer ? officerTabs : citizenTabs;

  return (
    <header className="sticky top-0 z-40 bg-white border-b-3 border-rt-ink font-body">
      {/* Top Header Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Product Wordmark */}
          <div
            className="flex items-center gap-3 shrink-0 cursor-pointer select-none"
            onClick={() => setActiveView(isOfficer ? 'overview' : 'citizen-home')}
          >
            <div className="w-9 h-9 bg-rt-primary border-2 border-rt-ink rounded-[4px] shadow-brutal-sm flex items-center justify-center font-headline font-black text-xl text-rt-ink leading-none">
              ₹
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-headline font-extrabold text-xl text-rt-ink tracking-tight">
                  RUPEETRACE<span className="text-xs align-top">®</span>
                </span>
                <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-[3px] border border-rt-ink font-black shadow-[1px_1px_0px_#171717] ${
                  isOfficer ? 'bg-rt-mint text-rt-ink' : 'bg-rt-primary text-rt-ink'
                }`}>
                  {isOfficer ? 'OFFICER WORKSPACE' : 'CITIZEN WORKSPACE'}
                </span>
              </div>
              <p className="text-[11px] font-mono text-rt-secondary-text hidden sm:block tracking-tight">
                FOLLOW THE RUPEE. VERIFY THE REPAIR. FUND WHAT MATTERS.
              </p>
            </div>
          </div>

          {/* Quick Search Bar */}
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
                placeholder={isOfficer ? "Search Road (RD0140), Work Order (WO25-00600), Contractor..." : "Search your street name or Road ID (e.g. RD0140)..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-rt-canvas border-2 border-rt-ink rounded-[4px] pl-9 pr-4 py-1.5 text-xs text-rt-ink placeholder-rt-secondary-text font-mono font-medium focus:outline-none focus:bg-white focus:shadow-brutal-sm transition-all"
              />
            </form>
          </div>

          {/* Ward Selector, Auth Badge & AI Assistant */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            
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

            {/* Authenticated Persona Badge & Role Switcher */}
            <div
              onClick={onOpenLogin}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-[4px] border-2 border-rt-ink text-xs cursor-pointer shadow-brutal-sm transition-all hover:shadow-brutal ${
                isOfficer ? 'bg-rt-mint' : 'bg-rt-primary'
              }`}
              title="Click to switch verified prototype profile"
            >
              {isOfficer ? (
                <ShieldCheck className="w-3.5 h-3.5 text-rt-ink shrink-0" />
              ) : (
                <UserCheck className="w-3.5 h-3.5 text-rt-ink shrink-0" />
              )}
              <div className="flex flex-col text-left leading-none">
                <span className="font-headline font-black text-rt-ink text-[11px] truncate max-w-[110px]">
                  {user?.name || (isOfficer ? 'Er. R. K. Patil' : 'Sunita Sharma')}
                </span>
                <span className="text-[9px] font-mono text-rt-ink/80 uppercase font-bold">
                  {isOfficer ? 'Executive Eng.' : 'Public Citizen'}
                </span>
              </div>
              <span className="text-[9px] bg-white border border-rt-ink px-1 rounded font-mono font-bold">
                Switch
              </span>
            </div>

            {/* Global AI Assistant Trigger */}
            <button
              onClick={onOpenAssistant}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-rt-primary hover:bg-yellow-300 border-2 border-rt-ink font-headline font-black text-xs text-rt-ink shadow-brutal-sm active:translate-x-[1px] active:translate-y-[1px] transition-all"
              title="Open Multilingual AI Assistant (Ctrl+K)"
            >
              <span className="w-4 h-4 bg-white border border-rt-ink rounded-full flex items-center justify-center font-black text-[10px]">₹</span>
              <span className="hidden lg:inline">AI ASSISTANT</span>
              <span className="text-[9px] bg-white px-1 rounded border border-rt-ink font-mono font-bold">⌘K</span>
            </button>
          </div>
        </div>

        {/* Dynamic Navigation Tabs (Citizen vs Officer) */}
        <nav className="flex items-center space-x-1.5 overflow-x-auto py-2.5 border-t-2 border-rt-ink/20 no-scrollbar text-xs font-headline">
          {currentTabs.map(tab => {
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
                  <span className={`text-[9px] font-mono px-1 py-0.2 rounded-[2px] border border-rt-ink ${tab.badgeColor} ml-0.5`}>
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
