import React from 'react';
import { Play, Compass, Network, ShieldAlert, Award, MessageSquare, TrendingUp, Bot } from 'lucide-react';

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
    <aside aria-label="Demo Tour" className="bg-rt-muted border-b-2 border-rt-ink px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-headline">
      <div className="flex items-center space-x-2">
        <span className="px-2 py-0.5 rounded-[3px] bg-rt-primary border-2 border-rt-ink text-rt-ink font-black text-[10px] uppercase tracking-wider shadow-[1.5px_1.5px_0px_#171717] flex items-center space-x-1">
          <Play className="w-2.5 h-2.5 fill-current" />
          <span>4-MIN EVALUATION TOUR</span>
        </span>
        <span className="text-rt-secondary-text text-[11px] font-mono hidden lg:inline">
          Official Judge Walkthrough:
        </span>
      </div>

      {/* Tour Buttons */}
      <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
        {[
          { step: 1, label: '1. Ward Trail', icon: TrendingUp, title: 'Ward K/E Budget vs Expenditure' },
          { step: 2, label: '2. Road Passport', icon: Compass, title: 'Featured Road Passport (RD0140)', highlight: true },
          { step: 3, label: '3. Trace Graph', icon: Network, title: 'Interactive Visual Money Trace Graph' },
          { step: 4, label: '4. Audit Flag', icon: ShieldAlert, title: 'Work Order WO25-00600 (+129.5% Variance)', coral: true },
          { step: 5, label: '5. Contractors', icon: Award, title: 'Context-Aware Contractor Scorecards' },
          { step: 6, label: '6. Case Dialogue', icon: MessageSquare, title: 'Shared Citizen/Officer Case Workflow' },
          { step: 7, label: '7. Next Rupee', icon: Compass, title: 'Next Rupee Capital Prioritization' }
        ].map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.step}
              onClick={() => onStep(item.step)}
              className={`px-2.5 py-1 rounded-[3px] border-2 border-rt-ink text-[11px] font-bold whitespace-nowrap transition-transform duration-75 active:translate-x-[1px] active:translate-y-[1px] shadow-brutal-sm hover:shadow-brutal flex items-center space-x-1 ${
                item.coral
                  ? 'bg-rt-coral text-white'
                  : item.highlight
                  ? 'bg-rt-primary text-rt-ink'
                  : 'bg-white hover:bg-yellow-50 text-rt-ink'
              }`}
              title={item.title}
            >
              <Icon className="w-3 h-3 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* AI Assistant Quick Pill */}
      <button
        onClick={onOpenAssistant}
        className="px-3 py-1 bg-rt-primary hover:bg-yellow-300 text-rt-ink border-2 border-rt-ink rounded-[4px] text-[11px] font-extrabold shadow-brutal-sm hover:shadow-brutal transition-all flex items-center space-x-1.5"
      >
        <Bot className="w-3.5 h-3.5" />
        <span>Ask AI Assistant</span>
        <span className="text-[9px] bg-white px-1 py-0.2 rounded border border-rt-ink font-mono font-bold">
          हि/म/EN
        </span>
      </button>
    </aside>
  );
};
