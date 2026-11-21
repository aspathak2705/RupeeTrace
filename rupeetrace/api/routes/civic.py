import urllib.parse
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Request, HTTPException, Path, Query, Body, UploadFile, File, Form, Depends
from pydantic import BaseModel, Field
from rupeetrace.core.auth import require_role

router = APIRouter(prefix="/civic", tags=["Civic Intelligence"])

# --- Request / Response Pydantic Models ---

class CastVoteRequest(BaseModel):
    user_id: str = Field(..., description="Demo or authenticated user ID")
    vote_type: str = Field("upvote", description="'upvote', 'downvote', or 'support'")

class AddCommentRequest(BaseModel):
    user_id: str
    user_name: str
    comment_text: str
    user_role: str = "citizen"

class LifecycleUpdateRequest(BaseModel):
    new_status: str
    actor: str
    reason: str
    supporting_evidence: Optional[str] = None

class CitizenProposalRequest(BaseModel):
    ward_code: str
    road_id: str
    category: str
    title: str
    problem_statement: str
    citizen_id: str
    citizen_name: str

class OptimizeBudgetRequest(BaseModel):
    total_budget: float
    contingency_pct: float = 5.0
    mandatory_proposal_ids: Optional[List[str]] = None
    disallowed_categories: Optional[List[str]] = None
    weights: Optional[Dict[str, float]] = None

class SaveScenarioRequest(BaseModel):
    scenario_name: str
    description: str
    total_budget: float
    selected_proposal_ids: List[str]
    created_by: str = "Demo Officer"

class TenderEvaluateRequest(BaseModel):
    custom_bids: Optional[List[Dict[str, Any]]] = None

class CostOptimizationRequest(BaseModel):
    base_cost: float
    category: str
    road_surface: Optional[str] = None
    traffic_level: Optional[str] = None

class AIResearchRequest(BaseModel):
    project_type: str
    surface: str
    ward_context: str

class SubmitVerificationRequest(BaseModel):
    road_id: str
    work_order_id: Optional[str] = None
    proposal_id: Optional[str] = None
    verification_action: str
    observation_text: str
    submitter_id: str
    image_url: Optional[str] = None
    gps_lat: Optional[float] = None
    gps_lon: Optional[float] = None

# --- Proposals & JANMAT Endpoints ---

@router.get("/proposals")
def list_proposals(
    request: Request,
    ward_code: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None
):
    janmat_svc = request.app.state.janmat_service
    return janmat_svc.list_proposals(ward_code=ward_code, category=category, status=status, search=search)

@router.get("/proposals/{proposal_id}")
def get_proposal_detail(
    request: Request,
    proposal_id: str = Path(...)
):
    janmat_svc = request.app.state.janmat_service
    p = janmat_svc.get_proposal_detail(proposal_id)
    if not p:
        raise HTTPException(status_code=404, detail=f"Proposal '{proposal_id}' not found.")
    return p

@router.post("/proposals")
def create_citizen_proposal(
    request: Request,
    body: CitizenProposalRequest
):
    janmat_svc = request.app.state.janmat_service
    try:
        return janmat_svc.create_citizen_proposal(
            ward_code=body.ward_code,
            road_id=body.road_id,
            category=body.category,
            title=body.title,
            problem_statement=body.problem_statement,
            citizen_id=body.citizen_id,
            citizen_name=body.citizen_name
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/proposals/{proposal_id}/vote")
def cast_proposal_vote(
    request: Request,
    proposal_id: str = Path(...),
    body: CastVoteRequest = Body(...)
):
    janmat_svc = request.app.state.janmat_service
    try:
        return janmat_svc.cast_vote(proposal_id=proposal_id, user_id=body.user_id, vote_type=body.vote_type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/proposals/{proposal_id}/vote")
def withdraw_proposal_vote(
    request: Request,
    proposal_id: str = Path(...),
    user_id: str = Query(...)
):
    janmat_svc = request.app.state.janmat_service
    return janmat_svc.withdraw_vote(proposal_id=proposal_id, user_id=user_id)

@router.post("/proposals/{proposal_id}/comment")
def add_proposal_comment(
    request: Request,
    proposal_id: str = Path(...),
    body: AddCommentRequest = Body(...)
):
    janmat_svc = request.app.state.janmat_service
    try:
        return janmat_svc.add_comment(
            proposal_id=proposal_id,
            user_id=body.user_id,
            user_name=body.user_name,
            comment_text=body.comment_text,
            user_role=body.user_role
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/proposals/{proposal_id}/lifecycle")
def update_proposal_lifecycle(
    request: Request,
    proposal_id: str = Path(...),
    body: LifecycleUpdateRequest = Body(...),
    current_user: Dict[str, Any] = Depends(require_role("officer"))
):
    janmat_svc = request.app.state.janmat_service
    actor_name = f"{current_user.get('name', body.actor)} ({current_user.get('designation', 'Ward Officer')})"
    try:
        return janmat_svc.update_lifecycle_status(
            proposal_id=proposal_id,
            new_status=body.new_status,
            actor=actor_name,
            reason=body.reason,
            supporting_evidence=body.supporting_evidence
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Civic Budget Simulator Endpoints ---

@router.get("/simulator/{ward_prefix}/{ward_suffix}")
def simulate_split_ward_scenarios(
    request: Request,
    ward_prefix: str,
    ward_suffix: str,
    custom_budget: Optional[float] = None,
    contingency_pct: float = 5.0,
    max_projects: Optional[int] = None
):
    return simulate_ward_scenarios(request, f"{ward_prefix}/{ward_suffix}", custom_budget, contingency_pct, max_projects)

@router.get("/simulator/{ward_code}")
def simulate_ward_scenarios(
    request: Request,
    ward_code: str = Path(...),
    custom_budget: Optional[float] = None,
    contingency_pct: float = 5.0,
    max_projects: Optional[int] = None
):
    sim_svc = request.app.state.budget_simulator_service
    code = urllib.parse.unquote(ward_code) if "urllib" in globals() else ward_code
    try:
        return sim_svc.simulate_scenarios_for_ward(
            ward_code=code,
            custom_budget=custom_budget,
            contingency_pct=contingency_pct,
            max_projects=max_projects
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/simulator/{ward_prefix}/{ward_suffix}/optimize")
def optimize_split_budget(
    request: Request,
    ward_prefix: str,
    ward_suffix: str,
    body: OptimizeBudgetRequest = Body(...),
    current_user: Dict[str, Any] = Depends(require_role("officer"))
):
    return optimize_budget(request, f"{ward_prefix}/{ward_suffix}", body, current_user)

@router.post("/simulator/{ward_code}/optimize")
def optimize_budget(
    request: Request,
    ward_code: str = Path(...),
    body: OptimizeBudgetRequest = Body(...),
    current_user: Dict[str, Any] = Depends(require_role("officer"))
):
    sim_svc = request.app.state.budget_simulator_service
    return sim_svc.optimize_budget(
        ward_code=ward_code,
        total_budget=body.total_budget,
        contingency_pct=body.contingency_pct,
        mandatory_proposal_ids=body.mandatory_proposal_ids,
        disallowed_categories=body.disallowed_categories,
        weights=body.weights
    )

@router.post("/simulator/{ward_code}/scenarios")
def save_custom_scenario(
    request: Request,
    ward_code: str = Path(...),
    body: SaveScenarioRequest = Body(...),
    current_user: Dict[str, Any] = Depends(require_role("officer"))
):
    sim_svc = request.app.state.budget_simulator_service
    created_by = f"{current_user.get('name', body.created_by)} ({current_user.get('designation', 'Ward Officer')})"
    return sim_svc.save_custom_scenario(
        ward_code=ward_code,
        name=body.scenario_name,
        description=body.description,
        total_budget=body.total_budget,
        selected_ids=body.selected_proposal_ids,
        created_by=created_by
    )

@router.get("/simulator/{ward_code}/scenarios")
def list_custom_scenarios(
    request: Request,
    ward_code: str = Path(...)
):
    sim_svc = request.app.state.budget_simulator_service
    return sim_svc.list_custom_scenarios(ward_code)

# --- Contractor Intelligence Endpoints ---

@router.get("/contractors/{contractor_id}/category-profile")
def get_contractor_category_profile(
    request: Request,
    contractor_id: str = Path(...),
    category: Optional[str] = None
):
    ci_svc = request.app.state.contractor_intelligence_service
    profile = ci_svc.get_contractor_category_profile(contractor_id, category)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Contractor '{contractor_id}' not found.")
    return profile

@router.get("/contractors/compare/{proposal_id}")
def compare_contractors_for_proposal(
    request: Request,
    proposal_id: str = Path(...)
):
    ci_svc = request.app.state.contractor_intelligence_service
    try:
        return ci_svc.compare_contractors_for_proposal(proposal_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/tenders/{proposal_id}/evaluate")
def evaluate_tender_bids(
    request: Request,
    proposal_id: str = Path(...),
    body: TenderEvaluateRequest = Body(...),
    current_user: Dict[str, Any] = Depends(require_role("officer"))
):
    ci_svc = request.app.state.contractor_intelligence_service
    try:
        return ci_svc.prepare_tender_evaluation(proposal_id, body.custom_bids)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

# --- Material & Cost Intelligence Endpoints ---

@router.get("/materials/alternatives")
def get_material_alternatives(
    request: Request,
    category: str = Query(...)
):
    mat_svc = request.app.state.material_intelligence_service
    return mat_svc.get_material_alternatives_for_category(category)

@router.post("/materials/optimization-report")
def generate_cost_optimization_report(
    request: Request,
    body: CostOptimizationRequest = Body(...),
    current_user: Dict[str, Any] = Depends(require_role("officer"))
):
    mat_svc = request.app.state.material_intelligence_service
    return mat_svc.generate_cost_optimization_report(
        base_cost=body.base_cost,
        category=body.category,
        road_surface=body.road_surface,
        traffic_level=body.traffic_level
    )

@router.post("/materials/ai-research")
async def query_ai_material_research(
    request: Request,
    body: AIResearchRequest = Body(...),
    current_user: Dict[str, Any] = Depends(require_role("officer"))
):
    mat_svc = request.app.state.material_intelligence_service
    return await mat_svc.query_claude_material_research(
        project_type=body.project_type,
        surface=body.surface,
        ward_context=body.ward_context
    )

# --- Citizen Verification Endpoints ---

@router.get("/verification/{road_id}")
def get_road_verification(
    request: Request,
    road_id: str = Path(...)
):
    ver_svc = request.app.state.citizen_verification_service
    try:
        return ver_svc.get_road_verification_summary(road_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/verification")
def submit_citizen_verification(
    request: Request,
    body: SubmitVerificationRequest = Body(...)
):
    ver_svc = request.app.state.citizen_verification_service
    try:
        return ver_svc.submit_citizen_verification(
            road_id=body.road_id,
            work_order_id=body.work_order_id,
            proposal_id=body.proposal_id,
            verification_action=body.verification_action,
            observation_text=body.observation_text,
            submitter_id=body.submitter_id,
            image_url=body.image_url,
            gps_lat=body.gps_lat,
            gps_lon=body.gps_lon
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/verification/upload")
async def upload_verification_evidence(
    request: Request,
    file: UploadFile = File(...)
):
    ver_svc = request.app.state.citizen_verification_service
    content = await file.read()
    try:
        file_url = ver_svc.save_uploaded_evidence(file.filename or "evidence.jpg", content)
        return {"file_url": file_url, "filename": file.filename, "size_bytes": len(content)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Civic Value Optimizer Endpoints ---

@router.get("/optimizer/{proposal_id}/report")
def get_unified_decision_brief(
    request: Request,
    proposal_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("officer"))
):
    opt_svc = request.app.state.civic_value_optimizer_service
    try:
        return opt_svc.generate_unified_investment_brief(proposal_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
