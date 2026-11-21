# RupeeTrace: Data Relationship Map (Phase 1)

This document defines the deterministic relational model and graph schema connecting Mumbai's synthetic civic road datasets into an auditable financial trail.

---

## 1. Core Entity Relational Diagram

```
[complaints.csv]
       │
       │ (linked_complaint_ids, pipe-delimited)
       ▼
[work_orders.csv] ───────(repair_method)───────► [rate_card.csv]
   │          │
   │ (ward)   │ (road_id)
   ▼          ▼
[wards.csv] [roads.csv] ◄─────(ambulance_entry_road)───── [facilities.csv]
   ▲          ▲
   │ (ward)   │ (road_id)
   ├──────────┴─────────────────────────────── [accidents.csv]
   │
   ├──────(ward_code + spatial distance)────── [flood_hotspots.csv]
   ├──────(ward_code)───────────────────────── [localities.csv]
   └──────(active_wards)────────────────────── [contractors.csv]
```

---

## 2. Deterministic Join Rules

### 1. Work Order to Citizen Complaints (`M:N`)
- **Source Field**: `work_orders.linked_complaint_ids`
- **Join Rule**: Split string by pipe character `|`, trim whitespace, and match each identifier against `complaints.complaint_id`.
- **Handling of Nulls**: 45 work orders have blank complaint links. Preserved as engineering-initiated jobs (`linked_complaint_ids = []`).

### 2. Work Order to Road Asset (`N:1`)
- **Source Field**: `work_orders.road_id`
- **Target Field**: `roads.road_id`
- **Integrity**: 100% exact string match across all 2,499 work orders.

### 3. Work Order to Ward (`N:1`)
- **Source Field**: `work_orders.ward_code`
- **Target Field**: `wards.ward_code`
- **Integrity**: 100% exact match across all 24 BMC wards.

### 4. Work Order to Contractor (`N:1`)
- **Source Field**: `work_orders.contractor_id`
- **Target Field**: `contractors.contractor_id`
- **Integrity**: 100% exact match across all 8 synthetic contractors.

### 5. Work Order to Rate Card (`N:1`)
- **Source Field**: `work_orders.repair_method`
- **Target Field**: `rate_card.repair_method`
- **Integrity**: 100% exact string match across all 10 repair methods.

### 6. Road to Peak Traffic Overlay (`1:1`)
- **Source Field**: `traffic.road_id`
- **Target Field**: `roads.road_id`
- **Integrity**: 100% match (all 291 roads have exact traffic profile).

### 7. Road / Ward to Road Accidents (`N:1`)
- **Source Fields**: `accidents.road_id` and `accidents.ward_code`
- **Integrity**: 100% exact match. Enables safety overlays (identifying accidents caused by potholes or waterlogging).

### 8. Critical Facilities to Roads (`N:1`)
- **Source Field**: `facilities.ambulance_entry_road`
- **Target Field**: `roads.road_id`
- **Integrity**: 100% exact match (160 hospitals and schools linked to arterial entry roads).

### 9. Flood Hotspot Spatial Resolution (`N:1 Spatial`)
- **Matching Rule**: For each flood hotspot `(lat, lon)`:
  1. Filter roads located within the same `ward_code`.
  2. Compute Haversine distance from hotspot coordinates to the road segment endpoints and midpoint:
     $$d = \min(d_{\text{start}}, d_{\text{end}}, d_{\text{mid}})$$
  3. Associate the hotspot with the closest road segment in that ward.
- **Results**: Median distance to road segment is 346.5 m. Minimum is 25.2 m (Sion Road No 24 near FH003).

### 10. Daily Weather & Tidal Context (`Temporal`)
- **Rainfall**: Indexed by `(date, station)` for Colaba and Santacruz.
- **Tides**: Indexed by `date`. Contains `big_tide_flag` (True when high tide height $\ge 4.5\text{ m}$).

---

## 3. Graph Edge Taxonomy

RupeeTrace translates relational linkages into typed directional edges for the Visual Money Trace Graph:

| Edge Type | Source Entity | Target Entity | Edge Metadata |
|---|---|---|---|
| `LINKED_TO_WORK_ORDER` | `Complaint` | `WorkOrder` | `work_type`, `repair_method` |
| `EXECUTED_ON_ROAD` | `WorkOrder` | `RoadAsset` | `cost_inr`, `is_dlp_breach` |
| `ASSIGNED_IN_WARD` | `WorkOrder` | `Ward` | `cost_inr` |
| `AWARDED_TO_CONTRACTOR` | `WorkOrder` | `Contractor` | `cost_inr`, `contractor_name` |
| `PRICED_BY_RATE_CARD` | `WorkOrder` | `RateCard` | `expected_cost`, `cost_variance_pct` |
| `MEASURED_ON_ROAD` | `TrafficRecord` | `RoadAsset` | `congestion_index_0_10` |
| `OCCURRED_ON_ROAD` | `Accident` | `RoadAsset` | `severity`, `probable_cause` |
| `ACCESSIBLE_VIA_ROAD` | `Facility` | `RoadAsset` | `type`, `emergency_services` |
| `SPATIALLY_NEAR_ROAD` | `FloodHotspot` | `RoadAsset` | `distance_m`, `avg_water_depth_cm` |
