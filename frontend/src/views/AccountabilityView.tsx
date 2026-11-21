import React, { useState } from 'react';
import {
  ShieldAlert, Award, AlertTriangle, Layers,
  Compass, CheckCircle2, UserCheck, ShieldCheck
} from 'lucide-react';
import { AuditsInvestigationView } from './AuditsInvestigationView';
import { FairAccountabilityView } from './FairAccountabilityView';

interface Props {
  currentWard: string;
  role: 'citizen' | 'officer';
  onOpenPassport: (roadId: string) => void;
  onOpenWorkOrder: (woId: string) => void;
  onNavigateToGraph: (type: 'work_order' | 'road' | 'ward', id: string) => void;
  initialSubTab?: 'sentinel' | 'scorecards';
}

export const AccountabilityView: React.FC<Props> = ({
  currentWard,
  role,
  onOpenPassport,
  onOpenWorkOrder,
  onNavigateToGraph,
  initialSubTab = 'sentinel'
}) => {
  const [subTab, setSubTab] = useState<'sentinel' | 'scorecards'>(initialSubTab);

  return (
    <div className="space-y-6">
      
      {/* ACCOUNTABILITY SUB-NAVIGATION */}
      <div className="bg-white border-b-3 border-rt-ink sticky top-16 z-30 shadow-brutal-sm font-body">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs bg-rt-canvas px-2.5 py-1 rounded border border-rt-ink text-rt-ink">
              DESTINATION 3 • ACCOUNTABILITY
            </span>
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-rt-secondary-text font-bold">MODE:</span>
              {role === 'officer' ? (
                <span className="bg-rt-mint text-rt-ink font-bold px-2 py-0.5 rounded border border-rt-ink flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-rt-ink" />
                  Officer Administrative Triage
                </span>
              ) : (
                <span className="bg-rt-primary text-rt-ink font-bold px-2 py-0.5 rounded border border-rt-ink flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-rt-ink" />
                  Citizen Public Transparency
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSubTab('sentinel')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[4px] border-2 border-rt-ink font-headline font-black text-xs transition-all whitespace-nowrap ${
                subTab === 'sentinel'
                  ? 'bg-rt-primary text-rt-ink shadow-brutal-sm'
                  : 'bg-white hover:bg-rt-canvas text-rt-ink'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rt-coral" />
              <span>DLP SENTINEL &amp; AUDITS</span>
              <span className="text-[9px] bg-white px-1 py-0.2 rounded border border-rt-ink font-mono font-bold">
                FORENSIC
              </span>
            </button>

            <button
              onClick={() => setSubTab('scorecards')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[4px] border-2 border-rt-ink font-headline font-black text-xs transition-all whitespace-nowrap ${
                subTab === 'scorecards'
                  ? 'bg-rt-primary text-rt-ink shadow-brutal-sm'
                  : 'bg-white hover:bg-rt-canvas text-rt-ink'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-rt-ink" />
              <span>CONTRACTOR SCORECARDS</span>
              <span className="text-[9px] bg-rt-mint px-1 py-0.2 rounded border border-rt-ink font-mono font-bold text-rt-ink">
                8 EMPANELED
              </span>
            </button>
          </div>

        </div>
      </div>

      {/* ACTIVE SUB-TAB CONTENT */}
      {subTab === 'sentinel' ? (
        <AuditsInvestigationView
          initialWard={currentWard}
          onOpenPassport={onOpenPassport}
          onOpenWorkOrder={onOpenWorkOrder}
        />
      ) : (
        <FairAccountabilityView
          onOpenWorkOrder={onOpenWorkOrder}
          onNavigateToGraph={onNavigateToGraph}
        />
      )}

    </div>
  );
};
