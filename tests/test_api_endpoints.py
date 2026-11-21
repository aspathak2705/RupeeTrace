import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from types import SimpleNamespace
from rupeetrace.data.data_loader import DataLoader
from rupeetrace.data.validation_service import ValidationService
from rupeetrace.services.relationship_service import RelationshipService
from rupeetrace.services.ward_service import WardService
from rupeetrace.services.road_service import RoadService
from rupeetrace.services.work_order_service import WorkOrderService
from rupeetrace.services.money_trail_service import MoneyTrailService
from rupeetrace.services.audit_service import AuditService
from rupeetrace.services.accountability_service import AccountabilityService
from rupeetrace.services.next_rupee_service import NextRupeeService

from rupeetrace.api.routes import health, wards, roads, work_orders, audits, contractors

def test_all_api_endpoints():
    # Setup state
    loader = DataLoader()
    loader.load_all()
    val_svc = ValidationService(loader)
    val_rep = val_svc.run_full_validation()
    rel = RelationshipService(loader)

    app_state = SimpleNamespace(
        loader=loader,
        validation_report=val_rep,
        rel_service=rel,
        ward_service=WardService(rel),
        road_service=RoadService(rel),
        work_order_service=WorkOrderService(rel),
        money_trail_service=MoneyTrailService(rel),
        audit_service=AuditService(rel),
        accountability_service=AccountabilityService(rel),
        next_rupee_service=NextRupeeService(rel)
    )
    mock_request = SimpleNamespace(app=SimpleNamespace(state=app_state))

    # 1. Health
    h = health.get_health(mock_request)
    assert h.status == "HEALTHY"
    assert h.dataset_summary["work_orders_count"] == 2499

    # 2. Wards
    w_list = wards.get_wards(mock_request)
    assert len(w_list) == 24

    w_detail = wards.get_ward_detail(mock_request, "A")
    assert w_detail["ward_code"] == "A"

    mt = wards.get_ward_money_trail(mock_request, "A")
    assert mt["ward_code"] == "A"
    assert mt["total_recorded_work_order_expenditure_inr"] > 0
    assert len(mt["underlying_work_order_ids"]) == mt["total_work_orders"]

    nr = wards.get_ward_next_rupee(mock_request, "A")
    assert nr["ward_code"] == "A"
    assert nr["total_budget_allocated_inr"] <= nr["remaining_budget_inr"]

    # 3. Roads
    r_list = roads.get_roads(mock_request)
    assert len(r_list) == 291

    r_detail = roads.get_road_detail(mock_request, "RD0001")
    assert r_detail["road_id"] == "RD0001"

    r_wos = roads.get_road_work_orders(mock_request, "RD0001")
    assert len(r_wos) == r_detail["total_work_orders"]

    r_comps = roads.get_road_complaints(mock_request, "RD0001")
    assert len(r_comps) == r_detail["linked_complaints_count"]

    r_hist = roads.get_road_financial_history(mock_request, "RD0001")
    assert r_hist["road_id"] == "RD0001"
    assert len(r_hist["repair_history"]) == r_hist["total_work_orders"]

    # 4. Work Orders & Evidence
    wos = work_orders.list_work_orders(mock_request, limit=10)
    assert len(wos) == 10

    wo_item = work_orders.get_work_order(mock_request, wos[0].work_order_id)
    assert wo_item.work_order_id == wos[0].work_order_id

    wo_ev = work_orders.get_work_order_evidence(mock_request, wos[0].work_order_id)
    assert wo_ev.work_order.work_order_id == wos[0].work_order_id
    assert len(wo_ev.provenances) > 0

    # 5. Audits
    aud_list = audits.get_audit_findings(mock_request, limit=10)
    assert len(aud_list) == 10

    first_finding_id = aud_list[0]["finding_id"]
    f_detail = audits.get_finding_by_id(mock_request, first_finding_id)
    assert f_detail["finding_id"] == first_finding_id
    assert f_detail["status"] in ("Needs review", "High priority review", "Information")

    # 6. Contractors
    c_list = contractors.get_contractors(mock_request)
    assert len(c_list) == 8

    c_sc = contractors.get_contractor_scorecard(mock_request, c_list[0]["contractor_id"])
    assert 0.0 <= c_sc["composite_score"] <= 100.0
    assert "score_breakdown" in c_sc
    assert "contextual_factors" in c_sc

if __name__ == "__main__":
    test_all_api_endpoints()
    print("ALL API ENDPOINTS TESTS PASSED!")
