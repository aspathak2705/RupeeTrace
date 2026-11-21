import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass, DollarSign, ArrowRight, CheckCircle2,
  AlertCircle, ExternalLink, ShieldAlert, Sliders,
  HelpCircle, Layers, FileDown, Wrench, Building2, MapPin,
  Vote, MessageSquare, PlusCircle, CheckSquare, Sparkles,
  ChevronRight, RefreshCw, BarChart3, Scale, HardHat, FileText,
  AlertTriangle, ShieldCheck, Eye, Upload, ThumbsUp, X, Filter
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  WardSummary, CivicProposal, SimulatorWardResponse, BudgetScenarioResult,
  ProposalContractorComparison, TenderEvaluationResponse, CostOptimizationReport,
  RoadVerificationSummary, UnifiedInvestmentBrief
} from '../types';
import { EvidenceBadge } from '../components/EvidenceBadge';

interface NextRupeePlannerViewProps {
  initialWard?: string;
  initialRoadId?: string;
  role?: 'citizen' | 'officer';
  onOpenPassport: (roadId: string) => void;
  onNavigateToMoneyTrail: (wardCode: string) => void;
}

export const NextRupeePlannerView: React.FC<NextRupeePlannerViewProps> = ({
  initialWard = 'K/E',
  initialRoadId = 'RD0140',
  role = 'citizen',
  onOpenPassport,
  onNavigateToMoneyTrail
}) => {
  // Navigation & Sub-Tabs
  const { user, isOfficer } = useAuth();
  const [activeTab, setActiveTab] = useState<'janmat' | 'simulator' | 'contractors' | 'materials' | 'verification' | 'optimizer'>('janmat');
  const [wardCode, setWardCode] = useState<string>(initialWard);
  const [wards, setWards] = useState<WardSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Authenticated user from session
  const demoUser = useMemo(() => ({
    id: user?.username || 'officer',
    name: user?.name || (isOfficer ? 'Er. R. K. Patil' : 'Sunita Sharma'),
    role: (user?.role || role || 'officer') as 'citizen' | 'officer'
  }), [user, isOfficer, role]);

  // Data Collections
  const [proposals, setProposals] = useState<CivicProposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<CivicProposal | null>(null);
  const [selectedRoadId, setSelectedRoadId] = useState<string>(initialRoadId);

  // Filter state for JANMAT
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSuggestModal, setShowSuggestModal] = useState<boolean>(false);
  const [showCommentsDrawer, setShowCommentsDrawer] = useState<boolean>(false);
  const [showLifecycleModal, setShowLifecycleModal] = useState<boolean>(false);

  // Simulator State
  const [simData, setSimData] = useState<SimulatorWardResponse | null>(null);
  const [activeScenarioKey, setActiveScenarioKey] = useState<string>('Balanced Ward Development');
  const [compareScenarioKey, setCompareScenarioKey] = useState<string>('Safety First');
  const [simBudget, setSimBudget] = useState<number>(1500000);
  const [contingencyPct, setContingencyPct] = useState<number>(5);
  const [optimizerWeights, setOptimizerWeights] = useState({
    urgency: 0.25,
    safety: 0.25,
    facility: 0.20,
    flood: 0.15,
    citizen_vote: 0.15
  });

  // Contractor Intelligence State
  const [contractorComparison, setContractorComparison] = useState<ProposalContractorComparison | null>(null);
  const [tenderEvaluation, setTenderEvaluation] = useState<TenderEvaluationResponse | null>(null);

  // Material & Cost State
  const [costOptReport, setCostOptReport] = useState<CostOptimizationReport | null>(null);
  const [aiResearchResult, setAiResearchResult] = useState<any | null>(null);
  const [aiResearchLoading, setAiResearchLoading] = useState<boolean>(false);

  // Verification State
  const [verificationSummary, setVerificationSummary] = useState<RoadVerificationSummary | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState<boolean>(false);
  const [verifyAction, setVerifyAction] = useState<string>('Confirmed Completed');
  const [verifyComment, setVerifyComment] = useState<string>('');
  const [verifyWorkOrderId, setVerifyWorkOrderId] = useState<string>('WO25-00600');

  // Unified Optimizer Brief
  const [unifiedBrief, setUnifiedBrief] = useState<UnifiedInvestmentBrief | null>(null);

  // Form states for suggestions
  const [newPropCategory, setNewPropCategory] = useState<string>('School access road improvement');
  const [newPropRoadId, setNewPropRoadId] = useState<string>('RD0140');
  const [newPropTitle, setNewPropTitle] = useState<string>('');
  const [newPropProblem, setNewPropProblem] = useState<string>('');

  // Comment input
  const [newCommentText, setNewCommentText] = useState<string>('');

  // Lifecycle transition
  const [newLifecycleStatus, setNewLifecycleStatus] = useState<string>('Technical Review');
  const [lifecycleReason, setLifecycleReason] = useState<string>('');

  // 1. Initial Load of Wards
  useEffect(() => {
    api.getWards().then(setWards).catch(console.error);
  }, []);

  // 2. Load Proposals whenever Ward changes
  const loadWardProposals = async (code: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getProposals({ ward_code: code });
      setProposals(data);
      if (data && data.length > 0) {
        setSelectedProposal(data[0]);
        setSelectedRoadId(data[0].related_road_id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load ward proposals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWardProposals(wardCode);
  }, [wardCode]);

  // 3. Load Simulator Data
  const loadSimulator = async (code: string, budget?: number, contingency?: number) => {
    try {
      const data = await api.getSimulatorScenarios(code, {
        custom_budget: budget,
        contingency_pct: contingency
      });
      setSimData(data);
      if (data.total_budget_inr && !budget) {
        setSimBudget(data.total_budget_inr);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'simulator') {
      loadSimulator(wardCode, simBudget, contingencyPct);
    }
  }, [activeTab, wardCode]);

  // 4. Load Contractor Comparison for Selected Proposal
  const loadContractorData = async (propId: string) => {
    try {
      const data = await api.compareContractorsForProposal(propId);
      setContractorComparison(data);
      const tender = await api.evaluateTenderBids(propId);
      setTenderEvaluation(tender);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'contractors' && selectedProposal) {
      loadContractorData(selectedProposal.proposal_id);
    }
  }, [activeTab, selectedProposal]);

  // 5. Load Material Cost Optimization
  const loadMaterialData = async (proposal: CivicProposal) => {
    try {
      const report = await api.getCostOptimizationReport({
        base_cost: proposal.indicative_cost_inr,
        category: proposal.category
      });
      setCostOptReport(report);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'materials' && selectedProposal) {
      loadMaterialData(selectedProposal);
    }
  }, [activeTab, selectedProposal]);

  // 6. Load Verification Data for Road
  const loadVerificationData = async (roadId: string) => {
    try {
      const data = await api.getRoadVerificationSummary(roadId);
      setVerificationSummary(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'verification' && selectedRoadId) {
      loadVerificationData(selectedRoadId);
    }
  }, [activeTab, selectedRoadId]);

  // 7. Load Unified Brief
  const loadUnifiedBrief = async (propId: string) => {
    try {
      const data = await api.getUnifiedDecisionBrief(propId);
      setUnifiedBrief(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'optimizer' && selectedProposal) {
      loadUnifiedBrief(selectedProposal.proposal_id);
    }
  }, [activeTab, selectedProposal]);

  // Filtered Proposals in JANMAT
  const filteredProposals = useMemo(() => {
    return proposals.filter(p => {
      const matchCat = categoryFilter === 'ALL' || p.category.toLowerCase().includes(categoryFilter.toLowerCase());
      const matchSearch = !searchQuery.trim() || (
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.related_road_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.problem_statement.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return matchCat && matchSearch;
    });
  }, [proposals, categoryFilter, searchQuery]);

  // Actions
  const handleVote = async (proposalId: string) => {
    try {
      const res = await api.castVote(proposalId, demoUser.id, 'upvote');
      setProposals(prev => prev.map(p => {
        if (p.proposal_id === proposalId) {
          return { ...p, votes_total: res.votes_total, votes_up: res.votes_up };
        }
        return p;
      }));
      if (selectedProposal && selectedProposal.proposal_id === proposalId) {
        setSelectedProposal({
          ...selectedProposal,
          votes_total: res.votes_total,
          votes_up: res.votes_up
        });
      }
    } catch (err: any) {
      alert(err.message || 'Voting failed');
    }
  };

  const handleAddComment = async () => {
    if (!selectedProposal || !newCommentText.trim()) return;
    try {
      const res = await api.addProposalComment(selectedProposal.proposal_id, {
        user_id: demoUser.id,
        user_name: demoUser.name,
        comment_text: newCommentText.trim(),
        user_role: demoUser.role
      });
      setSelectedProposal(prev => prev ? {
        ...prev,
        comments_count: (prev.comments_count || 0) + 1,
        comments: [...(prev.comments || []), res]
      } : null);
      setNewCommentText('');
    } catch (err: any) {
      alert(err.message || 'Failed to submit comment');
    }
  };

  const handleSuggestProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropTitle.trim() || !newPropProblem.trim()) return;
    try {
      const created = await api.createCitizenProposal({
        ward_code: wardCode,
        road_id: newPropRoadId,
        category: newPropCategory,
        title: newPropTitle.trim(),
        problem_statement: newPropProblem.trim(),
        citizen_id: demoUser.id,
        citizen_name: demoUser.name
      });
      setProposals(prev => [created, ...prev]);
      setSelectedProposal(created);
      setShowSuggestModal(false);
      setNewPropTitle('');
      setNewPropProblem('');
      alert('Community proposal submitted successfully to JANMAT!');
    } catch (err: any) {
      alert(err.message || 'Failed to submit proposal');
    }
  };

  const handleLifecycleUpdate = async () => {
    if (!selectedProposal || !lifecycleReason.trim()) return;
    try {
      const res = await api.updateProposalLifecycle(selectedProposal.proposal_id, {
        new_status: newLifecycleStatus,
        actor: demoUser.name,
        reason: lifecycleReason.trim()
      });
      setSelectedProposal(prev => prev ? { ...prev, status: res.new_status } : null);
      setProposals(prev => prev.map(p => p.proposal_id === selectedProposal.proposal_id ? { ...p, status: res.new_status } : p));
      setShowLifecycleModal(false);
      setLifecycleReason('');
      alert(`Proposal status updated to '${res.new_status}'.`);
    } catch (err: any) {
      alert(err.message || 'Lifecycle update failed');
    }
  };

  const handleTriggerOptimizer = async () => {
    try {
      const res = await api.optimizeBudget(wardCode, {
        total_budget: simBudget,
        contingency_pct: contingencyPct,
        weights: optimizerWeights
      });
      if (res.is_feasible) {
        alert(`Deterministic Optimizer selected ${res.selected_projects_count} projects allocating ₹${res.total_allocated_inr.toLocaleString()}!`);
      } else {
        alert(res.error_message || 'Optimization budget constraint exceeded.');
      }
    } catch (err: any) {
      alert(err.message || 'Optimization failed');
    }
  };

  const handleTriggerAIResearch = async () => {
    if (!selectedProposal) return;
    setAiResearchLoading(true);
    try {
      const res = await api.queryAIMaterialResearch({
        project_type: selectedProposal.category,
        surface: 'Asphalt',
        ward_context: `Ward ${wardCode} high monsoon precipitation area`
      });
      setAiResearchResult(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setAiResearchLoading(false);
    }
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyComment.trim()) return;
    try {
      const res = await api.submitCitizenVerification({
        road_id: selectedRoadId,
        work_order_id: verifyWorkOrderId,
        verification_action: verifyAction,
        observation_text: verifyComment.trim(),
        submitter_id: demoUser.id
      });
      setShowVerifyModal(false);
      setVerifyComment('');
      loadVerificationData(selectedRoadId);
      if (res.conflict_flag) {
        alert('DISCREPANCY ALERT: Conflicting evidence recorded. Flagged for Joint Site Inspection!');
      } else {
        alert('Verification report recorded in public civic ledger.');
      }
    } catch (err: any) {
      alert(err.message || 'Submission failed');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-body pb-24 text-rt-ink">
      {/* Top Banner: Synthetic Data Notice */}
      <div className="p-3 bg-rt-canvas border-2 border-rt-ink rounded-[4px] shadow-[2px_2px_0px_#171717] flex flex-wrap items-center justify-between text-xs font-mono gap-2">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 bg-rt-coral rounded-full animate-ping" />
          <span className="font-bold">CIVIC INFRASTRUCTURE INTELLIGENCE SYSTEM 2.0</span>
          <span className="text-rt-secondary-text">|</span>
          <span className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-bold border border-yellow-400">
            SYNTHETIC DEMO DATA
          </span>
          <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold border border-blue-400">
            DETERMINISTIC RATE CARDS
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-rt-secondary-text">Authenticated Session:</span>
          <span className="font-bold bg-white px-2 py-0.5 border border-rt-ink rounded">
            {demoUser.name} ({demoUser.role.toUpperCase()})
          </span>
        </div>
      </div>

      {/* Main Header & Ward Selector */}
      <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-[3px] text-xs font-mono font-bold bg-rt-primary text-rt-ink border border-rt-ink shadow-[1.5px_1.5px_0px_#171717]">
              RUPEETRACE PLANNER 2.0
            </span>
            <span className="text-xs font-mono font-bold bg-rt-mint text-rt-ink px-2 py-0.5 rounded border border-rt-ink">
              JANMAT PARTICIPATORY BUDGETING
            </span>
          </div>
          <h1 className="text-3xl font-headline font-black text-rt-ink tracking-tight">
            Civic Infrastructure Planning & Accountability Hub
          </h1>
          <p className="text-xs font-mono text-rt-secondary-text mt-1 max-w-2xl">
            "Your neighbourhood. Your priorities. Your money." — Follow the Rupee from citizen proposal to budget scenario, contractor evaluation, material optimization, and physical verification.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right">
            <label className="block text-[10px] font-mono font-bold uppercase text-rt-secondary-text">Select Ward</label>
            <select
              value={wardCode}
              onChange={(e) => setWardCode(e.target.value)}
              className="px-3 py-1.5 bg-white border-2 border-rt-ink rounded-[4px] font-headline font-black text-sm shadow-[2px_2px_0px_#171717] focus:outline-none focus:ring-2 focus:ring-rt-primary"
            >
              {wards.map(w => (
                <option key={w.ward_code} value={w.ward_code}>
                  Ward {w.ward_code} — {w.ward_name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => onNavigateToMoneyTrail(wardCode)}
            className="px-3 py-1.5 bg-rt-canvas hover:bg-neutral-200 border-2 border-rt-ink rounded-[4px] text-xs font-headline font-black shadow-[2px_2px_0px_#171717] flex items-center space-x-1"
          >
            <span>Money Trail</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 6 Connected Capability Tabs */}
      <div className="flex border-b-3 border-rt-ink bg-white overflow-x-auto shadow-brutal-sm rounded-t-[6px]">
        {[
          { key: 'janmat', label: '1. JANMAT Proposals & Voting', icon: Vote, desc: 'Citizen Voice & Priorities' },
          { key: 'simulator', label: '2. Civic Budget Simulator', icon: Sliders, desc: 'Knapsack Scenarios' },
          { key: 'contractors', label: '3. Contractor Intelligence', icon: HardHat, desc: 'Empirical Track & Tenders' },
          { key: 'materials', label: '4. Material & Cost Intelligence', icon: Layers, desc: 'IRC / MoRTH Standards' },
          { key: 'verification', label: '5. Citizen Verification', icon: Eye, desc: 'Before/After & Discrepancies' },
          { key: 'optimizer', label: '6. Civic Value Optimizer', icon: Sparkles, desc: '13-Point Decision Brief' }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 min-w-[180px] py-3 px-4 text-left border-r-2 border-rt-ink transition-colors flex items-center space-x-2.5 ${
                isActive
                  ? 'bg-rt-primary font-black border-b-0 shadow-[inset_0_-3px_0_#171717]'
                  : 'bg-white hover:bg-neutral-50 text-rt-secondary-text'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-rt-ink' : 'text-neutral-500'}`} />
              <div>
                <div className="text-xs font-headline font-black leading-tight text-rt-ink">
                  {tab.label}
                </div>
                <div className="text-[10px] font-mono text-rt-secondary-text">
                  {tab.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* TAB 1: JANMAT PROPOSALS & PARTICIPATORY BUDGETING */}
      {activeTab === 'janmat' && (
        <div className="space-y-6">
          {/* Action & Filter Bar */}
          <div className="p-4 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Category:
              </span>
              {[
                'ALL',
                'School access',
                'Hospital and ambulance',
                'Flood-prone',
                'Road rehabilitation',
                'Repeatedly reopened'
              ].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`text-xs px-2.5 py-1 rounded-[3px] border border-rt-ink font-mono font-bold transition-all ${
                    categoryFilter === cat
                      ? 'bg-rt-ink text-white shadow-[1.5px_1.5px_0px_#171717]'
                      : 'bg-rt-canvas text-rt-ink hover:bg-neutral-200'
                  }`}
                >
                  {cat === 'ALL' ? 'All Proposals' : cat}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Search road, problem, or school..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 text-xs border-2 border-rt-ink rounded-[4px] font-mono w-60 focus:outline-none focus:ring-1 focus:ring-rt-primary"
              />
              <button
                onClick={() => setShowSuggestModal(true)}
                className="px-3 py-1.5 bg-rt-mint hover:bg-teal-300 text-rt-ink border-2 border-rt-ink rounded-[4px] font-headline font-black text-xs shadow-[2px_2px_0px_#171717] flex items-center space-x-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Suggest Need</span>
              </button>
            </div>
          </div>

          {/* Proposals List Grid */}
          {loading ? (
            <div className="p-12 text-center bg-white border-3 border-rt-ink rounded-[6px] font-mono text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rt-primary" />
              Loading evidence-backed proposals for Ward {wardCode}...
            </div>
          ) : filteredProposals.length === 0 ? (
            <div className="p-12 text-center bg-white border-3 border-rt-ink rounded-[6px] font-mono text-sm text-rt-secondary-text">
              No proposals match the selected filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredProposals.map(proposal => {
                const isSelected = selectedProposal?.proposal_id === proposal.proposal_id;
                const factors = proposal.score_factors;
                const isDLP = Boolean(proposal.under_dlp);

                return (
                  <div
                    key={proposal.proposal_id}
                    onClick={() => {
                      setSelectedProposal(proposal);
                      setSelectedRoadId(proposal.related_road_id);
                    }}
                    className={`p-5 bg-white border-3 border-rt-ink rounded-[6px] cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'shadow-brutal-lg ring-2 ring-rt-primary border-rt-ink'
                        : 'shadow-brutal hover:translate-x-[-2px] hover:translate-y-[-2px]'
                    }`}
                  >
                    <div>
                      {/* Card Top Pill Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-[11px] font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black bg-rt-canvas px-2 py-0.5 border border-rt-ink rounded-[3px]">
                            {proposal.proposal_id}
                          </span>
                          <span className="font-bold bg-neutral-100 text-neutral-800 px-2 py-0.5 border border-neutral-300 rounded-[3px]">
                            {proposal.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded font-black border border-rt-ink ${
                            proposal.status === 'Open for Voting' ? 'bg-rt-mint text-rt-ink' :
                            proposal.status === 'Under Review' ? 'bg-yellow-100 text-yellow-900' :
                            proposal.status === 'Approved' ? 'bg-green-100 text-green-900' : 'bg-neutral-200'
                          }`}>
                            {proposal.status}
                          </span>
                          <span className="font-bold bg-rt-primary px-2 py-0.5 border border-rt-ink rounded">
                            Score: {proposal.composite_score}
                          </span>
                        </div>
                      </div>

                      {/* DLP Warning Alert if under guarantee */}
                      {isDLP && (
                        <div className="mb-3 p-2 bg-rose-50 border-2 border-rt-coral rounded text-xs font-mono text-rose-900 flex items-start space-x-2">
                          <ShieldAlert className="w-4 h-4 text-rt-coral flex-shrink-0 mt-0.5" />
                          <div>
                            <strong>DEFECT LIABILITY ACTIVE:</strong> Road under active warranty. Contractor{' '}
                            <strong>{proposal.dlp_contractor_id || 'on record'}</strong> is obligated to rectify at zero municipal cost!
                          </div>
                        </div>
                      )}

                      {/* Title & Road Link */}
                      <h3 className="font-headline font-black text-lg text-rt-ink leading-snug">
                        {proposal.title}
                      </h3>
                      <div className="text-xs font-mono text-rt-secondary-text mt-1 flex items-center space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-rt-coral" />
                        <span>{proposal.related_road_name} ({proposal.related_road_id})</span>
                        <span>•</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenPassport(proposal.related_road_id);
                          }}
                          className="text-rt-ink underline font-bold hover:text-rt-primary"
                        >
                          Passport
                        </button>
                      </div>

                      {/* Problem Statement */}
                      <p className="text-xs font-body text-neutral-700 mt-2 bg-neutral-50 p-2.5 rounded border border-neutral-200">
                        {proposal.problem_statement}
                      </p>

                      {/* 8-Factor Transparent Scores Grid */}
                      <div className="mt-3 pt-3 border-t border-neutral-200">
                        <div className="text-[10px] font-mono font-bold uppercase text-rt-secondary-text mb-1">
                          8-Factor Prioritization Dimensions:
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 text-[10px] font-mono text-center">
                          <div className="bg-neutral-100 p-1 rounded border border-neutral-300">
                            <span className="text-neutral-500 block">Public</span>
                            <span className="font-black">{factors.public_priority}</span>
                          </div>
                          <div className="bg-neutral-100 p-1 rounded border border-neutral-300">
                            <span className="text-neutral-500 block">Urgency</span>
                            <span className="font-black text-rt-coral">{factors.infrastructure_urgency}</span>
                          </div>
                          <div className="bg-neutral-100 p-1 rounded border border-neutral-300">
                            <span className="text-neutral-500 block">Safety</span>
                            <span className="font-black">{factors.safety_impact}</span>
                          </div>
                          <div className="bg-neutral-100 p-1 rounded border border-neutral-300">
                            <span className="text-neutral-500 block">Facility</span>
                            <span className="font-black">{factors.facility_accessibility_impact}</span>
                          </div>
                        </div>
                      </div>

                      {/* Facilities & Complaint Context */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-neutral-600">
                        <span className="bg-white px-1.5 py-0.5 border border-neutral-300 rounded">
                          {proposal.supporting_complaint_ids.length} Citizen Complaints
                        </span>
                        {proposal.nearby_facilities.length > 0 && (
                          <span className="bg-white px-1.5 py-0.5 border border-neutral-300 rounded">
                            {proposal.nearby_facilities.length} Nearby Facilities ({proposal.nearby_facilities[0].name})
                          </span>
                        )}
                        <span className="bg-white px-1.5 py-0.5 border border-neutral-300 rounded">
                          {proposal.estimated_duration_days} Days Execution
                        </span>
                      </div>
                    </div>

                    {/* Card Footer: Financials & Action Buttons */}
                    <div className="mt-4 pt-3 border-t-2 border-rt-ink flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-rt-secondary-text block">Indicative Cost</span>
                        <span className="font-mono font-black text-base text-rt-ink">
                          ₹{proposal.indicative_cost_inr.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Vote Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVote(proposal.proposal_id);
                          }}
                          className="px-3 py-1.5 bg-rt-mint hover:bg-teal-300 text-rt-ink border-2 border-rt-ink rounded-[4px] font-headline font-black text-xs shadow-[1.5px_1.5px_0px_#171717] flex items-center space-x-1"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>Vote</span>
                          <span className="bg-white px-1 rounded ml-1 text-[10px] font-mono">
                            {proposal.votes_up || 0}
                          </span>
                        </button>

                        {/* Comments Drawer Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProposal(proposal);
                            setShowCommentsDrawer(true);
                          }}
                          className="px-2.5 py-1.5 bg-white hover:bg-neutral-100 text-rt-ink border-2 border-rt-ink rounded-[4px] font-headline font-black text-xs shadow-[1.5px_1.5px_0px_#171717] flex items-center space-x-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{proposal.comments_count || 0}</span>
                        </button>

                        {/* Officer Lifecycle Review */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProposal(proposal);
                            setShowLifecycleModal(true);
                          }}
                          className="px-2.5 py-1.5 bg-rt-canvas hover:bg-neutral-200 text-rt-ink border-2 border-rt-ink rounded-[4px] font-mono text-xs font-bold"
                          title="Officer Decision Review"
                        >
                          Review
                        </button>

                        {/* Quick Jump to Optimizer Brief */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProposal(proposal);
                            setActiveTab('optimizer');
                          }}
                          className="px-2.5 py-1.5 bg-rt-primary hover:bg-yellow-300 text-rt-ink border-2 border-rt-ink rounded-[4px] font-headline font-black text-xs shadow-[1.5px_1.5px_0px_#171717]"
                          title="View 13-Point Unified Decision Brief"
                        >
                          Brief →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CIVIC BUDGET SIMULATOR */}
      {activeTab === 'simulator' && simData && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-rt-ink pb-4">
              <div>
                <h2 className="text-xl font-headline font-black text-rt-ink">
                  Ward {wardCode} Interactive Capital Expenditure Simulator
                </h2>
                <p className="text-xs font-mono text-rt-secondary-text">
                  Test trade-offs before allocating public rupees. Bounded deterministic Knapsack model maximizes public welfare subject to budget limits.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleTriggerOptimizer}
                  className="px-4 py-2 bg-rt-primary hover:bg-yellow-300 text-rt-ink border-2 border-rt-ink rounded-[4px] font-headline font-black text-xs shadow-[2px_2px_0px_#171717] flex items-center space-x-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Run Bounded Optimizer</span>
                </button>
              </div>
            </div>

            {/* Sliders: Budget & Contingency */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="font-bold">Total Ward Budget Constraint:</span>
                  <span className="font-black text-sm">₹{simBudget.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={500000}
                  max={5000000}
                  step={100000}
                  value={simBudget}
                  onChange={(e) => {
                    const b = Number(e.target.value);
                    setSimBudget(b);
                    loadSimulator(wardCode, b, contingencyPct);
                  }}
                  className="w-full accent-rt-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-rt-secondary-text">
                  <span>₹5.0 Lakh (Austere)</span>
                  <span>Official Remaining: ₹{simData.remaining_official_ward_budget_inr.toLocaleString()}</span>
                  <span>₹50.0 Lakh (Expansion)</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="font-bold">Emergency Contingency Reserve:</span>
                  <span className="font-black text-sm">{contingencyPct}% (₹{Math.round(simBudget * (contingencyPct / 100)).toLocaleString()})</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={20}
                  step={1}
                  value={contingencyPct}
                  onChange={(e) => {
                    const c = Number(e.target.value);
                    setContingencyPct(c);
                    loadSimulator(wardCode, simBudget, c);
                  }}
                  className="w-full accent-rt-coral cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-rt-secondary-text">
                  <span>0% (Aggressive)</span>
                  <span>5% (Standard BMC reserve)</span>
                  <span>20% (Flood Risk Protection)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Scenario Selector & Comparison Matrix */}
          <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-headline font-black text-rt-ink">
                  Side-by-Side Scenario Trade-off Comparison
                </h3>
                <p className="text-xs font-mono text-rt-secondary-text">
                  Compare two distinct spending philosophies to evaluate public benefit vs unallocated funds.
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold">Scenario A:</span>
                  <select
                    value={activeScenarioKey}
                    onChange={(e) => setActiveScenarioKey(e.target.value)}
                    className="px-2.5 py-1 text-xs border-2 border-rt-ink rounded font-mono font-bold bg-white"
                  >
                    {Object.keys(simData.scenarios).map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold">Scenario B:</span>
                  <select
                    value={compareScenarioKey}
                    onChange={(e) => setCompareScenarioKey(e.target.value)}
                    className="px-2.5 py-1 text-xs border-2 border-rt-ink rounded font-mono font-bold bg-white"
                  >
                    {Object.keys(simData.scenarios).map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Comparison Table */}
            {simData.scenarios[activeScenarioKey] && simData.scenarios[compareScenarioKey] && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-mono text-xs">
                  <thead>
                    <tr className="border-b-2 border-rt-ink bg-rt-canvas text-rt-ink">
                      <th className="p-3">Decision Metric</th>
                      <th className="p-3 bg-rt-primary/30 font-headline font-black text-sm">
                        {activeScenarioKey} (A)
                      </th>
                      <th className="p-3 bg-rt-mint/30 font-headline font-black text-sm">
                        {compareScenarioKey} (B)
                      </th>
                      <th className="p-3">Variance / Trade-off</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    <tr>
                      <td className="p-3 font-bold">Total Budget Allocated</td>
                      <td className="p-3 font-black">
                        ₹{simData.scenarios[activeScenarioKey].total_allocated_inr.toLocaleString()}
                      </td>
                      <td className="p-3 font-black">
                        ₹{simData.scenarios[compareScenarioKey].total_allocated_inr.toLocaleString()}
                      </td>
                      <td className="p-3 text-neutral-600">
                        ₹{(simData.scenarios[activeScenarioKey].total_allocated_inr - simData.scenarios[compareScenarioKey].total_allocated_inr).toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold">Budget Utilization %</td>
                      <td className="p-3 font-bold">
                        {simData.scenarios[activeScenarioKey].budget_utilization_pct}%
                      </td>
                      <td className="p-3 font-bold">
                        {simData.scenarios[compareScenarioKey].budget_utilization_pct}%
                      </td>
                      <td className="p-3">
                        {(simData.scenarios[activeScenarioKey].budget_utilization_pct - simData.scenarios[compareScenarioKey].budget_utilization_pct).toFixed(1)}%
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold">Projects Funded</td>
                      <td className="p-3 font-bold text-rt-ink">
                        {simData.scenarios[activeScenarioKey].selected_projects_count} projects
                      </td>
                      <td className="p-3 font-bold text-rt-ink">
                        {simData.scenarios[compareScenarioKey].selected_projects_count} projects
                      </td>
                      <td className="p-3">
                        {simData.scenarios[activeScenarioKey].selected_projects_count - simData.scenarios[compareScenarioKey].selected_projects_count} projects
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold">Hospitals & Schools Benefited</td>
                      <td className="p-3 font-bold">
                        {simData.scenarios[activeScenarioKey].impact_metrics.hospitals_accessible_benefited} Hosp / {simData.scenarios[activeScenarioKey].impact_metrics.schools_accessible_benefited} Sch
                      </td>
                      <td className="p-3 font-bold">
                        {simData.scenarios[compareScenarioKey].impact_metrics.hospitals_accessible_benefited} Hosp / {simData.scenarios[compareScenarioKey].impact_metrics.schools_accessible_benefited} Sch
                      </td>
                      <td className="p-3">
                        Facility access priority delta
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold">Safety Impact Score (0-100)</td>
                      <td className="p-3 font-bold text-rt-coral">
                        {simData.scenarios[activeScenarioKey].impact_metrics.safety_outcomes_score}
                      </td>
                      <td className="p-3 font-bold text-rt-coral">
                        {simData.scenarios[compareScenarioKey].impact_metrics.safety_outcomes_score}
                      </td>
                      <td className="p-3">
                        {(simData.scenarios[activeScenarioKey].impact_metrics.safety_outcomes_score - simData.scenarios[compareScenarioKey].impact_metrics.safety_outcomes_score).toFixed(1)} pts
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold">Flood Resilience Score (0-100)</td>
                      <td className="p-3 font-bold text-blue-700">
                        {simData.scenarios[activeScenarioKey].impact_metrics.flood_resilience_score}
                      </td>
                      <td className="p-3 font-bold text-blue-700">
                        {simData.scenarios[compareScenarioKey].impact_metrics.flood_resilience_score}
                      </td>
                      <td className="p-3">
                        {(simData.scenarios[activeScenarioKey].impact_metrics.flood_resilience_score - simData.scenarios[compareScenarioKey].impact_metrics.flood_resilience_score).toFixed(1)} pts
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold">DLP Defect Liability Avoidance</td>
                      <td className="p-3 font-black text-emerald-700">
                        ₹{simData.scenarios[activeScenarioKey].impact_metrics.dlp_avoidance_savings_inr.toLocaleString()} saved
                      </td>
                      <td className="p-3 font-black text-emerald-700">
                        ₹{simData.scenarios[compareScenarioKey].impact_metrics.dlp_avoidance_savings_inr.toLocaleString()} saved
                      </td>
                      <td className="p-3">
                        Zero-cost contractor enforcement
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold">Est. 5-Yr Annual Maintenance Burden</td>
                      <td className="p-3 text-neutral-700">
                        ₹{simData.scenarios[activeScenarioKey].impact_metrics.est_annual_maintenance_burden_inr.toLocaleString()} / yr
                      </td>
                      <td className="p-3 text-neutral-700">
                        ₹{simData.scenarios[compareScenarioKey].impact_metrics.est_annual_maintenance_burden_inr.toLocaleString()} / yr
                      </td>
                      <td className="p-3">
                        Ongoing O&M liability
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Selected vs Unselected Projects for Active Scenario */}
          {simData.scenarios[activeScenarioKey] && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Funded Projects */}
              <div className="p-5 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal space-y-3">
                <div className="flex items-center justify-between border-b-2 border-rt-ink pb-2">
                  <h4 className="font-headline font-black text-sm text-rt-ink flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Projects Recommended for Funding ({simData.scenarios[activeScenarioKey].selected_projects_count})</span>
                  </h4>
                  <span className="font-mono text-xs font-bold bg-rt-mint px-2 py-0.5 rounded border border-rt-ink">
                    ₹{simData.scenarios[activeScenarioKey].total_allocated_inr.toLocaleString()}
                  </span>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {simData.scenarios[activeScenarioKey].selected_proposals.map(p => (
                    <div key={p.proposal_id} className="p-2.5 bg-neutral-50 border border-rt-ink rounded text-xs font-mono flex justify-between items-center">
                      <div>
                        <div className="font-bold text-rt-ink">{p.title}</div>
                        <div className="text-[10px] text-rt-secondary-text">{p.related_road_name} ({p.proposal_id})</div>
                      </div>
                      <span className="font-black text-rt-ink whitespace-nowrap ml-2">
                        ₹{p.indicative_cost_inr.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Unfunded Projects & Explanations */}
              <div className="p-5 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal space-y-3">
                <div className="flex items-center justify-between border-b-2 border-rt-ink pb-2">
                  <h4 className="font-headline font-black text-sm text-rt-ink flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rt-coral" />
                    <span>Projects Deferred / Not Selected ({simData.scenarios[activeScenarioKey].unselected_projects_count})</span>
                  </h4>
                  <span className="font-mono text-xs text-rt-secondary-text">
                    Defers DLP defects to contractor
                  </span>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {simData.scenarios[activeScenarioKey].unselected_proposals.map(p => (
                    <div key={p.proposal_id} className="p-2.5 bg-neutral-50 border border-neutral-300 rounded text-xs font-mono">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-neutral-800">{p.title}</span>
                        <span className="font-mono text-neutral-600 whitespace-nowrap ml-2">
                          ₹{p.cost_inr.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-[10px] text-rt-coral font-bold mt-1">
                        Reason: {p.reason_not_selected}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CONTRACTOR INTELLIGENCE & TENDER ADVISOR */}
      {activeTab === 'contractors' && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold bg-rt-canvas text-rt-ink px-2 py-0.5 border border-rt-ink rounded">
                CATEGORY PERFORMANCE INTELLIGENCE
              </span>
              <h2 className="text-xl font-headline font-black text-rt-ink mt-1">
                Who Should Execute the Next Project?
              </h2>
              <p className="text-xs font-mono text-rt-secondary-text">
                Evaluating 8 empanelled BMC contractors specifically for proposal:{' '}
                <strong>{selectedProposal?.title || 'Selected Project'}</strong> ({contractorComparison?.target_engineering_category || 'Category'})
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono text-rt-secondary-text block">Selected Proposal</span>
              <select
                value={selectedProposal?.proposal_id}
                onChange={(e) => {
                  const p = proposals.find(item => item.proposal_id === e.target.value);
                  if (p) setSelectedProposal(p);
                }}
                className="px-3 py-1.5 bg-white border-2 border-rt-ink rounded text-xs font-mono font-bold"
              >
                {proposals.map(p => (
                  <option key={p.proposal_id} value={p.proposal_id}>
                    {p.proposal_id}: {p.title.slice(0, 40)}...
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contractor Comparison Table */}
          {contractorComparison && (
            <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-headline font-black text-base text-rt-ink">
                  Comparative Suitability Matrix for {contractorComparison.target_engineering_category}
                </h3>
                <span className="text-xs font-mono bg-yellow-100 text-yellow-900 px-2 py-0.5 border border-yellow-400 rounded">
                  Balances Quality & Durability Over Mere Lowest Price
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-mono text-xs">
                  <thead>
                    <tr className="border-b-2 border-rt-ink bg-rt-canvas text-rt-ink">
                      <th className="p-3">Contractor</th>
                      <th className="p-3">Category Jobs</th>
                      <th className="p-3">Avg Cost vs Baseline</th>
                      <th className="p-3">SLA Compliance</th>
                      <th className="p-3">30-Day Reopen %</th>
                      <th className="p-3">Suitability Score</th>
                      <th className="p-3">Automated Verdict</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {contractorComparison.comparisons.map((c, idx) => (
                      <tr key={c.contractor_id} className={idx === 0 ? 'bg-rt-primary/15 font-bold' : ''}>
                        <td className="p-3">
                          <div className="font-black text-rt-ink">{c.contractor_name}</div>
                          <div className="text-[10px] text-rt-secondary-text">
                            ID: {c.contractor_id} • Empanelled: {c.empanelled_since}
                          </div>
                        </td>
                        <td className="p-3">
                          {c.category_jobs_done} completed
                          {!c.has_sufficient_data && (
                            <span className="block text-[9px] text-amber-700">Low Sample</span>
                          )}
                        </td>
                        <td className="p-3">
                          ₹{c.avg_job_cost_inr.toLocaleString()}
                        </td>
                        <td className="p-3">
                          {c.sla_compliance_pct !== null ? `${c.sla_compliance_pct}%` : 'N/A'}
                        </td>
                        <td className="p-3">
                          <span className={c.reopen_frequency_pct && c.reopen_frequency_pct > 15 ? 'text-rt-coral font-bold' : 'text-emerald-700 font-bold'}>
                            {c.reopen_frequency_pct !== null ? `${c.reopen_frequency_pct}%` : 'N/A'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-rt-ink text-white rounded font-black">
                            {c.overall_suitability_score}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                            c.overall_suitability_score >= 75
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : c.overall_suitability_score >= 55
                              ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                              : 'bg-rose-100 text-rose-800 border-rose-300'
                          }`}>
                            {c.suitability_verdict}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tender Recommendation Workspace */}
          {tenderEvaluation && (
            <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 border-rt-ink pb-3 gap-2">
                <div>
                  <h3 className="font-headline font-black text-lg text-rt-ink flex items-center gap-2">
                    <FileText className="w-5 h-5 text-rt-primary" />
                    <span>Tender Evaluation Workspace ({tenderEvaluation.tender_id})</span>
                  </h3>
                  <p className="text-xs font-mono text-rt-secondary-text">
                    Transparent bid comparison based on pre-declared technical, quality, and DLP warranty criteria.
                  </p>
                </div>

                <span className="text-xs font-mono bg-rt-coral/20 text-rt-coral px-2.5 py-1 border border-rt-coral rounded font-bold">
                  Illustrative Decision Support — Not an Official Award
                </span>
              </div>

              {/* Evaluated Bids Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-mono text-xs">
                  <thead>
                    <tr className="border-b-2 border-rt-ink bg-rt-canvas text-rt-ink">
                      <th className="p-2.5">Rank</th>
                      <th className="p-2.5">Bidder</th>
                      <th className="p-2.5">Quoted Amount</th>
                      <th className="p-2.5">Variance</th>
                      <th className="p-2.5">Delivery Timeline</th>
                      <th className="p-2.5">Warranty</th>
                      <th className="p-2.5">Evaluation Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {tenderEvaluation.evaluated_bids.map(b => (
                      <tr key={b.bidder_id} className={b.rank === 'L1' ? 'bg-rt-mint/20 font-bold' : ''}>
                        <td className="p-2.5 font-black text-sm">
                          {b.rank || 'DQ'}
                        </td>
                        <td className="p-2.5">
                          <div className="font-bold text-rt-ink">{b.contractor_name}</div>
                          <div className="text-[10px] text-rt-secondary-text">ID: {b.bidder_id}</div>
                        </td>
                        <td className="p-2.5 font-black">
                          ₹{b.quoted_amount_inr.toLocaleString()}
                        </td>
                        <td className="p-2.5">
                          <span className={b.variance_from_estimate_pct > 0 ? 'text-amber-800' : 'text-emerald-700 font-bold'}>
                            {b.variance_from_estimate_pct > 0 ? `+${b.variance_from_estimate_pct}%` : `${b.variance_from_estimate_pct}%`}
                          </span>
                        </td>
                        <td className="p-2.5">
                          {b.proposed_duration_days} days
                        </td>
                        <td className="p-2.5">
                          {b.warranty_months} Months DLP
                        </td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 bg-rt-ink text-white rounded font-black">
                            {b.composite_evaluation_score}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MATERIAL & COST INTELLIGENCE */}
      {activeTab === 'materials' && costOptReport && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold bg-rt-mint text-rt-ink px-2 py-0.5 border border-rt-ink rounded">
                INDIAN ROADS CONGRESS (IRC) & MoRTH STANDARDS
              </span>
              <h2 className="text-xl font-headline font-black text-rt-ink mt-1">
                Save Money Without Sacrificing Quality
              </h2>
              <p className="text-xs font-mono text-rt-secondary-text">
                Evaluates alternative pavement mix designs and drainage materials to optimize 5-year lifecycle performance.
              </p>
            </div>

            <button
              onClick={handleTriggerAIResearch}
              disabled={aiResearchLoading}
              className="px-4 py-2 bg-rt-primary hover:bg-yellow-300 text-rt-ink border-2 border-rt-ink rounded-[4px] font-headline font-black text-xs shadow-[2px_2px_0px_#171717] flex items-center space-x-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>{aiResearchLoading ? 'Synthesizing...' : 'Claude AI Material Research'}</span>
            </button>
          </div>

          {/* AI Research Callout if triggered */}
          {aiResearchResult && (
            <div className="p-5 bg-yellow-50 border-3 border-rt-ink rounded-[6px] shadow-brutal text-xs font-mono space-y-2">
              <div className="flex justify-between items-center border-b border-rt-ink/20 pb-2">
                <span className="font-bold uppercase text-rt-ink">
                  AI-Assisted Material Research: {aiResearchResult.source}
                </span>
                <span className="text-[10px] bg-white px-2 py-0.5 border border-rt-ink rounded">
                  {aiResearchResult.ai_provider}
                </span>
              </div>
              <div className="font-black text-sm text-rt-ink">
                Recommended: {aiResearchResult.recommended_material}
              </div>
              <div className="text-neutral-700">
                <strong>Technical Suitability:</strong> {aiResearchResult.technical_suitability}
              </div>
              <div className="text-neutral-700">
                <strong>Durability Considerations:</strong> {aiResearchResult.durability_considerations}
              </div>
              <div className="text-rt-coral font-bold">
                <strong>Human Engineering Sign-off Required:</strong> {aiResearchResult.human_approval_requirement}
              </div>
            </div>
          )}

          {/* Baseline vs Alternatives Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Baseline Option */}
            <div className="p-5 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold bg-neutral-200 text-neutral-800 px-2 py-0.5 rounded border border-neutral-400">
                  STANDARD BASELINE
                </span>
                <h3 className="font-headline font-black text-base text-rt-ink mt-2">
                  {costOptReport.baseline_option.title}
                </h3>
                <div className="text-[11px] font-mono text-rt-secondary-text mt-1">
                  Spec: {costOptReport.baseline_option.standard_reference}
                </div>

                <div className="mt-4 space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-rt-secondary-text">Initial Capex:</span>
                    <span className="font-black">₹{costOptReport.baseline_option.baseline_cost_inr.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rt-secondary-text">Expected Lifespan:</span>
                    <span className="font-bold">{costOptReport.baseline_option.lifespan_years} Years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rt-secondary-text">5-Yr Lifecycle Cost:</span>
                    <span className="font-black">₹{costOptReport.baseline_option.five_year_lifecycle_cost_inr.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-200 text-[10px] font-mono text-neutral-600">
                Conventional method requires frequent monsoon patch cycles.
              </div>
            </div>

            {/* Alternative Options */}
            {costOptReport.alternatives_evaluated.map(alt => (
              <div
                key={alt.alternative_code}
                className="p-5 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono font-bold bg-rt-mint text-rt-ink px-2 py-0.5 rounded border border-rt-ink">
                      ENGINEERING ALTERNATIVE
                    </span>
                    <span className="text-xs font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                      {alt.lifecycle_savings_pct > 0 ? `${alt.lifecycle_savings_pct}% Lifecycle Savings` : 'Fast Deployment'}
                    </span>
                  </div>

                  <h3 className="font-headline font-black text-base text-rt-ink mt-2">
                    {alt.title}
                  </h3>
                  <div className="text-[11px] font-mono text-rt-secondary-text mt-1">
                    Spec: {alt.standard_reference}
                  </div>

                  <div className="mt-4 space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-rt-secondary-text">Initial Capex:</span>
                      <span className="font-black">₹{alt.initial_capex_inr.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-rt-secondary-text">Expected Lifespan:</span>
                      <span className="font-bold text-emerald-800">{alt.lifespan_years} Years</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-rt-secondary-text">Monsoon Flood Rating:</span>
                      <span className="font-bold">{alt.monsoon_flooding_resilience} / 10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-rt-secondary-text">5-Yr Lifecycle Total:</span>
                      <span className="font-black text-emerald-800">₹{alt.five_year_lifecycle_cost_inr.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-200">
                  <div className="text-[10px] font-mono text-neutral-700">
                    <strong>Trade-off:</strong> {alt.technical_trade_off}
                  </div>
                  <div className="text-[10px] font-mono text-rt-secondary-text mt-1">
                    <strong>Best For:</strong> {alt.appropriate_conditions}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: CITIZEN VERIFICATION & DISCREPANCY DETECTION */}
      {activeTab === 'verification' && verificationSummary && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold bg-rt-coral text-white px-2 py-0.5 border border-rt-ink rounded">
                INDEPENDENT COMMUNITY FEEDBACK
              </span>
              <h2 className="text-xl font-headline font-black text-rt-ink mt-1">
                Did the Work Actually Happen?
              </h2>
              <p className="text-xs font-mono text-rt-secondary-text">
                Physical verification for {verificationSummary.road_name} ({verificationSummary.road_id}). Cross-referencing contractor completion claims with citizen ground evidence.
              </p>
            </div>

            <button
              onClick={() => setShowVerifyModal(true)}
              className="px-4 py-2 bg-rt-mint hover:bg-teal-300 text-rt-ink border-2 border-rt-ink rounded-[4px] font-headline font-black text-xs shadow-[2px_2px_0px_#171717] flex items-center space-x-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>Submit Verification Report</span>
            </button>
          </div>

          {/* Active Discrepancy Conflict Alert */}
          {verificationSummary.has_discrepancy_conflict && (
            <div className="p-4 bg-rose-100 border-3 border-rt-coral rounded-[6px] shadow-brutal text-xs font-mono space-y-2">
              <div className="flex items-center space-x-2 text-rose-900 font-headline font-black text-sm">
                <AlertTriangle className="w-5 h-5 text-rt-coral animate-bounce" />
                <span>DISCREPANCY DETECTED: CONFLICTING EVIDENCE ON RECORD</span>
              </div>
              <p className="text-rose-900">
                Contractor submitted completion sign-off, but citizen photographic report indicates road surface remains damaged or prematurely reopened.
                Status automatically set to <strong>Flagged for Joint Site Inspection</strong>.
              </p>
            </div>
          )}

          {/* 7-Stage Verification Progress Timeline */}
          <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal space-y-4">
            <h3 className="font-headline font-black text-sm text-rt-ink">
              7-Stage Infrastructure Verification Lifecycle
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {verificationSummary.verification_stages.map(st => (
                <div
                  key={st.stage_no}
                  className={`p-3 rounded border-2 border-rt-ink text-xs font-mono flex flex-col justify-between ${
                    st.status === 'Available' || st.status === 'Submitted' || st.status === 'Verified'
                      ? 'bg-emerald-50 border-emerald-600'
                      : st.status === 'Action Required' || st.status === 'Flagged for Inspection'
                      ? 'bg-rose-50 border-rt-coral text-rose-900 font-bold'
                      : 'bg-neutral-50 text-neutral-600'
                  }`}
                >
                  <div className="text-[10px] text-rt-secondary-text">Stage {st.stage_no}</div>
                  <div className="font-headline font-black text-xs my-1">{st.name}</div>
                  <div className="text-[10px] font-bold">{st.status}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Before-and-After Verification Comparison Viewer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Before Evidence */}
            <div className="p-5 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal space-y-3">
              <div className="flex justify-between items-center border-b-2 border-rt-ink pb-2">
                <span className="font-headline font-black text-sm text-rt-ink">
                  BEFORE WORK: Original Condition
                </span>
                <span className="text-[10px] font-mono bg-neutral-100 px-2 py-0.5 border border-neutral-300 rounded">
                  {verificationSummary.before_after_comparison.before?.source}
                </span>
              </div>

              <div className="h-52 bg-neutral-100 border-2 border-rt-ink rounded flex items-center justify-center relative overflow-hidden">
                <div className="text-center p-4">
                  <AlertCircle className="w-8 h-8 text-rt-coral mx-auto mb-2" />
                  <div className="font-mono text-xs font-bold text-neutral-800">
                    {verificationSummary.before_after_comparison.before?.description}
                  </div>
                  <div className="text-[10px] font-mono text-rt-secondary-text mt-1">
                    Recorded Date: {verificationSummary.before_after_comparison.before?.date}
                  </div>
                </div>
              </div>
            </div>

            {/* After Evidence / Citizen Ground Observation */}
            <div className="p-5 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal space-y-3">
              <div className="flex justify-between items-center border-b-2 border-rt-ink pb-2">
                <span className="font-headline font-black text-sm text-rt-ink">
                  AFTER WORK: Current Ground Reality
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 border rounded font-bold ${
                  verificationSummary.before_after_comparison.after?.is_conflict
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  {verificationSummary.before_after_comparison.after?.verification_action}
                </span>
              </div>

              <div className="h-52 bg-neutral-100 border-2 border-rt-ink rounded flex items-center justify-center relative overflow-hidden">
                <div className="text-center p-4">
                  {verificationSummary.before_after_comparison.after?.is_conflict ? (
                    <AlertTriangle className="w-8 h-8 text-rt-coral mx-auto mb-2 animate-bounce" />
                  ) : (
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  )}
                  <div className="font-mono text-xs font-bold text-neutral-800">
                    {verificationSummary.before_after_comparison.after?.description}
                  </div>
                  <div className="text-[10px] font-mono text-rt-secondary-text mt-1">
                    Verified By: {verificationSummary.before_after_comparison.after?.source}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: CIVIC VALUE OPTIMIZER (THE UNIFYING REPORT) */}
      {activeTab === 'optimizer' && unifiedBrief && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="p-6 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold bg-rt-primary text-rt-ink px-2 py-0.5 border border-rt-ink rounded">
                UNIFYING CIVIC INTELLIGENCE BRIEF
              </span>
              <h2 className="text-2xl font-headline font-black text-rt-ink mt-1">
                {unifiedBrief.title}
              </h2>
              <p className="text-xs font-mono text-rt-secondary-text">
                Proposal ID: {unifiedBrief.proposal_id} • Ward {unifiedBrief.ward_code} • Asset: {unifiedBrief.road_name} ({unifiedBrief.road_id})
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-rt-canvas hover:bg-neutral-200 text-rt-ink border-2 border-rt-ink rounded-[4px] font-headline font-black text-xs shadow-[2px_2px_0px_#171717] flex items-center space-x-1.5"
            >
              <FileDown className="w-4 h-4" />
              <span>Print / Export Brief</span>
            </button>
          </div>

          {/* 13-Point Structured Answers Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(unifiedBrief.answers_to_13_questions).map(([key, val]) => (
              <div key={key} className="p-5 bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal space-y-2">
                <h4 className="font-headline font-black text-sm text-rt-ink border-b-2 border-rt-ink pb-1">
                  {val.question}
                </h4>
                <div className="text-xs font-mono text-neutral-800 space-y-1 pt-1">
                  {Object.entries(val).map(([k, v]) => {
                    if (k === 'question') return null;
                    return (
                      <div key={k} className="flex justify-between items-start gap-2">
                        <span className="text-rt-secondary-text font-bold capitalize">{k.replace(/_/g, ' ')}:</span>
                        <span className="font-bold text-right text-rt-ink">
                          {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: SUGGEST MISSING INFRASTRUCTURE NEED */}
      {showSuggestModal && (
        <div className="fixed inset-0 bg-rt-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal-lg max-w-lg w-full p-6 space-y-4 font-body">
            <div className="flex justify-between items-center border-b-2 border-rt-ink pb-2">
              <h3 className="font-headline font-black text-lg text-rt-ink flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-rt-mint" />
                <span>Suggest Missing Infrastructure Need</span>
              </h3>
              <button onClick={() => setShowSuggestModal(false)} className="text-rt-secondary-text hover:text-rt-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSuggestProposal} className="space-y-3 text-xs font-mono">
              <div>
                <label className="block font-bold mb-1">Infrastructure Category:</label>
                <select
                  value={newPropCategory}
                  onChange={(e) => setNewPropCategory(e.target.value)}
                  className="w-full p-2 border-2 border-rt-ink rounded font-mono bg-white"
                >
                  <option value="School access road improvement">School access road improvement</option>
                  <option value="Hospital and ambulance access improvement">Hospital and ambulance access</option>
                  <option value="Stormwater drainage improvement">Stormwater drainage improvement</option>
                  <option value="Road rehabilitation">Road rehabilitation</option>
                  <option value="Pedestrian safety improvement">Pedestrian safety improvement</option>
                  <option value="Junction safety improvements">Junction safety improvements</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Proposal Title:</label>
                <input
                  type="text"
                  placeholder="e.g. Mastic Surface & Walkway near St. Xavier High School"
                  value={newPropTitle}
                  onChange={(e) => setNewPropTitle(e.target.value)}
                  className="w-full p-2 border-2 border-rt-ink rounded font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Problem Statement & Justification:</label>
                <textarea
                  rows={3}
                  placeholder="Explain why this repair is urgently needed by residents..."
                  value={newPropProblem}
                  onChange={(e) => setNewPropProblem(e.target.value)}
                  className="w-full p-2 border-2 border-rt-ink rounded font-mono"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowSuggestModal(false)}
                  className="px-3 py-1.5 bg-neutral-200 border-2 border-rt-ink rounded font-headline font-black text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rt-mint hover:bg-teal-300 border-2 border-rt-ink rounded font-headline font-black text-xs shadow-[2px_2px_0px_#171717]"
                >
                  Submit Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER: COMMENTS & COMMUNITY DISCUSSION */}
      {showCommentsDrawer && selectedProposal && (
        <div className="fixed inset-0 bg-rt-ink/50 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white border-l-3 border-rt-ink w-full max-w-md h-full p-6 flex flex-col justify-between font-body shadow-brutal-lg">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b-2 border-rt-ink pb-2">
                <div>
                  <h3 className="font-headline font-black text-base text-rt-ink">
                    Community Discussion
                  </h3>
                  <div className="text-[10px] font-mono text-rt-secondary-text">
                    {selectedProposal.proposal_id}: {selectedProposal.title.slice(0, 35)}...
                  </div>
                </div>
                <button onClick={() => setShowCommentsDrawer(false)}>
                  <X className="w-5 h-5 text-rt-secondary-text hover:text-rt-ink" />
                </button>
              </div>

              {/* Comments Thread */}
              <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-260px)] pr-1">
                {(!selectedProposal.comments || selectedProposal.comments.length === 0) ? (
                  <div className="text-center py-12 text-xs font-mono text-rt-secondary-text">
                    No citizen comments logged yet. Start the conversation!
                  </div>
                ) : (
                  selectedProposal.comments.map(c => (
                    <div key={c.comment_id} className="p-3 bg-neutral-50 border border-neutral-300 rounded text-xs font-mono space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-rt-ink">{c.user_name}</span>
                        <span className="text-[9px] bg-white px-1.5 py-0.2 border rounded">
                          {c.user_role.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-neutral-800">{c.comment_text}</p>
                      <div className="text-[9px] text-neutral-400">{c.created_at}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* New Comment Input */}
            <div className="pt-3 border-t-2 border-rt-ink space-y-2">
              <textarea
                rows={2}
                placeholder="Add citizen perspective or ground observation..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="w-full p-2 text-xs font-mono border-2 border-rt-ink rounded focus:outline-none"
              />
              <button
                onClick={handleAddComment}
                className="w-full py-2 bg-rt-primary hover:bg-yellow-300 border-2 border-rt-ink rounded font-headline font-black text-xs shadow-[2px_2px_0px_#171717]"
              >
                Post Comment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: OFFICER LIFECYCLE REVIEW */}
      {showLifecycleModal && selectedProposal && (
        <div className="fixed inset-0 bg-rt-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal-lg max-w-md w-full p-6 space-y-4 font-body">
            <div className="flex justify-between items-center border-b-2 border-rt-ink pb-2">
              <h3 className="font-headline font-black text-base text-rt-ink">
                Officer Feasibility Decision
              </h3>
              <button onClick={() => setShowLifecycleModal(false)}>
                <X className="w-5 h-5 text-rt-secondary-text hover:text-rt-ink" />
              </button>
            </div>

            <div className="text-xs font-mono space-y-3">
              <div>
                <label className="block font-bold mb-1">New Review Status:</label>
                <select
                  value={newLifecycleStatus}
                  onChange={(e) => setNewLifecycleStatus(e.target.value)}
                  className="w-full p-2 border-2 border-rt-ink rounded font-mono bg-white"
                >
                  <option value="Technical Review">Technical Review</option>
                  <option value="Open for Voting">Open for Voting</option>
                  <option value="Budget Review">Budget Review</option>
                  <option value="Approved">Approved for Tendering</option>
                  <option value="Deferred">Deferred (Exceeds Ward Budget)</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Officer Rationale & Decision Note:</label>
                <textarea
                  rows={3}
                  placeholder="Record formal reasons for approval, deferral, or rejection..."
                  value={lifecycleReason}
                  onChange={(e) => setLifecycleReason(e.target.value)}
                  className="w-full p-2 border-2 border-rt-ink rounded font-mono"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowLifecycleModal(false)}
                  className="px-3 py-1.5 bg-neutral-200 border-2 border-rt-ink rounded font-headline font-black text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLifecycleUpdate}
                  className="px-4 py-1.5 bg-rt-primary hover:bg-yellow-300 border-2 border-rt-ink rounded font-headline font-black text-xs shadow-[2px_2px_0px_#171717]"
                >
                  Record Decision
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CITIZEN VERIFICATION SUBMISSION */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-rt-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal-lg max-w-lg w-full p-6 space-y-4 font-body">
            <div className="flex justify-between items-center border-b-2 border-rt-ink pb-2">
              <h3 className="font-headline font-black text-lg text-rt-ink flex items-center gap-2">
                <Eye className="w-5 h-5 text-rt-coral" />
                <span>Submit Citizen Verification Report</span>
              </h3>
              <button onClick={() => setShowVerifyModal(false)}>
                <X className="w-5 h-5 text-rt-secondary-text hover:text-rt-ink" />
              </button>
            </div>

            <form onSubmit={handleSubmitVerification} className="space-y-3 text-xs font-mono">
              <div>
                <label className="block font-bold mb-1">Verification Action:</label>
                <select
                  value={verifyAction}
                  onChange={(e) => setVerifyAction(e.target.value)}
                  className="w-full p-2 border-2 border-rt-ink rounded font-mono bg-white"
                >
                  <option value="Confirmed Completed">Work appears properly completed</option>
                  <option value="Incomplete">Work is incomplete / abandoned</option>
                  <option value="Poor Workmanship">Poor workmanship / uneven surface</option>
                  <option value="Visible Damage/Reopened">Visible damage / pothole reopened</option>
                  <option value="Wrong Location">Wrong location repaired</option>
                  <option value="Unable to Verify">Unable to verify</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Work Order Reference:</label>
                <input
                  type="text"
                  value={verifyWorkOrderId}
                  onChange={(e) => setVerifyWorkOrderId(e.target.value)}
                  className="w-full p-2 border-2 border-rt-ink rounded font-mono"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Citizen Observation & Ground Details:</label>
                <textarea
                  rows={3}
                  placeholder="Detail visible defects, measurements, or water stagnation..."
                  value={verifyComment}
                  onChange={(e) => setVerifyComment(e.target.value)}
                  className="w-full p-2 border-2 border-rt-ink rounded font-mono"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(false)}
                  className="px-3 py-1.5 bg-neutral-200 border-2 border-rt-ink rounded font-headline font-black text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rt-coral text-white hover:bg-rose-600 border-2 border-rt-ink rounded font-headline font-black text-xs shadow-[2px_2px_0px_#171717]"
                >
                  Submit Ground Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
