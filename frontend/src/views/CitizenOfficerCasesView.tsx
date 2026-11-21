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

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  'Under Review': {
    bg: 'bg-rt-primary',
    text: 'text-rt-ink'
  },
  Clarified: {
    bg: 'bg-rt-mint',
    text: 'text-rt-ink'
  },
  'Action Taken': {
    bg: 'bg-white',
    text: 'text-rt-ink'
  },
  Resolved: {
    bg: 'bg-rt-ink',
    text: 'text-white'
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
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-body pb-20">
      {/* Header */}
      <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-[3px] text-xs font-mono font-bold bg-rt-primary text-rt-ink border border-rt-ink shadow-[1.5px_1.5px_0px_#171717]">
              SHARED CIVIC WORKFLOW
            </span>
            <span
              className={`px-2 py-0.5 rounded-[3px] text-xs font-mono font-bold border border-rt-ink ${
                role === 'officer' ? 'bg-rt-mint text-rt-ink' : 'bg-rt-canvas text-rt-ink'
              }`}
            >
              ACTIVE ROLE: {role.toUpperCase()}
            </span>
          </div>
          <h1 className="text-3xl font-headline font-black text-rt-ink tracking-tight">
            Citizen & Officer Case Follow-up Dialogue
          </h1>
          <p className="text-xs font-mono text-rt-secondary-text mt-1 max-w-2xl">
            Two-way accountability: citizens log ground observations on road failures; ward executive engineers record official responses and warranty actions.
          </p>
        </div>

        {/* Persona docket */}
        <div className="bg-rt-canvas border-2 border-rt-ink rounded-[4px] p-3 max-w-sm text-xs font-mono shadow-brutal-sm">
          <div className="font-headline font-bold text-rt-ink mb-1 uppercase text-[11px]">
            {role === 'citizen' ? '👤 Citizen Mode Active' : '🏛️ Ward Officer Mode Active'}
          </div>
          {role === 'citizen'
            ? 'Submit ground-level road defect observations or question recurring work orders.'
            : 'Review citizen observations, provide official technical clarifications, and update sanction status.'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form / Console */}
        <div className="lg:col-span-1 space-y-4">
          {role === 'citizen' ? (
            /* Citizen Observation Form */
            <div className="bg-white border-3 border-rt-ink rounded-[6px] p-5 space-y-4 shadow-brutal">
              <div className="flex items-center space-x-2 border-b-2 border-rt-ink pb-3">
                <PlusCircle className="w-5 h-5 text-rt-ink" />
                <h2 className="text-sm font-headline font-black text-rt-ink uppercase">Log Field Observation</h2>
              </div>

              {submitSuccess && (
                <div className="p-3 bg-rt-mint border-2 border-rt-ink rounded-[4px] text-xs font-mono font-bold text-rt-ink flex items-center space-x-2 shadow-brutal-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-rt-ink" />
                  <span>Observation recorded and linked to road passport timeline!</span>
                </div>
              )}

              <form onSubmit={handleCreateCase} className="space-y-3.5 text-xs font-mono">
                <div>
                  <label className="block text-rt-secondary-text font-bold mb-1">Target Road Asset:</label>
                  <select
                    value={newRoadId}
                    onChange={e => setNewRoadId(e.target.value)}
                    className="w-full bg-rt-canvas border-2 border-rt-ink rounded-[4px] px-3 py-2 text-rt-ink font-bold focus:outline-none focus:bg-white"
                  >
                    {roads.map(r => (
                      <option key={r.road_id} value={r.road_id}>
                        {r.road_id} — {r.road_name} ({r.ward_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-rt-secondary-text font-bold mb-1">
                    Work Order ID (Optional):
                  </label>
                  <input
                    type="text"
                    value={newWorkOrderId}
                    onChange={e => setNewWorkOrderId(e.target.value)}
                    placeholder="e.g. WO25-00600"
                    className="w-full bg-rt-canvas border-2 border-rt-ink rounded-[4px] px-3 py-2 text-rt-ink font-bold focus:outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-rt-secondary-text font-bold mb-1 font-body">
                    Field Observation & Evidence Notes:
                  </label>
                  <textarea
                    rows={4}
                    value={newObservation}
                    onChange={e => setNewObservation(e.target.value)}
                    placeholder="Describe observable surface failure, waterlogging depth, reopened crater, or contractor absence..."
                    className="w-full bg-rt-canvas border-2 border-rt-ink rounded-[4px] px-3 py-2 text-rt-ink font-body focus:outline-none focus:bg-white leading-relaxed"
                    required
                  />
                </div>

                <div>
                  <label className="block text-rt-secondary-text font-bold mb-1">
                    Photo / Geotag Reference:
                  </label>
                  <input
                    type="text"
                    value={newEvidenceRef}
                    onChange={e => setNewEvidenceRef(e.target.value)}
                    placeholder="e.g. Metro Pillar 140 / IMG_042.jpg"
                    className="w-full bg-rt-canvas border-2 border-rt-ink rounded-[4px] px-3 py-2 text-rt-ink font-bold focus:outline-none focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingCase}
                  className="w-full py-2.5 bg-rt-primary hover:bg-yellow-300 text-rt-ink font-headline font-black border-2 border-rt-ink rounded-[4px] shadow-brutal-sm active:translate-x-[1px] active:translate-y-[1px] transition flex items-center justify-center space-x-2"
                >
                  <Send className="w-4 h-4 text-rt-ink" />
                  <span>{submittingCase ? 'Submitting...' : 'Submit Citizen Observation'}</span>
                </button>
              </form>
            </div>
          ) : (
            /* Officer Guidance Card */
            <div className="bg-white border-3 border-rt-ink rounded-[6px] p-5 space-y-4 shadow-brutal">
              <div className="flex items-center space-x-2 border-b-2 border-rt-ink pb-3">
                <Shield className="w-5 h-5 text-rt-ink" />
                <h2 className="text-sm font-headline font-black text-rt-ink uppercase">Officer Operations Console</h2>
              </div>

              <div className="text-xs text-rt-ink space-y-2 leading-relaxed font-body">
                <p>
                  As a Municipal Executive Engineer or Road Inspector, review citizen observations flagged on the right.
                </p>
                <p className="text-rt-secondary-text">
                  Click <strong className="text-rt-ink font-bold">"Respond as Municipal Officer"</strong> to attach technical explanations, invoke contractor defect liability clauses, or issue notice for remedial work orders.
                </p>
              </div>

              <div className="p-3 bg-rt-canvas rounded-[4px] border-2 border-rt-ink text-xs font-mono space-y-1 shadow-brutal-sm">
                <div className="text-rt-secondary-text text-[10px] uppercase font-bold">CURRENT AUTHENTICATED PROFILE:</div>
                <div className="text-rt-ink font-bold">{officerName}</div>
                <div className="text-rt-secondary-text text-[11px]">Roads & Traffic Department, BMC</div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Cases Thread */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center justify-between bg-white border-3 border-rt-ink px-4 py-2.5 rounded-[6px] text-xs font-mono shadow-brutal-sm">
            <span className="text-rt-ink font-headline font-black uppercase tracking-wider">
              Follow-up Cases & Timeline ({filteredCases.length})
            </span>

            <div className="flex items-center space-x-2">
              <span className="text-rt-secondary-text font-bold uppercase text-[10px]">Status:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-rt-canvas border-2 border-rt-ink text-rt-ink rounded-[3px] px-2.5 py-1 font-bold focus:outline-none"
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
            <div className="flex flex-col items-center justify-center p-12 space-y-3 font-mono">
              <div className="w-8 h-8 border-3 border-rt-ink border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold uppercase tracking-wider text-rt-ink">Loading case threads...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-rt-coral text-white border-3 border-rt-ink rounded-[4px] shadow-brutal text-center font-mono">
              <p className="font-bold">{error}</p>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="p-12 text-center bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal">
              <CheckCircle2 className="w-8 h-8 text-rt-ink mx-auto mb-2" />
              <p className="text-base font-headline font-bold text-rt-ink">No Cases Found</p>
              <p className="text-xs font-mono text-rt-secondary-text mt-1">Submit a new observation on the left.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCases.map(c => {
                const statusStyle = STATUS_STYLES[c.status] || STATUS_STYLES['Under Review'];
                const isResponding = respondingCaseId === c.case_id;

                return (
                  <div
                    key={c.case_id}
                    className="bg-white border-3 border-rt-ink rounded-[6px] p-5 space-y-4 shadow-brutal font-body"
                  >
                    {/* Header: Case ID, Road, Work Order, Status */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-rt-ink pb-3 font-mono">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white bg-rt-ink px-2 py-0.5 rounded-[3px]">
                          {c.case_id}
                        </span>
                        <span className={`px-2 py-0.5 rounded-[3px] text-[11px] font-bold border border-rt-ink ${statusStyle.bg} ${statusStyle.text}`}>
                          {c.status}
                        </span>
                        <span className="text-xs text-rt-secondary-text">{c.created_at}</span>
                      </div>

                      <div className="flex items-center space-x-3 text-xs font-bold">
                        <button
                          onClick={() => onOpenPassport(c.road_id)}
                          className="text-rt-ink hover:underline flex items-center space-x-1"
                        >
                          <span>{c.road_id}</span>
                          <ExternalLink className="w-3 h-3 text-rt-ink" />
                        </button>

                        {c.work_order_id && (
                          <button
                            onClick={() => onOpenWorkOrder(c.work_order_id!)}
                            className="text-rt-ink hover:underline flex items-center space-x-1"
                          >
                            <span>{c.work_order_id}</span>
                            <FileText className="w-3 h-3 text-rt-ink" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Citizen Observation Content */}
                    <div className="p-3.5 bg-rt-canvas rounded-[4px] border-2 border-rt-ink space-y-2 shadow-brutal-sm">
                      <div className="flex items-center space-x-2 text-[11px] font-mono text-rt-secondary-text font-bold">
                        <User className="w-3.5 h-3.5 text-rt-ink" />
                        <span className="uppercase text-rt-ink">Citizen Observation</span>
                      </div>
                      <p className="text-xs text-rt-ink leading-relaxed font-body font-medium">
                        "{c.citizen_observation}"
                      </p>

                      {c.evidence_references && c.evidence_references.length > 0 && (
                        <div className="text-[11px] font-mono text-rt-secondary-text pt-1">
                          Attached Evidence: <strong className="text-rt-ink">{c.evidence_references.join(', ')}</strong>
                        </div>
                      )}
                    </div>

                    {/* Official Response */}
                    {c.officer_response && (
                      <div className="p-3.5 bg-rt-mint rounded-[4px] border-2 border-rt-ink space-y-2 shadow-brutal-sm">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <div className="flex items-center space-x-2 text-rt-ink font-bold">
                            <ShieldCheck className="w-4 h-4 text-rt-ink" />
                            <span>{c.officer_name || 'Municipal Engineer'}</span>
                          </div>
                          <span className="bg-white px-1.5 py-0.2 rounded border border-rt-ink font-bold uppercase text-[9px] text-rt-ink">
                            Official Response
                          </span>
                        </div>
                        <p className="text-xs text-rt-ink leading-relaxed font-body font-medium">
                          {c.officer_response}
                        </p>
                      </div>
                    )}

                    {/* Timeline Log */}
                    {c.follow_up_history && c.follow_up_history.length > 0 && (
                      <div className="pt-2 border-t border-rt-ink/20 space-y-1.5 font-mono">
                        <div className="text-[10px] font-headline font-bold uppercase tracking-wider text-rt-secondary-text">
                          Timeline History:
                        </div>
                        <div className="space-y-1 text-[11px] text-rt-secondary-text">
                          {c.follow_up_history.map((h, i) => (
                            <div key={i} className="flex items-center space-x-2">
                              <span className="font-bold text-rt-ink">{h.date}</span>
                              <span className="text-rt-secondary-text">[{h.actor}]</span>
                              <span className="text-rt-ink font-body font-medium">{h.action}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Officer Response Action Panel */}
                    {role === 'officer' && (
                      <div className="pt-2">
                        {isResponding ? (
                          <div className="p-4 bg-rt-canvas border-2 border-rt-ink rounded-[4px] space-y-3 text-xs font-mono shadow-brutal-sm">
                            <div className="font-headline font-bold text-rt-ink flex items-center justify-between">
                              <span className="uppercase">Draft Official Engineering Response</span>
                              <button
                                onClick={() => setRespondingCaseId(null)}
                                className="text-rt-secondary-text hover:text-rt-ink font-bold"
                              >
                                [Cancel]
                              </button>
                            </div>

                            <div>
                              <label className="block text-rt-secondary-text mb-1 font-bold">Responding Officer Name & Title:</label>
                              <input
                                type="text"
                                value={officerName}
                                onChange={e => setOfficerName(e.target.value)}
                                className="w-full bg-white border-2 border-rt-ink rounded-[4px] px-3 py-1.5 text-rt-ink font-bold"
                              />
                            </div>

                            <div>
                              <label className="block text-rt-secondary-text mb-1 font-bold">Technical Clarification / Action Taken:</label>
                              <textarea
                                rows={3}
                                value={officerResponse}
                                onChange={e => setOfficerResponse(e.target.value)}
                                placeholder="Explain site inspection outcome, defect liability notice to contractor, or remedial work order sanction..."
                                className="w-full bg-white border-2 border-rt-ink rounded-[4px] px-3 py-1.5 text-rt-ink font-body"
                              />
                            </div>

                            <div className="flex items-center space-x-3">
                              <label className="text-rt-secondary-text font-bold">Update Status:</label>
                              <select
                                value={officerNewStatus}
                                onChange={e => setOfficerNewStatus(e.target.value)}
                                className="bg-white border-2 border-rt-ink text-rt-ink rounded-[3px] px-2.5 py-1 font-bold"
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
                              className="px-4 py-2 bg-rt-primary hover:bg-yellow-300 text-rt-ink font-headline font-bold border-2 border-rt-ink rounded-[4px] shadow-brutal-sm active:translate-x-[1px] active:translate-y-[1px] transition"
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
                            className="px-3.5 py-1.5 bg-white hover:bg-rt-canvas text-rt-ink rounded-[4px] text-xs font-headline font-bold border-2 border-rt-ink shadow-brutal-sm active:translate-x-[1px] active:translate-y-[1px] transition flex items-center space-x-1.5"
                          >
                            <CornerDownRight className="w-3.5 h-3.5 text-rt-ink" />
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
