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
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col font-sans">
      {/* Header */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-teal-500/10 text-teal-400 rounded-lg border border-teal-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-white">RupeeTrace AI Assistant</h2>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-teal-950 text-teal-300 border border-teal-800">
                Grounded
              </span>
            </div>
            <p className="text-[11px] text-slate-400">English · हिन्दी · मराठी · Hinglish</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Prompt Pills */}
      <div className="p-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center space-x-2 overflow-x-auto text-xs no-scrollbar">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider shrink-0">
          Try:
        </span>
        {SAMPLE_QUESTIONS.map((sq, i) => (
          <button
            key={i}
            onClick={() => handleSend(sq.query)}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full border border-slate-800 text-[11px] whitespace-nowrap transition"
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
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
            >
              <div
                className={`max-w-[90%] rounded-2xl p-4 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-teal-600 text-white rounded-br-none shadow-md font-medium'
                    : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none shadow-sm space-y-3'
                }`}
              >
                {/* Assistant Language Pill */}
                {!isUser && m.language && (
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-[10px]">
                    <span className="text-teal-400 font-mono flex items-center space-x-1">
                      <Globe2 className="w-3 h-3" />
                      <span>{m.language} Output</span>
                    </span>
                    <span className="text-slate-500 font-mono">Retrieved-Grounded</span>
                  </div>
                )}

                <div>{m.text}</div>

                {/* Cited Source Records */}
                {m.citedRecords && m.citedRecords.length > 0 && (
                  <div className="pt-2 border-t border-slate-900 space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
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
                          className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-teal-300 font-mono text-[10px] flex items-center space-x-1 transition"
                        >
                          <span>{r.file}#{r.id}</span>
                          <ArrowRight className="w-2.5 h-2.5 text-slate-500" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing Evidence Warning */}
                {m.missingEvidence && m.missingEvidence.length > 0 && (
                  <div className="p-2.5 bg-amber-950/30 border border-amber-900/50 rounded-lg text-[10px] text-amber-300 space-y-1">
                    <div className="font-semibold flex items-center space-x-1 text-amber-400">
                      <ShieldAlert className="w-3 h-3" />
                      <span>Missing Corroborative Evidence:</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-amber-300/80">
                      {m.missingEvidence.map((me, idx) => (
                        <li key={idx}>{me}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommended Next Action */}
                {m.recommendedAction && (
                  <div className="pt-1 text-[11px] text-teal-400 font-mono">
                    <strong className="text-slate-400 font-sans mr-1">Recommended Action:</strong>
                    {m.recommendedAction}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center space-x-2 text-slate-400 text-xs py-2">
            <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <span>Resolving entities and retrieving verified records...</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="p-4 bg-slate-950 border-t border-slate-800">
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
            className="flex-1 bg-slate-900 border border-slate-700 text-xs text-slate-100 rounded-lg px-3 py-2.5 focus:outline-none focus:border-teal-500"
          />
          <button
            type="submit"
            disabled={!inputVal.trim() || loading}
            className="p-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white rounded-lg transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="text-[10px] text-slate-500 mt-2 text-center">
          Grounding: Deterministic retrieval from synthetic dataset. Zero fabricated figures.
        </div>
      </div>
    </div>
  );
};
