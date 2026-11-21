from typing import List, Dict, Any, Optional
from rupeetrace.models.entities import Ward, WorkOrder
from rupeetrace.services.relationship_service import RelationshipService

class WardService:
    def __init__(self, rel_service: RelationshipService):
        self.rel_service = rel_service
        self._cached_wards_summary: Optional[List[Dict[str, Any]]] = None

    def list_wards(self) -> List[Dict[str, Any]]:
        if self._cached_wards_summary is not None:
            return self._cached_wards_summary

        results = []
        for ward in self.rel_service.loader.wards:
            w_orders = self.rel_service.get_ward_work_orders(ward.ward_code)
            total_spend = sum(wo.cost_inr for wo in w_orders)
            reopened_count = sum(1 for wo in w_orders if wo.reopened_within_30d)
            dlp_breach_count = sum(1 for wo in w_orders if wo.is_dlp_breach)
            overbilled_count = sum(1 for wo in w_orders if wo.is_overbilled)
            
            ward_roads = [r for r in self.rel_service.loader.roads if r.ward_code == ward.ward_code]
            
            results.append({
                "ward_code": ward.ward_code,
                "ward_name": ward.ward_name,
                "zone": ward.zone,
                "assistant_commissioner_office": ward.assistant_commissioner_office,
                "centroid_lat": ward.centroid_lat,
                "centroid_lon": ward.centroid_lon,
                "approx_area_km2": ward.approx_area_km2,
                "population_est": ward.population_est,
                "low_lying_index": ward.low_lying_index,
                "engineering_crews": ward.engineering_crews,
                "monsoon_repair_budget_inr_2025": ward.monsoon_repair_budget_inr_2025,
                "total_recorded_spend_inr": round(total_spend, 2),
                "budget_utilization_pct": round((total_spend / ward.monsoon_repair_budget_inr_2025) * 100, 2) if ward.monsoon_repair_budget_inr_2025 > 0 else 0,
                "total_work_orders": len(w_orders),
                "reopened_work_orders": reopened_count,
                "dlp_breach_work_orders": dlp_breach_count,
                "overbilled_work_orders": overbilled_count,
                "total_roads": len(ward_roads),
                "provenance": ward.provenance
            })
        self._cached_wards_summary = sorted(results, key=lambda x: x["ward_code"])
        return self._cached_wards_summary

    def get_ward_detail(self, ward_code: str) -> Optional[Dict[str, Any]]:
        ward = self.rel_service.get_ward(ward_code)
        if not ward:
            return None

        w_orders = self.rel_service.get_ward_work_orders(ward.ward_code)
        total_spend = sum(wo.cost_inr for wo in w_orders)
        reopened_count = sum(1 for wo in w_orders if wo.reopened_within_30d)
        dlp_breach_count = sum(1 for wo in w_orders if wo.is_dlp_breach)
        overbilled_count = sum(1 for wo in w_orders if wo.is_overbilled)
        dlp_breach_spend = sum(wo.cost_inr for wo in w_orders if wo.is_dlp_breach)

        # Spend by contractor
        contractor_spend: Dict[str, Dict[str, Any]] = {}
        for wo in w_orders:
            if wo.contractor_id not in contractor_spend:
                contractor_spend[wo.contractor_id] = {
                    "contractor_id": wo.contractor_id,
                    "contractor_name": wo.contractor_name,
                    "total_spend_inr": 0.0,
                    "work_order_count": 0,
                    "reopened_count": 0
                }
            contractor_spend[wo.contractor_id]["total_spend_inr"] += wo.cost_inr
            contractor_spend[wo.contractor_id]["work_order_count"] += 1
            if wo.reopened_within_30d:
                contractor_spend[wo.contractor_id]["reopened_count"] += 1

        # Roads in ward
        ward_roads = [
            {
                "road_id": r.road_id,
                "road_name": r.road_name,
                "road_type": r.road_type,
                "surface": r.surface,
                "length_m": r.length_m,
                "under_dlp": r.under_dlp
            }
            for r in self.rel_service.loader.roads if r.ward_code == ward.ward_code
        ]

        # Flood hotspots
        hotspots = self.rel_service.flood_hotspots_by_ward.get(ward.ward_code, [])
        hotspots_summary = [
            {
                "hotspot_id": fh.hotspot_id,
                "name": fh.name,
                "lat": fh.lat,
                "lon": fh.lon,
                "avg_water_depth_cm": fh.avg_water_depth_cm,
                "nearest_road_id": fh.nearest_road_id,
                "distance_to_nearest_road_m": fh.distance_to_nearest_road_m
            }
            for fh in hotspots
        ]

        # Accidents count
        accidents_count = len(self.rel_service.accidents_by_ward.get(ward.ward_code, []))

        return {
            "ward_code": ward.ward_code,
            "ward_name": ward.ward_name,
            "zone": ward.zone,
            "assistant_commissioner_office": ward.assistant_commissioner_office,
            "centroid_lat": ward.centroid_lat,
            "centroid_lon": ward.centroid_lon,
            "approx_area_km2": ward.approx_area_km2,
            "population_est": ward.population_est,
            "low_lying_index": ward.low_lying_index,
            "engineering_crews": ward.engineering_crews,
            "localities": ward.localities,
            "monsoon_repair_budget_inr_2025": ward.monsoon_repair_budget_inr_2025,
            "total_recorded_spend_inr": round(total_spend, 2),
            "remaining_budget_inr": round(ward.monsoon_repair_budget_inr_2025 - total_spend, 2),
            "budget_utilization_pct": round((total_spend / ward.monsoon_repair_budget_inr_2025) * 100, 2) if ward.monsoon_repair_budget_inr_2025 > 0 else 0,
            "total_work_orders": len(w_orders),
            "reopened_work_orders": reopened_count,
            "reopen_rate_pct": round((reopened_count / len(w_orders)) * 100, 2) if len(w_orders) > 0 else 0,
            "dlp_breach_work_orders": dlp_breach_count,
            "dlp_breach_spend_inr": round(dlp_breach_spend, 2),
            "overbilled_work_orders": overbilled_count,
            "total_roads": len(ward_roads),
            "contractor_spend_breakdown": list(contractor_spend.values()),
            "roads": ward_roads,
            "flood_hotspots": hotspots_summary,
            "accidents_recorded": accidents_count,
            "provenance": ward.provenance
        }
