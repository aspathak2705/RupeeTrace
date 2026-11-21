import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
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
          setActiveView(isOfficer ? 'investigate' : 'explore-roads');
        }
      } else if (hash.startsWith('graph')) {
        setInvestigateMode('graph');
        setActiveView('investigate');
      } else if (hash.startsWith('explore-roads')) {
        setInvestigateMode('passport');
        setActiveView('explore-roads');
      } else if (hash.startsWith('report-issue')) {
        setActiveView('report-issue');
      } else if (hash.startsWith('my-activity') || hash.startsWith('activity')) {
        setActiveView('my-activity');
      } else if (hash.startsWith('citizen-mgmt')) {
        setActiveView('citizen-mgmt');
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
        setActiveView(isOfficer ? 'citizen-mgmt' : 'report-issue');
      } else if (hash.startsWith('verify')) {
        setActiveView('verify');
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
    if (isCitizen && (view === 'accountability' || view === 'next-rupee' || view === 'citizen-mgmt')) {
      setRestrictedTarget(
        view === 'accountability'
          ? 'DLP Sentinel & Forensic Audits'
          : view === 'next-rupee'
          ? 'Next Rupee Planner & Budget Simulator'
          : 'Officer Citizen Management Triage'
      );
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
    setActiveView(isOfficer ? 'investigate' : 'explore-roads');
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

  return (
    <div className="min-h-screen bg-rt-canvas text-rt-ink flex flex-col font-body selection:bg-rt-primary selection:text-rt-ink">
      
      {/* Top Banner: Civic Integrity Notice */}
      <div className="bg-rt-ink text-white border-b-2 border-rt-ink text-[11px] font-mono py-1 px-4 text-center flex items-center justify-center space-x-2">
        <span className={`w-2 h-2 rounded-full ${user ? (isOfficer ? 'bg-rt-mint' : 'bg-rt-primary') : 'bg-neutral-400'} animate-pulse`} />
        <span>
          {user ? (
            <>
              <strong>RUPEETRACE:</strong> Authenticated as <strong>{user.name}</strong> ({user.role.toUpperCase()}) &bull; Server-enforced permissions active
            </>
          ) : (
            <>
              <strong>RUPEETRACE:</strong> Public Transparency Mode &bull; Sign in to access personal activity tracker or municipal officer tools
            </>
          )}
        </span>
      </div>

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
        onOpenLogin={() => setShowLoginModal(true)}
      />

      {/* Active Page View */}
      <main className="flex-1">
        
        {/* VIEW 0: CITIZEN HOME (Citizen Workspace Landing) */}
        {activeView === 'citizen-home' && (
          <CitizenLandingView
            currentWard={selectedWard}
            onNavigatePassport={handleOpenPassport}
            onNavigateVerification={() => navigateToView('verify')}
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
            onNavigatePortal={() => navigateToView(isOfficer ? 'citizen-mgmt' : 'report-issue')}
          />
        )}

        {/* VIEW 2: EXPLORE ROADS (Citizen-Facing Road Passport) */}
        {activeView === 'explore-roads' && (
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
              navigateToView('report-issue');
            }}
            initialMode="passport"
          />
        )}

        {/* VIEW 3: INVESTIGATE (Officer Scoped Investigation Board & Graph) */}
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
              navigateToView('citizen-mgmt');
            }}
            initialMode={investigateMode}
          />
        )}

        {/* VIEW 4: ACCOUNTABILITY (DLP Sentinel, Scorecards, Tenders) */}
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

        {/* VIEW 5: NEXT RUPEE (Budget Simulator, Knapsack, IRC Materials) */}
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

        {/* VIEW 6: REPORT ISSUE (Citizen Complaint Form) */}
        {activeView === 'report-issue' && (
          <PublicPortalView
            initialRoadId={selectedRoadId}
            currentWard={selectedWard}
            role="citizen"
            onOpenPassport={handleOpenPassport}
            onOpenWorkOrder={(woId) => setActiveWorkOrderId(woId)}
            initialTab="cases"
          />
        )}

        {/* VIEW 6B: 7-STAGE REPAIR VERIFICATION */}
        {activeView === 'verify' && (
          <PublicPortalView
            initialRoadId={selectedRoadId}
            currentWard={selectedWard}
            role="citizen"
            onOpenPassport={handleOpenPassport}
            onOpenWorkOrder={(woId) => setActiveWorkOrderId(woId)}
            initialTab="verify"
          />
        )}

        {/* VIEW 7: JANMAT (Citizen Participatory Voting) */}
        {activeView === 'janmat' && (
          <PublicPortalView
            initialRoadId={selectedRoadId}
            currentWard={selectedWard}
            role="citizen"
            onOpenPassport={handleOpenPassport}
            onOpenWorkOrder={(woId) => setActiveWorkOrderId(woId)}
            initialTab="janmat"
          />
        )}

        {/* VIEW 8: MY ACTIVITY (Citizen Tracking Hub) */}
        {activeView === 'my-activity' && (
          <PublicPortalView
            initialRoadId={selectedRoadId}
            currentWard={selectedWard}
            role="citizen"
            onOpenPassport={handleOpenPassport}
            onOpenWorkOrder={(woId) => setActiveWorkOrderId(woId)}
            initialTab="activity"
          />
        )}

        {/* VIEW 9: CITIZEN MANAGEMENT (Officer Triage & Response Dispatch) */}
        {activeView === 'citizen-mgmt' && (
          isCitizen ? (
            <AccessRestrictedGate
              workspaceName="Citizen Management Triage"
              onOpenLogin={() => setShowLoginModal(true)}
            />
          ) : (
            <PublicPortalView
              initialRoadId={selectedRoadId}
              currentWard={selectedWard}
              role="officer"
              onOpenPassport={handleOpenPassport}
              onOpenWorkOrder={(woId) => setActiveWorkOrderId(woId)}
              initialTab="cases"
            />
          )
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
