import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { DemoTourBar } from './components/DemoTourBar';
import { AIAssistantDrawer } from './components/AIAssistantDrawer';
import { WorkOrderEvidenceModal } from './components/WorkOrderEvidenceModal';
import { LoginModal } from './components/LoginModal';
import { AccessRestrictedGate } from './components/AccessRestrictedGate';
import { CitizenLandingView } from './views/CitizenLandingView';
import { OverviewView } from './views/OverviewView';
import { InvestigateView } from './views/InvestigateView';
import { AccountabilityView } from './views/AccountabilityView';
import { NextRupeePlannerView } from './views/NextRupeePlannerView';
import { PublicPortalView } from './views/PublicPortalView';
import { api } from './api/client';

const AppContent: React.FC = () => {
  const { user, isOfficer, isCitizen, loginDemo } = useAuth();

  // Active view destination:
  // Citizen: 'citizen-home' | 'overview' | 'investigate' | 'portal' | 'janmat'
  // Officer: 'overview' | 'investigate' | 'accountability' | 'next-rupee' | 'portal'
  const [activeView, setActiveView] = useState<string>('citizen-home');
  const [selectedWard, setSelectedWard] = useState<string>('K/E');
  const [selectedRoadId, setSelectedRoadId] = useState<string>('RD0140');
  const [investigateMode, setInvestigateMode] = useState<'passport' | 'graph' | 'ledger'>('passport');
  const [accountabilityTab, setAccountabilityTab] = useState<'sentinel' | 'scorecards'>('sentinel');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeWorkOrderId, setActiveWorkOrderId] = useState<string | null>(null);
  const [showAssistant, setShowAssistant] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [restrictedTarget, setRestrictedTarget] = useState<string>('');
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

  // Update default view when role changes
  useEffect(() => {
    if (isOfficer && activeView === 'citizen-home') {
      setActiveView('overview');
    }
  }, [isOfficer]);

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

  // Hash-based routing synchronization
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (!hash) {
        setActiveView(isOfficer ? 'overview' : 'citizen-home');
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
      } else if (hash.startsWith('janmat')) {
        setActiveView('janmat');
      } else if (hash.startsWith('overview') || hash.startsWith('money-trail')) {
        setActiveView('overview');
      } else if (hash.startsWith('citizen-home')) {
        setActiveView('citizen-home');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isOfficer]);

  const navigateToView = (view: string) => {
    // If citizen tries to navigate to officer-only views, display access gate
    if (isCitizen && (view === 'accountability' || view === 'next-rupee')) {
      setRestrictedTarget(view === 'accountability' ? 'DLP Sentinel & Forensic Audits' : 'Next Rupee Planner & Budget Simulator');
      setActiveView(view);
      window.location.hash = `#/${view}`;
      return;
    }

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
  const handleDemoStep = async (step: number) => {
    switch (step) {
      case 1: // Step 1: Citizen Landing & Ward Overview
        setSelectedWard('K/E');
        navigateToView(isOfficer ? 'overview' : 'citizen-home');
        break;
      case 2: // Step 2: Road Passport RD0140
        setSelectedRoadId('RD0140');
        setInvestigateMode('passport');
        setActiveView('investigate');
        window.location.hash = `#/passport/RD0140`;
        break;
      case 3: // Step 3: Entity-Specific Money Trace Graph
        // Automatically ensure officer role for full investigation board
        if (!isOfficer) {
          await loginDemo('officer');
        }
        setSelectedRoadId('RD0140');
        setInvestigateMode('graph');
        setActiveView('investigate');
        window.location.hash = `#/graph`;
        break;
      case 4: // Step 4: Audit Evidence Modal (WO25-00600)
        setActiveWorkOrderId('WO25-00600');
        break;
      case 5: // Step 5: Officer DLP Sentinel & Contractor Scorecards
        if (!isOfficer) {
          await loginDemo('officer');
        }
        setAccountabilityTab('scorecards');
        navigateToView('accountability');
        break;
      case 6: // Step 6: 7-Stage Citizen Verification & Cases
        navigateToView('portal');
        break;
      case 7: // Step 7: Next Rupee Planner 2.0 (Budget Simulator & IRC Materials)
        if (!isOfficer) {
          await loginDemo('officer');
        }
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
          <strong>RUPEETRACE DEMO:</strong> Authenticated as <strong>{user?.name}</strong> ({user?.role?.toUpperCase()}). Role-based permissions actively enforced by backend.
        </span>
      </div>

      {/* Demo Tour Toolbar */}
      <DemoTourBar
        onStep={handleDemoStep}
        onOpenAssistant={() => setShowAssistant(true)}
      />

      {/* Main Global Navigation */}
      <Navbar
        activeView={activeView}
        setActiveView={navigateToView}
        selectedWard={selectedWard}
        setSelectedWard={setSelectedWard}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        wardsList={wardsList}
        onOpenAssistant={() => setShowAssistant(true)}
        onOpenLogin={() => setShowLoginModal(true)}
      />

      {/* Active Page View */}
      <main className="flex-1">
        
        {/* VIEW 0: CITIZEN HOME (Citizen Workspace Landing) */}
        {activeView === 'citizen-home' && (
          <CitizenLandingView
            currentWard={selectedWard}
            onNavigatePassport={handleOpenPassport}
            onNavigateVerification={() => navigateToView('portal')}
            onNavigateJanmat={() => navigateToView('janmat')}
            onNavigateWardOverview={() => navigateToView('overview')}
          />
        )}

        {/* VIEW 1: WARD OVERVIEW / MONEY TRAIL */}
        {activeView === 'overview' && (
          <OverviewView
            wardCode={selectedWard}
            onInvestigateRoad={handleOpenPassport}
            onOpenWorkOrder={(woId) => setActiveWorkOrderId(woId)}
            onNavigateAccountability={(tab) => {
              if (isCitizen) {
                setRestrictedTarget('DLP Sentinel & Forensic Audits');
                setShowLoginModal(true);
              } else {
                if (tab === 'scorecards') setAccountabilityTab('scorecards');
                else setAccountabilityTab('sentinel');
                navigateToView('accountability');
              }
            }}
            onNavigateNextRupee={() => {
              if (isCitizen) {
                setRestrictedTarget('Next Rupee Planner & Budget Simulator');
                setShowLoginModal(true);
              } else {
                navigateToView('next-rupee');
              }
            }}
            onNavigatePortal={() => navigateToView('portal')}
          />
        )}

        {/* VIEW 2: INVESTIGATE (Road Passport / Visual Money Trace Board) */}
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

        {/* VIEW 3: ACCOUNTABILITY (DLP Sentinel, Scorecards, Tenders) */}
        {activeView === 'accountability' && (
          isCitizen ? (
            <AccessRestrictedGate
              workspaceName="DLP Sentinel &amp; Repair Auditor"
              onOpenLogin={() => setShowLoginModal(true)}
            />
          ) : (
            <AccountabilityView
              currentWard={selectedWard}
              role="officer"
              onOpenPassport={handleOpenPassport}
              onOpenWorkOrder={(woId) => setActiveWorkOrderId(woId)}
              onNavigateToGraph={(type, id) => {
                if (type === 'road') setSelectedRoadId(id);
                setInvestigateMode('graph');
                setActiveView('investigate');
              }}
              initialSubTab={accountabilityTab}
            />
          )
        )}

        {/* VIEW 4: NEXT RUPEE (Budget Simulator, Knapsack, IRC Materials) */}
        {activeView === 'next-rupee' && (
          isCitizen ? (
            <AccessRestrictedGate
              workspaceName="Next Rupee Planner &amp; Budget Simulator"
              onOpenLogin={() => setShowLoginModal(true)}
            />
          ) : (
            <NextRupeePlannerView
              initialWard={selectedWard}
              initialRoadId={selectedRoadId}
              role="officer"
              onOpenPassport={handleOpenPassport}
              onNavigateToMoneyTrail={(code) => {
                setSelectedWard(code);
                navigateToView('overview');
              }}
            />
          )
        )}

        {/* VIEW 5: PUBLIC PORTAL & CASES / JANMAT */}
        {(activeView === 'portal' || activeView === 'janmat') && (
          <PublicPortalView
            initialRoadId={selectedRoadId}
            currentWard={selectedWard}
            role={user?.role || 'citizen'}
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

      {/* Global Role-Based Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        requiredRole={restrictedTarget ? 'officer' : undefined}
      />

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

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};
