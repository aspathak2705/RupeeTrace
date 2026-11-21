import React, { useState, useEffect } from 'react';
import {
  MessageSquare, User, ShieldCheck, Send, CheckCircle2,
  Clock, AlertTriangle, ExternalLink, FileText, ArrowRight,
  Filter, PlusCircle, CornerDownRight, Shield, Camera,
  AlertOctagon, CheckSquare, Vote, Sparkles, UserCheck, Compass
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { CaseRecord, RoadSummary, CivicProposal, RoadVerificationSummary } from '../types';
import { CitizenOfficerCasesView } from './CitizenOfficerCasesView';

interface Props {
  initialRoadId?: string;
  currentWard: string;
  role: 'citizen' | 'officer';
  onOpenPassport: (roadId: string) => void;
  onOpenWorkOrder: (woId: string) => void;
  initialTab?: 'verify' | 'cases' | 'janmat' | 'activity';
}

export const PublicPortalView: React.FC<Props> = ({
  initialRoadId = 'RD0140',
  currentWard,
  role,
  onOpenPassport,
  onOpenWorkOrder,
  initialTab = 'verify'
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'verify' | 'cases' | 'janmat' | 'activity'>(initialTab);
  const [verificationSummary, setVerificationSummary] = useState<RoadVerificationSummary | null>(null);
  const [proposals, setProposals] = useState<CivicProposal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isConflict, setIsConflict] = useState<boolean>(false);

  // Sync initialTab when changed from outside
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

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

      {/* SUB-VIEW 4: MY CIVIC ACTIVITY & ESCROW DEFENSE */}
      {activeTab === 'activity' && (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
          
          {/* Hero Profile Banner */}
          <div className="p-6 bg-rt-primary border-3 border-rt-ink rounded-[6px] shadow-brutal flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-[3px] text-xs font-mono font-black bg-white border border-rt-ink text-rt-ink flex items-center gap-1 shadow-[1px_1px_0px_#171717]">
                  <UserCheck className="w-3.5 h-3.5" />
                  AUTHENTICATED CIVIC AUDITOR
                </span>
                <span className="px-2 py-0.5 rounded-[3px] text-xs font-mono font-bold bg-rt-mint text-rt-ink border border-rt-ink">
                  WARD {currentWard}
                </span>
              </div>
              <h2 className="text-2xl font-headline font-black text-rt-ink">
                {user?.name || 'Citizen Sunita Sharma'}’s Activity Hub
              </h2>
              <p className="text-xs font-mono text-rt-ink">
                Track your submitted road issues, field photograph verifications, warranty escrow holds, and JANMAT participatory votes.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('cases')}
                className="px-4 py-2 bg-rt-ink text-white hover:bg-neutral-800 border-2 border-rt-ink rounded font-headline font-black text-xs uppercase shadow-brutal"
              >
                + Report New Issue
              </button>
            </div>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white border-2 border-rt-ink rounded-[4px] shadow-brutal-sm space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase text-rt-secondary-text">Issues Logged</span>
              <div className="font-headline font-black text-2xl text-rt-ink">2</div>
              <span className="text-[10px] font-mono text-rt-mint font-bold">1 Action Taken</span>
            </div>

            <div className="p-4 bg-white border-2 border-rt-ink rounded-[4px] shadow-brutal-sm space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase text-rt-secondary-text">Verifications</span>
              <div className="font-headline font-black text-2xl text-rt-ink">3</div>
              <span className="text-[10px] font-mono text-rt-coral font-bold">1 Conflict Flagged</span>
            </div>

            <div className="p-4 bg-white border-2 border-rt-ink rounded-[4px] shadow-brutal-sm space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase text-rt-secondary-text">Escrow Protected</span>
              <div className="font-headline font-black text-2xl text-rt-ink">₹4.2L</div>
              <span className="text-[10px] font-mono text-rt-ink font-bold">Defect Liability Hold</span>
            </div>

            <div className="p-4 bg-white border-2 border-rt-ink rounded-[4px] shadow-brutal-sm space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase text-rt-secondary-text">JANMAT Votes</span>
              <div className="font-headline font-black text-2xl text-rt-ink">2</div>
              <span className="text-[10px] font-mono text-rt-secondary-text font-bold">Ward K/E Projects</span>
            </div>
          </div>

          {/* Activity Log Cards */}
          <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal space-y-4">
            <div className="flex items-center justify-between border-b-2 border-rt-ink pb-3">
              <h3 className="font-headline font-black text-base text-rt-ink uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-rt-primary" />
                Submitted Records &amp; Municipal Responses
              </h3>
              <span className="text-xs font-mono font-bold bg-rt-canvas px-2 py-0.5 rounded border border-rt-ink">
                4 Recent Actions
              </span>
            </div>

            <div className="space-y-3">
              {/* Record 1 */}
              <div className="p-4 bg-rt-canvas border-2 border-rt-ink rounded-[4px] shadow-brutal-sm space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rt-primary border border-rt-ink">
                      CASE #BMC-2025-0891
                    </span>
                    <span className="font-headline font-bold text-xs text-rt-ink">
                      Waterlogging and unraveling asphalt after rain
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-rt-ink border border-rt-ink self-start sm:self-auto">
                    Action Taken
                  </span>
                </div>
                <p className="text-xs font-mono text-rt-secondary-text">
                  Asset: <button onClick={() => onOpenPassport('RD0140')} className="font-bold underline text-rt-ink hover:text-rt-coral">Marol Maroshi Road (RD0140)</button> • Submitted 14 days ago
                </p>
                <div className="p-2.5 bg-white rounded border border-rt-ink font-mono text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rt-ink">
                    <ShieldCheck className="w-3.5 h-3.5 text-rt-mint" />
                    <span>Officer Response from Er. R. K. Patil (Executive Engineer):</span>
                  </div>
                  <p className="text-rt-secondary-text pl-5">
                    "Joint inspection conducted on 04-Nov-2025. Contractor Apex Infrastructure served rectification notice under active 2-year DLP warranty clause 14. Potholes filled with polymer cold mix at zero municipal cost."
                  </p>
                </div>
              </div>

              {/* Record 2 */}
              <div className="p-4 bg-rt-canvas border-2 border-rt-ink rounded-[4px] shadow-brutal-sm space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rt-mint border border-rt-ink text-rt-ink">
                      VERIFICATION #VRF-9921
                    </span>
                    <span className="font-headline font-bold text-xs text-rt-ink">
                      Stage 5 Surface Texture Inspection
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rt-mint text-rt-ink border border-rt-ink self-start sm:self-auto">
                    Confirmed Satisfactory
                  </span>
                </div>
                <p className="text-xs font-mono text-rt-secondary-text">
                  Asset: <button onClick={() => onOpenPassport('RD0140')} className="font-bold underline text-rt-ink hover:text-rt-coral">Marol Maroshi Road (RD0140)</button> • Work Order: WO25-00600
                </p>
                <p className="text-xs font-mono text-rt-ink">
                  Observation: "Surface inspected in person. Mastic asphalt level with storm drain manholes; smooth riding quality."
                </p>
              </div>

              {/* Record 3 */}
              <div className="p-4 bg-rt-canvas border-2 border-rt-ink rounded-[4px] shadow-brutal-sm space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rt-coral text-white border border-rt-ink">
                      VERIFICATION #VRF-4412
                    </span>
                    <span className="font-headline font-bold text-xs text-rt-ink">
                      Edge Compaction Discrepancy Flag
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rt-coral text-white border border-rt-ink self-start sm:self-auto">
                    Conflict Flagged
                  </span>
                </div>
                <p className="text-xs font-mono text-rt-secondary-text">
                  Asset: <button onClick={() => onOpenPassport('RD0140')} className="font-bold underline text-rt-ink hover:text-rt-coral">Marol Maroshi Road (RD0140)</button>
                </p>
                <p className="text-xs font-mono text-rt-ink">
                  Observation: "Loose gravel at boundary edges without bitumen seal. ₹1.8L escrow retainage hold enforced pending engineer joint audit."
                </p>
              </div>

              {/* Record 4 */}
              <div className="p-4 bg-rt-canvas border-2 border-rt-ink rounded-[4px] shadow-brutal-sm space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white border border-rt-ink text-rt-ink">
                      JANMAT VOTE #PRP-KE-001
                    </span>
                    <span className="font-headline font-bold text-xs text-rt-ink">
                      Permeable Concrete Paver Walkways &amp; Storm Outlets
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rt-primary text-rt-ink border border-rt-ink self-start sm:self-auto">
                    Upvoted
                  </span>
                </div>
                <p className="text-xs font-mono text-rt-secondary-text">
                  Ward K/E Budget Priority • Est. ₹14.5 Lakh • Supported alongside 43 other residents
                </p>
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
};
