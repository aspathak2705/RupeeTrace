import {
  WardSummary, WardDetail, RoadSummary, RoadDetail, WorkOrder,
  Complaint, AuditEvidence, MoneyTrail, RoadFinancialHistory,
  AuditFinding, ContractorScorecard, NextRupeePlan, GraphData, CaseRecord,
  CivicProposal, SimulatorWardResponse, ProposalContractorComparison,
  TenderEvaluationResponse, CostOptimizationReport, RoadVerificationSummary,
  UnifiedInvestmentBrief, UserSession, EntityInvestigationResponse
} from '../types';

// Configurable API base URL with fallback to local proxy path
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

// Session Token Management
let currentAuthToken: string | null = localStorage.getItem('rt_session_token') || 'demo-citizen-token';

export const setAuthToken = (token: string | null) => {
  currentAuthToken = token;
  if (token) {
    localStorage.setItem('rt_session_token', token);
  } else {
    localStorage.removeItem('rt_session_token');
  }
};

export const getAuthToken = () => currentAuthToken;

// Authenticated fetch wrapper injecting Bearer token
const authFetch = async (url: string, init?: RequestInit): Promise<Response> => {
  const headers = new Headers(init?.headers || {});
  if (currentAuthToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${currentAuthToken}`);
  }
  return fetch(url, { ...init, headers });
};

export const api = {
  // Authentication & Demo Profiles
  login: async (payload: { username?: string; password?: string; demo_role?: string }): Promise<{ token: string; user: UserSession; message: string }> => {
    const res = await authFetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Authentication failed' }));
      throw new Error(err.detail || 'Authentication failed');
    }
    const data = await res.json();
    setAuthToken(data.token);
    return data;
  },

  getMe: async (): Promise<{ authenticated: boolean; user: UserSession }> => {
    const res = await authFetch(`${API_BASE}/auth/me`);
    if (!res.ok) throw new Error('Not authenticated');
    return res.json();
  },

  logout: async (): Promise<void> => {
    await authFetch(`${API_BASE}/auth/logout`, { method: 'POST' }).catch(() => {});
    setAuthToken(null);
  },

  getDemoAccounts: async (): Promise<UserSession[]> => {
    const res = await authFetch(`${API_BASE}/auth/demo-accounts`);
    if (!res.ok) throw new Error('Failed to fetch demo accounts');
    return res.json();
  },

  // Health
  getHealth: async () => {
    const res = await authFetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Failed to fetch health');
    return res.json();
  },

  // Wards
  getWards: async (): Promise<WardSummary[]> => {
    const res = await authFetch(`${API_BASE}/wards`);
    if (!res.ok) throw new Error('Failed to fetch wards');
    return res.json();
  },

  getWardDetail: async (wardCode: string): Promise<WardDetail> => {
    const res = await authFetch(`${API_BASE}/wards/${encodeURIComponent(wardCode)}`);
    if (!res.ok) throw new Error(`Failed to fetch ward ${wardCode}`);
    return res.json();
  },

  getWardMoneyTrail: async (wardCode: string): Promise<MoneyTrail> => {
    const res = await authFetch(`${API_BASE}/wards/${encodeURIComponent(wardCode)}/money-trail`);
    if (!res.ok) throw new Error(`Failed to fetch money trail for ${wardCode}`);
    return res.json();
  },

  getWardNextRupee: async (wardCode: string): Promise<NextRupeePlan> => {
    const res = await authFetch(`${API_BASE}/wards/${encodeURIComponent(wardCode)}/next-rupee`);
    if (!res.ok) throw new Error(`Failed to fetch next rupee plan for ${wardCode}`);
    return res.json();
  },

  // Roads
  getRoads: async (): Promise<RoadSummary[]> => {
    const res = await authFetch(`${API_BASE}/roads`);
    if (!res.ok) throw new Error('Failed to fetch roads');
    return res.json();
  },

  getRoadDetail: async (roadId: string): Promise<RoadDetail> => {
    const res = await authFetch(`${API_BASE}/roads/${encodeURIComponent(roadId)}`);
    if (!res.ok) throw new Error(`Failed to fetch road ${roadId}`);
    return res.json();
  },

  getRoadWorkOrders: async (roadId: string): Promise<WorkOrder[]> => {
    const res = await authFetch(`${API_BASE}/roads/${encodeURIComponent(roadId)}/work-orders`);
    if (!res.ok) throw new Error(`Failed to fetch work orders for road ${roadId}`);
    return res.json();
  },

  getRoadComplaints: async (roadId: string): Promise<Complaint[]> => {
    const res = await authFetch(`${API_BASE}/roads/${encodeURIComponent(roadId)}/complaints`);
    if (!res.ok) throw new Error(`Failed to fetch complaints for road ${roadId}`);
    return res.json();
  },

  getRoadFinancialHistory: async (roadId: string): Promise<RoadFinancialHistory> => {
    const res = await authFetch(`${API_BASE}/roads/${encodeURIComponent(roadId)}/financial-history`);
    if (!res.ok) throw new Error(`Failed to fetch financial history for road ${roadId}`);
    return res.json();
  },

  // Work Orders & Evidence
  getWorkOrder: async (woId: string): Promise<WorkOrder> => {
    const res = await authFetch(`${API_BASE}/work-orders/${encodeURIComponent(woId)}`);
    if (!res.ok) throw new Error(`Failed to fetch work order ${woId}`);
    return res.json();
  },

  getWorkOrderEvidence: async (woId: string): Promise<AuditEvidence> => {
    const res = await authFetch(`${API_BASE}/work-orders/${encodeURIComponent(woId)}/evidence`);
    if (!res.ok) throw new Error(`Failed to fetch evidence for ${woId}`);
    return res.json();
  },

  // Audits
  getAuditFindings: async (params?: {
    finding_type?: string;
    ward_code?: string;
    road_id?: string;
    status?: string;
    severity?: string;
    limit?: number;
  }): Promise<AuditFinding[]> => {
    const q = new URLSearchParams();
    if (params?.finding_type) q.append('finding_type', params.finding_type);
    if (params?.ward_code) q.append('ward_code', params.ward_code);
    if (params?.road_id) q.append('road_id', params.road_id);
    if (params?.status) q.append('status', params.status);
    if (params?.severity) q.append('severity', params.severity);
    if (params?.limit) q.append('limit', String(params.limit));

    const res = await authFetch(`${API_BASE}/audits?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch audit findings');
    return res.json();
  },

  getAuditFinding: async (findingId: string): Promise<AuditFinding> => {
    const res = await authFetch(`${API_BASE}/audits/${encodeURIComponent(findingId)}`);
    if (!res.ok) throw new Error(`Failed to fetch finding ${findingId}`);
    return res.json();
  },

  reviewAuditFinding: async (findingId: string, payload: {
    action: string;
    remedial_notes: string;
    recovery_amount_inr?: number;
  }): Promise<any> => {
    const res = await authFetch(`${API_BASE}/audits/${encodeURIComponent(findingId)}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to review finding' }));
      throw new Error(err.detail || 'Failed to review finding');
    }
    return res.json();
  },

  // Contractors
  getContractors: async (): Promise<ContractorScorecard[]> => {
    const res = await authFetch(`${API_BASE}/contractors`);
    if (!res.ok) throw new Error('Failed to fetch contractors');
    return res.json();
  },

  getContractorScorecard: async (contractorId: string): Promise<ContractorScorecard> => {
    const res = await authFetch(`${API_BASE}/contractors/${encodeURIComponent(contractorId)}/scorecard`);
    if (!res.ok) throw new Error(`Failed to fetch scorecard for ${contractorId}`);
    return res.json();
  },

  // Graph
  getGraph: async (params?: {
    road_id?: string;
    work_order_id?: string;
    ward_code?: string;
    max_work_orders?: number;
    include_ml?: boolean;
  }): Promise<GraphData> => {
    const q = new URLSearchParams();
    if (params?.road_id) q.append('road_id', params.road_id);
    if (params?.work_order_id) q.append('work_order_id', params.work_order_id);
    if (params?.ward_code) q.append('ward_code', params.ward_code);
    if (params?.max_work_orders) q.append('max_work_orders', String(params.max_work_orders));
    if (params?.include_ml) q.append('include_ml', 'true');

    const res = await authFetch(`${API_BASE}/graph?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch graph data');
    return res.json();
  },

  investigateEntityGraph: async (params: {
    mode: string;
    entity_id: string;
    expanded_nodes?: string[];
    include_ml?: boolean;
  }): Promise<EntityInvestigationResponse> => {
    const q = new URLSearchParams();
    q.append('mode', params.mode);
    q.append('entity_id', params.entity_id);
    if (params.expanded_nodes && params.expanded_nodes.length > 0) {
      q.append('expanded_nodes', params.expanded_nodes.join(','));
    }
    if (params.include_ml) {
      q.append('include_ml', 'true');
    }

    const res = await authFetch(`${API_BASE}/graph/investigate?${q.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to investigate entity' }));
      throw new Error(err.detail || 'Failed to investigate entity');
    }
    return res.json();
  },

  // ML Intelligence Layer
  getRoadMLSignals: async (roadId: string): Promise<any> => {
    const res = await authFetch(`${API_BASE}/intelligence/roads/${encodeURIComponent(roadId)}/signals`);
    if (!res.ok) throw new Error(`Failed to fetch ML signals for road ${roadId}`);
    return res.json();
  },

  getIncidentClusters: async (params?: {
    ward_code?: string;
    road_id?: string;
    limit?: number;
  }): Promise<any[]> => {
    const q = new URLSearchParams();
    if (params?.ward_code) q.append('ward_code', params.ward_code);
    if (params?.road_id) q.append('road_id', params.road_id);
    if (params?.limit) q.append('limit', String(params.limit));

    const res = await authFetch(`${API_BASE}/intelligence/issues/clusters?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch incident clusters');
    return res.json();
  },

  getRepairAnomalies: async (params?: {
    ward_code?: string;
    road_id?: string;
    classification?: string;
    limit?: number;
  }): Promise<any[]> => {
    const q = new URLSearchParams();
    if (params?.ward_code) q.append('ward_code', params.ward_code);
    if (params?.road_id) q.append('road_id', params.road_id);
    if (params?.classification) q.append('classification', params.classification);
    if (params?.limit) q.append('limit', String(params.limit));

    const res = await authFetch(`${API_BASE}/intelligence/anomalies?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch repair anomalies');
    return res.json();
  },

  getWorkOrderAnomaly: async (woId: string): Promise<any> => {
    const res = await authFetch(`${API_BASE}/intelligence/anomalies/${encodeURIComponent(woId)}`);
    if (!res.ok) throw new Error(`Failed to fetch anomaly diagnostic for ${woId}`);
    return res.json();
  },

  getSocialSignals: async (params?: {
    ward_code?: string;
    only_actionable?: boolean;
    limit?: number;
  }): Promise<any[]> => {
    const q = new URLSearchParams();
    if (params?.ward_code) q.append('ward_code', params.ward_code);
    if (params?.only_actionable !== undefined) q.append('only_actionable', String(params.only_actionable));
    if (params?.limit) q.append('limit', String(params.limit));

    const res = await authFetch(`${API_BASE}/intelligence/social-signals?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch social signals');
    return res.json();
  },

  // Cases
  getCases: async (params?: { road_id?: string; status?: string }): Promise<CaseRecord[]> => {
    const q = new URLSearchParams();
    if (params?.road_id) q.append('road_id', params.road_id);
    if (params?.status) q.append('status', params.status);

    const res = await authFetch(`${API_BASE}/cases?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch cases');
    return res.json();
  },

  createCase: async (payload: {
    road_id: string;
    citizen_observation: string;
    work_order_id?: string;
    evidence_references?: string[];
  }): Promise<CaseRecord> => {
    const res = await authFetch(`${API_BASE}/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to submit observation case');
    return res.json();
  },

  respondCase: async (
    caseId: string,
    payload: { officer_name: string; officer_response: string; new_status: string }
  ): Promise<CaseRecord> => {
    const res = await authFetch(`${API_BASE}/cases/${encodeURIComponent(caseId)}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to submit officer response');
    return res.json();
  },

  // AI Assistant
  askAssistant: async (
    question: string,
    default_ward?: string
  ): Promise<{
    answer: string;
    language: string;
    retrieved_context: any;
    cited_records: Array<{ file: string; id: string }>;
    missing_evidence: string[];
    recommended_action: string;
  }> => {
    const res = await authFetch(`${API_BASE}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, default_ward: default_ward || 'K/E' })
    });
    if (!res.ok) throw new Error('Failed to query RupeeTrace assistant');
    return res.json();
  },

  // ==========================================
  // NEXT RUPEE PLANNER 2.0 CIVIC INTELLIGENCE
  // ==========================================

  // JANMAT Proposals & Participatory Budgeting
  getProposals: async (params?: {
    ward_code?: string;
    category?: string;
    status?: string;
    search?: string;
  }): Promise<CivicProposal[]> => {
    const q = new URLSearchParams();
    if (params?.ward_code) q.append('ward_code', params.ward_code);
    if (params?.category) q.append('category', params.category);
    if (params?.status) q.append('status', params.status);
    if (params?.search) q.append('search', params.search);

    const res = await authFetch(`${API_BASE}/civic/proposals?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch proposals');
    return res.json();
  },

  getProposalDetail: async (proposalId: string): Promise<CivicProposal> => {
    const res = await authFetch(`${API_BASE}/civic/proposals/${encodeURIComponent(proposalId)}`);
    if (!res.ok) throw new Error(`Failed to fetch proposal ${proposalId}`);
    return res.json();
  },

  createCitizenProposal: async (payload: {
    ward_code: string;
    road_id: string;
    category: string;
    title: string;
    problem_statement: string;
    citizen_id: string;
    citizen_name: string;
  }): Promise<CivicProposal> => {
    const res = await authFetch(`${API_BASE}/civic/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to submit citizen proposal');
    return res.json();
  },

  castVote: async (proposalId: string, userId: string, voteType: string = 'upvote'): Promise<any> => {
    const res = await authFetch(`${API_BASE}/civic/proposals/${encodeURIComponent(proposalId)}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, vote_type: voteType })
    });
    if (!res.ok) throw new Error('Failed to cast vote');
    return res.json();
  },

  withdrawVote: async (proposalId: string, userId: string): Promise<any> => {
    const res = await authFetch(`${API_BASE}/civic/proposals/${encodeURIComponent(proposalId)}/vote?user_id=${encodeURIComponent(userId)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to withdraw vote');
    return res.json();
  },

  addProposalComment: async (proposalId: string, payload: {
    user_id: string;
    user_name: string;
    comment_text: string;
    user_role?: string;
  }): Promise<any> => {
    const res = await authFetch(`${API_BASE}/civic/proposals/${encodeURIComponent(proposalId)}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to add comment');
    return res.json();
  },

  updateProposalLifecycle: async (proposalId: string, payload: {
    new_status: string;
    actor: string;
    reason: string;
    supporting_evidence?: string;
  }): Promise<any> => {
    const res = await authFetch(`${API_BASE}/civic/proposals/${encodeURIComponent(proposalId)}/lifecycle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update proposal lifecycle');
    return res.json();
  },

  // Civic Budget Simulator
  getSimulatorScenarios: async (wardCode: string, params?: {
    custom_budget?: number;
    contingency_pct?: number;
    max_projects?: number;
  }): Promise<SimulatorWardResponse> => {
    const q = new URLSearchParams();
    if (params?.custom_budget) q.append('custom_budget', String(params.custom_budget));
    if (params?.contingency_pct) q.append('contingency_pct', String(params.contingency_pct));
    if (params?.max_projects) q.append('max_projects', String(params.max_projects));

    const res = await authFetch(`${API_BASE}/civic/simulator/${encodeURIComponent(wardCode)}?${q.toString()}`);
    if (!res.ok) throw new Error(`Failed to simulate scenarios for ward ${wardCode}`);
    return res.json();
  },

  optimizeBudget: async (wardCode: string, payload: {
    total_budget: number;
    contingency_pct?: number;
    mandatory_proposal_ids?: string[];
    disallowed_categories?: string[];
    weights?: Record<string, number>;
  }): Promise<any> => {
    const res = await authFetch(`${API_BASE}/civic/simulator/${encodeURIComponent(wardCode)}/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to run budget optimizer');
    return res.json();
  },

  saveCustomScenario: async (wardCode: string, payload: {
    scenario_name: string;
    description: string;
    total_budget: number;
    selected_proposal_ids: string[];
    created_by?: string;
  }): Promise<any> => {
    const res = await authFetch(`${API_BASE}/civic/simulator/${encodeURIComponent(wardCode)}/scenarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to save custom scenario');
    return res.json();
  },

  // Contractor Intelligence & Tenders
  compareContractorsForProposal: async (proposalId: string): Promise<ProposalContractorComparison> => {
    const res = await authFetch(`${API_BASE}/civic/contractors/compare/${encodeURIComponent(proposalId)}`);
    if (!res.ok) throw new Error(`Failed to compare contractors for ${proposalId}`);
    return res.json();
  },

  evaluateTenderBids: async (proposalId: string, customBids?: any[]): Promise<TenderEvaluationResponse> => {
    const res = await authFetch(`${API_BASE}/civic/tenders/${encodeURIComponent(proposalId)}/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ custom_bids: customBids || null })
    });
    if (!res.ok) throw new Error(`Failed to evaluate tender bids for ${proposalId}`);
    return res.json();
  },

  // Material & Cost Intelligence
  getMaterialAlternatives: async (category: string): Promise<any> => {
    const res = await authFetch(`${API_BASE}/civic/materials/alternatives?category=${encodeURIComponent(category)}`);
    if (!res.ok) throw new Error('Failed to fetch material alternatives');
    return res.json();
  },

  getCostOptimizationReport: async (payload: {
    base_cost: number;
    category: string;
    road_surface?: string;
    traffic_level?: string;
  }): Promise<CostOptimizationReport> => {
    const res = await authFetch(`${API_BASE}/civic/materials/optimization-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to generate cost optimization report');
    return res.json();
  },

  queryAIMaterialResearch: async (payload: {
    project_type: string;
    surface: string;
    ward_context: string;
  }): Promise<any> => {
    const res = await authFetch(`${API_BASE}/civic/materials/ai-research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to query AI material research');
    return res.json();
  },

  // Citizen Verification
  getRoadVerificationSummary: async (roadId: string): Promise<RoadVerificationSummary> => {
    const res = await authFetch(`${API_BASE}/civic/verification/${encodeURIComponent(roadId)}`);
    if (!res.ok) throw new Error(`Failed to fetch verification for road ${roadId}`);
    return res.json();
  },

  submitCitizenVerification: async (payload: {
    road_id: string;
    work_order_id?: string;
    proposal_id?: string;
    verification_action: string;
    observation_text: string;
    submitter_id: string;
    image_url?: string;
    gps_lat?: number;
    gps_lon?: number;
  }): Promise<any> => {
    const res = await authFetch(`${API_BASE}/civic/verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to submit citizen verification');
    return res.json();
  },

  uploadVerificationPhoto: async (file: File): Promise<{ file_url: string; filename: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await authFetch(`${API_BASE}/civic/verification/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Failed to upload evidence file');
    return res.json();
  },

  // Civic Value Optimizer
  getUnifiedDecisionBrief: async (proposalId: string): Promise<UnifiedInvestmentBrief> => {
    const res = await authFetch(`${API_BASE}/civic/optimizer/${encodeURIComponent(proposalId)}/report`);
    if (!res.ok) throw new Error(`Failed to fetch decision brief for ${proposalId}`);
    return res.json();
  }
};
