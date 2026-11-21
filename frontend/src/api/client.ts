import {
  WardSummary, WardDetail, RoadSummary, RoadDetail, WorkOrder,
  Complaint, AuditEvidence, MoneyTrail, RoadFinancialHistory,
  AuditFinding, ContractorScorecard, NextRupeePlan, GraphData, CaseRecord
} from '../types';

const API_BASE = '/api';

export const api = {
  // Health
  getHealth: async () => {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Failed to fetch health');
    return res.json();
  },

  // Wards
  getWards: async (): Promise<WardSummary[]> => {
    const res = await fetch(`${API_BASE}/wards`);
    if (!res.ok) throw new Error('Failed to fetch wards');
    return res.json();
  },

  getWardDetail: async (wardCode: string): Promise<WardDetail> => {
    const res = await fetch(`${API_BASE}/wards/${encodeURIComponent(wardCode)}`);
    if (!res.ok) throw new Error(`Failed to fetch ward ${wardCode}`);
    return res.json();
  },

  getWardMoneyTrail: async (wardCode: string): Promise<MoneyTrail> => {
    const res = await fetch(`${API_BASE}/wards/${encodeURIComponent(wardCode)}/money-trail`);
    if (!res.ok) throw new Error(`Failed to fetch money trail for ${wardCode}`);
    return res.json();
  },

  getWardNextRupee: async (wardCode: string): Promise<NextRupeePlan> => {
    const res = await fetch(`${API_BASE}/wards/${encodeURIComponent(wardCode)}/next-rupee`);
    if (!res.ok) throw new Error(`Failed to fetch next rupee plan for ${wardCode}`);
    return res.json();
  },

  // Roads
  getRoads: async (): Promise<RoadSummary[]> => {
    const res = await fetch(`${API_BASE}/roads`);
    if (!res.ok) throw new Error('Failed to fetch roads');
    return res.json();
  },

  getRoadDetail: async (roadId: string): Promise<RoadDetail> => {
    const res = await fetch(`${API_BASE}/roads/${encodeURIComponent(roadId)}`);
    if (!res.ok) throw new Error(`Failed to fetch road ${roadId}`);
    return res.json();
  },

  getRoadWorkOrders: async (roadId: string): Promise<WorkOrder[]> => {
    const res = await fetch(`${API_BASE}/roads/${encodeURIComponent(roadId)}/work-orders`);
    if (!res.ok) throw new Error(`Failed to fetch work orders for road ${roadId}`);
    return res.json();
  },

  getRoadComplaints: async (roadId: string): Promise<Complaint[]> => {
    const res = await fetch(`${API_BASE}/roads/${encodeURIComponent(roadId)}/complaints`);
    if (!res.ok) throw new Error(`Failed to fetch complaints for road ${roadId}`);
    return res.json();
  },

  getRoadFinancialHistory: async (roadId: string): Promise<RoadFinancialHistory> => {
    const res = await fetch(`${API_BASE}/roads/${encodeURIComponent(roadId)}/financial-history`);
    if (!res.ok) throw new Error(`Failed to fetch financial history for road ${roadId}`);
    return res.json();
  },

  // Work Orders & Evidence
  getWorkOrder: async (woId: string): Promise<WorkOrder> => {
    const res = await fetch(`${API_BASE}/work-orders/${encodeURIComponent(woId)}`);
    if (!res.ok) throw new Error(`Failed to fetch work order ${woId}`);
    return res.json();
  },

  getWorkOrderEvidence: async (woId: string): Promise<AuditEvidence> => {
    const res = await fetch(`${API_BASE}/work-orders/${encodeURIComponent(woId)}/evidence`);
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

    const res = await fetch(`${API_BASE}/audits?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch audit findings');
    return res.json();
  },

  getAuditFinding: async (findingId: string): Promise<AuditFinding> => {
    const res = await fetch(`${API_BASE}/audits/${encodeURIComponent(findingId)}`);
    if (!res.ok) throw new Error(`Failed to fetch finding ${findingId}`);
    return res.json();
  },

  // Contractors
  getContractors: async (): Promise<ContractorScorecard[]> => {
    const res = await fetch(`${API_BASE}/contractors`);
    if (!res.ok) throw new Error('Failed to fetch contractors');
    return res.json();
  },

  getContractorScorecard: async (contractorId: string): Promise<ContractorScorecard> => {
    const res = await fetch(`${API_BASE}/contractors/${encodeURIComponent(contractorId)}/scorecard`);
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

    const res = await fetch(`${API_BASE}/graph?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch graph data');
    return res.json();
  },

  // ML Intelligence Layer
  getRoadMLSignals: async (roadId: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/intelligence/roads/${encodeURIComponent(roadId)}/signals`);
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

    const res = await fetch(`${API_BASE}/intelligence/issues/clusters?${q.toString()}`);
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

    const res = await fetch(`${API_BASE}/intelligence/anomalies?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch repair anomalies');
    return res.json();
  },

  getWorkOrderAnomaly: async (woId: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/intelligence/anomalies/${encodeURIComponent(woId)}`);
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

    const res = await fetch(`${API_BASE}/intelligence/social-signals?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch social signals');
    return res.json();
  },

  // Cases
  getCases: async (params?: { road_id?: string; status?: string }): Promise<CaseRecord[]> => {
    const q = new URLSearchParams();
    if (params?.road_id) q.append('road_id', params.road_id);
    if (params?.status) q.append('status', params.status);

    const res = await fetch(`${API_BASE}/cases?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch cases');
    return res.json();
  },

  createCase: async (payload: {
    road_id: string;
    citizen_observation: string;
    work_order_id?: string;
    evidence_references?: string[];
  }): Promise<CaseRecord> => {
    const res = await fetch(`${API_BASE}/cases`, {
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
    const res = await fetch(`${API_BASE}/cases/${encodeURIComponent(caseId)}/respond`, {
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
    const res = await fetch(`${API_BASE}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, default_ward: default_ward || 'K/E' })
    });
    if (!res.ok) throw new Error('Failed to query RupeeTrace assistant');
    return res.json();
  }
};
