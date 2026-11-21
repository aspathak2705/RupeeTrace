import time
from types import SimpleNamespace
from rupeetrace.data.data_loader import DataLoader
from rupeetrace.services.relationship_service import RelationshipService
from rupeetrace.services.janmat_service import JanmatService
from rupeetrace.services.budget_simulator_service import BudgetSimulatorService
from rupeetrace.services.contractor_intelligence_service import ContractorIntelligenceService
from rupeetrace.services.material_intelligence_service import MaterialIntelligenceService
from rupeetrace.services.citizen_verification_service import CitizenVerificationService
from rupeetrace.services.civic_value_optimizer_service import CivicValueOptimizerService

from rupeetrace.api.routes import civic

def test_civic_endpoints():
    print("Loading data foundation...", flush=True)
    t0 = time.time()
    loader = DataLoader()
    loader.load_all()
    rel = RelationshipService(loader)

    janmat = JanmatService(rel)
    sim = BudgetSimulatorService(rel, janmat)
    ci = ContractorIntelligenceService(rel, janmat)
    mat = MaterialIntelligenceService()
    ver = CitizenVerificationService(rel)
    opt = CivicValueOptimizerService(rel, janmat, sim, ci, mat, ver)

    app_state = SimpleNamespace(
        loader=loader,
        rel_service=rel,
        janmat_service=janmat,
        budget_simulator_service=sim,
        contractor_intelligence_service=ci,
        material_intelligence_service=mat,
        citizen_verification_service=ver,
        civic_value_optimizer_service=opt
    )
    req = SimpleNamespace(app=SimpleNamespace(state=app_state))

    print(f"Foundation ready in {round(time.time() - t0, 2)}s. Testing civic endpoints...", flush=True)

    # 1. Proposals
    proposals = civic.list_proposals(req, ward_code="K/E")
    print(f"1. GET proposals: count={len(proposals)}", flush=True)
    assert len(proposals) > 0
    p_id = proposals[0]["proposal_id"]

    # 2. Proposal Detail
    detail = civic.get_proposal_detail(req, proposal_id=p_id)
    print(f"2. GET proposal detail ({p_id}): title='{detail['title'][:35]}...'", flush=True)
    assert detail["proposal_id"] == p_id

    # 3. Vote
    vote_res = civic.cast_proposal_vote(req, proposal_id=p_id, body=civic.CastVoteRequest(user_id="citizen_smoke", vote_type="upvote"))
    print(f"3. POST vote: total={vote_res['votes_total']}, up={vote_res['votes_up']}", flush=True)
    assert vote_res["votes_up"] >= 1

    # 4. Comment
    comm_res = civic.add_proposal_comment(req, proposal_id=p_id, body=civic.AddCommentRequest(
        user_id="citizen_smoke",
        user_name="Smoke Test Resident",
        comment_text="Essential pedestrian safety project for school children."
    ))
    print(f"4. POST comment: id={comm_res['comment_id']}", flush=True)
    assert comm_res["comment_id"].startswith("COMM-")

    # 5. Lifecycle Transition
    lc_res = civic.update_proposal_lifecycle(req, proposal_id=p_id, body=civic.LifecycleUpdateRequest(
        new_status="Technical Review",
        actor="Er. V. Deshmukh (Assistant Engineer)",
        reason="Field inspection confirmed drainage slope requirement."
    ))
    print(f"5. POST lifecycle transition: new_status='{lc_res['new_status']}'", flush=True)
    assert lc_res["new_status"] == "Technical Review"

    # 6. Simulator Scenarios
    sim_res = civic.simulate_ward_scenarios(req, ward_code="K/E")
    print(f"6. GET simulator: scenarios={list(sim_res['scenarios'].keys())[:4]}", flush=True)
    assert "Balanced Ward Development" in sim_res["scenarios"]
    assert "Safety First" in sim_res["scenarios"]

    # 7. Simulator Optimizer
    opt_res = civic.optimize_budget(req, ward_code="K/E", body=civic.OptimizeBudgetRequest(
        total_budget=1200000.0,
        contingency_pct=5.0
    ))
    print(f"7. POST optimizer: feasible={opt_res['is_feasible']}, allocated=Rs.{opt_res['total_allocated_inr']:,.0f}", flush=True)
    assert opt_res["is_feasible"] is True

    # 8. Contractor Comparison for Proposal
    comp_res = civic.compare_contractors_for_proposal(req, proposal_id=p_id)
    print(f"8. GET contractor compare: candidates={len(comp_res['comparisons'])}, top='{comp_res['comparisons'][0]['contractor_name']}'", flush=True)
    assert len(comp_res["comparisons"]) == 8

    # 9. Tender Evaluation
    tender_res = civic.evaluate_tender_bids(req, proposal_id=p_id, body=civic.TenderEvaluateRequest())
    print(f"9. POST tender evaluate: bids={len(tender_res['evaluated_bids'])}, recommended='{tender_res['recommended_bidder']['contractor_name']}'", flush=True)
    assert len(tender_res["evaluated_bids"]) > 0

    # 10. Material Alternatives
    mat_res = civic.get_material_alternatives(req, category="Road rehabilitation")
    print(f"10. GET material alternatives: baseline='{mat_res['baseline']['code']}', alts={len(mat_res['alternatives'])}", flush=True)
    assert len(mat_res["alternatives"]) > 0

    # 11. Cost Optimization Report
    cost_res = civic.generate_cost_optimization_report(req, body=civic.CostOptimizationRequest(
        base_cost=420000.0,
        category="Road rehabilitation"
    ))
    print(f"11. POST cost opt report: best='{cost_res['best_lifecycle_value_recommendation']['title'][:30]}...', savings={cost_res['best_lifecycle_value_recommendation']['lifecycle_savings_pct']}%", flush=True)
    assert cost_res["best_lifecycle_value_recommendation"]["lifecycle_savings_pct"] > 0

    # 12. Citizen Verification Summary
    ver_res = civic.get_road_verification(req, road_id="RD0140")
    print(f"12. GET verification summary: status='{ver_res['overall_verification_status']}', conflict={ver_res['has_discrepancy_conflict']}", flush=True)
    assert ver_res["road_id"] == "RD0140"

    # 13. Citizen Verification Report Submission
    submit_res = civic.submit_citizen_verification(req, body=civic.SubmitVerificationRequest(
        road_id="RD0140",
        work_order_id="WO25-00600",
        verification_action="Visible Damage/Reopened",
        observation_text="Pothole has reappeared next to metro pillar after yesterday's rain.",
        submitter_id="citizen_smoke"
    ))
    print(f"13. POST citizen verification: id={submit_res['report_id']}, conflict={submit_res['conflict_flag']}", flush=True)
    assert submit_res["conflict_flag"] is True

    # 14. Unified Civic Value Optimizer Brief (13 Questions)
    brief_res = civic.get_unified_decision_brief(req, proposal_id=p_id)
    questions = brief_res["answers_to_13_questions"]
    print(f"14. GET unified brief: answered={len(questions)}/13 questions", flush=True)
    assert len(questions) == 13

    print(f"\nSUCCESS: ALL 14 CIVIC INTELLIGENCE SUITE TESTS PASSED IN {round(time.time() - t0, 2)}s!", flush=True)

if __name__ == "__main__":
    test_civic_endpoints()
