import React, { useState } from 'react';
import {
  Bot, X, Send, Sparkles, AlertCircle, FileText,
  CheckCircle2, ArrowRight, ShieldAlert, Globe2
} from 'lucide-react';
import { api } from '../api/client';
import { EvidenceBadge } from './EvidenceBadge';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentWard: string;
  currentRoadId?: string;
  onNavigateRoad: (roadId: string) => void;
  onNavigateWorkOrder: (woId: string) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  language?: string;
  citedRecords?: Array<{ file: string; id: string }>;
  missingEvidence?: string[];
  recommendedAction?: string;
}

const SAMPLE_QUESTIONS = [
  { label: 'RD0140 Cost & DLP', query: 'How much money was recorded for RD0140 repairs and is it under DLP?' },
  { label: 'WO25-00600 Audit Flag', query: 'Is WO25-00600 billed cost outside the rate-card review band?' },
  { label: 'हिंदी: शिकायत व मरम्मत', query: 'कार्य आदेश WO25-00600 किन शिकायतों के कारण जारी हुआ?' },
  { label: 'मराठी: रस्ता खर्च', query: 'रस्ता RD0140 वर किती खर्च नोंदवला आहे आणि कंत्राटदार कोण आहे?' }
];

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
  currentWard,
  currentRoadId,
  onNavigateRoad,
  onNavigateWorkOrder
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Namaste! I am the RupeeTrace Intelligence Assistant. Ask any question in English, हिन्दी, मराठी, or Hinglish regarding road repairs, rate-card audit flags, or contractor performance. All responses cite exact source records from our verified ingestion pipeline.'
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || inputVal).trim();
    if (!textToSend || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: textToSend
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setLoading(true);

    try {
      const res = await api.askAssistant(textToSend, currentWard);
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        language: res.language,
        citedRecords: res.cited_records,
        missingEvidence: res.missing_evidence,
        recommendedAction: res.recommended_action
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `Error retrieving grounded records: ${err.message || 'Service unavailable'}. Please verify Road ID or Work Order format.`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-rt-canvas border-l-3 border-rt-ink shadow-brutal-xl z-50 flex flex-col font-body">
      {/* Drawer Header */}
      <div className="p-4 bg-rt-primary border-b-3 border-rt-ink flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 bg-white border-2 border-rt-ink rounded-[4px] shadow-brutal-sm flex items-center justify-center font-bold text-rt-ink">
            ₹
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-headline font-black text-rt-ink tracking-tight uppercase">
                RUPEETRACE AI ASSISTANT
              </h2>
              <span className="px-1.5 py-0.5 rounded-[3px] text-[10px] font-mono font-bold bg-white text-rt-ink border border-rt-ink">
                GROUNDED
              </span>
            </div>
            <p className="text-[11px] font-mono text-rt-secondary-text">English · हिन्दी · मराठी · Hinglish</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 bg-white border-2 border-rt-ink rounded text-rt-ink hover:bg-rt-canvas transition shadow-brutal-sm"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Suggested Questions Pills */}
      <div className="p-3 bg-white border-b-2 border-rt-ink flex items-center space-x-2 overflow-x-auto text-xs no-scrollbar">
        <span className="text-[10px] font-headline font-black text-rt-secondary-text uppercase tracking-wider shrink-0">
          Try:
        </span>
        {SAMPLE_QUESTIONS.map((sq, i) => (
          <button
            key={i}
            onClick={() => handleSend(sq.query)}
            className="px-2.5 py-1 bg-rt-canvas hover:bg-yellow-100 text-rt-ink rounded-[3px] border border-rt-ink font-mono text-[11px] whitespace-nowrap transition shadow-[1px_1px_0px_#171717]"
          >
            {sq.label}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(m => {
          const isUser = m.sender === 'user';

          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
            >
              <div
                className={`max-w-[90%] p-4 text-xs leading-relaxed rounded-[4px] border-2 border-rt-ink shadow-brutal-sm ${
                  isUser
                    ? 'bg-rt-ink text-white font-medium'
                    : 'bg-white text-rt-ink space-y-3'
                }`}
              >
                {/* Assistant Language Pill */}
                {!isUser && m.language && (
                  <div className="flex items-center justify-between border-b border-rt-ink/20 pb-1.5 text-[10px] font-mono">
                    <span className="text-rt-ink font-bold flex items-center space-x-1">
                      <Globe2 className="w-3 h-3 text-rt-ink" />
                      <span>{m.language} Mode</span>
                    </span>
                    <span className="text-rt-secondary-text font-bold uppercase">Zero Hallucination</span>
                  </div>
                )}

                <div className="font-body text-[13px]">{m.text}</div>

                {/* Cited Source Records */}
                {m.citedRecords && m.citedRecords.length > 0 && (
                  <div className="pt-2 border-t border-rt-ink/20 space-y-1">
                    <span className="text-[10px] font-headline font-black text-rt-secondary-text uppercase tracking-wider block">
                      Cited Source Records:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {m.citedRecords.map((r, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            if (r.id.startsWith('RD')) onNavigateRoad(r.id);
                            if (r.id.startsWith('WO')) onNavigateWorkOrder(r.id);
                          }}
                          className="px-2 py-0.5 rounded-[3px] bg-rt-canvas hover:bg-yellow-100 border border-rt-ink text-rt-ink font-mono text-[10px] font-bold flex items-center space-x-1 transition shadow-[1px_1px_0px_#171717]"
                        >
                          <span>{r.file}#{r.id}</span>
                          <ArrowRight className="w-2.5 h-2.5 text-rt-ink" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing Evidence Warning */}
                {m.missingEvidence && m.missingEvidence.length > 0 && (
                  <div className="p-2.5 bg-yellow-50 border-2 border-rt-ink rounded-[4px] text-[10px] text-rt-ink space-y-1">
                    <div className="font-headline font-bold flex items-center space-x-1 text-rt-ink uppercase">
                      <ShieldAlert className="w-3 h-3 text-rt-coral" />
                      <span>Missing Corroborative Evidence:</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-rt-secondary-text font-mono">
                      {m.missingEvidence.map((me, idx) => (
                        <li key={idx}>{me}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommended Next Action */}
                {m.recommendedAction && (
                  <div className="pt-1 text-[11px] font-mono text-rt-ink">
                    <strong className="text-rt-secondary-text uppercase font-headline mr-1 block text-[10px]">Recommended Action:</strong>
                    <span className="bg-rt-canvas px-2 py-1 rounded border border-rt-ink block mt-0.5">
                      {m.recommendedAction}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center space-x-2 text-rt-ink font-mono font-bold text-xs py-2 bg-white p-3 rounded border-2 border-rt-ink shadow-brutal-sm">
            <div className="w-4 h-4 border-2 border-rt-ink border-t-transparent rounded-full animate-spin" />
            <span>Resolving entities and retrieving verified records...</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="p-4 bg-white border-t-3 border-rt-ink">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            placeholder="Ask about a road, work order, or contractor..."
            className="flex-1 bg-rt-canvas border-2 border-rt-ink text-xs text-rt-ink rounded-[4px] px-3 py-2.5 font-mono focus:outline-none focus:bg-white focus:shadow-brutal-sm"
          />
          <button
            type="submit"
            disabled={!inputVal.trim() || loading}
            className="p-2.5 bg-rt-primary hover:bg-yellow-300 disabled:opacity-40 text-rt-ink border-2 border-rt-ink rounded-[4px] shadow-brutal-sm active:translate-x-[1px] active:translate-y-[1px] transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="text-[10px] text-rt-secondary-text font-mono mt-2 text-center">
          Grounding: Deterministic retrieval from synthetic dataset. Zero fabricated figures.
        </div>
      </div>
    </div>
  );
};
