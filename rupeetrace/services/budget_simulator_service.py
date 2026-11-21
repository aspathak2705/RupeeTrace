import json
import sqlite3
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from rupeetrace.data.civic_db import CivicDB
from rupeetrace.services.janmat_service import JanmatService
from rupeetrace.services.relationship_service import RelationshipService
from rupeetrace.models.entities import Ward

class BudgetSimulatorService:
    def __init__(self, rel_service: RelationshipService, janmat_service: JanmatService, civic_db: Optional[CivicDB] = None):
        self.rel_service = rel_service
        self.janmat = janmat_service
        self.db = civic_db or CivicDB()

    def _get_conn(self):
        return self.db.session()

    def get_project_cost_breakdown(self, base_cost: float, category: str) -> Dict[str, Any]:
        """
        Calculates itemized engineering cost breakdown using realistic public works proportions.
        All figures rounded to 2 decimal places.
        """
        # Proportions: Materials (40%), Labour (25%), Equipment (15%), Transport (8%), Testing/QA (4%), Contingency (8%)
        materials = round(base_cost * 0.40, 2)
        labour = round(base_cost * 0.25, 2)
        machinery = round(base_cost * 0.15, 2)
        transport = round(base_cost * 0.08, 2)
        testing_qa = round(base_cost * 0.04, 2)
        contingency = round(base_cost * 0.08, 2)

        # Annual maintenance estimate: 5% of initial capex per year
        annual_maintenance = round(base_cost * 0.05, 2)

        return {
            "total_estimated_cost_inr": base_cost,
            "raw_materials_inr": materials,
            "labour_inr": labour,
            "equipment_machinery_inr": machinery,
            "transport_logistics_inr": transport,
            "testing_quality_assurance_inr": testing_qa,
            "contingency_reserve_inr": contingency,
            "annual_maintenance_est_inr": annual_maintenance,
            "financial_uncertainty_pct": 7.5,
            "is_estimate": True
        }

    def simulate_scenarios_for_ward(
        self,
        ward_code: str,
        custom_budget: Optional[float] = None,
        contingency_pct: float = 5.0,
        max_projects: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Generates standard civic scenarios and evaluates allocations under constraints.
        """
        ward = self.rel_service.get_ward(ward_code)
        if not ward:
            raise ValueError(f"Ward {ward_code} not found")

        # Determine budget: user custom or remaining ward budget
        w_orders = self.rel_service.get_ward_work_orders(ward_code)
        recorded_spend = sum(wo.cost_inr for wo in w_orders)
        remaining_ward_budget = max(0.0, round(ward.monsoon_repair_budget_inr_2025 - recorded_spend, 2))
        effective_budget = custom_budget if custom_budget is not None else remaining_ward_budget
        effective_budget = max(500000.0, effective_budget) # Ensure viable minimum

        # Available proposals in this ward
        proposals = self.janmat.list_proposals(ward_code=ward_code)
        if not proposals:
            # Fallback across wards if ward has few proposals
            proposals = self.janmat.list_proposals()[:15]

        # Attach itemized cost breakdown to each proposal
        enriched_proposals = []
        for p in proposals:
            p_copy = dict(p)
            p_copy["cost_breakdown"] = self.get_project_cost_breakdown(p["indicative_cost_inr"], p["category"])
            enriched_proposals.append(p_copy)

        # Build predefined scenarios
        scenario_keys = [
            "Balanced Ward Development",
            "Safety First",
            "Healthcare and School Access",
            "Flood Resilience",
            "Road Quality First",
            "Maximum Coverage",
            "Cost Optimized",
            "Citizen Priority"
        ]

        scenarios = {}
        for key in scenario_keys:
            scenarios[key] = self._evaluate_scenario_strategy(
                key=key,
                proposals=enriched_proposals,
                budget=effective_budget,
                contingency_pct=contingency_pct,
                max_projects=max_projects,
                ward=ward
            )

        # Retrieve any custom user scenarios saved in DB
        custom_saved = self.list_custom_scenarios(ward_code)

        return {
            "ward_code": ward.ward_code,
            "ward_name": ward.ward_name,
            "total_budget_inr": effective_budget,
            "remaining_official_ward_budget_inr": remaining_ward_budget,
            "contingency_reserve_pct": contingency_pct,
            "total_available_proposals_count": len(enriched_proposals),
            "scenarios": scenarios,
            "custom_saved_scenarios": custom_saved
        }

    def _evaluate_scenario_strategy(
        self,
        key: str,
        proposals: List[Dict[str, Any]],
        budget: float,
        contingency_pct: float,
        max_projects: Optional[int],
        ward: Ward
    ) -> Dict[str, Any]:
        """Applies objective weighting and executes deterministic bounded allocation."""
        contingency_amount = round(budget * (contingency_pct / 100.0), 2)
        spendable_budget = budget - contingency_amount

        # Sorting strategy based on scenario philosophy
        def get_sort_key(p: Dict[str, Any]):
            factors = p["score_factors"]
            cost = max(1.0, p["indicative_cost_inr"])

            if key == "Safety First":
                # Maximize safety impact + infrastructure urgency
                return (factors.get("safety_impact", 0) * 0.6 + factors.get("infrastructure_urgency", 0) * 0.4)
            elif key == "Healthcare and School Access":
                # Prioritize facility accessibility
                return factors.get("facility_accessibility_impact", 0) * 0.7 + factors.get("public_priority", 0) * 0.3
            elif key == "Flood Resilience":
                # Prioritize environmental & flood resilience
                return factors.get("environmental_flood_resilience", 0) * 0.7 + factors.get("infrastructure_urgency", 0) * 0.3
            elif key == "Road Quality First":
                # Prioritize infrastructure urgency + technical feasibility
                return factors.get("infrastructure_urgency", 0) * 0.6 + factors.get("technical_feasibility", 0) * 0.4
            elif key == "Maximum Coverage":
                # Ratio of utility to cost (bang for the buck)
                return p["composite_score"] / cost
            elif key == "Cost Optimized":
                # Lowest cost projects first
                return -cost
            elif key == "Citizen Priority":
                # Citizen votes and public priority
                return p.get("votes_up", 0) * 10.0 + factors.get("public_priority", 0)
            else: # "Balanced Ward Development"
                return p["composite_score"]

        # Sort proposals
        sorted_proposals = sorted(proposals, key=get_sort_key, reverse=True)

        selected = []
        unselected = []
        running_spent = 0.0

        for p in sorted_proposals:
            cost = p["indicative_cost_inr"]
            # Exclude if under active DLP to avoid wasting public funds (direct them to contractor notice)
            if p.get("under_dlp") and key != "Balanced Ward Development":
                unselected.append({
                    "proposal_id": p["proposal_id"],
                    "title": p["title"],
                    "cost_inr": cost,
                    "reason_not_selected": "Under active Defect Liability Period (DLP). Contractor liable for zero-cost repair."
                })
                continue

            if (running_spent + cost) <= spendable_budget:
                if max_projects and len(selected) >= max_projects:
                    unselected.append({
                        "proposal_id": p["proposal_id"],
                        "title": p["title"],
                        "cost_inr": cost,
                        "reason_not_selected": f"Reached maximum allowed project count ({max_projects})."
                    })
                    continue

                selected.append(p)
                running_spent += cost
            else:
                unselected.append({
                    "proposal_id": p["proposal_id"],
                    "title": p["title"],
                    "cost_inr": cost,
                    "reason_not_selected": f"Exceeds remaining scenario budget (needed ₹{cost:,.0f}, had ₹{(spendable_budget - running_spent):,.0f})."
                })

        remaining_budget = round(spendable_budget - running_spent, 2)

        # Aggregate metrics
        hospitals_benefited = sum(
            sum(1 for f in p.get("nearby_facilities", []) if f.get("type") == "Hospital")
            for p in selected
        )
        schools_benefited = sum(
            sum(1 for f in p.get("nearby_facilities", []) if f.get("type") == "School")
            for p in selected
        )
        accidents_addressed = sum(
            len(p.get("source_record_ids", [])) for p in selected if "safety" in p["category"].lower()
        )
        total_complaints_resolved = sum(len(p.get("supporting_complaint_ids", [])) for p in selected)

        total_annual_maint = sum(p["cost_breakdown"]["annual_maintenance_est_inr"] for p in selected)

        avg_safety = (
            sum(p["score_factors"]["safety_impact"] for p in selected) / len(selected)
            if selected else 0.0
        )
        avg_flood = (
            sum(p["score_factors"]["environmental_flood_resilience"] for p in selected) / len(selected)
            if selected else 0.0
        )

        return {
            "scenario_name": key,
            "spendable_budget_inr": round(spendable_budget, 2),
            "contingency_reserved_inr": contingency_amount,
            "total_allocated_inr": round(running_spent, 2),
            "unallocated_surplus_inr": remaining_budget,
            "budget_utilization_pct": round((running_spent / spendable_budget) * 100.0, 1) if spendable_budget > 0 else 0.0,
            "selected_projects_count": len(selected),
            "unselected_projects_count": len(unselected),
            "selected_proposals": selected,
            "unselected_proposals": unselected,
            "impact_metrics": {
                "hospitals_accessible_benefited": hospitals_benefited,
                "schools_accessible_benefited": schools_benefited,
                "citizen_complaints_resolved_count": total_complaints_resolved,
                "safety_outcomes_score": round(avg_safety, 1),
                "flood_resilience_score": round(avg_flood, 1),
                "est_annual_maintenance_burden_inr": round(total_annual_maint, 2),
                "dlp_avoidance_savings_inr": sum(p.get("cost_inr", 0.0) for p in unselected if "Defect Liability" in p["reason_not_selected"])
            }
        }

    def optimize_budget(
        self,
        ward_code: str,
        total_budget: float,
        contingency_pct: float = 5.0,
        mandatory_proposal_ids: Optional[List[str]] = None,
        disallowed_categories: Optional[List[str]] = None,
        weights: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Deterministic Multi-Objective Integer Programming Baseline (Knapsack Optimizer).
        Maximizes objective value subject to budget and mandatory project constraints.
        """
        proposals = self.janmat.list_proposals(ward_code=ward_code)
        if not proposals:
            proposals = self.janmat.list_proposals()[:15]

        contingency_amount = round(total_budget * (contingency_pct / 100.0), 2)
        spendable_budget = total_budget - contingency_amount

        mandatory_ids = set(mandatory_proposal_ids or [])
        disallowed = set(disallowed_categories or [])

        # Default weights
        w = weights or {
            "urgency": 0.25,
            "safety": 0.25,
            "facility": 0.20,
            "flood": 0.15,
            "citizen_vote": 0.15
        }

        # First, force include mandatory projects
        selected = []
        unselected = []
        current_spent = 0.0

        candidates = []
        for p in proposals:
            if p["category"] in disallowed:
                unselected.append({
                    "proposal_id": p["proposal_id"],
                    "title": p["title"],
                    "cost_inr": p["indicative_cost_inr"],
                    "reason_not_selected": f"Category '{p['category']}' disallowed by user filter."
                })
                continue

            cost = p["indicative_cost_inr"]
            if p["proposal_id"] in mandatory_ids:
                if (current_spent + cost) <= spendable_budget:
                    selected.append(p)
                    current_spent += cost
                else:
                    return {
                        "is_feasible": False,
                        "error_message": f"Mandatory project {p['proposal_id']} (₹{cost:,.0f}) exceeds total spendable budget ₹{spendable_budget:,.0f}.",
                        "selected_proposals": [],
                        "total_allocated_inr": 0.0
                    }
            else:
                candidates.append(p)

        # Multi-objective utility calculation
        def compute_utility(p: Dict[str, Any]) -> float:
            factors = p["score_factors"]
            u = factors.get("infrastructure_urgency", 50.0) * w.get("urgency", 0.25)
            s = factors.get("safety_impact", 50.0) * w.get("safety", 0.25)
            f = factors.get("facility_accessibility_impact", 50.0) * w.get("facility", 0.20)
            fl = factors.get("environmental_flood_resilience", 50.0) * w.get("flood", 0.15)
            cv = min(100.0, (p.get("votes_up", 0) * 15.0)) * w.get("citizen_vote", 0.15)
            dlp_penalty = -50.0 if p.get("under_dlp") else 0.0
            return max(0.1, u + s + f + fl + cv + dlp_penalty)

        # Bounded Greedy Ratio Optimization (Density = Utility / Cost)
        candidates.sort(key=lambda p: compute_utility(p) / max(1.0, p["indicative_cost_inr"]), reverse=True)

        for p in candidates:
            cost = p["indicative_cost_inr"]
            if (current_spent + cost) <= spendable_budget:
                selected.append(p)
                current_spent += cost
            else:
                unselected.append({
                    "proposal_id": p["proposal_id"],
                    "title": p["title"],
                    "cost_inr": cost,
                    "reason_not_selected": f"Optimization budget boundary reached (marginal utility / cost lower than selected alternatives)."
                })

        return {
            "is_feasible": True,
            "total_budget_inr": total_budget,
            "spendable_budget_inr": round(spendable_budget, 2),
            "contingency_reserved_inr": contingency_amount,
            "total_allocated_inr": round(current_spent, 2),
            "unallocated_surplus_inr": round(spendable_budget - current_spent, 2),
            "selected_projects_count": len(selected),
            "unselected_projects_count": len(unselected),
            "selected_proposals": selected,
            "unselected_proposals": unselected,
            "weights_applied": w
        }

    def save_custom_scenario(
        self,
        ward_code: str,
        name: str,
        description: str,
        total_budget: float,
        selected_ids: List[str],
        created_by: str = "Demo Officer"
    ) -> Dict[str, Any]:
        scenario_id = f"SCEN-{uuid.uuid4().hex[:8]}"
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        with self._get_conn() as conn:
            conn.execute("""
                INSERT INTO budget_scenarios (
                    scenario_id, ward_code, scenario_name, description, total_budget_inr,
                    selected_proposal_ids, metrics_json, created_at, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                scenario_id, ward_code, name, description, total_budget,
                json.dumps(selected_ids), json.dumps({"count": len(selected_ids)}),
                now_str, created_by
            ))
            conn.commit()

        return {
            "scenario_id": scenario_id,
            "ward_code": ward_code,
            "scenario_name": name,
            "total_budget_inr": total_budget,
            "selected_proposal_ids": selected_ids,
            "created_at": now_str
        }

    def list_custom_scenarios(self, ward_code: str) -> List[Dict[str, Any]]:
        with self._get_conn() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM budget_scenarios WHERE ward_code = ? ORDER BY created_at DESC", (ward_code,))
            rows = cur.fetchall()
            results = []
            for r in rows:
                d = dict(r)
                d["selected_proposal_ids"] = json.loads(d["selected_proposal_ids"])
                d["metrics_json"] = json.loads(d["metrics_json"])
                results.append(d)
            return results
