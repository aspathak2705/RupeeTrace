import json
from datetime import datetime
from typing import Dict, Any, Optional
from rupeetrace.services.janmat_service import JanmatService
from rupeetrace.services.budget_simulator_service import BudgetSimulatorService
from rupeetrace.services.contractor_intelligence_service import ContractorIntelligenceService
from rupeetrace.services.material_intelligence_service import MaterialIntelligenceService
from rupeetrace.services.citizen_verification_service import CitizenVerificationService
from rupeetrace.services.relationship_service import RelationshipService

class CivicValueOptimizerService:
    def __init__(
        self,
        rel_service: RelationshipService,
        janmat_service: JanmatService,
        budget_service: BudgetSimulatorService,
        contractor_service: ContractorIntelligenceService,
        material_service: MaterialIntelligenceService,
        verification_service: CitizenVerificationService
    ):
        self.rel_service = rel_service
        self.janmat = janmat_service
        self.budget = budget_service
        self.contractor = contractor_service
        self.material = material_service
        self.verification = verification_service

    def generate_unified_investment_brief(self, proposal_id: str) -> Dict[str, Any]:
        """
        Synthesizes the complete Civic Infrastructure Intelligence System into an authoritative,
        evidence-grounded decision brief answering the 13 core questions.
        """
        proposal = self.janmat.get_proposal_detail(proposal_id)
        if not proposal:
            raise ValueError(f"Proposal {proposal_id} not found")

        road = self.rel_service.get_road(proposal["related_road_id"])
        ward = self.rel_service.get_ward(proposal["ward_code"])

        # Contractor analysis
        contractor_analysis = self.contractor.compare_contractors_for_proposal(proposal_id)
        top_contractor = contractor_analysis["comparisons"][0] if contractor_analysis["comparisons"] else None

        # Material optimization
        cost_opt = self.material.generate_cost_optimization_report(
            base_cost=proposal["indicative_cost_inr"],
            category=proposal["category"]
        )

        # Verification context
        verification_data = self.verification.get_road_verification_summary(proposal["related_road_id"])

        # Cost breakdown
        cost_breakdown = self.budget.get_project_cost_breakdown(proposal["indicative_cost_inr"], proposal["category"])

        factors = proposal["score_factors"]

        # Formulate answers to the 13 foundational questions
        answers = {
            "q1_why_is_project_needed": {
                "question": "1. Why is this project needed?",
                "summary": proposal["problem_statement"],
                "context": proposal["generation_reason"]
            },
            "q2_supporting_evidence": {
                "question": "2. What evidence supports it?",
                "complaints_count": len(proposal["supporting_complaint_ids"]),
                "complaint_ids_sample": proposal["supporting_complaint_ids"][:5],
                "nearby_facilities": proposal["nearby_facilities"],
                "flood_context": proposal["flood_context"],
                "traffic_context": proposal["traffic_context"],
                "evidence_completeness_pct": proposal["evidence_completeness_pct"]
            },
            "q3_citizen_sentiment_priority": {
                "question": "3. What do citizens think?",
                "total_votes": proposal["votes_total"],
                "upvotes": proposal["votes_up"],
                "comments_count": len(proposal.get("comments", [])),
                "community_priority_score": factors.get("public_priority", 50.0),
                "sample_citizen_comment": proposal["comments"][0]["comment_text"] if proposal.get("comments") else "No direct comment logged yet."
            },
            "q4_urgency": {
                "question": "4. How urgent is it?",
                "urgency_score": factors.get("infrastructure_urgency", 50.0),
                "severity_category": proposal["category"],
                "safety_score": factors.get("safety_impact", 50.0),
                "urgency_verdict": "High Priority Intervention" if factors.get("infrastructure_urgency", 50) >= 80 else "Standard Planned Maintenance"
            },
            "q5_technical_feasibility": {
                "question": "5. Is it technically feasible?",
                "feasibility_score": factors.get("technical_feasibility", 90.0),
                "engineering_method": cost_opt["baseline_option"]["title"],
                "estimated_duration_days": proposal["estimated_duration_days"],
                "feasibility_note": "Standard rate-card intervention; execution feasible within dry-weather shift."
            },
            "q6_indicative_cost_and_budget": {
                "question": "6. What is the indicative cost and budget fit?",
                "indicative_cost_inr": proposal["indicative_cost_inr"],
                "itemized_breakdown": cost_breakdown,
                "ward_monsoon_budget_inr": ward.monsoon_repair_budget_inr_2025 if ward else 0.0,
                "financial_feasibility_score": factors.get("financial_feasibility", 85.0)
            },
            "q7_material_engineering_alternatives": {
                "question": "7. What alternative engineering/material approaches exist?",
                "baseline_material": cost_opt["baseline_option"]["title"],
                "recommended_alternative": cost_opt["best_lifecycle_value_recommendation"]["title"],
                "lifecycle_savings_pct": cost_opt["best_lifecycle_value_recommendation"]["lifecycle_savings_pct"],
                "alternatives_count": len(cost_opt["alternatives_evaluated"])
            },
            "q8_dlp_obligations": {
                "question": "8. Can existing DLP obligations cover any of the work?",
                "under_dlp": bool(proposal.get("under_dlp")),
                "dlp_investigation_flag": bool(proposal.get("dlp_investigation_flag")),
                "dlp_contractor_id": proposal.get("dlp_contractor_id"),
                "dlp_notice": proposal.get("dlp_notice") or "Road is outside statutory 24-month Defect Liability Period.",
                "action_recommended": "Issue Defect Liability Notice to contractor for zero-cost remedial works." if proposal.get("under_dlp") else "Proceed with competitive civic budget allocation."
            },
            "q9_contractor_experience": {
                "question": "9. Which contractors have relevant category experience?",
                "recommended_contractor": top_contractor["contractor_name"] if top_contractor else "No historical match",
                "category_jobs_completed": top_contractor["category_jobs_done"] if top_contractor else 0,
                "reopen_rate_pct": top_contractor["reopen_frequency_pct"] if top_contractor else 0.0,
                "sla_compliance_pct": top_contractor["sla_compliance_pct"] if top_contractor else 0.0,
                "suitability_score": top_contractor["overall_suitability_score"] if top_contractor else 0.0
            },
            "q10_procurement_criteria": {
                "question": "10. What procurement criteria should be considered?",
                "mandated_standards": ["IRC:SP:98-2020", "IS:73-2013 VG-30", "MoRTH Section 500"],
                "minimum_warranty_months": 24,
                "suggested_weighting": "40% Financial Bid, 35% Technical Quality/Durability, 15% Delivery Commitment, 10% Extended Warranty"
            },
            "q11_major_execution_risks": {
                "question": "11. What are the major execution risks?",
                "risks": proposal["risks_dependencies"],
                "environmental_flood_risk_score": factors.get("environmental_flood_resilience", 50.0),
                "mitigation": "Conduct night work shifts with Traffic Police corridor clearance and pre-cast utility pipe sleeves."
            },
            "q12_citizen_verification_mechanism": {
                "question": "12. How will citizens verify the work?",
                "verification_channel": "Road Passport QR-Code & JANMAT Citizen Portal",
                "stages_supported": "7-Stage Lifecycle Verification (Before-work, In-progress, Contractor completion, Junior Engineer review, Citizen verification, Post-monsoon monitoring)",
                "current_road_status": verification_data["overall_verification_status"]
            },
            "q13_success_measurement": {
                "question": "13. How will success be measured?",
                "metrics": [
                    "Zero complaint re-openings within 90 days of work order sign-off",
                    "Stormwater discharge time reduced under 20 minutes during 50mm/hr rainfall",
                    "Smooth running surface compliant with IRC Bump Integrator roughness index < 2200 mm/km",
                    "Over 85% citizen satisfaction score recorded on JANMAT community verification"
                ]
            }
        }

        return {
            "proposal_id": proposal["proposal_id"],
            "title": proposal["title"],
            "category": proposal["category"],
            "ward_code": proposal["ward_code"],
            "road_id": proposal["related_road_id"],
            "road_name": proposal["related_road_name"],
            "status": proposal["status"],
            "composite_score": proposal["composite_score"],
            "answers_to_13_questions": answers,
            "provenance_statement": "SYNTHETIC RESEARCH PROVENANCE: Generated by RupeeTrace Civic Value Optimizer integrating BMC synthetic open data, deterministic rate cards, and participatory citizen inputs."
        }
