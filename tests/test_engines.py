import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from rupeetrace.data.data_loader import DataLoader
from rupeetrace.services.relationship_service import RelationshipService
from rupeetrace.services.money_trail_service import MoneyTrailService
from rupeetrace.services.audit_service import AuditService
from rupeetrace.services.accountability_service import AccountabilityService
from rupeetrace.services.next_rupee_service import NextRupeeService

def test_four_intelligence_engines():
    loader = DataLoader()
    loader.load_all()
    rel = RelationshipService(loader)

    # 1. Test Engine 1: Money Trail Engine
    mt_service = MoneyTrailService(rel)
    trail = mt_service.get_ward_money_trail("F/N")
    assert trail is not None
    assert trail["ward_code"] == "F/N"
    assert trail["monsoon_repair_budget_inr_2025"] == 10500000.0
    assert trail["total_recorded_work_order_expenditure_inr"] > 0
    assert len(trail["underlying_work_order_ids"]) == trail["total_work_orders"]
    assert len(trail["contractor_expenditure"]) > 0
    assert len(trail["repair_method_expenditure"]) > 0
    assert len(trail["road_expenditure"]) > 0

    # Test Road Financial History
    road_hist = mt_service.get_road_financial_history("RD0001")
    assert road_hist is not None
    assert road_hist["road_id"] == "RD0001"
    assert len(road_hist["repair_history"]) == road_hist["total_work_orders"]

    # 2. Test Engine 2: Repair Auditor
    audit_service = AuditService(rel)
    findings = audit_service.get_all_findings(limit=500)
    assert len(findings) > 0

    # Verify Rate Card Deviations
    rate_findings = audit_service.get_all_findings(finding_type="RATE_CARD_DEVIATION")
    assert len(rate_findings) > 0
    f1 = rate_findings[0]
    assert "formula" in f1["calculation"]
    assert f1["status"] in ("Needs review", "High priority review")
    assert f1["limitations"] != ""

    # Verify Possible Duplicates
    dup_findings = audit_service.get_all_findings(finding_type="POSSIBLE_DUPLICATE")
    assert len(dup_findings) > 0

    # Verify DLP Findings
    dlp_findings = audit_service.get_all_findings(finding_type="DLP_EXPENDITURE")
    assert len(dlp_findings) > 0
    assert "contract/warranty review required" in dlp_findings[0]["reason"]

    # Verify SLA & Durability Findings
    dur_findings = audit_service.get_all_findings(finding_type="SLA_DURABILITY_BREACH")
    assert len(dur_findings) > 0

    # 3. Test Engine 3: Fair Accountability Engine
    ac_service = AccountabilityService(rel)
    scorecards = ac_service.list_contractor_scorecards()
    assert len(scorecards) == 8  # 8 contractors

    for sc in scorecards:
        assert 0.0 <= sc["composite_score"] <= 100.0
        assert sc["total_jobs"] > 0
        assert "score_breakdown" in sc
        assert "contextual_factors" in sc
        assert "average_ward_low_lying_index" in sc["contextual_factors"]

    # 4. Test Engine 4: Next Rupee Planner
    nr_service = NextRupeeService(rel)
    plan = nr_service.plan_next_rupee_for_ward("F/N")
    assert plan is not None
    assert plan["ward_code"] == "F/N"
    assert plan["total_budget_allocated_inr"] <= plan["remaining_budget_inr"]
    assert len(plan["recommendations"]) > 0

    # Check top recommendation structure
    top_rec = plan["recommendations"][0]
    assert "priority_score" in top_rec
    assert "recommended_intervention" in top_rec
    assert "score_factors" in top_rec
    assert top_rec["funding_decision"] in (
        "Recommended for Immediate Funding",
        "Pending Engineering Survey (Cost TBD)",
        "Deferred (Exceeds Available Ward Budget)"
    )

if __name__ == "__main__":
    test_four_intelligence_engines()
    print("All 4 Intelligence Engines tests PASSED!")
