import React from 'react';
import { Play, Compass, Network, ShieldAlert, Award, MessageSquare, TrendingUp } from 'lucide-react';

interface DemoTourBarProps {
  onStep: (step: number) => void;
  activeStep?: number;
  onOpenAssistant: () => void;
}

export const DemoTourBar: React.FC<DemoTourBarProps> = ({
  onStep,
  activeStep,
  onOpenAssistant
}) => {
  return (
    <div className="bg-slate-900/90 border-b border-teal-500/30 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs backdrop-blur-md">
      <div className="flex items-center space-x-2">
        <span className="px-2 py-0.5 rounded bg-teal-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider flex items-center space-x-1">
          <Play className="w-2.5 h-2.5 fill-current" />
          <span>Demo Tour (4 Min)</span>
        </span>
        <span className="text-slate-400 text-[11px] hidden lg:inline">
          Step through the verified evaluation journey:
        </span>
      </div>

      {/* Tour Buttons */}
      <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-0.5">
        <button
          onClick={() => onStep(1)}
          className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-medium whitespace-nowrap transition flex items-center space-x-1"
          title="0:00–0:40: Ward K/E Money Trail"
        >
          <TrendingUp className="w-3 h-3 text-indigo-400" />
          <span>1. Ward Trail</span>
        </button>

        <button
          onClick={() => onStep(2)}
          className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-teal-500/40 text-teal-300 hover:text-white text-[11px] font-semibold whitespace-nowrap transition flex items-center space-x-1"
          title="0:40–1:35: Featured Road Passport (RD0140)"
        >
          <Compass className="w-3 h-3 text-teal-400" />
          <span>2. Road Passport</span>
        </button>

        <button
          onClick={() => onStep(3)}
          className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-medium whitespace-nowrap transition flex items-center space-x-1"
          title="Visual Money Trace Graph"
        >
          <Network className="w-3 h-3 text-teal-400" />
          <span>3. Trace Graph</span>
        </button>

        <button
          onClick={() => onStep(4)}
          className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-rose-500/40 text-rose-300 hover:text-white text-[11px] font-semibold whitespace-nowrap transition flex items-center space-x-1"
          title="1:35–2:20: Work Order Audit (WO25-00600 +129% deviation)"
        >
          <ShieldAlert className="w-3 h-3 text-rose-400" />
          <span>4. Audit Flag</span>
        </button>

        <button
          onClick={() => onStep(5)}
          className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-medium whitespace-nowrap transition flex items-center space-x-1"
          title="2:20–3:05: Contractor Scorecard (CT03)"
        >
          <Award className="w-3 h-3 text-blue-400" />
          <span>5. Contractors</span>
        </button>

        <button
          onClick={() => onStep(6)}
          className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-medium whitespace-nowrap transition flex items-center space-x-1"
          title="3:05–3:40: Citizen & Officer Workflow"
        >
          <MessageSquare className="w-3 h-3 text-emerald-400" />
          <span>6. Case Dialogue</span>
        </button>

        <button
          onClick={() => onStep(7)}
          className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-medium whitespace-nowrap transition flex items-center space-x-1"
          title="3:40–4:00: Next Rupee Planner"
        >
          <Compass className="w-3 h-3 text-amber-400" />
          <span>7. Next Rupee</span>
        </button>
      </div>

      {/* AI Assistant Quick Pill */}
      <button
        onClick={onOpenAssistant}
        className="px-2.5 py-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded text-[11px] font-bold shadow transition flex items-center space-x-1"
      >
        <span>Ask AI Assistant</span>
        <span className="text-[10px] bg-slate-950/40 px-1 py-0.2 rounded font-mono">हि/म/EN</span>
      </button>
    </div>
  );
};
