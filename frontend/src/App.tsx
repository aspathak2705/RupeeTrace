import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DemoTourBar } from './components/DemoTourBar';
import { AIAssistantDrawer } from './components/AIAssistantDrawer';
import { WorkOrderEvidenceModal } from './components/WorkOrderEvidenceModal';
import { WardMoneyTrailView } from './views/WardMoneyTrailView';
import { RoadPassportView } from './views/RoadPassportView';
import { VisualMoneyTraceGraphView } from './views/VisualMoneyTraceGraphView';
import { AuditsInvestigationView } from './views/AuditsInvestigationView';
import { FairAccountabilityView } from './views/FairAccountabilityView';
import { NextRupeePlannerView } from './views/NextRupeePlannerView';
import { CitizenOfficerCasesView } from './views/CitizenOfficerCasesView';
import { api } from './api/client';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<string>('money-trail');
  const [selectedWard, setSelectedWard] = useState<string>('K/E');
  const [selectedRoadId, setSelectedRoadId] = useState<string>('RD0140');
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

  // Hash-based routing synchronization
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (!hash) {
        setActiveView('money-trail');
        return;
      }

      if (hash.startsWith('passport/')) {
        const roadId = hash.replace('passport/', '');
        if (roadId) {
          setSelectedRoadId(decodeURIComponent(roadId));
          setActiveView('passport');
        }
      } else if (hash.startsWith('graph')) {
        setActiveView('graph');
      } else if (hash.startsWith('audits')) {
        setActiveView('audits');
      } else if (hash.startsWith('contractors')) {
        setActiveView('contractors');
      } else if (hash.startsWith('next-rupee')) {
        setActiveView('next-rupee');
      } else if (hash.startsWith('cases')) {
        setActiveView('cases');
      } else if (hash.startsWith('money-trail')) {
        setActiveView('money-trail');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateToView = (view: string) => {
    setActiveView(view);
    if (view === 'passport') {
      window.location.hash = `#/passport/${selectedRoadId}`;
    } else {
      window.location.hash = `#/${view}`;
    }
  };

  const handleOpenPassport = (roadId: string) => {
    setSelectedRoadId(roadId);
    setActiveView('passport');
    window.location.hash = `#/passport/${roadId}`;
  };

  const handleSearchSubmit = (query: string) => {
    const clean = query.trim().toUpperCase();
    if (!clean) return;

    if (clean.startsWith('RD') || clean.includes('ROAD')) {
      handleOpenPassport(clean);
    } else if (clean.startsWith('WO')) {
      setActiveWorkOrderId(clean);
    } else if (wardsList.includes(clean)) {
      setSelectedWard(clean);
      navigateToView('money-trail');
    } else {
      handleOpenPassport(clean);
    }
  };

  // Demo Tour Handler for 4-minute demo
  const handleDemoStep = (step: number) => {
    switch (step) {
      case 1: // Ward Money Trail
        setSelectedWard('K/E');
        navigateToView('money-trail');
        break;
      case 2: // Road Passport RD0140
        setSelectedRoadId('RD0140');
        handleOpenPassport('RD0140');
        break;
      case 3: // Visual Money Trace Graph
        setSelectedRoadId('RD0140');
        navigateToView('graph');
        break;
      case 4: // Work Order Audit (WO25-00600)
        setActiveWorkOrderId('WO25-00600');
        break;
      case 5: // Fair Accountability
        navigateToView('contractors');
        break;
      case 6: // Citizen/Officer Case Dialogue
        navigateToView('cases');
        break;
      case 7: // Next Rupee Planner
        setSelectedWard('K/E');
        navigateToView('next-rupee');
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500/30">
      {/* Top Banner: Synthetic Data Notice */}
      <div className="bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400 py-1 px-4 text-center flex items-center justify-center space-x-2">
        <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
        <span>
          <strong>RupeeTrace Research Prototype:</strong> All civic records synthetic. Billed expenditures represent recorded work-order figures, not verified treasury disbursements.
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
        role={role}
        setRole={setRole}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        wardsList={wardsList}
      />

      {/* Active Page View */}
      <main className="flex-1">
        {activeView === 'money-trail' && (
          <WardMoneyTrailView
            wardCode={selectedWard}
            onSelectRoad={handleOpenPassport}
            onSelectWorkOrder={(woId) => setActiveWorkOrderId(woId)}
            onNavigateAudits={(code) => {
              setSelectedWard(code);
              navigateToView('audits');
            }}
          />
        )}

        {activeView === 'passport' && (
          <RoadPassportView
            roadId={selectedRoadId}
            onSelectWorkOrder={(woId) => setActiveWorkOrderId(woId)}
            onNavigateGraph={(roadId) => {
              setSelectedRoadId(roadId);
              navigateToView('graph');
            }}
            onNavigateCreateCase={(roadId) => {
              setSelectedRoadId(roadId);
              navigateToView('cases');
            }}
          />
        )}

        {activeView === 'graph' && (
          <VisualMoneyTraceGraphView
            initialFocusType="road"
            initialFocusId={selectedRoadId}
            onOpenPassport={handleOpenPassport}
            onOpenWorkOrder={(woId) => setActiveWorkOrderId(woId)}
            onNavigateToWard={(code) => {
              setSelectedWard(code);
              navigateToView('money-trail');
            }}
          />
        )}

        {activeView === 'audits' && (
          <AuditsInvestigationView
            initialWard={selectedWard}
            onOpenPassport={handleOpenPassport}
            onOpenWorkOrder={(woId) => setActiveWorkOrderId(woId)}
          />
        )}

        {activeView === 'contractors' && (
          <FairAccountabilityView
            onOpenWorkOrder={(woId) => setActiveWorkOrderId(woId)}
            onNavigateToGraph={(type, id) => {
              if (type === 'road') setSelectedRoadId(id);
              navigateToView('graph');
            }}
          />
        )}

        {activeView === 'next-rupee' && (
          <NextRupeePlannerView
            initialWard={selectedWard}
            onOpenPassport={handleOpenPassport}
            onNavigateToMoneyTrail={(code) => {
              setSelectedWard(code);
              navigateToView('money-trail');
            }}
          />
        )}

        {activeView === 'cases' && (
          <CitizenOfficerCasesView
            initialRoadId={selectedRoadId}
            role={role}
            onOpenPassport={handleOpenPassport}
            onOpenWorkOrder={(woId) => setActiveWorkOrderId(woId)}
          />
        )}
      </main>

      {/* Floating AI Assistant Trigger (Bottom-Right) */}
      <button
        onClick={() => setShowAssistant(true)}
        className="fixed bottom-6 right-6 p-3.5 bg-gradient-to-tr from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-full shadow-2xl z-40 transition-transform hover:scale-105 flex items-center space-x-2 border border-teal-400/30"
        title="Open RupeeTrace Multilingual AI Assistant"
      >
        <span className="font-bold text-xs">₹ AI Assistant</span>
      </button>

      {/* Global Work Order Evidence Modal */}
      {activeWorkOrderId && (
        <WorkOrderEvidenceModal
          workOrderId={activeWorkOrderId}
          onClose={() => setActiveWorkOrderId(null)}
          onNavigateRoad={handleOpenPassport}
          onNavigateGraph={(woId) => {
            setActiveWorkOrderId(null);
            navigateToView('graph');
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
