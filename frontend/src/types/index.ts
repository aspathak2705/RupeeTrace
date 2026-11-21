export interface SourceProvenance {
  source_file: string;
  source_record_id: string;
  row_index?: number;
}

export interface WardSummary {
  ward_code: string;
  ward_name: string;
  zone: string;
  assistant_commissioner_office: string;
  centroid_lat: number;
  centroid_lon: number;
  approx_area_km2: number;
  population_est: number;
  low_lying_index: number;
  engineering_crews: number;
  monsoon_repair_budget_inr_2025: number;
  total_recorded_spend_inr: number;
  budget_utilization_pct: number;
  total_work_orders: number;
  reopened_work_orders: number;
  dlp_breach_work_orders: number;
  overbilled_work_orders: number;
  total_roads: number;
  provenance: SourceProvenance;
}

export interface WardDetail extends WardSummary {
  remaining_budget_inr: number;
  reopen_rate_pct: number;
  dlp_breach_spend_inr: number;
  localities: string[];
  contractor_spend_breakdown: Array<{
    contractor_id: string;
    contractor_name: string;
    total_spend_inr: number;
    work_order_count: number;
    reopened_count: number;
  }>;
  roads: Array<{
    road_id: string;
    road_name: string;
    road_type: string;
    surface: string;
    length_m: number;
    under_dlp: boolean;
  }>;
  flood_hotspots: Array<{
    hotspot_id: string;
    name: string;
    lat: number;
    lon: number;
    avg_water_depth_cm: number;
    nearest_road_id?: string;
    distance_to_nearest_road_m?: number;
  }>;
  accidents_recorded: number;
}

export interface RoadSummary {
  road_id: string;
  road_name: string;
  segment_no: number;
  ward_code: string;
  road_type: string;
  surface: string;
  lanes: number;
  length_m: number;
  under_dlp: boolean;
  bus_route: boolean;
  last_resurfaced?: string;
  total_work_orders: number;
  total_spend_inr: number;
  linked_complaints_count: number;
  accidents_count: number;
  congestion_index?: number;
  provenance: SourceProvenance;
}

export interface RoadDetail extends RoadSummary {
  start_lat: number;
  start_lon: number;
  end_lat: number;
  end_lon: number;
  dlp_breach_detected: boolean;
  traffic?: {
    peak_hour_vehicles: number;
    avg_peak_speed_kmph: number;
    congestion_index_0_10: number;
    bus_routes_count: number;
    two_wheeler_share_pct: number;
  };
  accidents_recorded: Array<{
    accident_id: string;
    occurred_at: string;
    severity: string;
    probable_cause: string;
    vehicle_type: string;
  }>;
  facilities: Array<{
    facility_id: string;
    name: string;
    type: string;
    emergency_services: boolean;
    beds_or_students: number;
  }>;
  nearby_flood_hotspots: Array<{
    hotspot_id: string;
    name: string;
    distance_m?: number;
    avg_water_depth_cm: number;
  }>;
}

export interface WorkOrder {
  work_order_id: string;
  linked_complaint_ids: string[];
  ward_code: string;
  road_id: string;
  work_type: string;
  repair_method: string;
  contractor_id: string;
  contractor_name: string;
  assigned_at: string;
  work_started_at: string;
  completed_at: string;
  area_sqm: number;
  cost_inr: number;
  sla_hours: number;
  sla_met: boolean;
  reopened_within_30d: boolean;
  engineer_remark?: string;
  expected_cost_inr?: number;
  cost_variance_inr?: number;
  cost_variance_pct?: number;
  is_overbilled?: boolean;
  is_dlp_breach?: boolean;
  provenance: SourceProvenance;
}

export interface Complaint {
  complaint_id: string;
  received_at: string;
  channel: string;
  category_reported: string;
  description: string;
  language: string;
  locality_text: string;
  ward_code?: string;
  lat?: number;
  lon?: number;
  gps_accuracy_m?: number;
  photo_url?: string;
  photo_description?: string;
  complainant_id: string;
  upvotes: number;
  status: string;
  resolved_at?: string;
  provenance: SourceProvenance;
}

export interface AuditEvidence {
  work_order: WorkOrder;
  linked_complaints: Complaint[];
  road?: RoadSummary;
  ward?: WardSummary;
  contractor?: {
    contractor_id: string;
    contractor_name: string;
    empanelled_since: number;
    active_wards: string[];
  };
  rate_card?: {
    repair_method: string;
    unit: string;
    standard_rate_inr: number;
  };
  traffic?: {
    peak_hour_vehicles: number;
    avg_peak_speed_kmph: number;
    congestion_index_0_10: number;
  };
  nearby_facilities: Array<{
    facility_id: string;
    name: string;
    type: string;
    emergency_services: boolean;
  }>;
  sla_and_reopening: {
    sla_hours: number;
    sla_met: boolean;
    reopened_within_30d: boolean;
    assigned_at: string;
    work_started_at: string;
    completed_at: string;
  };
  financial_audit: {
    billed_cost_inr: number;
    repair_method: string;
    area_sqm: number;
    rate_card_standard_rate?: number;
    rate_card_unit?: string;
    expected_cost_inr?: number;
    cost_variance_inr?: number;
    cost_variance_pct?: number;
    is_overbilled_flag?: boolean;
    road_under_dlp?: boolean;
    is_dlp_breach_flag?: boolean;
  };
  provenances: SourceProvenance[];
}

export interface MoneyTrail {
  ward_code: string;
  ward_name: string;
  monsoon_repair_budget_inr_2025: number;
  total_recorded_work_order_expenditure_inr: number;
  remaining_budget_estimate_inr: number;
  budget_utilization_pct: number;
  total_work_orders: number;
  contractors_count: number;
  reopened_jobs_count: number;
  reopened_expenditure_inr: number;
  reopened_rate_pct: number;
  dlp_breach_jobs_count: number;
  dlp_breach_expenditure_inr: number;
  underlying_work_order_ids: string[];
  contractor_expenditure: Array<{
    contractor_id: string;
    contractor_name: string;
    total_recorded_billed_cost_inr: number;
    work_order_count: number;
    average_job_cost_inr: number;
    repair_methods_used: Record<string, number>;
    reopened_jobs_count: number;
    reopened_expenditure_inr: number;
    work_order_ids: string[];
  }>;
  repair_method_expenditure: Array<{
    repair_method: string;
    unit: string;
    standard_rate_inr?: number;
    total_recorded_billed_cost_inr: number;
    work_order_count: number;
    average_job_cost_inr: number;
    average_job_size_sqm?: number;
    work_order_ids: string[];
  }>;
  road_expenditure: Array<{
    road_id: string;
    road_name: string;
    under_dlp: boolean;
    surface: string;
    total_recorded_expenditure_inr: number;
    work_order_count: number;
    reopened_jobs_count: number;
    repeat_repair_indicator: boolean;
    work_order_ids: string[];
  }>;
  provenance: SourceProvenance;
}

export interface RoadFinancialHistory {
  road_id: string;
  road_name: string;
  ward_code: string;
  road_type: string;
  surface: string;
  length_m: number;
  under_dlp: boolean;
  last_resurfaced?: string;
  total_recorded_expenditure_inr: number;
  total_work_orders: number;
  reopened_jobs_count: number;
  repeat_repair_count: number;
  dlp_breach_recorded_spend_inr: number;
  repair_history: Array<{
    work_order_id: string;
    assigned_at: string;
    completed_at: string;
    contractor_id: string;
    contractor_name: string;
    work_type: string;
    repair_method: string;
    area_sqm: number;
    recorded_billed_cost_inr: number;
    expected_cost_inr?: number;
    cost_variance_pct?: number;
    is_overbilled?: boolean;
    is_dlp_breach?: boolean;
    sla_hours: number;
    sla_met: boolean;
    reopened_within_30d: boolean;
    linked_complaint_ids: string[];
    engineer_remark?: string;
  }>;
  provenance: SourceProvenance;
}

export interface AuditFinding {
  finding_id: string;
  finding_type: string;
  severity: string;
  status: string;
  ward_code: string;
  road_id: string;
  work_order_id: string;
  contractor_id: string;
  source_records: Array<{ file: string; id: string }>;
  calculation: Record<string, any>;
  reason: string;
  limitations: string;
  recommended_action: string;
}

export interface ContractorScorecard {
  contractor_id: string;
  contractor_name: string;
  empanelled_since: number;
  active_wards: string[];
  wards_with_recorded_work: string[];
  total_jobs: number;
  total_recorded_billed_amount_inr: number;
  sample_size_warning: boolean;
  composite_score: number;
  rating_tier: string;
  score_breakdown: {
    sla_performance: { weight_pct: number; score: number; raw_sla_success_rate_pct: number; jobs_meeting_sla: number; jobs_breaching_sla: number };
    repair_durability: { weight_pct: number; score: number; raw_reopen_rate_pct: number; reopened_jobs_count: number; reopened_expenditure_inr: number };
    cost_efficiency: { weight_pct: number; score: number; average_rate_deviation_pct: number; overbilled_jobs_count: number };
    repeat_repair_burden: { weight_pct: number; score: number; repeat_repair_burden_pct: number; jobs_on_repeated_roads: number };
  };
  contextual_factors: {
    average_ward_low_lying_index: number;
    dlp_breach_jobs_recorded: number;
    fairness_note: string;
  };
  provenance: SourceProvenance;
}

export interface NextRupeePlan {
  ward_code: string;
  ward_name: string;
  monsoon_repair_budget_inr_2025: number;
  total_recorded_spend_inr: number;
  remaining_budget_inr: number;
  total_budget_allocated_inr: number;
  surplus_unallocated_inr: number;
  total_actionable_issues_evaluated: number;
  fully_funded_interventions_count: number;
  unmatched_open_complaints_count: number;
  recommendations: Array<{
    road_id: string;
    road_name: string;
    ward_code: string;
    road_type: string;
    surface: string;
    under_dlp: boolean;
    open_complaint_ids: string[];
    open_complaint_count: number;
    priority_score: number;
    score_factors: {
      issue_severity: number;
      repeat_complaints: number;
      flood_exposure: number;
      rain_tide_exposure: number;
      traffic_exposure: number;
      safety_exposure: number;
      nearby_facilities_exposure: number;
    };
    context: {
      dominant_reported_category: string;
      congestion_index?: number;
      historical_accidents_count: number;
      nearby_facilities_count: number;
      nearest_flood_hotspot?: string;
    };
    recommended_intervention: string;
    estimated_intervention_cost_inr?: number;
    funding_decision: string;
    budget_allocated_inr: number;
    cumulative_budget_spent_inr: number;
    recommendation_reason: string;
    missing_evidence?: string;
  }>;
  provenance: SourceProvenance;
}

export interface GraphNode {
  id: string;
  label: string;
  category: 'financial' | 'citizen' | 'road_asset' | 'contractor' | 'outcome_audit' | 'work_order';
  type: string;
  title: string;
  subtitle: string;
  data: Record<string, any>;
  provenance: SourceProvenance;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  relation_type: string;
  explanation: string;
}

export interface GraphData {
  root: {
    road_id?: string;
    work_order_id?: string;
    ward_code?: string;
  };
  nodes_count: number;
  edges_count: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface CaseRecord {
  case_id: string;
  road_id: string;
  work_order_id?: string;
  citizen_observation: string;
  evidence_references: string[];
  created_at: string;
  status: 'Under Review' | 'Clarified' | 'Action Taken' | 'Resolved';
  officer_name?: string;
  officer_response?: string;
  follow_up_history: Array<{
    date: string;
    actor: 'Citizen' | 'Officer';
    action: string;
  }>;
}
