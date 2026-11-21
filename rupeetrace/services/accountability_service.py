from typing import List, Dict, Any, Optional
from rupeetrace.services.relationship_service import RelationshipService
from rupeetrace.models.entities import Contractor, WorkOrder

class AccountabilityService:
    def __init__(self, rel_service: RelationshipService):
        self.rel_service = rel_service

    def list_contractor_scorecards(self) -> List[Dict[str, Any]]:
        """
        Returns high-level scorecard summaries for all empanelled contractors.
        """
        scorecards = []
        for contractor in self.rel_service.loader.contractors:
            sc = self.get_contractor_scorecard(contractor.contractor_id)
            if sc:
                scorecards.append(sc)
        # Sort by composite score descending
        scorecards.sort(key=lambda x: x["composite_score"], reverse=True)
        return scorecards

    def get_contractor_scorecard(self, contractor_id: str) -> Optional[Dict[str, Any]]:
        """
        Engine 3: Detailed contractor scorecard with contextual fairness adjustments.
        Deterministic computation based on MVP weights.
        """
        contractor = self.rel_service.get_contractor(contractor_id)
        if not contractor:
            return None

        w_orders = self.rel_service.work_orders_by_contractor.get(contractor.contractor_id, [])
        total_jobs = len(w_orders)

        if total_jobs == 0:
            return {
                "contractor_id": contractor.contractor_id,
                "contractor_name": contractor.contractor_name,
                "empanelled_since": contractor.empanelled_since,
                "active_wards": contractor.active_wards,
                "total_jobs": 0,
                "composite_score": 0.0,
                "sample_size_warning": True,
                "warning_message": "Insufficient work orders recorded for reliable evaluation.",
                "provenance": contractor.provenance
            }

        total_spend = round(sum(wo.cost_inr for wo in w_orders), 2)
        sla_met_count = sum(1 for wo in w_orders if wo.sla_met)
        reopened_count = sum(1 for wo in w_orders if wo.reopened_within_30d)
        dlp_breach_count = sum(1 for wo in w_orders if wo.is_dlp_breach)
        reopened_spend = round(sum(wo.cost_inr for wo in w_orders if wo.reopened_within_30d), 2)

        # 1. Raw Metrics
        sla_success_rate = round((sla_met_count / total_jobs) * 100.0, 2)
        reopen_rate = round((reopened_count / total_jobs) * 100.0, 2)

        valid_variances = [wo.cost_variance_pct for wo in w_orders if wo.cost_variance_pct is not None]
        avg_rate_deviation_pct = round(sum(valid_variances) / len(valid_variances), 2) if valid_variances else 0.0

        # Repeat repair burden: % of jobs on roads where contractor did multiple repairs
        road_job_counts: Dict[str, int] = {}
        for wo in w_orders:
            road_job_counts[wo.road_id] = road_job_counts.get(wo.road_id, 0) + 1
        repeat_jobs = sum(cnt for rid, cnt in road_job_counts.items() if cnt > 1)
        repeat_repair_burden_pct = round((repeat_jobs / total_jobs) * 100.0, 2)

        # 2. Independent Sub-Scores (0 to 100 scale)
        # SLA score (30% weight)
        sla_score = sla_success_rate

        # Durability score (30% weight): 100 minus penalty for reopened jobs
        durability_score = max(0.0, round(100.0 - (reopen_rate * 3.0), 2))

        # Cost efficiency score (25% weight): benchmark is rate card
        cost_score = max(0.0, min(100.0, round(100.0 - max(0.0, avg_rate_deviation_pct - 5.0) * 2.5, 2)))

        # Repeat repair score (15% weight)
        repeat_score = max(0.0, round(100.0 - (repeat_repair_burden_pct * 0.4), 2))

        # 3. Composite Score Calculation
        composite_score = round(
            (0.30 * sla_score) +
            (0.30 * durability_score) +
            (0.25 * cost_score) +
            (0.15 * repeat_score),
            2
        )

        # 4. Contextual Environmental Exposure
        wards_worked = list({wo.ward_code for wo in w_orders})
        ward_low_lying_vals = []
        for w_code in wards_worked:
            w_obj = self.rel_service.get_ward(w_code)
            if w_obj:
                ward_low_lying_vals.append(w_obj.low_lying_index)
        avg_low_lying = round(sum(ward_low_lying_vals) / len(ward_low_lying_vals), 2) if ward_low_lying_vals else 0.0

        sample_size_warning = total_jobs < 30

        return {
            "contractor_id": contractor.contractor_id,
            "contractor_name": contractor.contractor_name,
            "empanelled_since": contractor.empanelled_since,
            "active_wards": contractor.active_wards,
            "wards_with_recorded_work": wards_worked,
            "total_jobs": total_jobs,
            "total_recorded_billed_amount_inr": total_spend,
            "sample_size_warning": sample_size_warning,
            "composite_score": composite_score,
            "rating_tier": self._get_tier(composite_score),
            "score_breakdown": {
                "sla_performance": {
                    "weight_pct": 30.0,
                    "score": sla_score,
                    "raw_sla_success_rate_pct": sla_success_rate,
                    "jobs_meeting_sla": sla_met_count,
                    "jobs_breaching_sla": total_jobs - sla_met_count
                },
                "repair_durability": {
                    "weight_pct": 30.0,
                    "score": durability_score,
                    "raw_reopen_rate_pct": reopen_rate,
                    "reopened_jobs_count": reopened_count,
                    "reopened_expenditure_inr": reopened_spend
                },
                "cost_efficiency": {
                    "weight_pct": 25.0,
                    "score": cost_score,
                    "average_rate_deviation_pct": avg_rate_deviation_pct,
                    "overbilled_jobs_count": sum(1 for wo in w_orders if wo.is_overbilled)
                },
                "repeat_repair_burden": {
                    "weight_pct": 15.0,
                    "score": repeat_score,
                    "repeat_repair_burden_pct": repeat_repair_burden_pct,
                    "jobs_on_repeated_roads": repeat_jobs
                }
            },
            "contextual_factors": {
                "average_ward_low_lying_index": avg_low_lying,
                "dlp_breach_jobs_recorded": dlp_breach_count,
                "fairness_note": (
                    f"Contractor operates across {len(wards_worked)} wards with an average low-lying index "
                    f"of {avg_low_lying}. Durability variations should be viewed alongside ward-level drainage "
                    f"and chronic flooding hotspots."
                )
            },
            "provenance": contractor.provenance
        }

    def _get_tier(self, score: float) -> str:
        if score >= 85.0:
            return "Good Standing"
        elif score >= 70.0:
            return "Standard Performance"
        elif score >= 50.0:
            return "Under Observation"
        else:
            return "Requires Administrative Review"
