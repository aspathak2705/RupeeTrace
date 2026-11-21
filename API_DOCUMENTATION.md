# RupeeTrace: API Documentation (Phase 1 & 2)

Base URL: `http://localhost:8000/api`

---

## 1. System Health

### `GET /api/health`
Returns system status, dataset loading metrics, and validation health.

**Response `200 OK`**:
```json
{
  "status": "HEALTHY",
  "project": "RupeeTrace",
  "version": "1.0.0",
  "dataset_summary": {
    "wards_count": 24,
    "roads_count": 291,
    "contractors_count": 8,
    "rate_cards_count": 10,
    "work_orders_count": 2499,
    "complaints_count": 6501,
    "complaints_sample_count": 200,
    "traffic_count": 291,
    "accidents_count": 420,
    "facilities_count": 160,
    "flood_hotspots_count": 28
  },
  "validation_status": "PASS"
}
```

---

## 2. Wards & Money Trail

### `GET /api/wards`
Returns list of all 24 BMC wards with aggregate repair expenditure and budget utilization.

### `GET /api/wards/{ward_code}`
Returns detailed ward information, localities, active engineering crews, contractor spend breakdown, and chronic flood hotspots.

### `GET /api/wards/{ward_code}/money-trail`
**Engine 1 Signature Endpoint**: Reconciles ward repair budget against recorded billed expenditure, contractor shares, repair methods, and road breakdowns with full work order drill-downs.

**Response `200 OK` (Excerpt)**:
```json
{
  "ward_code": "F/N",
  "ward_name": "Matunga, Sion, Wadala",
  "monsoon_repair_budget_inr_2025": 10500000.0,
  "total_recorded_work_order_expenditure_inr": 9412574.0,
  "remaining_budget_estimate_inr": 1087426.0,
  "budget_utilization_pct": 89.64,
  "total_work_orders": 128,
  "contractors_count": 6,
  "reopened_jobs_count": 29,
  "reopened_expenditure_inr": 2185420.0,
  "reopened_rate_pct": 22.66,
  "dlp_breach_jobs_count": 23,
  "dlp_breach_expenditure_inr": 1294850.0,
  "underlying_work_order_ids": ["WO25-00012", "WO25-00045"],
  "contractor_expenditure": [
    {
      "contractor_id": "CT01",
      "contractor_name": "Sahyadri Infra Works (synthetic)",
      "total_recorded_billed_cost_inr": 2840500.0,
      "work_order_count": 38,
      "average_job_cost_inr": 74750.0,
      "reopened_jobs_count": 9,
      "reopened_expenditure_inr": 680200.0,
      "work_order_ids": ["WO25-00012"]
    }
  ],
  "repair_method_expenditure": [],
  "road_expenditure": []
}
```

---

## 3. Roads & Financial History

### `GET /api/roads`
Returns all 291 road segments with surface type, length, DLP status, and recorded repair counts.

### `GET /api/roads/{road_id}`
Returns detailed asset profile including start/end coordinates, congestion index, historical accidents, and nearest flood hotspots.

### `GET /api/roads/{road_id}/work-orders`
Returns all work orders executed on this road segment.

### `GET /api/roads/{road_id}/complaints`
Returns all citizen complaints linked to this road segment.

### `GET /api/roads/{road_id}/financial-history`
Chronological repair history of this road segment, highlighting repeated repairs, rate card variances, and DLP breaches.

---

## 4. Work Orders & Audit Evidence

### `GET /api/work-orders?limit=100`
Query work orders with optional filters: `ward_code`, `road_id`, `contractor_id`, `is_dlp_breach`, `is_overbilled`.

### `GET /api/work-orders/{work_order_id}`
Returns complete work order record with expected cost and variance calculations.

### `GET /api/work-orders/{work_order_id}/evidence`
**Task 5 Signature Evidence Endpoint**: Returns complete multi-dimensional evidence bundle:
- Work order record
- Linked citizen complaints
- Road asset profile (including Defect Liability status)
- Ward budget context
- Contractor profile
- Standard rate card benchmark
- Traffic and vulnerable facilities context
- Explicit provenance for every source record

---

## 5. Repair Auditor

### `GET /api/audits`
Query audit findings filtered by:
- `finding_type`: `RATE_CARD_DEVIATION`, `POSSIBLE_DUPLICATE`, `DLP_EXPENDITURE`, `SLA_DURABILITY_BREACH`
- `ward_code`: e.g. `F/N`
- `status`: `Needs review`, `High priority review`, `Information`
- `severity`: `LOW`, `MEDIUM`, `HIGH`

### `GET /api/audits/{finding_id}`
Returns single audit finding with exact mathematical formulas, source citations, screening limitations, and recommended administrative action.

---

## 6. Contractors & Fair Accountability

### `GET /api/contractors`
Returns contractor rankings based on composite performance scores (SLA 30%, Durability 30%, Cost 25%, Repeat repair burden 15%).

### `GET /api/contractors/{contractor_id}/scorecard`
**Engine 3 Signature Endpoint**: Detailed contractor scorecard with contextual fairness adjustments (average ward low-lying index, work volume share, and neutral explanations).

---

## 7. Next Rupee Planner

### `GET /api/wards/{ward_code}/next-rupee`
**Engine 4 Signature Endpoint**: Recommends prioritized allocations of remaining ward budget across actionable open issues. Respects remaining budget constraint and suggests rate-card backed interventions.
