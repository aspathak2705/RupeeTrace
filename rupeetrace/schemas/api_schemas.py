from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field
from rupeetrace.core.provenance import SourceProvenance
from rupeetrace.models.entities import RoadAsset, Ward, WorkOrder, Complaint

# --- Health Schemas ---
class HealthResponse(BaseModel):
    status: str
    project: str
    version: str
    dataset_summary: Dict[str, Any]
    validation_status: str

# --- Ward Schemas ---
class WardSummary(BaseModel):
    ward_code: str
    ward_name: str
    zone: str
    assistant_commissioner_office: str
    centroid_lat: float
    centroid_lon: float
    approx_area_km2: float
    population_est: int
    low_lying_index: float
    engineering_crews: int
    monsoon_repair_budget_inr_2025: float
    total_recorded_spend_inr: float
    budget_utilization_pct: float
    total_work_orders: int
    reopened_work_orders: int
    dlp_breach_work_orders: int
    overbilled_work_orders: int
    total_roads: int
    provenance: SourceProvenance

class WardDetailResponse(WardSummary):
    remaining_budget_inr: float
    reopen_rate_pct: float
    dlp_breach_spend_inr: float
    localities: List[str]
    contractor_spend_breakdown: List[Dict[str, Any]]
    roads: List[Dict[str, Any]]
    flood_hotspots: List[Dict[str, Any]]
    accidents_recorded: int

# --- Road Schemas ---
class RoadSummary(BaseModel):
    road_id: str
    road_name: str
    segment_no: int
    ward_code: str
    road_type: str
    surface: str
    lanes: int
    length_m: float
    under_dlp: bool
    bus_route: bool
    last_resurfaced: Optional[str] = None
    total_work_orders: int
    total_spend_inr: float
    linked_complaints_count: int
    accidents_count: int
    congestion_index: Optional[float] = None
    provenance: SourceProvenance

class RoadDetailResponse(RoadSummary):
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    dlp_breach_detected: bool
    traffic: Optional[Dict[str, Any]] = None
    accidents_recorded: List[Dict[str, Any]] = Field(default_factory=list)
    facilities: List[Dict[str, Any]] = Field(default_factory=list)
    nearby_flood_hotspots: List[Dict[str, Any]] = Field(default_factory=list)

# --- Work Order & Complaint Response aliases ---
WorkOrderResponse = WorkOrder
ComplaintResponse = Complaint

# --- Audit Evidence Schema (Task 5) ---
class AuditEvidenceResponse(BaseModel):
    work_order: WorkOrder
    linked_complaints: List[Complaint] = Field(default_factory=list)
    road: Optional[RoadAsset] = None
    ward: Optional[Ward] = None
    contractor: Optional[Dict[str, Any]] = None
    rate_card: Optional[Dict[str, Any]] = None
    traffic: Optional[Dict[str, Any]] = None
    nearby_facilities: List[Dict[str, Any]] = Field(default_factory=list)
    sla_and_reopening: Dict[str, Any]
    financial_audit: Dict[str, Any]
    provenances: List[SourceProvenance] = Field(default_factory=list)

# --- Money Trail Schemas ---
class MoneyTrailResponse(BaseModel):
    ward_code: str
    ward_name: str
    monsoon_repair_budget_inr_2025: float
    total_recorded_work_order_expenditure_inr: float
    remaining_budget_estimate_inr: float
    budget_utilization_pct: float
    total_work_orders: int
    contractors_count: int
    reopened_jobs_count: int
    reopened_expenditure_inr: float
    reopened_rate_pct: float
    dlp_breach_jobs_count: int
    dlp_breach_expenditure_inr: float
    underlying_work_order_ids: List[str]
    contractor_expenditure: List[Dict[str, Any]]
    repair_method_expenditure: List[Dict[str, Any]]
    road_expenditure: List[Dict[str, Any]]
    provenance: SourceProvenance

# --- Financial History Schema ---
class RoadFinancialHistoryResponse(BaseModel):
    road_id: str
    road_name: str
    ward_code: str
    road_type: str
    surface: str
    length_m: float
    under_dlp: bool
    last_resurfaced: Optional[str] = None
    total_recorded_expenditure_inr: float
    total_work_orders: int
    reopened_jobs_count: int
    repeat_repair_count: int
    dlp_breach_recorded_spend_inr: float
    repair_history: List[Dict[str, Any]]
    provenance: SourceProvenance

# --- Audit Finding Schema ---
class AuditFindingResponse(BaseModel):
    finding_id: str
    finding_type: str
    severity: str
    status: str
    ward_code: str
    road_id: str
    work_order_id: str
    contractor_id: str
    source_records: List[Dict[str, Any]]
    calculation: Dict[str, Any]
    reason: str
    limitations: str
    recommended_action: str
    provenance_type: Optional[str] = "[Deterministic]"

# --- Contractor Scorecard Schema ---
class ContractorScorecardResponse(BaseModel):
    contractor_id: str
    contractor_name: str
    empanelled_since: int
    active_wards: List[str]
    wards_with_recorded_work: List[str] = Field(default_factory=list)
    total_jobs: int
    total_recorded_billed_amount_inr: float
    sample_size_warning: bool
    composite_score: float
    rating_tier: str
    score_breakdown: Dict[str, Any]
    contextual_factors: Dict[str, Any]
    provenance: SourceProvenance

# --- Next Rupee Planner Schema ---
class NextRupeeResponse(BaseModel):
    ward_code: str
    ward_name: str
    monsoon_repair_budget_inr_2025: float
    total_recorded_spend_inr: float
    remaining_budget_inr: float
    total_budget_allocated_inr: float
    surplus_unallocated_inr: float
    total_actionable_issues_evaluated: int
    fully_funded_interventions_count: int
    unmatched_open_complaints_count: int
    recommendations: List[Dict[str, Any]]
    provenance: SourceProvenance
