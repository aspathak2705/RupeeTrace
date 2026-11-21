# RupeeTrace: Data Validation Report (Phase 1)

> ⚠️ **Synthetic Data Notice**: All records in RupeeTrace are synthetic and derived from `Claude-Impact-Labs-data-2`. They simulate Mumbai civic road maintenance, but do not represent actual BMC treasury expenditures, verified invoices, or real contractors.

## 1. Executive Summary

| Metric | Value |
|---|---|
| **Ingestion Status** | **PASS (100% Schema & Foreign Key Match)** |
| **Total Datasets Inspected** | 17 files (15 CSVs, 2 GeoJSONs) |
| **Total Citizen Complaints** | 6,501 rows |
| **Total Work Orders** | 2,499 rows |
| **Road Asset Segments** | 291 segments (GeoJSON LineStrings) |
| **BMC Administrative Wards** | 24 wards (A through T) |
| **Empanelled Contractors** | 8 synthetic entities |
| **Rate Card Repair Methods** | 10 standardized methods |
| **Accidents Recorded** | 420 events (2024–2025) |
| **Critical Facilities** | 160 (18 Hospitals, 142 Schools) |
| **Chronic Flood Hotspots** | 28 locations |

---

## 2. Primary Key Uniqueness

Every entity in the dataset was checked for primary key integrity. Zero duplicate identifiers were found across any dataset.

| Dataset | Primary Key Column | Total Rows | Unique Count | Duplicates | Status |
|---|---|---|---|---|---|
| `complaints.csv` | `complaint_id` | 6,501 | 6,501 | 0 | PASS |
| `work_orders.csv` | `work_order_id` | 2,499 | 2,499 | 0 | PASS |
| `roads.csv` | `road_id` | 291 | 291 | 0 | PASS |
| `wards.csv` | `ward_code` | 24 | 24 | 0 | PASS |
| `contractors.csv` | `contractor_id` | 8 | 8 | 0 | PASS |
| `rate_card.csv` | `repair_method` | 10 | 10 | 0 | PASS |
| `traffic.csv` | `road_id` | 291 | 291 | 0 | PASS |
| `accidents.csv` | `accident_id` | 420 | 420 | 0 | PASS |
| `facilities.csv` | `facility_id` | 160 | 160 | 0 | PASS |
| `flood_hotspots.csv` | `hotspot_id` | 28 | 28 | 0 | PASS |
| `social_posts.csv` | `post_id` | 650 | 650 | 0 | PASS |

---

## 3. Foreign Key Integrity & Relational Verification

| Source Column | Target Column | References Checked | Resolved | Unmatched | Integrity % |
|---|---|---|---|---|---|
| `work_orders.road_id` | `roads.road_id` | 2,499 | 2,499 | 0 | 100.0% |
| `work_orders.ward_code` | `wards.ward_code` | 2,499 | 2,499 | 0 | 100.0% |
| `work_orders.contractor_id` | `contractors.contractor_id` | 2,499 | 2,499 | 0 | 100.0% |
| `work_orders.repair_method` | `rate_card.repair_method` | 2,499 | 2,499 | 0 | 100.0% |
| `work_orders.linked_complaint_ids` | `complaints.complaint_id` | 4,948 | 4,948 | 0 | 100.0% |
| `traffic.road_id` | `roads.road_id` | 291 | 291 | 0 | 100.0% |
| `accidents.road_id` | `roads.road_id` | 420 | 420 | 0 | 100.0% |
| `accidents.ward_code` | `wards.ward_code` | 420 | 420 | 0 | 100.0% |
| `facilities.ambulance_entry_road` | `roads.road_id` | 160 | 160 | 0 | 100.0% |
| `facilities.ward_code` | `wards.ward_code` | 160 | 160 | 0 | 100.0% |
| `flood_hotspots.ward_code` | `wards.ward_code` | 28 | 28 | 0 | 100.0% |

### Key Relational Observations:
1. **Unlinked Work Orders**: 45 out of 2,499 work orders (1.8%) have blank `linked_complaint_ids`. These represent municipal engineering-initiated or scheduled jobs without a citizen complaint trigger. They are explicitly isolated in audit checks.
2. **Pipe-separated Complaint Links**: 2,454 work orders link between 1 and 4 complaints each (separated by `|`). All 4,948 individual references resolve 100% to valid complaints.
3. **Unassigned Complaint Wards**: 457 complaints lack `ward_code` in raw intake, but 844 of 896 open complaints resolve to localities in `localities.csv`.

---

## 4. Numeric Range & Constraint Checks

| Field | Range in Dataset | Negative / Zero Anomalies | Status |
|---|---|---|---|
| `work_orders.cost_inr` | ₹837.00 to ₹410,330.00 | 0 negative, 0 zero | PASS |
| `work_orders.area_sqm` | 0.50 sqm to 40.00 sqm | 0 negative, 0 zero | PASS |
| `work_orders.sla_hours` | 24.0 h to 168.0 h | 0 negative, 0 zero | PASS |
| `wards.monsoon_repair_budget_inr_2025` | ₹900,000.00 to ₹11,900,000.00 | 0 negative, 0 zero | PASS |
| `rate_card.standard_rate_inr` | ₹1,800.00 to ₹180,000.00 | 0 negative, 0 zero | PASS |

---

## 5. Coordinate & Spatial Bounds Verification

All spatial coordinates were checked against the Greater Mumbai geographic bounding box:
- Latitude: `18.80° N` to `19.35° N`
- Longitude: `72.70° E` to `73.10° E`

* **Roads**: 291 segments (Start and End coordinates within bounds: 100%).
* **Facilities**: 160 facilities (100% within bounds).
* **Flood Hotspots**: 28 hotspots (100% within bounds).
* **Complaints**: 3,777 rows possess valid GPS coordinates (all within bounds); 2,724 complaints lack GPS (originating from 1916 Helpline, web portal, or walk-ins).

---

## 6. Known Ingestion Limitations & Handling

1. **Missing GPS on Non-App Complaints**: Handled safely by falling back to `localities.csv` gazetteer matching via `locality_text`.
2. **Missing Engineer Remarks**: 354 work orders have null `engineer_remark`. Stored as `None` without record dropping.
3. **No Material Delivery Records**: Synthetic dataset omits asphalt plant batch tickets, core test lab reports, or banking transactions. RupeeTrace explicitly refers to `cost_inr` as **recorded billed cost**.
