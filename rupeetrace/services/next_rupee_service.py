import math
from typing import List, Dict, Any, Optional, Tuple
from rupeetrace.services.relationship_service import RelationshipService
from rupeetrace.models.entities import Complaint, RoadAsset, Ward

def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

class NextRupeeService:
    def __init__(self, rel_service: RelationshipService):
        self.rel_service = rel_service
        self._locality_map: Dict[str, Tuple[float, float, str]] = {}
        self._init_locality_map()

    def _init_locality_map(self):
        for loc in self.rel_service.loader.localities:
            self._locality_map[loc["locality"].lower()] = (loc["lat"], loc["lon"], loc["ward_code"])
            for alias in loc.get("aliases", []):
                self._locality_map[alias.lower()] = (loc["lat"], loc["lon"], loc["ward_code"])

    def plan_next_rupee_for_ward(self, ward_code: str) -> Optional[Dict[str, Any]]:
        """
        Engine 4: Prioritizes open road issues and recommends next rupee allocations
        strictly within available ward budget.
        """
        ward = self.rel_service.get_ward(ward_code)
        if not ward:
            return None

        # 1. Budget reconciliation
        w_orders = self.rel_service.get_ward_work_orders(ward.ward_code)
        recorded_spend = sum(wo.cost_inr for wo in w_orders)
        remaining_budget = max(0.0, round(ward.monsoon_repair_budget_inr_2025 - recorded_spend, 2))

        # 2. Collect actionable open complaints for this ward
        open_complaints = [
            c for c in self.rel_service.loader.complaints
            if c.status in ("Open", "In Progress") and (c.ward_code == ward.ward_code or not c.ward_code)
        ]

        # Resolve complaints to roads in this ward
        ward_roads = [r for r in self.rel_service.loader.roads if r.ward_code == ward.ward_code]
        if not ward_roads:
            return {
                "ward_code": ward.ward_code,
                "ward_name": ward.ward_name,
                "remaining_budget_inr": remaining_budget,
                "recommendations": [],
                "message": "No road assets registered in ward."
            }

        road_candidates: Dict[str, List[Complaint]] = {}
        unmatched_complaints: List[Complaint] = []

        for c in open_complaints:
            # If complaint already has ward and it does not match, skip
            if c.ward_code and c.ward_code != ward.ward_code:
                continue

            target_lat = c.lat
            target_lon = c.lon

            # Fallback to locality gazetteer
            if (target_lat is None or target_lon is None) and c.locality_text:
                loc_info = self._locality_map.get(c.locality_text.lower())
                if loc_info:
                    target_lat, target_lon, loc_ward = loc_info
                    if c.ward_code is None and loc_ward != ward.ward_code:
                        continue

            if target_lat is not None and target_lon is not None:
                # Find closest road in ward
                best_road = None
                best_d = float("inf")
                for r in ward_roads:
                    mid_lat = (r.start_lat + r.end_lat) / 2.0
                    mid_lon = (r.start_lon + r.end_lon) / 2.0
                    d = _haversine_m(target_lat, target_lon, mid_lat, mid_lon)
                    if d < best_d:
                        best_d = d
                        best_road = r.road_id
                if best_road:
                    road_candidates.setdefault(best_road, []).append(c)
            else:
                unmatched_complaints.append(c)

        # 3. Score and prioritize candidate roads
        prioritized_issues = []
        for road_id, comps in road_candidates.items():
            road = self.rel_service.get_road(road_id)
            if not road:
                continue
            scored_issue = self._evaluate_road_issue(ward, road, comps)
            prioritized_issues.append(scored_issue)

        # Sort descending by priority score
        prioritized_issues.sort(key=lambda x: x["priority_score"], reverse=True)

        # 4. Greedy Budget Allocation
        allocated_recommendations = []
        running_budget = remaining_budget
        cumulative_allocated = 0.0

        for item in prioritized_issues:
            est_cost = item["estimated_intervention_cost_inr"]
            if est_cost is not None and est_cost <= running_budget:
                item["funding_decision"] = "Recommended for Immediate Funding"
                item["budget_allocated_inr"] = est_cost
                running_budget -= est_cost
                cumulative_allocated += est_cost
            elif est_cost is None:
                item["funding_decision"] = "Pending Engineering Survey (Cost TBD)"
                item["budget_allocated_inr"] = 0.0
            else:
                item["funding_decision"] = "Deferred (Exceeds Available Ward Budget)"
                item["budget_allocated_inr"] = 0.0

            item["cumulative_budget_spent_inr"] = round(cumulative_allocated, 2)
            allocated_recommendations.append(item)

        return {
            "ward_code": ward.ward_code,
            "ward_name": ward.ward_name,
            "monsoon_repair_budget_inr_2025": ward.monsoon_repair_budget_inr_2025,
            "total_recorded_spend_inr": round(recorded_spend, 2),
            "remaining_budget_inr": remaining_budget,
            "total_budget_allocated_inr": round(cumulative_allocated, 2),
            "surplus_unallocated_inr": round(running_budget, 2),
            "total_actionable_issues_evaluated": len(allocated_recommendations),
            "fully_funded_interventions_count": sum(1 for r in allocated_recommendations if r["funding_decision"] == "Recommended for Immediate Funding"),
            "unmatched_open_complaints_count": len(unmatched_complaints),
            "recommendations": allocated_recommendations,
            "provenance": ward.provenance
        }

    def _evaluate_road_issue(
        self,
        ward: Ward,
        road: RoadAsset,
        complaints: List[Complaint]
    ) -> Dict[str, Any]:
        """
        Evaluates risk factors and recommends specific rate-card supported repair methods.
        """
        # Component 1: Issue Severity (25% weight)
        severity_weights = {
            "Road cave-in": 100.0,
            "Open or broken manhole": 90.0,
            "Waterlogging": 80.0,
            "Choked drain / nullah overflow": 75.0,
            "Pothole": 65.0,
            "Broken paver blocks": 50.0,
            "Road related": 40.0,
            "Other": 30.0
        }
        categories = [c.category_reported for c in complaints]
        max_severity = max(severity_weights.get(cat, 35.0) for cat in categories)
        dominant_cat = max(set(categories), key=categories.count)

        # Component 2: Repeat Complaints & Upvotes (20% weight)
        total_upvotes = sum(c.upvotes for c in complaints)
        comp_count = len(complaints)
        repeat_score = min(100.0, (comp_count * 20.0) + (total_upvotes * 5.0))

        # Component 3: Flood Exposure (15% weight)
        flood_spots = self.rel_service.flood_hotspots_by_road.get(road.road_id, [])
        if flood_spots:
            min_dist = min(fh.distance_to_nearest_road_m or 500 for fh in flood_spots)
            if min_dist <= 250:
                flood_score = 100.0
            elif min_dist <= 500:
                flood_score = 80.0
            else:
                flood_score = 60.0
        else:
            flood_score = ward.low_lying_index * 70.0

        # Component 4: Rainfall & Tide Context (10% weight)
        # Low-lying wards with coastal exposure score higher
        rain_tide_score = ward.low_lying_index * 100.0

        # Component 5: Traffic Exposure (10% weight)
        traffic = self.rel_service.traffic_by_road.get(road.road_id)
        if traffic:
            traffic_score = min(100.0, (traffic.congestion_index_0_10 * 8.0) + (20.0 if road.bus_route else 0.0))
        else:
            traffic_score = 40.0

        # Component 6: Accident & Safety Exposure (10% weight)
        accidents = self.rel_service.accidents_by_road.get(road.road_id, [])
        pot_water_accidents = sum(1 for a in accidents if a.probable_cause in ("Pothole", "Waterlogged road"))
        accident_score = min(100.0, (len(accidents) * 15.0) + (pot_water_accidents * 25.0))

        # Component 7: Vulnerable Facilities Exposure (10% weight)
        facilities = self.rel_service.facilities_by_road.get(road.road_id, [])
        hospital_count = sum(1 for f in facilities if f.type == "Hospital")
        school_count = sum(1 for f in facilities if f.type == "School")
        facilities_score = min(100.0, (hospital_count * 50.0) + (school_count * 25.0))

        # Overall Composite Priority Score
        priority_score = round(
            (0.25 * max_severity) +
            (0.20 * repeat_score) +
            (0.15 * flood_score) +
            (0.10 * rain_tide_score) +
            (0.10 * traffic_score) +
            (0.10 * accident_score) +
            (0.10 * facilities_score),
            2
        )

        # Recommended Intervention & Estimated Cost from Rate Card
        rec_method, est_cost, reason = self._recommend_repair_method(dominant_cat, road, traffic, flood_spots)

        return {
            "road_id": road.road_id,
            "road_name": road.road_name,
            "ward_code": ward.ward_code,
            "road_type": road.road_type,
            "surface": road.surface,
            "under_dlp": road.under_dlp,
            "open_complaint_ids": [c.complaint_id for c in complaints],
            "open_complaint_count": len(complaints),
            "priority_score": priority_score,
            "score_factors": {
                "issue_severity": round(max_severity, 1),
                "repeat_complaints": round(repeat_score, 1),
                "flood_exposure": round(flood_score, 1),
                "rain_tide_exposure": round(rain_tide_score, 1),
                "traffic_exposure": round(traffic_score, 1),
                "safety_exposure": round(accident_score, 1),
                "nearby_facilities_exposure": round(facilities_score, 1)
            },
            "context": {
                "dominant_reported_category": dominant_cat,
                "congestion_index": traffic.congestion_index_0_10 if traffic else None,
                "historical_accidents_count": len(accidents),
                "nearby_facilities_count": len(facilities),
                "nearest_flood_hotspot": flood_spots[0].name if flood_spots else None
            },
            "recommended_intervention": rec_method,
            "estimated_intervention_cost_inr": est_cost,
            "recommendation_reason": reason,
            "missing_evidence": "Subsurface soil condition unmeasured" if rec_method == "Engineering review required" else None
        }

    def _recommend_repair_method(
        self,
        category: str,
        road: RoadAsset,
        traffic: Optional[Any],
        flood_spots: List[Any]
    ) -> Tuple[str, Optional[float], str]:
        """
        Determines rate-card backed method based on physical road context.
        Returns (method_name, estimated_cost_inr, explanation).
        """
        if category == "Pothole":
            # If arterial, heavy traffic or bus route, recommend Mastic asphalt (durability)
            if road.bus_route or (traffic and traffic.congestion_index_0_10 >= 6.5) or road.road_type in ("Highway", "Arterial"):
                # Mastic asphalt: 4200/sqm, avg patch ~3.0 sqm = 12,600 INR
                return (
                    "Mastic asphalt",
                    12600.0,
                    "High traffic volume and bus route mandate mastic asphalt for high wear resistance."
                )
            else:
                # Hot mix patch: 2600/sqm, avg patch ~2.5 sqm = 6,500 INR
                return (
                    "Hot mix patch",
                    6500.0,
                    "Standard hot mix patch for local road surface defect."
                )

        elif category in ("Waterlogging", "Choked drain / nullah overflow"):
            if flood_spots:
                return (
                    "Dewatering pump deployed",
                    60000.0,
                    "Chronic flood hotspot proximity requires active pumping station deployment."
                )
            else:
                return (
                    "Drain desilting",
                    90000.0,
                    "Choked drain clearance to restore monsoon storm-water runoff."
                )

        elif category == "Broken paver blocks":
            # Paver blocks relaid: 3000/sqm, avg 5.0 sqm = 15,000 INR
            return (
                "Paver blocks relaid",
                15000.0,
                "Paver block relaying and sand leveling over pedestrian/junction area."
            )

        elif category == "Open or broken manhole":
            return (
                "Manhole cover replaced + grating",
                45000.0,
                "Immediate safety hazard mitigation via heavy duty ductile iron manhole cover and grating."
            )

        elif category == "Road cave-in":
            return (
                "Excavation, pipeline repair, PQC patch",
                180000.0,
                "Deep structural excavation and PQC concrete slab restoration."
            )

        else:
            # Explicit constraint: return "Engineering review required" rather than inventing a method
            return (
                "Engineering review required",
                None,
                "Vague or multi-disciplinary complaint description requires on-site structural engineer survey."
            )
