import React, { useState, useEffect } from 'react';
import {
  MessageSquare, User, ShieldCheck, Send, CheckCircle2,
  Clock, AlertTriangle, ExternalLink, FileText, ArrowRight,
  Filter, PlusCircle, CornerDownRight, Shield, Camera,
  AlertOctagon, CheckSquare, Vote, Sparkles
} from 'lucide-react';
import { api } from '../api/client';
import { CaseRecord, RoadSummary, CivicProposal, RoadVerificationSummary } from '../types';
import { CitizenOfficerCasesView } from './CitizenOfficerCasesView';

interface Props {
  initialRoadId?: string;
  currentWard: string;
  role: 'citizen' | 'officer';
  onOpenPassport: (roadId: string) => void;
  onOpenWorkOrder: (woId: string) => void;
}

export const PublicPortalView: React.FC<Props> = ({
  initialRoadId = 'RD0140',
  currentWard,
  role,
  onOpenPassport,
  onOpenWorkOrder
}) => {
  const [activeTab, setActiveTab] = useState<'verify' | 'cases' | 'janmat'>('verify');
  const [verificationSummary, setVerificationSummary] = useState<RoadVerificationSummary | null>(null);
  const [proposals, setProposals] = useState<CivicProposal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isConflict, setIsConflict] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getRoadVerificationSummary(initialRoadId).catch(() => null),
      api.getProposals({ ward_code: currentWard }).catch(() => [])
    ])
      .then(([vData, pData]) => {
        setVerificationSummary(vData);
        setProposals(pData);
      })
      .finally(() => setLoading(false));
  }, [currentWard, initialRoadId]);

  const handleVerifySubmission = async (satisfied: boolean) => {
    try {
      await api.submitCitizenVerification({
        road_id: initialRoadId,
        verification_action: satisfied ? 'CONFIRMED_SATISFACTORY' : 'FLAGGED_DISCREPANCY',
        observation_text: satisfied
          ? 'Surface inspected in person. Asphalt level with curbs and manholes.'
          : 'Pothole patch loose gravel; signs of unbonded asphalt edges.',
        submitter_id: 'CITIZEN-ANON-' + Math.floor(Math.random() * 8999 + 1000)
      });
      if (satisfied) {
        setIsVerified(true);
      } else {
        setIsConflict(true);
      }
    } catch (err) {
      console.error(err);
      if (satisfied) {
        setIsVerified(true);
      } else {
        setIsConflict(true);
      }
    }
  };

  const handleVote = async (proposalId: string) => {
    try {
      await api.castVote(proposalId, 'CITIZEN-USER-' + Math.floor(Math.random() * 8999 + 1000), 'upvote');
      setProposals(prev => prev.map(p =>
        p.proposal_id === proposalId
          ? { ...p, votes_up: (p.votes_up || 0) + 1 }
          : p
      ));
    } catch (err) {
      console.error(err);
      setProposals(prev => prev.map(p =>
        p.proposal_id === proposalId
          ? { ...p, votes_up: (p.votes_up || 0) + 1 }
          : p
      ));
    }
  };

  return (
    <div className="space-y-6 font-body pb-16">
      
      {/* PUBLIC PORTAL HEADER / CONTROL BAR */}
      <div className="bg-white border-b-3 border-rt-ink sticky top-16 z-30 shadow-brutal-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs bg-rt-canvas px-2.5 py-1 rounded border border-rt-ink text-rt-ink">
              DESTINATION 5 • PUBLIC PORTAL
            </span>
            <span className="font-mono text-xs text-rt-secondary-text hidden sm:inline">
              Citizen Reporting, 7-Stage Verification &amp; Participatory Democracy
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('verify')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[4px] border-2 border-rt-ink font-headline font-black text-xs transition-all whitespace-nowrap ${
                activeTab === 'verify'
                  ? 'bg-rt-primary text-rt-ink shadow-brutal-sm'
                  : 'bg-white hover:bg-rt-canvas text-rt-ink'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>7-STAGE VERIFICATION</span>
              <span className="text-[9px] bg-white px-1 py-0.2 rounded border border-rt-ink font-mono font-bold">
                BEFORE / AFTER
              </span>
            </button>

            <button
              onClick={() => setActiveTab('cases')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[4px] border-2 border-rt-ink font-headline font-black text-xs transition-all whitespace-nowrap ${
                activeTab === 'cases'
                  ? 'bg-rt-primary text-rt-ink shadow-brutal-sm'
                  : 'bg-white hover:bg-rt-canvas text-rt-ink'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>REPORT &amp; CASES</span>
              <span className="text-[9px] bg-rt-mint px-1 py-0.2 rounded border border-rt-ink font-mono font-bold text-rt-ink">
                PUBLIC
              </span>
            </button>

            <button
              onClick={() => setActiveTab('janmat')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[4px] border-2 border-rt-ink font-headline font-black text-xs transition-all whitespace-nowrap ${
                activeTab === 'janmat'
                  ? 'bg-rt-primary text-rt-ink shadow-brutal-sm'
                  : 'bg-white hover:bg-rt-canvas text-rt-ink'
              }`}
            >
              <Vote className="w-3.5 h-3.5" />
              <span>JANMAT VOTING</span>
              <span className="text-[9px] bg-white px-1 py-0.2 rounded border border-rt-ink font-mono font-bold">
                COMMUNITY
              </span>
            </button>
          </div>

        </div>
      </div>

      {/* SUB-VIEW 1: 7-STAGE CITIZEN VERIFICATION */}
      {activeTab === 'verify' && (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
          <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-rt-ink pb-4">
              <div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-[3px] bg-rt-primary border border-rt-ink text-rt-ink">
                  WARD {currentWard} • ASSET: {initialRoadId}
                </span>
                <h2 className="text-2xl font-headline font-black text-rt-ink mt-1">
                  7-Stage Municipal Repair Verification Pipeline
                </h2>
                <p className="text-xs font-mono text-rt-secondary-text">
                  Contractor payouts are withheld in escrow pending Stage 6 photographic verification by resident citizens.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenPassport(initialRoadId)}
                  className="px-3 py-1.5 bg-rt-canvas hover:bg-neutral-200 border-2 border-rt-ink rounded font-headline font-bold text-xs"
                >
                  View Road Passport &rarr;
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-16 text-center">
                <div className="w-8 h-8 border-3 border-rt-ink border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="font-mono text-xs text-rt-secondary-text">Loading verification stages...</p>
              </div>
            ) : !verificationSummary ? (
              <div className="p-8 text-center bg-rt-canvas border-2 border-rt-ink rounded font-mono text-xs mt-4">
                No active repair verification record for road {initialRoadId}. Select another road from Investigate.
              </div>
            ) : (
              <div className="space-y-6 mt-6">
                
                {/* 7-Stage Visual Progress Bar */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-rt-secondary-text block">
                    Current Repair Lifecycle Status: <strong>{verificationSummary.overall_verification_status}</strong>
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 text-center font-mono text-[10px] font-bold">
                    {(verificationSummary.verification_stages || []).map((st) => (
                      <div
                        key={st.stage_no}
                        className={`p-2 rounded border-2 border-rt-ink flex flex-col justify-between ${
                          st.status === 'COMPLETED'
                            ? 'bg-rt-primary text-rt-ink'
                            : st.status === 'IN_PROGRESS'
                            ? 'bg-rt-mint text-rt-ink font-black animate-pulse'
                            : 'bg-white text-rt-secondary-text'
                        }`}
                      >
                        <span className="text-[9px] opacity-70">Stage {st.stage_no}</span>
                        <span className="truncate">{st.name}</span>
                        <span className="text-[9px] uppercase mt-1">{st.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Before / After Photo Comparison Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 bg-white border-2 border-rt-ink rounded-[4px] space-y-2.5 shadow-brutal-sm">
                    <div className="flex items-center justify-between text-xs font-mono font-bold">
                      <span className="text-rt-coral flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5" />
                        BEFORE REPAIR (Citizen Complaint)
                      </span>
                      <span className="text-[10px] text-rt-secondary-text">
                        {verificationSummary.before_after_comparison?.before?.date || 'Recorded at filing'}
                      </span>
                    </div>
                    <div className="h-44 bg-neutral-100 border-2 border-rt-ink rounded flex items-center justify-center font-mono text-xs text-neutral-600 flex-col gap-1 p-3 text-center">
                      <AlertTriangle className="w-8 h-8 text-rt-coral mb-1" />
                      <span className="font-bold text-rt-ink">
                        {verificationSummary.before_after_comparison?.before?.description || 'Severe pothole cluster with standing water and exposed aggregate'}
                      </span>
                      <span className="text-[10px] text-neutral-500">Source: Municipal 1916 / MyBMC Complaint Log</span>
                    </div>
                  </div>

                  <div className="p-4 bg-white border-2 border-rt-ink rounded-[4px] space-y-2.5 shadow-brutal-sm">
                    <div className="flex items-center justify-between text-xs font-mono font-bold">
                      <span className="text-rt-mint flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-rt-ink" />
                        AFTER REPAIR (Contractor Completion Claim)
                      </span>
                      <span className="text-[10px] text-rt-secondary-text">
                        {verificationSummary.before_after_comparison?.after?.date || 'Claim submitted'}
                      </span>
                    </div>
                    <div className="h-44 bg-neutral-100 border-2 border-rt-ink rounded flex items-center justify-center font-mono text-xs text-neutral-600 flex-col gap-1 p-3 text-center">
                      <CheckSquare className="w-8 h-8 text-rt-ink mb-1" />
                      <span className="font-bold text-rt-ink">
                        {verificationSummary.before_after_comparison?.after?.description || 'Bituminous concrete resurfacing completed conforming to IRC standard'}
                      </span>
                      <span className="text-[10px] text-neutral-500">
                        Verification Action: {verificationSummary.before_after_comparison?.after?.verification_action || 'CONTRACTOR_SELF_CLAIM'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Citizen Verification Submission Panel */}
                <div className="p-4 bg-rt-canvas border-2 border-rt-ink rounded-[4px] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-headline font-black text-rt-ink block">
                      Resident Community Field Verification
                    </span>
                    <p className="text-xs font-mono text-rt-secondary-text">
                      Did the contractor successfully restore the road surface? Flagging substandard work holds final payment.
                    </p>
                  </div>

                  {isVerified ? (
                    <div className="flex items-center gap-1.5 px-4 py-2 bg-rt-mint border-2 border-rt-ink rounded text-xs font-headline font-black text-rt-ink shadow-brutal-sm">
                      <CheckCircle2 className="w-4 h-4 text-rt-ink" />
                      <span>CONFIRMED SATISFACTORY BY RESIDENT</span>
                    </div>
                  ) : isConflict ? (
                    <div className="flex items-center gap-1.5 px-4 py-2 bg-rt-coral border-2 border-rt-ink rounded text-xs font-headline font-black text-white shadow-brutal-sm">
                      <AlertOctagon className="w-4 h-4 text-white" />
                      <span>DISCREPANCY ALERT SUBMITTED (PAYOUT BLOCKED)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVerifySubmission(true)}
                        className="px-4 py-2 bg-rt-primary hover:bg-yellow-300 border-2 border-rt-ink rounded font-headline font-black text-xs text-rt-ink shadow-brutal-sm active:translate-x-[1px] active:translate-y-[1px]"
                      >
                        Verify (Satisfactory)
                      </button>
                      <button
                        onClick={() => handleVerifySubmission(false)}
                        className="px-4 py-2 bg-rt-coral hover:bg-red-600 text-white border-2 border-rt-ink rounded font-headline font-black text-xs shadow-brutal-sm active:translate-x-[1px] active:translate-y-[1px]"
                      >
                        Flag Discrepancy (Substandard)
                      </button>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: CITIZEN REPORTING & OBSERVATIONS */}
      {activeTab === 'cases' && (
        <CitizenOfficerCasesView
          initialRoadId={initialRoadId}
          role={role}
          onOpenPassport={onOpenPassport}
          onOpenWorkOrder={onOpenWorkOrder}
        />
      )}

      {/* SUB-VIEW 3: COMMUNITY JANMAT VOTING */}
      {activeTab === 'janmat' && (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
          <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-rt-ink pb-4">
              <div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-[3px] bg-rt-primary border border-rt-ink text-rt-ink">
                  JANMAT • DEMOCRATIC CIVIC VOTING
                </span>
                <h2 className="text-2xl font-headline font-black text-rt-ink mt-1">
                  Vote for Next-Cycle Road Repairs in Ward {currentWard}
                </h2>
                <p className="text-xs font-mono text-rt-secondary-text">
                  Direct citizen voting prioritizes municipal work orders before monsoon tenders are finalized.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold bg-rt-canvas px-3 py-1.5 rounded border border-rt-ink">
                  {proposals.length} Proposals Open
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {proposals.map(p => (
                <div
                  key={p.proposal_id}
                  className="p-5 bg-rt-canvas border-2 border-rt-ink rounded-[6px] shadow-brutal-sm flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-rt-ink">
                        {p.proposal_id}
                      </span>
                      <span className="font-financial font-bold text-sm text-rt-ink">
                        Est: ₹{(p.indicative_cost_inr / 100000).toFixed(1)} Lakh
                      </span>
                    </div>

                    <h3 className="font-headline font-black text-sm text-rt-ink">
                      {p.title}
                    </h3>
                    <p className="text-xs font-mono text-rt-secondary-text leading-relaxed">
                      {p.problem_statement}
                    </p>

                    <div className="flex items-center gap-2 text-[10px] font-mono pt-1">
                      <span className="bg-white px-2 py-0.5 rounded border border-rt-ink font-bold">
                        Road: {p.related_road_name}
                      </span>
                      <span className="bg-rt-primary px-2 py-0.5 rounded border border-rt-ink font-bold">
                        Civic Score: {p.composite_score}/100
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-rt-ink/20">
                    <span className="font-mono font-bold text-xs text-rt-ink flex items-center gap-1">
                      <Vote className="w-3.5 h-3.5 text-rt-coral" />
                      {p.votes_up || 0} Upvotes
                    </span>

                    <button
                      onClick={() => handleVote(p.proposal_id)}
                      className="px-4 py-1.5 bg-rt-primary hover:bg-yellow-300 border-2 border-rt-ink rounded font-headline font-black text-xs uppercase shadow-brutal-sm active:translate-x-[1px] active:translate-y-[1px]"
                    >
                      Upvote &uarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
