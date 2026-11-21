import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DemoTourBar } from './components/DemoTourBar';
import { AIAssistantDrawer } from './components/AIAssistantDrawer';
import { WorkOrderEvidenceModal } from './components/WorkOrderEvidenceModal';
import { OverviewView } from './views/OverviewView';
import { InvestigateView } from './views/InvestigateView';
import { AccountabilityView } from './views/AccountabilityView';
import { NextRupeePlannerView } from './views/NextRupeePlannerView';
import { PublicPortalView } from './views/PublicPortalView';
import { api } from './api/client';

export const App: React.FC = () => {
  // 5 Primary Destinations: 'overview' | 'investigate' | 'accountability' | 'next-rupee' | 'portal'
  const [activeView, setActiveView] = useState<string>('overview');
  const [selectedWard, setSelectedWard] = useState<string>('K/E');
  const [selectedRoadId, setSelectedRoadId] = useState<string>('RD0140');
  const [investigateMode, setInvestigateMode] = useState<'passport' | 'graph' | 'ledger'>('passport');
  const [accountabilityTab, setAccountabilityTab] = useState<'sentinel' | 'scorecards'>('sentinel');
  const [role, setRole] = useState<'citizen' | 'officer'>('citizen');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeWorkOrderId, setActiveWorkOrderId] = useState<string | null>(null);
  const [showAssistant, setShowAssistant] = useState<boolean>(false);
  const [wardsList, setWardsList] = useState<string[]>([
    'A', 'B', 'C', 'D', 'E', 'F/N', 'F/S', 'G/N', 'G/S',
    'H/E', 'H/W', 'K/E', 'K/W', 'L', 'M/E', 'M/W', 'N',
    'P/N', 'P/S', 'R/C', 'R/N', 'R/S', 'S', 'T'
  ]);

  // Load actual wards on mount
  useEffect(() => {
    api.getWards()
      .then(wards => {
        if (wards && wards.length > 0) {
          setWardsList(wards.map(w => w.ward_code));
        }
      })
      .catch(err => console.error('Error fetching wards:', err));
  }, []);

  // Global Keyboard shortcut (Cmd+K / Ctrl+K) for AI Assistant
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowAssistant(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Hash-based routing synchronization (with backward compatibility)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (!hash || hash === 'overview' || hash === 'money-trail') {
        setActiveView('overview');
        return;
      }

      if (hash.startsWith('passport/')) {
        const roadId = hash.replace('passport/', '');
        if (roadId) {
          setSelectedRoadId(decodeURIComponent(roadId));
          setInvestigateMode('passport');
          setActiveView('investigate');
        }
      } else if (hash.startsWith('graph')) {
        setInvestigateMode('graph');
        setActiveView('investigate');
      } else if (hash.startsWith('investigate')) {
        setActiveView('investigate');
      } else if (hash.startsWith('audits')) {
        setAccountabilityTab('sentinel');
        setActiveView('accountability');
      } else if (hash.startsWith('contractors')) {
        setAccountabilityTab('scorecards');
        setActiveView('accountability');
      } else if (hash.startsWith('accountability')) {
        setActiveView('accountability');
      } else if (hash.startsWith('next-rupee')) {
        setActiveView('next-rupee');
      } else if (hash.startsWith('cases') || hash.startsWith('portal')) {
        setActiveView('portal');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateToView = (view: string) => {
    setActiveView(view);
    window.location.hash = `#/${view}`;
  };

  const handleOpenPassport = (roadId: string) => {
    setSelectedRoadId(roadId);
    setInvestigateMode('passport');
    setActiveView('investigate');
    window.location.hash = `#/passport/${encodeURIComponent(roadId)}`;
  };

  const handleSearchSubmit = (query: string) => {
    const clean = query.trim().toUpperCase();
    if (!clean) return;

    if (clean.startsWith('RD') || clean.includes('ROAD') || clean.includes('MARG')) {
      handleOpenPassport(clean);
    } else if (clean.startsWith('WO')) {
      setActiveWorkOrderId(clean);
    } else if (wardsList.includes(clean)) {
      setSelectedWard(clean);
      navigateToView('overview');
    } else {
      handleOpenPassport(clean);
    }
  };

  // Demo Tour Handler for 4-minute evaluation
  const handleDemoStep = (step: number) => {
    switch (step) {
      case 1: // Destination 1: Ward Overview & Money Trail
        setSelectedWard('K/E');
        navigateToView('overview');
        break;
      case 2: // Destination 2: Road Passport RD0140
        setSelectedRoadId('RD0140');
        setInvestigateMode('passport');
        setActiveView('investigate');
        window.location.hash = `#/passport/RD0140`;
        break;
      case 3: // Destination 2: Money Trace Graph
        setSelectedRoadId('RD0140');
        setInvestigateMode('graph');
        setActiveView('investigate');
        window.location.hash = `#/graph`;
        break;
      case 4: // Destination 3: Audit Evidence Modal (WO25-00600)
        setActiveWorkOrderId('WO25-00600');
        break;
      case 5: // Destination 3: Accountability & Contractor Scorecards
        setAccountabilityTab('scorecards');
        navigateToView('accountability');
        break;
      case 6: // Destination 5: Public Portal & Citizen Verification
        navigateToView('portal');
        break;
      case 7: // Destination 4: Next Rupee Planner 2.0
        setSelectedWard('K/E');
        navigateToView('next-rupee');
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-rt-canvas text-rt-ink flex flex-col font-body selection:bg-rt-primary selection:text-rt-ink">
      {/* Top Banner: Synthetic Civic Research Data Notice */}
      <div className="bg-rt-ink text-white border-b-2 border-rt-ink text-[11px] font-mono py-1 px-4 text-center flex items-center justify-center space-x-2">
        <span className="w-2 h-2 rounded-full bg-rt-primary animate-pulse" />
        <span>
          <strong>RUPEETRACE PROTOTYPE:</strong> Synthetic civic research records. Billed expenditures represent recorded work-order figures, not verified treasury disbursements.
        </span>
      </div>

      {/* Demo Tour Toolbar */}
      <DemoTourBar
        onStep={handleDemoStep}
        onOpenAssistant={() => setShowAssistant(true)}
      />

      {/* Main Global Navigation (5 Primary Destinations) */}
      <Navbar
        activeView={activeView}
        setActiveView={navigateToView}
        selectedWard={selectedWard}
        setSelectedWard={setSelectedWard}
        role={role}
        setRole={setRole}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        wardsList={wardsList}
        onOpenAssistant={() => setShowAssistant(true)}
      />

      {/* Active Page View */}
      <main className="flex-1">
        {/* DESTINATION 1: OVERVIEW */}
        {activeView === 'overview' && (
          <OverviewView
            wardCode={selectedWard}
            onInvestigateRoad={handleOpenPassport}
            onOpenWorkOrder={(woId) => setActiveWorkOrderId(woId)}
            onNavigateAccountability={(tab) => {
              if (tab === 'scorecards') setAccountabilityTab('scorecards');
              else setAccountabilityTab('sentinel');
              navigateToView('accountability');
            }}
            onNavigateNextRupee={() => navigateToView('next-rupee')}
            onNavigatePortal={() => navigateToView('portal')}
          />
        )}

        {/* DESTINATION 2: INVESTIGATE */}
        {activeView === 'investigate' && (
          <InvestigateView
            currentRoadId={selectedRoadId}
            onSelectRoad={handleOpenPassport}
            onSelectWorkOrder={(woId) => setActiveWorkOrderId(woId)}
            onNavigateToWard={(code) => {
              setSelectedWard(code);
              navigateToView('overview');
            }}
            onNavigateCreateCase={(roadId) => {
              setSelectedRoadId(roadId);
              navigateToView('portal');
            }}
            initialMode={investigateMode}
          />
        )}

        {/* DESTINATION 3: ACCOUNTABILITY */}
        {activeView === 'accountability' && (
          <AccountabilityView
            currentWard={selectedWard}
            role={role}
            onOpenPassport={handleOpenPassport}
            onOpenWorkOrder={(woId) => setActiveWorkOrderId(woId)}
            onNavigateToGraph={(type, id) => {
              if (type === 'road') setSelectedRoadId(id);
              setInvestigateMode('graph');
              setActiveView('investigate');
            }}
            initialSubTab={accountabilityTab}
          />
        )}

        {/* DESTINATION 4: NEXT RUPEE */}
        {activeView === 'next-rupee' && (
          <NextRupeePlannerView
            initialWard={selectedWard}
            initialRoadId={selectedRoadId}
            role={role}
            onOpenPassport={handleOpenPassport}
            onNavigateToMoneyTrail={(code) => {
              setSelectedWard(code);
              navigateToView('overview');
            }}
          />
        )}

        {/* DESTINATION 5: PUBLIC PORTAL */}
        {activeView === 'portal' && (
          <PublicPortalView
            initialRoadId={selectedRoadId}
            currentWard={selectedWard}
            role={role}
            onOpenPassport={handleOpenPassport}
            onOpenWorkOrder={(woId) => setActiveWorkOrderId(woId)}
          />
        )}
      </main>

      {/* Floating AI Assistant Trigger (Bottom-Right) */}
      <button
        onClick={() => setShowAssistant(true)}
        className="fixed bottom-6 right-6 px-4 py-3 bg-rt-primary hover:bg-yellow-300 text-rt-ink border-3 border-rt-ink rounded-[6px] shadow-brutal-lg z-40 transition-transform active:translate-x-[2px] active:translate-y-[2px] font-headline font-black text-xs flex items-center space-x-2"
        title="Open RupeeTrace Multilingual AI Assistant (Ctrl+K)"
      >
        <span className="w-5 h-5 bg-white border border-rt-ink rounded-full flex items-center justify-center font-black text-xs">₹</span>
        <span>AI ASSISTANT</span>
        <span className="text-[10px] bg-white px-1 py-0.2 rounded border border-rt-ink font-mono font-bold">हि/म/EN</span>
      </button>

      {/* Global Work Order Evidence Modal */}
      {activeWorkOrderId && (
        <WorkOrderEvidenceModal
          workOrderId={activeWorkOrderId}
          onClose={() => setActiveWorkOrderId(null)}
          onNavigateRoad={handleOpenPassport}
          onNavigateGraph={() => {
            setActiveWorkOrderId(null);
            setInvestigateMode('graph');
            setActiveView('investigate');
          }}
        />
      )}

      {/* Global AI Assistant Drawer */}
      <AIAssistantDrawer
        isOpen={showAssistant}
        onClose={() => setShowAssistant(false)}
        currentWard={selectedWard}
        currentRoadId={selectedRoadId}
        onNavigateRoad={handleOpenPassport}
        onNavigateWorkOrder={(woId) => setActiveWorkOrderId(woId)}
      />
    </div>
  );
};
