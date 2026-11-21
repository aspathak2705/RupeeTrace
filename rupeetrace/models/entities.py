from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field
from rupeetrace.core.provenance import SourceProvenance

class Ward(BaseModel):
    ward_code: str = Field(..., description="BMC ward identifier (A-T)")
    ward_name: str = Field(..., description="Primary localities covered")
    zone: str = Field(..., description="BMC administrative zone")
    assistant_commissioner_office: str = Field(..., description="Office name")
    centroid_lat: float
    centroid_lon: float
    approx_area_km2: float
    population_est: int
    low_lying_index: float = Field(..., description="Flood vulnerability index (0 to 1)")
    engineering_crews: int = Field(..., description="Repair crews available per day")
    localities: List[str] = Field(default_factory=list)
    monsoon_repair_budget_inr_2025: float = Field(..., description="Ward repair budget in INR")
    provenance: SourceProvenance

class RoadAsset(BaseModel):
    road_id: str = Field(..., description="Road segment identifier (e.g., RD0001)")
    road_name: str
    segment_no: int
    ward_code: str
    road_type: str = Field(..., description="Highway, Arterial, Main, or Local")
    surface: str = Field(..., description="Asphalt, Concrete (CC), or Paver blocks")
    lanes: int
    length_m: float
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    last_resurfaced: Optional[str] = None
    under_dlp: bool = Field(..., description="True if under Defect Liability Period")
    bus_route: bool = Field(..., description="True if BEST bus route operates here")
    provenance: SourceProvenance

class Complaint(BaseModel):
    complaint_id: str = Field(..., description="Unique complaint identifier (e.g., BMC25-000123)")
    received_at: str
    channel: str
    category_reported: str
    description: str
    language: str
    locality_text: str
    ward_code: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    gps_accuracy_m: Optional[float] = None
    photo_url: Optional[str] = None
    photo_description: Optional[str] = None
    complainant_id: str
    upvotes: int = 0
    status: str
    resolved_at: Optional[str] = None
    provenance: SourceProvenance

class Contractor(BaseModel):
    contractor_id: str = Field(..., description="Contractor identifier (e.g., CT01)")
    contractor_name: str
    empanelled_since: int
    active_wards: List[str] = Field(default_factory=list)
    provenance: SourceProvenance

class RateCard(BaseModel):
    repair_method: str
    unit: str = Field(..., description="'per sqm' or 'per job'")
    standard_rate_inr: float
    provenance: SourceProvenance

class WorkOrder(BaseModel):
    work_order_id: str = Field(..., description="Unique work order identifier (e.g., WO25-00001)")
    linked_complaint_ids: List[str] = Field(default_factory=list)
    ward_code: str
    road_id: str
    work_type: str
    repair_method: str
    contractor_id: str
    contractor_name: str
    assigned_at: str
    work_started_at: str
    completed_at: str
    area_sqm: float
    cost_inr: float = Field(..., description="Recorded billed cost in INR")
    sla_hours: float
    sla_met: bool
    reopened_within_30d: bool
    engineer_remark: Optional[str] = None
    
    # Financial reconciliation computed values
    expected_cost_inr: Optional[float] = None
    cost_variance_inr: Optional[float] = None
    cost_variance_pct: Optional[float] = None
    is_overbilled: Optional[bool] = None
    is_dlp_breach: Optional[bool] = None

    provenance: SourceProvenance

class TrafficRecord(BaseModel):
    road_id: str
    peak_hour_vehicles: int
    avg_peak_speed_kmph: float
    congestion_index_0_10: float
    bus_routes_count: int
    two_wheeler_share_pct: float
    provenance: SourceProvenance

class Accident(BaseModel):
    accident_id: str
    occurred_at: str
    ward_code: str
    road_id: str
    lat: float
    lon: float
    vehicle_type: str
    severity: str
    probable_cause: str
    provenance: SourceProvenance

class Facility(BaseModel):
    facility_id: str
    type: str = Field(..., description="Hospital or School")
    name: str
    ward_code: str
    lat: float
    lon: float
    beds_or_students: int
    emergency_services: bool
    ambulance_entry_road: str
    provenance: SourceProvenance

class FloodHotspot(BaseModel):
    hotspot_id: str
    name: str
    ward_code: str
    lat: float
    lon: float
    flood_threshold_mm_per_day: float
    tide_sensitive: bool
    avg_water_depth_cm: float
    avg_recession_hours: float
    pumping_station_nearby: bool
    years_flagged_last_5: int
    nearest_road_id: Optional[str] = None
    distance_to_nearest_road_m: Optional[float] = None
    provenance: SourceProvenance

class RainfallDaily(BaseModel):
    date: str
    station: str
    rainfall_mm: float
    imd_category: str
    imd_alert: str
    provenance: SourceProvenance

class TideRecord(BaseModel):
    date: str
    high_tide_time: str
    height_m: float
    big_tide_flag: bool
    provenance: SourceProvenance

class EnvironmentalObservation(BaseModel):
    observation_type: str = Field(..., description="rainfall, tide, or flood_hotspot")
    observation_id: str
    date_or_period: Optional[str] = None
    ward_code: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)
    provenance: SourceProvenance

class AuditEvidence(BaseModel):
    work_order: WorkOrder
    linked_complaints: List[Complaint] = Field(default_factory=list)
    road: Optional[RoadAsset] = None
    ward: Optional[Ward] = None
    contractor: Optional[Contractor] = None
    rate_card: Optional[RateCard] = None
    traffic: Optional[TrafficRecord] = None
    nearby_facilities: List[Facility] = Field(default_factory=list)
    sla_and_reopening: Dict[str, Any] = Field(default_factory=dict)
    financial_audit: Dict[str, Any] = Field(default_factory=dict)
    provenances: List[SourceProvenance] = Field(default_factory=list)

class GraphRelationship(BaseModel):
    source_id: str
    source_type: str
    target_id: str
    target_type: str
    relation_type: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    provenance: SourceProvenance
