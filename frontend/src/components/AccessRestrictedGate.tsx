import React from 'react';
import { ShieldAlert, Lock, ArrowRight, UserCheck } from 'lucide-react';

interface Props {
  workspaceName: string;
  onOpenLogin: () => void;
}

export const AccessRestrictedGate: React.FC<Props> = ({ workspaceName, onOpenLogin }) => {
  return (
    <div className="max-w-2xl mx-auto my-12 p-8 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal-xl font-body text-center space-y-6">
      <div className="w-16 h-16 bg-rt-coral border-3 border-rt-ink rounded-[6px] shadow-brutal flex items-center justify-center mx-auto">
        <Lock className="w-8 h-8 text-white" />
      </div>

      <div className="space-y-2">
        <span className="text-xs font-mono font-black uppercase px-2.5 py-1 rounded bg-rt-coral text-white border border-rt-ink">
          RESTRICTED MUNICIPAL WORKSPACE
        </span>
        <h2 className="text-2xl font-headline font-black text-rt-ink tracking-tight pt-2">
          Officer Authorization Required for {workspaceName}
        </h2>
        <p className="text-xs font-mono text-rt-secondary-text max-w-lg mx-auto leading-relaxed">
          This workspace contains forensic audit triages, contractor defect liability recovery notices, tender evaluation algorithms, and capital budgeting simulation models.
        </p>
      </div>

      <div className="p-4 bg-rt-canvas border-2 border-rt-ink rounded-[4px] text-left text-xs font-mono space-y-2">
        <div className="font-bold text-rt-ink flex items-center gap-1.5 border-b border-rt-ink/20 pb-1.5">
          <ShieldAlert className="w-4 h-4 text-rt-coral" />
          <span>Security &amp; Protocol Notice:</span>
        </div>
        <p className="text-rt-secondary-text leading-relaxed">
          Your current session is authenticated as <strong>Public Citizen (Sunita Sharma)</strong>. Citizens enjoy full transparency over public asset specifications, grievance filing, repair verification, and JANMAT community voting. Administrative disposition controls are restricted to verified municipal officers.
        </p>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onOpenLogin}
          className="w-full sm:w-auto px-6 py-3 bg-rt-primary hover:bg-yellow-300 text-rt-ink border-2 border-rt-ink rounded-[4px] font-headline font-black text-xs uppercase tracking-wider shadow-brutal active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center gap-2"
        >
          <span>Switch to Officer Session (Er. R. K. Patil)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
