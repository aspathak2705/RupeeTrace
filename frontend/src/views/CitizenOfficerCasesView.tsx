import React, { useState, useEffect } from 'react';
import {
  MessageSquare, User, ShieldCheck, Send, CheckCircle2,
  Clock, AlertTriangle, ExternalLink, FileText, ArrowRight,
  Filter, PlusCircle, CornerDownRight, Shield
} from 'lucide-react';
import { api } from '../api/client';
import { CaseRecord, RoadSummary } from '../types';

interface CitizenOfficerCasesViewProps {
  initialRoadId?: string;
  role: 'citizen' | 'officer';
  onOpenPassport: (roadId: string) => void;
  onOpenWorkOrder: (woId: string) => void;
}

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  'Under Review': {
    bg: 'bg-amber-950/40',
    border: 'border-amber-700/60',
    text: 'text-amber-300'
  },
  Clarified: {
    bg: 'bg-blue-950/40',
    border: 'border-blue-700/60',
    text: 'text-blue-300'
  },
  'Action Taken': {
    bg: 'bg-indigo-950/40',
    border: 'border-indigo-700/60',
    text: 'text-indigo-300'
  },
  Resolved: {
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-700/60',
    text: 'text-emerald-300'
  }
};

export const CitizenOfficerCasesView: React.FC<CitizenOfficerCasesViewProps> = ({
  initialRoadId,
  role,
  onOpenPassport,
  onOpenWorkOrder
}) => {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [roads, setRoads] = useState<RoadSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // New case form state (Citizen)
  const [newRoadId, setNewRoadId] = useState<string>(initialRoadId || 'RD0140');
  const [newWorkOrderId, setNewWorkOrderId] = useState<string>('');
  const [newObservation, setNewObservation] = useState<string>('');
  const [newEvidenceRef, setNewEvidenceRef] = useState<string>('');
  const [submittingCase, setSubmittingCase] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // Officer response form state
  const [respondingCaseId, setRespondingCaseId] = useState<string | null>(null);
  const [officerName, setOfficerName] = useState<string>('Er. R. K. Patil (Executive Engineer, K/East)');
  const [officerResponse, setOfficerResponse] = useState<string>('');
  const [officerNewStatus, setOfficerNewStatus] = useState<string>('Action Taken');
  const [submittingResponse, setSubmittingResponse] = useState<boolean>(false);

  // Filter
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [casesData, roadsData] = await Promise.all([
        api.getCases(),
        api.getRoads()
      ]);
      setCases(casesData);
      setRoads(roadsData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch cases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObservation.trim()) return;

    try {
      setSubmittingCase(true);
      const payload = {
        road_id: newRoadId,
        citizen_observation: newObservation,
        work_order_id: newWorkOrderId.trim() ? newWorkOrderId.trim() : undefined,
        evidence_references: newEvidenceRef.trim() ? [newEvidenceRef.trim()] : []
      };
      const created = await api.createCase(payload);
      setCases(prev => [created, ...prev]);
      setNewObservation('');
      setNewEvidenceRef('');
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to submit case');
    } finally {
      setSubmittingCase(false);
    }
  };

  const handleRespondCase = async (caseId: string) => {
    if (!officerResponse.trim()) return;

    try {
      setSubmittingResponse(true);
      const updated = await api.respondCase(caseId, {
        officer_name: officerName,
        officer_response: officerResponse,
        new_status: officerNewStatus
      });

      setCases(prev => prev.map(c => (c.case_id === caseId ? updated : c)));
      setRespondingCaseId(null);
      setOfficerResponse('');
    } catch (err: any) {
      alert(err.message || 'Failed to submit officer response');
    } finally {
      setSubmittingResponse(false);
    }
  };

  const filteredCases = cases.filter(c => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Citizen & Officer Case Management
            </h1>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                role === 'officer'
                  ? 'bg-blue-950 text-blue-300 border-blue-800'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-800'
              }`}
            >
              Active Persona: {role.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Two-way civic accountability dialogue: citizens report field observations and reopened road failures; municipal engineers provide official responses and remedial work orders.
          </p>
        </div>

        {/* Persona hint */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 max-w-sm text-[11px] text-slate-400">
          <div className="text-slate-300 font-semibold mb-0.5">
            {role === 'citizen' ? '👤 Citizen Mode Active' : '🏛️ Municipal Officer Mode Active'}
          </div>
          {role === 'citizen'
            ? 'Submit ground-level road defect observations or question recurring work orders.'
            : 'Review citizen observations, provide official technical clarifications, and update sanction status.'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Submission Form (Role-based) */}
        <div className="lg:col-span-1 space-y-4">
          {role === 'citizen' ? (
            /* Citizen Observation Form */
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-white">Log Field Observation</h2>
              </div>

              {submitSuccess && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-lg text-xs text-emerald-300 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Observation recorded. Linked to road passport timeline.</span>
                </div>
              )}

              <form onSubmit={handleCreateCase} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Target Road Asset:</label>
                  <select
                    value={newRoadId}
                    onChange={e => setNewRoadId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-teal-500"
                  >
                    {roads.map(r => (
                      <option key={r.road_id} value={r.road_id}>
                        {r.road_id} — {r.road_name} ({r.ward_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Work Order ID (Optional):
                  </label>
                  <input
                    type="text"
                    value={newWorkOrderId}
                    onChange={e => setNewWorkOrderId(e.target.value)}
                    placeholder="e.g. WO_0001 (if questioning specific repair)"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Field Observation & Evidence Notes:
                  </label>
                  <textarea
                    rows={4}
                    value={newObservation}
                    onChange={e => setNewObservation(e.target.value)}
                    placeholder="Describe observable surface failure, waterlogging depth, reopened crater, or contractor absence..."
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500 leading-relaxed"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Photo / Geotag Reference:
                  </label>
                  <input
                    type="text"
                    value={newEvidenceRef}
                    onChange={e => setNewEvidenceRef(e.target.value)}
                    placeholder="e.g. IMG_MONSOON_42.jpg or Metro Pillar 140"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingCase}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition flex items-center justify-center space-x-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingCase ? 'Submitting...' : 'Submit Citizen Observation'}</span>
                </button>
              </form>
            </div>
          ) : (
            /* Officer Guidance Card */
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                <Shield className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-white">Officer Operations Console</h2>
              </div>

              <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <p>
                  As a Municipal Executive Engineer or Road Inspector, you can review flagged citizen cases on the right.
                </p>
                <p className="text-slate-400">
                  Click <strong className="text-blue-300">"Submit Official Response"</strong> on any open case to attach technical explanations, cite contractor defect liability clauses, or issue notice for remedial work orders.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono space-y-1">
                <div className="text-slate-400 text-[10px]">CURRENT AUTHENTICATED PROFILE:</div>
                <div className="text-white font-bold">{officerName}</div>
                <div className="text-teal-400 text-[11px]">Roads & Traffic Department, BMC</div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Cases Thread & History */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl text-xs">
            <span className="text-slate-400 font-semibold uppercase tracking-wider">
              Follow-up Cases & Timeline ({filteredCases.length})
            </span>

            <div className="flex items-center space-x-2">
              <span className="text-slate-500">Status:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2.5 py-1 focus:outline-none focus:border-teal-500 font-mono"
              >
                <option value="ALL">All Statuses</option>
                <option value="Under Review">Under Review</option>
                <option value="Clarified">Clarified</option>
                <option value="Action Taken">Action Taken</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-3">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Loading case threads...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-rose-950/30 border border-rose-800 rounded-xl text-center">
              <p className="text-sm text-rose-300">{error}</p>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl">
              <CheckCircle2 className="w-8 h-8 text-teal-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">No Cases Found</p>
              <p className="text-xs text-slate-400 mt-1">Submit a new observation on the left.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCases.map(c => {
                const statusStyle = STATUS_STYLES[c.status] || STATUS_STYLES['Under Review'];
                const isResponding = respondingCaseId === c.case_id;

                return (
                  <div
                    key={c.case_id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm"
                  >
                    {/* Header: Case ID, Road, Work Order, Status */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center space-x-2.5">
                        <span className="font-mono text-xs font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {c.case_id}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}>
                          {c.status}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">{c.created_at}</span>
                      </div>

                      <div className="flex items-center space-x-3 text-xs font-mono">
                        <button
                          onClick={() => onOpenPassport(c.road_id)}
                          className="text-teal-400 hover:text-teal-300 font-bold flex items-center space-x-1"
                        >
                          <span>{c.road_id}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>

                        {c.work_order_id && (
                          <button
                            onClick={() => onOpenWorkOrder(c.work_order_id!)}
                            className="text-amber-400 hover:text-amber-300 font-bold flex items-center space-x-1"
                          >
                            <span>{c.work_order_id}</span>
                            <FileText className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Citizen Observation Content */}
                    <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800/80 space-y-2">
                      <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                        <User className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-semibold text-slate-300">Citizen Observation</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed font-sans">
                        "{c.citizen_observation}"
                      </p>

                      {c.evidence_references && c.evidence_references.length > 0 && (
                        <div className="text-[11px] font-mono text-slate-400 pt-1">
                          Attached Evidence: <span className="text-teal-300">{c.evidence_references.join(', ')}</span>
                        </div>
                      )}
                    </div>

                    {/* Official Response (if present) */}
                    {c.officer_response && (
                      <div className="p-3.5 bg-blue-950/20 rounded-lg border border-blue-900/40 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center space-x-2 text-blue-300">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span className="font-semibold">{c.officer_name || 'Municipal Engineer'}</span>
                          </div>
                          <span className="text-blue-400/70 font-mono text-[10px]">Official Response</span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed font-sans">
                          {c.officer_response}
                        </p>
                      </div>
                    )}

                    {/* Timeline Log */}
                    {c.follow_up_history && c.follow_up_history.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Timeline History:
                        </div>
                        <div className="space-y-1 text-[11px] font-mono text-slate-400">
                          {c.follow_up_history.map((h, i) => (
                            <div key={i} className="flex items-center space-x-2">
                              <span className="text-slate-600">{h.date}</span>
                              <span className="text-slate-500">[{h.actor}]</span>
                              <span className="text-slate-300 font-sans">{h.action}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Officer Response Action Panel (when officer role active) */}
                    {role === 'officer' && (
                      <div className="pt-2">
                        {isResponding ? (
                          <div className="p-4 bg-slate-950 border border-blue-800 rounded-lg space-y-3 text-xs">
                            <div className="font-semibold text-blue-300 flex items-center justify-between">
                              <span>Draft Official Engineering Response</span>
                              <button
                                onClick={() => setRespondingCaseId(null)}
                                className="text-slate-400 hover:text-white"
                              >
                                Cancel
                              </button>
                            </div>

                            <div>
                              <label className="block text-slate-400 mb-1">Responding Officer Name & Title:</label>
                              <input
                                type="text"
                                value={officerName}
                                onChange={e => setOfficerName(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-100"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-400 mb-1">Technical Clarification / Action Taken:</label>
                              <textarea
                                rows={3}
                                value={officerResponse}
                                onChange={e => setOfficerResponse(e.target.value)}
                                placeholder="Explain site inspection outcome, defect liability notice to contractor, or remedial work order sanction..."
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-100"
                              />
                            </div>

                            <div className="flex items-center space-x-3">
                              <label className="text-slate-400">Update Status:</label>
                              <select
                                value={officerNewStatus}
                                onChange={e => setOfficerNewStatus(e.target.value)}
                                className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1"
                              >
                                <option value="Clarified">Clarified</option>
                                <option value="Action Taken">Action Taken</option>
                                <option value="Resolved">Resolved</option>
                                <option value="Under Review">Under Review</option>
                              </select>
                            </div>

                            <button
                              onClick={() => handleRespondCase(c.case_id)}
                              disabled={submittingResponse}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded transition"
                            >
                              {submittingResponse ? 'Publishing...' : 'Publish Official Municipal Response'}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setRespondingCaseId(c.case_id);
                              setOfficerResponse('');
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium border border-slate-700 transition flex items-center space-x-1.5"
                          >
                            <CornerDownRight className="w-3.5 h-3.5 text-blue-400" />
                            <span>Respond as Municipal Officer</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
