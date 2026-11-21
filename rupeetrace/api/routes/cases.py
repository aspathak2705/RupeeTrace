from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Request, HTTPException, Path

router = APIRouter(prefix="/cases", tags=["Shared Cases"])

class CreateCaseRequest(BaseModel):
    road_id: str
    citizen_observation: str
    work_order_id: Optional[str] = None
    evidence_references: Optional[List[str]] = Field(default_factory=list)

class RespondCaseRequest(BaseModel):
    officer_name: str
    officer_response: str
    new_status: str = Field(..., description="Under Review, Clarified, Action Taken, or Resolved")

@router.get("", response_model=List[Dict[str, Any]])
def list_cases(
    request: Request,
    road_id: Optional[str] = None,
    status: Optional[str] = None
):
    case_service = request.app.state.case_service
    return case_service.list_cases(road_id=road_id, status=status)

@router.get("/{case_id}", response_model=Dict[str, Any])
def get_case(request: Request, case_id: str = Path(...)):
    case_service = request.app.state.case_service
    c = case_service.get_case(case_id)
    if not c:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")
    return c

@router.post("", response_model=Dict[str, Any], status_code=201)
def create_case(request: Request, body: CreateCaseRequest):
    case_service = request.app.state.case_service
    return case_service.create_case(
        road_id=body.road_id,
        citizen_observation=body.citizen_observation,
        work_order_id=body.work_order_id,
        evidence_references=body.evidence_references
    )

@router.post("/{case_id}/respond", response_model=Dict[str, Any])
def respond_case(request: Request, case_id: str, body: RespondCaseRequest):
    case_service = request.app.state.case_service
    updated = case_service.respond_case(
        case_id=case_id,
        officer_name=body.officer_name,
        officer_response=body.officer_response,
        new_status=body.new_status
    )
    if not updated:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")
    return updated
