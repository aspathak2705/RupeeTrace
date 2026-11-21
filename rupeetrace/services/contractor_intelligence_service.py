import json
import sqlite3
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from rupeetrace.data.civic_db import CivicDB
from rupeetrace.services.relationship_service import RelationshipService
from rupeetrace.services.janmat_service import JanmatService
from rupeetrace.models.entities import Contractor, WorkOrder

class ContractorIntelligenceService:
    def __init__(
        self,
        rel_service: RelationshipService,
        janmat_service: JanmatService,
        civic_db: Optional[CivicDB] = None
    ):
        self.rel_service = rel_service
        self.janmat = janmat_service
        self.db = civic_db or CivicDB()

    def _get_conn(self):
        return self.db.session()

    def get_contractor_category_profile(self, contractor_id: str, category_or_method: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Evaluates a contractor's empirical track record specifically within a project category or repair method.
        Distinguishes observed historical records from derived performance indicators.
        """
        contractor = self.rel_service.get_contractor(contractor_id)
        if not contractor:
            return None

        all_wos = self.rel_service.work_orders_by_contractor.get(contractor_id, [])

        # Filter by category/method if specified
        target_method = category_or_method.lower() if category_or_method else None
        if target_method:
            matched_wos = [
                wo for wo in all_wos
                if target_method in wo.repair_method.lower() or target_method in wo.work_type.lower()
            ]
        else:
            matched_wos = all_wos

        total_category_jobs = len(matched_wos)
        has_sufficient_data = total_category_jobs >= 3

        if total_category_jobs == 0:
            return {
                "contractor_id": contractor.contractor_id,
                "contractor_name": contractor.contractor_name,
                "empanelled_since": contractor.empanelled_since,
                "target_category": category_or_method or "All Works",
                "has_sufficient_data": False,
                "data_gap_warning": "Not enough evidence: No completed work orders recorded in this specific category.",
                "total_completed_jobs": 0,
                "observed_records": {
                    "total_spend_inr": 0.0,
                    "avg_cost_inr": 0.0,
                    "sla_met_count": 0,
                    "reopened_count": 0,
                    "dlp_breach_count": 0
                },
                "derived_indicators": {
                    "sla_compliance_pct": None,
                    "reopen_frequency_pct": None,
                    "cost_competitiveness_score": None,
                    "overall_category_suitability_score": None
                }
            }

        total_spend = sum(wo.cost_inr for wo in matched_wos)
        costs = [wo.cost_inr for wo in matched_wos]
        costs.sort()
        avg_cost = round(total_spend / total_category_jobs, 2)
        median_cost = costs[len(costs) // 2]

        sla_met = sum(1 for wo in matched_wos if wo.sla_met)
        reopened = sum(1 for wo in matched_wos if wo.reopened_within_30d)
        dlp_breaches = sum(1 for wo in matched_wos if wo.is_dlp_breach)

        # Rate variance
        variances = [wo.cost_variance_pct for wo in matched_wos if wo.cost_variance_pct is not None]
        avg_variance = round(sum(variances) / len(variances), 2) if variances else 0.0

        # Concurrent workload across all wards
        concurrent_workload_all_wards = len(all_wos)

        # Performance calculations
        sla_pct = round((sla_met / total_category_jobs) * 100.0, 1)
        reopen_pct = round((reopened / total_category_jobs) * 100.0, 1)

        # Category suitability score (0-100)
        durability_score = max(0.0, 100.0 - (reopen_pct * 3.5))
        sla_score = sla_pct
        cost_score = max(0.0, min(100.0, 100.0 - max(0.0, avg_variance - 2.0) * 3.0))

        # Composite category suitability (35% Durability, 35% SLA, 30% Cost)
        suitability_score = round((durability_score * 0.35) + (sla_score * 0.35) + (cost_score * 0.30), 1)

        return {
            "contractor_id": contractor.contractor_id,
            "contractor_name": contractor.contractor_name,
            "empanelled_since": contractor.empanelled_since,
            "active_wards": contractor.active_wards,
            "target_category": category_or_method or "All Works",
            "has_sufficient_data": has_sufficient_data,
            "data_gap_warning": None if has_sufficient_data else "Low sample size: evaluation based on fewer than 3 historical jobs.",
            "observed_records": {
                "total_completed_jobs": total_category_jobs,
                "total_recorded_spend_inr": round(total_spend, 2),
                "avg_job_cost_inr": avg_cost,
                "median_job_cost_inr": median_cost,
                "sla_met_count": sla_met,
                "reopened_jobs_count": reopened,
                "dlp_breaches_count": dlp_breaches,
                "avg_cost_variance_pct": avg_variance,
                "total_active_workload_jobs": concurrent_workload_all_wards
            },
            "derived_indicators": {
                "sla_compliance_pct": sla_pct,
                "reopen_frequency_pct": reopen_pct,
                "durability_score": round(durability_score, 1),
                "cost_competitiveness_score": round(cost_score, 1),
                "overall_category_suitability_score": suitability_score,
                "confidence_rating": "High" if total_category_jobs >= 10 else ("Medium" if total_category_jobs >= 3 else "Low")
            }
        }

    def compare_contractors_for_proposal(self, proposal_id: str) -> Dict[str, Any]:
        """
        Ranks and compares all 8 empanelled contractors specifically for a given proposal's engineering scope.
        Never ranks purely by cheapest price; balances durability, SLA, and past reopening frequency.
        """
        proposal = self.janmat.get_proposal_detail(proposal_id)
        if not proposal:
            raise ValueError(f"Proposal {proposal_id} not found")

        # Determine target repair method from category
        cat = proposal["category"]
        if "Mastic" in proposal["title"] or "Rehabilitation" in cat:
            target_method = "Mastic asphalt"
        elif "Drain" in cat or "Flood" in cat:
            target_method = "Drain desilting"
        elif "School" in cat or "Paver" in proposal["title"]:
            target_method = "Paver blocks relaid"
        elif "Investigation" in cat:
            target_method = "Excavation, pipeline repair, PQC patch"
        else:
            target_method = "Hot mix patch"

        comparisons = []
        for c in self.rel_service.loader.contractors:
            profile = self.get_contractor_category_profile(c.contractor_id, target_method)
            if not profile:
                continue

            # Check if ward active
            is_ward_active = proposal["ward_code"] in c.active_wards

            # Dimensions
            derived = profile["derived_indicators"]
            observed = profile["observed_records"]

            if profile["has_sufficient_data"]:
                tech_suitability = 90.0 if is_ward_active else 75.0
                comp_exp = min(100.0, observed["total_completed_jobs"] * 8.0)
                deliv_rel = derived["sla_compliance_pct"]
                qual_evid = derived["durability_score"]
                cost_comp = derived["cost_competitiveness_score"]
                workload_penalty = max(0.0, (observed["total_active_workload_jobs"] - 150) * 0.1)

                composite = round(
                    (tech_suitability * 0.25) +
                    (comp_exp * 0.20) +
                    (deliv_rel * 0.20) +
                    (qual_evid * 0.20) +
                    (cost_comp * 0.15) - workload_penalty,
                    1
                )
            else:
                tech_suitability = 60.0
                comp_exp = 30.0
                deliv_rel = 50.0
                qual_evid = 50.0
                cost_comp = 50.0
                composite = 45.0

            comparisons.append({
                "contractor_id": c.contractor_id,
                "contractor_name": c.contractor_name,
                "empanelled_since": c.empanelled_since,
                "is_active_in_ward": is_ward_active,
                "has_sufficient_data": profile["has_sufficient_data"],
                "data_gap_warning": profile["data_gap_warning"],
                "category_jobs_done": observed["total_completed_jobs"],
                "avg_job_cost_inr": observed["avg_job_cost_inr"],
                "sla_compliance_pct": derived["sla_compliance_pct"],
                "reopen_frequency_pct": derived["reopen_frequency_pct"],
                "dlp_breaches_count": observed["dlp_breaches_count"],
                "total_workload_jobs": observed["total_active_workload_jobs"],
                "suitability_dimensions": {
                    "technical_suitability": round(tech_suitability, 1),
                    "comparable_experience": round(comp_exp, 1),
                    "delivery_reliability": round(deliv_rel, 1) if deliv_rel is not None else 0.0,
                    "quality_evidence": round(qual_evid, 1) if qual_evid is not None else 0.0,
                    "cost_competitiveness": round(cost_comp, 1) if cost_comp is not None else 0.0
                },
                "overall_suitability_score": composite,
                "suitability_verdict": (
                    "Strongly Recommended (High durability & SLA compliance)"
                    if composite >= 75 and (derived["reopen_frequency_pct"] or 0) <= 12
                    else ("Conditional Candidate (Moderate track record)" if composite >= 55 else "Higher Risk (Frequent reopenings or insufficient category data)")
                )
            })

        # Sort descending by composite score
        comparisons.sort(key=lambda x: x["overall_suitability_score"], reverse=True)

        return {
            "proposal_id": proposal["proposal_id"],
            "proposal_title": proposal["title"],
            "ward_code": proposal["ward_code"],
            "target_engineering_category": target_method,
            "indicative_budget_inr": proposal["indicative_cost_inr"],
            "under_dlp": bool(proposal.get("under_dlp")),
            "comparisons": comparisons,
            "evaluation_notice": "Decision Support Only: Comparative suitability computed from historical BMC work order and SLA records. Tender award must conform to declared public procurement rules."
        }

    def prepare_tender_evaluation(
        self,
        proposal_id: str,
        custom_bids: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Creates a pre-declared tender evaluation workspace for an officer demo.
        Compares bidder quotations against objective technical and financial criteria.
        """
        comp_data = self.compare_contractors_for_proposal(proposal_id)
        base_cost = comp_data["indicative_budget_inr"]

        # Default criteria
        criteria = {
            "min_empanelled_years": 5,
            "min_completed_category_jobs": 3,
            "max_reopen_rate_allowed_pct": 20.0,
            "min_sla_compliance_pct": 75.0,
            "required_dlp_warranty_months": 24,
            "technical_standards": ["IRC:SP:98-2020", "IS:73-2013 VG-30", "MoRTH Section 500"],
            "evaluation_weights": {
                "financial_bid": 0.40,
                "technical_quality": 0.35,
                "delivery_commitment": 0.15,
                "dlp_extended_warranty": 0.10
            }
        }

        # If custom bids not supplied, synthesize competitive bids from top empanelled contractors
        bids = custom_bids or []
        if not bids:
            top_contractors = comp_data["comparisons"][:4]
            sample_variances = [-0.03, 0.02, -0.06, 0.05]
            sample_days = [18, 14, 21, 16]

            for i, c in enumerate(top_contractors):
                bid_amt = round(base_cost * (1.0 + sample_variances[i % len(sample_variances)]), 2)
                timeline = sample_days[i % len(sample_days)]
                bids.append({
                    "bidder_id": c["contractor_id"],
                    "contractor_name": c["contractor_name"],
                    "quoted_amount_inr": bid_amt,
                    "proposed_duration_days": timeline,
                    "warranty_months": 24 + (12 if i == 0 else 0),
                    "iso_certified": True,
                    "subcontracting_proposed": False
                })

        # Evaluate bids deterministically against criteria
        evaluated_bids = []
        min_bid = min(b["quoted_amount_inr"] for b in bids)

        for b in bids:
            # Check eligibility
            c_info = next((c for c in comp_data["comparisons"] if c["contractor_id"] == b["bidder_id"]), None)
            is_eligible = True
            disqualification_reasons = []

            if c_info:
                if c_info["category_jobs_done"] < criteria["min_completed_category_jobs"]:
                    is_eligible = False
                    disqualification_reasons.append(f"Insufficient completed category jobs ({c_info['category_jobs_done']} < {criteria['min_completed_category_jobs']}).")
                if (c_info["reopen_frequency_pct"] or 0) > criteria["max_reopen_rate_allowed_pct"]:
                    is_eligible = False
                    disqualification_reasons.append(f"Reopened repair frequency exceeds ceiling ({c_info['reopen_frequency_pct']}% > {criteria['max_reopen_rate_allowed_pct']}%).")

            # Scoring:
            # 1. Financial score: (min_bid / quoted) * 100
            financial_score = round((min_bid / b["quoted_amount_inr"]) * 100.0, 1)

            # 2. Technical score from historical suitability
            technical_score = c_info["overall_suitability_score"] if c_info else 70.0

            # 3. Delivery commitment score
            delivery_score = max(50.0, 100.0 - max(0, b["proposed_duration_days"] - 14) * 3.0)

            # 4. Extended warranty score
            warranty_score = min(100.0, (b["warranty_months"] / 24.0) * 100.0)

            composite_bid_score = round(
                (financial_score * criteria["evaluation_weights"]["financial_bid"]) +
                (technical_score * criteria["evaluation_weights"]["technical_quality"]) +
                (delivery_score * criteria["evaluation_weights"]["delivery_commitment"]) +
                (warranty_score * criteria["evaluation_weights"]["dlp_extended_warranty"]),
                1
            ) if is_eligible else 0.0

            evaluated_bids.append({
                "bidder_id": b["bidder_id"],
                "contractor_name": b["contractor_name"],
                "quoted_amount_inr": b["quoted_amount_inr"],
                "variance_from_estimate_pct": round(((b["quoted_amount_inr"] - base_cost) / base_cost) * 100.0, 1),
                "proposed_duration_days": b["proposed_duration_days"],
                "warranty_months": b["warranty_months"],
                "is_eligible": is_eligible,
                "disqualification_reasons": disqualification_reasons,
                "scores": {
                    "financial_score": financial_score,
                    "technical_score": technical_score,
                    "delivery_score": round(delivery_score, 1),
                    "warranty_score": round(warranty_score, 1)
                },
                "composite_evaluation_score": composite_bid_score,
                "rank": None
            })

        # Rank eligible bids descending
        eligible = [b for b in evaluated_bids if b["is_eligible"]]
        eligible.sort(key=lambda x: x["composite_evaluation_score"], reverse=True)
        for idx, b in enumerate(eligible):
            b["rank"] = f"L{idx + 1}"

        tender_id = f"TNDR-{uuid.uuid4().hex[:8]}"
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        with self._get_conn() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO tender_evaluations (
                    tender_id, proposal_id, project_scope, qualification_criteria,
                    technical_criteria, financial_criteria, dlp_warranty_months,
                    bids_json, evaluation_summary, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                tender_id, proposal_id, comp_data["target_engineering_category"],
                json.dumps(criteria), json.dumps(criteria["technical_standards"]),
                json.dumps({"base_cost_inr": base_cost}), criteria["required_dlp_warranty_months"],
                json.dumps(evaluated_bids), json.dumps({"recommended_bidder": eligible[0]["contractor_name"] if eligible else None}),
                now_str
            ))
            conn.commit()

        return {
            "tender_id": tender_id,
            "proposal_id": proposal_id,
            "project_scope": comp_data["target_engineering_category"],
            "indicative_base_cost_inr": base_cost,
            "criteria": criteria,
            "evaluated_bids": evaluated_bids,
            "recommended_bidder": eligible[0] if eligible else None,
            "disclaimer": "OFFICER DEMO WORKSPACE: This evaluation is purely illustrative decision-support. Official procurement awards require gazetted tendering under BMC Public Procurement Manual 2021."
        }
