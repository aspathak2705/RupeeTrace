from typing import List
from fastapi import APIRouter, Request, HTTPException, Path
from rupeetrace.schemas.api_schemas import (
    RoadSummary, RoadDetailResponse, WorkOrderResponse, ComplaintResponse, RoadFinancialHistoryResponse
)

router = APIRouter(prefix="/roads", tags=["Roads"])

@router.get("", response_model=List[RoadSummary])
def get_roads(request: Request):
    road_service = request.app.state.road_service
    return road_service.list_roads()

@router.get("/{road_id}", response_model=RoadDetailResponse)
def get_road_detail(request: Request, road_id: str = Path(..., description="Road Segment ID (e.g., RD0001)")):
    road_service = request.app.state.road_service
    road = road_service.get_road_detail(road_id)
    if not road:
        raise HTTPException(status_code=404, detail=f"Road '{road_id}' not found.")
    return road

@router.get("/{road_id}/work-orders", response_model=List[WorkOrderResponse])
def get_road_work_orders(request: Request, road_id: str = Path(...)):
    road_service = request.app.state.road_service
    road = road_service.rel_service.get_road(road_id)
    if not road:
        raise HTTPException(status_code=404, detail=f"Road '{road_id}' not found.")
    return road_service.get_road_work_orders(road_id)

@router.get("/{road_id}/complaints", response_model=List[ComplaintResponse])
def get_road_complaints(request: Request, road_id: str = Path(...)):
    road_service = request.app.state.road_service
    road = road_service.rel_service.get_road(road_id)
    if not road:
        raise HTTPException(status_code=404, detail=f"Road '{road_id}' not found.")
    return road_service.get_road_complaints(road_id)

@router.get("/{road_id}/financial-history", response_model=RoadFinancialHistoryResponse)
def get_road_financial_history(request: Request, road_id: str = Path(...)):
    mt_service = request.app.state.money_trail_service
    history = mt_service.get_road_financial_history(road_id)
    if not history:
        raise HTTPException(status_code=404, detail=f"Road '{road_id}' not found.")
    return history
