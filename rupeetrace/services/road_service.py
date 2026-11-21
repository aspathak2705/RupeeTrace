from typing import List, Dict, Any, Optional
from rupeetrace.models.entities import RoadAsset, WorkOrder, Complaint
from rupeetrace.services.relationship_service import RelationshipService

class RoadService:
    def __init__(self, rel_service: RelationshipService):
        self.rel_service = rel_service
        self._cached_roads_summary: Optional[List[Dict[str, Any]]] = None

    def list_roads(self) -> List[Dict[str, Any]]:
        if self._cached_roads_summary is not None:
            return self._cached_roads_summary

        results = []
        for road in self.rel_service.loader.roads:
            wos = self.rel_service.get_road_work_orders(road.road_id)
            total_spend = sum(wo.cost_inr for wo in wos)
            traffic = self.rel_service.traffic_by_road.get(road.road_id)
            accidents = self.rel_service.accidents_by_road.get(road.road_id, [])
            complaints = self.rel_service.get_road_complaints(road.road_id)

            results.append({
                "road_id": road.road_id,
                "road_name": road.road_name,
                "segment_no": road.segment_no,
                "ward_code": road.ward_code,
                "road_type": road.road_type,
                "surface": road.surface,
                "lanes": road.lanes,
                "length_m": road.length_m,
                "under_dlp": road.under_dlp,
                "bus_route": road.bus_route,
                "last_resurfaced": road.last_resurfaced,
                "total_work_orders": len(wos),
                "total_spend_inr": round(total_spend, 2),
                "linked_complaints_count": len(complaints),
                "accidents_count": len(accidents),
                "congestion_index": traffic.congestion_index_0_10 if traffic else None,
                "provenance": road.provenance
            })
        self._cached_roads_summary = sorted(results, key=lambda x: x["road_id"])
        return self._cached_roads_summary

    def get_road_detail(self, road_id: str) -> Optional[Dict[str, Any]]:
        road = self.rel_service.get_road(road_id)
        if not road:
            return None

        wos = self.rel_service.get_road_work_orders(road.road_id)
        total_spend = sum(wo.cost_inr for wo in wos)
        traffic = self.rel_service.traffic_by_road.get(road.road_id)
        accidents = self.rel_service.accidents_by_road.get(road.road_id, [])
        facilities = self.rel_service.facilities_by_road.get(road.road_id, [])
        flood_spots = self.rel_service.flood_hotspots_by_road.get(road.road_id, [])
        complaints = self.rel_service.get_road_complaints(road.road_id)

        return {
            "road_id": road.road_id,
            "road_name": road.road_name,
            "segment_no": road.segment_no,
            "ward_code": road.ward_code,
            "road_type": road.road_type,
            "surface": road.surface,
            "lanes": road.lanes,
            "length_m": road.length_m,
            "start_lat": road.start_lat,
            "start_lon": road.start_lon,
            "end_lat": road.end_lat,
            "end_lon": road.end_lon,
            "last_resurfaced": road.last_resurfaced,
            "under_dlp": road.under_dlp,
            "bus_route": road.bus_route,
            "total_work_orders": len(wos),
            "total_spend_inr": round(total_spend, 2),
            "dlp_breach_detected": road.under_dlp and total_spend > 0,
            "traffic": {
                "peak_hour_vehicles": traffic.peak_hour_vehicles,
                "avg_peak_speed_kmph": traffic.avg_peak_speed_kmph,
                "congestion_index_0_10": traffic.congestion_index_0_10,
                "bus_routes_count": traffic.bus_routes_count,
                "two_wheeler_share_pct": traffic.two_wheeler_share_pct
            } if traffic else None,
            "accidents_recorded": [
                {
                    "accident_id": a.accident_id,
                    "occurred_at": a.occurred_at,
                    "severity": a.severity,
                    "probable_cause": a.probable_cause,
                    "vehicle_type": a.vehicle_type
                }
                for a in accidents
            ],
            "facilities": [
                {
                    "facility_id": f.facility_id,
                    "name": f.name,
                    "type": f.type,
                    "emergency_services": f.emergency_services,
                    "beds_or_students": f.beds_or_students
                }
                for f in facilities
            ],
            "nearby_flood_hotspots": [
                {
                    "hotspot_id": fh.hotspot_id,
                    "name": fh.name,
                    "distance_m": fh.distance_to_nearest_road_m,
                    "avg_water_depth_cm": fh.avg_water_depth_cm
                }
                for fh in flood_spots
            ],
            "linked_complaints_count": len(complaints),
            "provenance": road.provenance
        }

    def get_road_work_orders(self, road_id: str) -> List[WorkOrder]:
        return self.rel_service.get_road_work_orders(road_id)

    def get_road_complaints(self, road_id: str) -> List[Complaint]:
        return self.rel_service.get_road_complaints(road_id)
