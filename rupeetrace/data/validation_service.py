from typing import Dict, List, Any, Set
from rupeetrace.data.data_loader import DataLoader

# Expected columns per source dataset
EXPECTED_COLUMNS = {
    "wards.csv": [
        "ward_code", "ward_name", "zone", "assistant_commissioner_office",
        "centroid_lat", "centroid_lon", "approx_area_km2", "population_est",
        "low_lying_index", "engineering_crews", "localities", "monsoon_repair_budget_inr_2025"
    ],
    "roads.csv": [
        "road_id", "road_name", "segment_no", "ward_code", "road_type",
        "surface", "lanes", "length_m", "start_lat", "start_lon",
        "end_lat", "end_lon", "last_resurfaced", "under_dlp", "bus_route"
    ],
    "work_orders.csv": [
        "work_order_id", "linked_complaint_ids", "ward_code", "road_id",
        "work_type", "repair_method", "contractor_id", "contractor_name",
        "assigned_at", "work_started_at", "completed_at", "area_sqm",
        "cost_inr", "sla_hours", "sla_met", "reopened_within_30d", "engineer_remark"
    ],
    "complaints.csv": [
        "complaint_id", "received_at", "channel", "category_reported",
        "description", "language", "locality_text", "ward_code", "lat",
        "lon", "gps_accuracy_m", "photo_url", "photo_description",
        "complainant_id", "upvotes", "status", "resolved_at"
    ],
    "contractors.csv": [
        "contractor_id", "contractor_name", "empanelled_since", "active_wards"
    ],
    "rate_card.csv": [
        "repair_method", "unit", "standard_rate_inr"
    ],
    "traffic.csv": [
        "road_id", "peak_hour_vehicles", "avg_peak_speed_kmph",
        "congestion_index_0_10", "bus_routes_count", "two_wheeler_share_pct"
    ],
    "accidents.csv": [
        "accident_id", "occurred_at", "ward_code", "road_id", "lat",
        "lon", "vehicle_type", "severity", "probable_cause"
    ],
    "facilities.csv": [
        "facility_id", "type", "name", "ward_code", "lat", "lon",
        "beds_or_students", "emergency_services", "ambulance_entry_road"
    ],
    "flood_hotspots.csv": [
        "hotspot_id", "name", "ward_code", "lat", "lon",
        "flood_threshold_mm_per_day", "tide_sensitive", "avg_water_depth_cm",
        "avg_recession_hours", "pumping_station_nearby", "years_flagged_last_5"
    ],
    "rainfall_daily.csv": [
        "date", "station", "rainfall_mm", "imd_category", "imd_alert"
    ],
    "tides.csv": [
        "date", "high_tide_time", "height_m", "big_tide_flag"
    ],
    "social_posts.csv": [
        "post_id", "posted_at", "source", "author_handle", "text", "has_media", "likes_or_forwards"
    ],
    "localities.csv": [
        "locality", "ward_code", "lat", "lon", "aliases"
    ]
}

# Mumbai coordinate bounding box
MUMBAI_BOUNDS = {
    "min_lat": 18.80,
    "max_lat": 19.35,
    "min_lon": 72.70,
    "max_lon": 73.10
}

class ValidationService:
    def __init__(self, loader: DataLoader):
        self.loader = loader

    def run_full_validation(self) -> Dict[str, Any]:
        """
        Validates schemas, keys, constraints, and relationships.
        Never silently discards errors.
        """
        report: Dict[str, Any] = {
            "status": "PASS",
            "missing_columns": self._validate_columns(),
            "duplicate_primary_keys": self._validate_primary_keys(),
            "foreign_key_integrity": self._validate_foreign_keys(),
            "numeric_integrity": self._validate_numerics(),
            "date_integrity": self._validate_dates(),
            "coordinate_integrity": self._validate_coordinates(),
            "rate_card_mappings": self._validate_rate_cards(),
            "summary": {}
        }

        # Check overall health status
        has_critical_failure = (
            len(report["missing_columns"]) > 0 or
            any(v["duplicates_found"] > 0 for v in report["duplicate_primary_keys"].values()) or
            any(len(v["unmatched_keys"]) > 0 for v in report["foreign_key_integrity"].values()) or
            len(report["rate_card_mappings"]["unmapped_methods"]) > 0
        )
        if has_critical_failure:
            report["status"] = "FAIL"

        report["summary"] = {
            "total_datasets_checked": len(self.loader.raw_dfs) + len(self.loader.raw_geojsons),
            "total_work_orders": len(self.loader.work_orders),
            "total_complaints": len(self.loader.complaints),
            "total_roads": len(self.loader.roads),
            "total_wards": len(self.loader.wards),
            "total_contractors": len(self.loader.contractors),
            "status": report["status"]
        }
        return report

    def _validate_columns(self) -> Dict[str, List[str]]:
        missing: Dict[str, List[str]] = {}
        for fname, expected in EXPECTED_COLUMNS.items():
            if fname in self.loader.raw_dfs:
                df = self.loader.raw_dfs[fname]
                diff = [col for col in expected if col not in df.columns]
                if diff:
                    missing[fname] = diff
        return missing

    def _validate_primary_keys(self) -> Dict[str, Dict[str, Any]]:
        pk_definitions = {
            "wards.csv": "ward_code",
            "roads.csv": "road_id",
            "work_orders.csv": "work_order_id",
            "complaints.csv": "complaint_id",
            "contractors.csv": "contractor_id",
            "rate_card.csv": "repair_method",
            "traffic.csv": "road_id",
            "accidents.csv": "accident_id",
            "facilities.csv": "facility_id",
            "flood_hotspots.csv": "hotspot_id",
            "social_posts.csv": "post_id"
        }
        pk_report = {}
        for fname, pk_col in pk_definitions.items():
            if fname in self.loader.raw_dfs:
                df = self.loader.raw_dfs[fname]
                total = len(df)
                unique = df[pk_col].nunique()
                dups = total - unique
                pk_report[fname] = {
                    "pk_column": pk_col,
                    "total_rows": total,
                    "unique_keys": unique,
                    "duplicates_found": dups
                }
        return pk_report

    def _validate_foreign_keys(self) -> Dict[str, Dict[str, Any]]:
        wards_set = {w.ward_code for w in self.loader.wards}
        roads_set = {r.road_id for r in self.loader.roads}
        contractors_set = {c.contractor_id for c in self.loader.contractors}
        rate_card_methods = {rc.repair_method for rc in self.loader.rate_cards}
        complaints_set = {c.complaint_id for c in self.loader.complaints}

        fk_report = {}

        # 1. Work orders -> roads
        wo_roads = {wo.road_id for wo in self.loader.work_orders}
        fk_report["work_orders_to_roads"] = {
            "source": "work_orders.road_id",
            "target": "roads.road_id",
            "unmatched_keys": list(wo_roads - roads_set),
            "unmatched_count": len(wo_roads - roads_set)
        }

        # 2. Work orders -> wards
        wo_wards = {wo.ward_code for wo in self.loader.work_orders}
        fk_report["work_orders_to_wards"] = {
            "source": "work_orders.ward_code",
            "target": "wards.ward_code",
            "unmatched_keys": list(wo_wards - wards_set),
            "unmatched_count": len(wo_wards - wards_set)
        }

        # 3. Work orders -> contractors
        wo_contractors = {wo.contractor_id for wo in self.loader.work_orders}
        fk_report["work_orders_to_contractors"] = {
            "source": "work_orders.contractor_id",
            "target": "contractors.contractor_id",
            "unmatched_keys": list(wo_contractors - contractors_set),
            "unmatched_count": len(wo_contractors - contractors_set)
        }

        # 4. Work orders -> rate_card
        wo_methods = {wo.repair_method for wo in self.loader.work_orders}
        fk_report["work_orders_to_rate_card"] = {
            "source": "work_orders.repair_method",
            "target": "rate_card.repair_method",
            "unmatched_keys": list(wo_methods - rate_card_methods),
            "unmatched_count": len(wo_methods - rate_card_methods)
        }

        # 5. Work orders -> complaints (via pipe-separated linked_complaint_ids)
        linked_complaints_checked = 0
        unmatched_cids = set()
        empty_linked_wos = 0
        for wo in self.loader.work_orders:
            if not wo.linked_complaint_ids:
                empty_linked_wos += 1
            for cid in wo.linked_complaint_ids:
                linked_complaints_checked += 1
                if cid not in complaints_set:
                    unmatched_cids.add(cid)

        fk_report["work_orders_to_complaints"] = {
            "source": "work_orders.linked_complaint_ids",
            "target": "complaints.complaint_id",
            "total_references_checked": linked_complaints_checked,
            "work_orders_without_linked_complaints": empty_linked_wos,
            "unmatched_keys": list(unmatched_cids),
            "unmatched_count": len(unmatched_cids)
        }

        # 6. Traffic -> roads
        traffic_roads = {t.road_id for t in self.loader.traffic}
        fk_report["traffic_to_roads"] = {
            "source": "traffic.road_id",
            "target": "roads.road_id",
            "unmatched_keys": list(traffic_roads - roads_set),
            "unmatched_count": len(traffic_roads - roads_set)
        }

        # 7. Accidents -> roads & wards
        acc_roads = {a.road_id for a in self.loader.accidents}
        acc_wards = {a.ward_code for a in self.loader.accidents}
        fk_report["accidents_to_roads"] = {
            "source": "accidents.road_id",
            "target": "roads.road_id",
            "unmatched_keys": list(acc_roads - roads_set),
            "unmatched_count": len(acc_roads - roads_set)
        }
        fk_report["accidents_to_wards"] = {
            "source": "accidents.ward_code",
            "target": "wards.ward_code",
            "unmatched_keys": list(acc_wards - wards_set),
            "unmatched_count": len(acc_wards - wards_set)
        }

        # 8. Facilities -> roads & wards
        fac_roads = {f.ambulance_entry_road for f in self.loader.facilities}
        fac_wards = {f.ward_code for f in self.loader.facilities}
        fk_report["facilities_to_roads"] = {
            "source": "facilities.ambulance_entry_road",
            "target": "roads.road_id",
            "unmatched_keys": list(fac_roads - roads_set),
            "unmatched_count": len(fac_roads - roads_set)
        }
        fk_report["facilities_to_wards"] = {
            "source": "facilities.ward_code",
            "target": "wards.ward_code",
            "unmatched_keys": list(fac_wards - wards_set),
            "unmatched_count": len(fac_wards - wards_set)
        }

        # 9. Flood hotspots -> wards
        flood_wards = {fh.ward_code for fh in self.loader.flood_hotspots}
        fk_report["flood_to_wards"] = {
            "source": "flood_hotspots.ward_code",
            "target": "wards.ward_code",
            "unmatched_keys": list(flood_wards - wards_set),
            "unmatched_count": len(flood_wards - wards_set)
        }

        return fk_report

    def _validate_numerics(self) -> Dict[str, Any]:
        num_issues = {
            "negative_work_order_costs": [wo.work_order_id for wo in self.loader.work_orders if wo.cost_inr < 0],
            "zero_work_order_costs": [wo.work_order_id for wo in self.loader.work_orders if wo.cost_inr == 0],
            "negative_areas": [wo.work_order_id for wo in self.loader.work_orders if wo.area_sqm <= 0],
            "negative_sla_hours": [wo.work_order_id for wo in self.loader.work_orders if wo.sla_hours <= 0],
            "negative_ward_budgets": [w.ward_code for w in self.loader.wards if w.monsoon_repair_budget_inr_2025 <= 0],
            "negative_rate_card_rates": [rc.repair_method for rc in self.loader.rate_cards if rc.standard_rate_inr <= 0]
        }
        return {k: len(v) for k, v in num_issues.items()}

    def _validate_dates(self) -> Dict[str, Any]:
        date_issues = {
            "invalid_complaints_received_at": sum(1 for c in self.loader.complaints if not c.received_at),
            "invalid_work_orders_assigned_at": sum(1 for wo in self.loader.work_orders if not wo.assigned_at),
            "invalid_work_orders_completed_at": sum(1 for wo in self.loader.work_orders if not wo.completed_at),
            "invalid_rainfall_dates": sum(1 for rf in self.loader.rainfall if not rf.date),
            "invalid_tide_dates": sum(1 for td in self.loader.tides if not td.date)
        }
        return date_issues

    def _validate_coordinates(self) -> Dict[str, Any]:
        out_of_bounds = []
        for r in self.loader.roads:
            for lat, lon in [(r.start_lat, r.start_lon), (r.end_lat, r.end_lon)]:
                if not (MUMBAI_BOUNDS["min_lat"] <= lat <= MUMBAI_BOUNDS["max_lat"] and
                        MUMBAI_BOUNDS["min_lon"] <= lon <= MUMBAI_BOUNDS["max_lon"]):
                    out_of_bounds.append(f"Road {r.road_id} coords out of bounds: ({lat}, {lon})")

        for f in self.loader.facilities:
            if not (MUMBAI_BOUNDS["min_lat"] <= f.lat <= MUMBAI_BOUNDS["max_lat"] and
                    MUMBAI_BOUNDS["min_lon"] <= f.lon <= MUMBAI_BOUNDS["max_lon"]):
                out_of_bounds.append(f"Facility {f.facility_id} coords out of bounds: ({f.lat}, {f.lon})")

        for fh in self.loader.flood_hotspots:
            if not (MUMBAI_BOUNDS["min_lat"] <= fh.lat <= MUMBAI_BOUNDS["max_lat"] and
                    MUMBAI_BOUNDS["min_lon"] <= fh.lon <= MUMBAI_BOUNDS["max_lon"]):
                out_of_bounds.append(f"FloodHotspot {fh.hotspot_id} coords out of bounds: ({fh.lat}, {fh.lon})")

        null_complaint_coords = sum(1 for c in self.loader.complaints if c.lat is None or c.lon is None)

        return {
            "out_of_bounds_count": len(out_of_bounds),
            "out_of_bounds_samples": out_of_bounds[:5],
            "complaints_without_gps": null_complaint_coords,
            "complaints_with_valid_gps": len(self.loader.complaints) - null_complaint_coords
        }

    def _validate_rate_cards(self) -> Dict[str, Any]:
        rc_methods = {rc.repair_method for rc in self.loader.rate_cards}
        wo_methods = {wo.repair_method for wo in self.loader.work_orders}
        unmapped = list(wo_methods - rc_methods)
        return {
            "total_rate_card_methods": len(rc_methods),
            "distinct_work_order_methods": len(wo_methods),
            "unmapped_methods": unmapped,
            "mapping_coverage_pct": 100.0 if not unmapped else round(len(wo_methods - set(unmapped)) / len(wo_methods) * 100, 2)
        }
