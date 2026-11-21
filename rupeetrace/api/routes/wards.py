from typing import List, Dict, Any
from fastapi import APIRouter, Request, HTTPException, Path
from rupeetrace.schemas.api_schemas import (
    WardSummary, WardDetailResponse, MoneyTrailResponse, NextRupeeResponse
)

router = APIRouter(prefix="/wards", tags=["Wards"])

@router.get("", response_model=List[WardSummary])
def get_wards(request: Request):
    ward_service = request.app.state.ward_service
    return ward_service.list_wards()

@router.get("/{ward_code}", response_model=WardDetailResponse)
def get_ward_detail(request: Request, ward_code: str = Path(..., description="BMC Ward Code (e.g., A, F/N, K/W)")):
    ward_service = request.app.state.ward_service
    detail = ward_service.get_ward_detail(ward_code)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Ward '{ward_code}' not found.")
    return detail

@router.get("/{ward_code}/money-trail", response_model=MoneyTrailResponse)
def get_ward_money_trail(request: Request, ward_code: str = Path(...)):
    mt_service = request.app.state.money_trail_service
    trail = mt_service.get_ward_money_trail(ward_code)
    if not trail:
        raise HTTPException(status_code=404, detail=f"Ward '{ward_code}' not found.")
    return trail

@router.get("/{ward_code}/next-rupee", response_model=NextRupeeResponse)
def get_ward_next_rupee(request: Request, ward_code: str = Path(...)):
    nr_service = request.app.state.next_rupee_service
    plan = nr_service.plan_next_rupee_for_ward(ward_code)
    if not plan:
        raise HTTPException(status_code=404, detail=f"Ward '{ward_code}' not found.")
    return plan
