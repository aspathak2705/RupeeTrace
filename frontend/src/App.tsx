import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { WorkOrderEvidenceModal } from './components/WorkOrderEvidenceModal';
import { WardMoneyTrailView } from './views/WardMoneyTrailView';
import { RoadPassportView } from './views/RoadPassportView';
import { VisualMoneyTraceGraphView } from './views/VisualMoneyTraceGraphView';
import { AuditsInvestigationView } from './views/AuditsInvestigationView';
import { FairAccountabilityView } from './views/FairAccountabilityView';
import { NextRupeePlannerView } from './views/NextRupeePlannerView';
import { CitizenOfficerCasesView } from './views/CitizenOfficerCasesView';
import { api } from './api/client';
import { Info, ShieldAlert } from 'lucide-react';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<string>('money-trail');
  const [selectedWard, setSelectedWard] = useState<string>('K/E');
  const [selectedRoadId, setSelectedRoadId] = useState<string>('RD_KE_01');
  const [role, setRole] = useState<'citizen' | 'officer'>('citizen');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeWorkOrderId, setActiveWorkOrderId] = useState<string | null>(null);
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
      // Default to searching in cases or passport
      handleOpenPassport(clean);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500/30">
      {/* Top Banner: Synthetic Data Disclaimer */}
      <div className="bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400 py-1.5 px-4 text-center flex items-center justify-center space-x-2">
        <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
        <span>
          <strong>RupeeTrace Research Prototype:</strong> All records are synthetic. Billed expenditures represent recorded work-order figures, not verified treasury disbursements.
        </span>
      </div>

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
    </div>
  );
};
