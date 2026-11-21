from typing import List, Optional
from fastapi import APIRouter, Request, HTTPException, Path
from rupeetrace.schemas.api_schemas import WorkOrderResponse, AuditEvidenceResponse

router = APIRouter(prefix="/work-orders", tags=["Work Orders"])

@router.get("", response_model=List[WorkOrderResponse])
def list_work_orders(
    request: Request,
    ward_code: Optional[str] = None,
    road_id: Optional[str] = None,
    contractor_id: Optional[str] = None,
    is_dlp_breach: Optional[bool] = None,
    is_overbilled: Optional[bool] = None,
    limit: int = 100
):
    wo_service = request.app.state.work_order_service
    return wo_service.list_work_orders(
        ward_code=ward_code,
        road_id=road_id,
        contractor_id=contractor_id,
        is_dlp_breach=is_dlp_breach,
        is_overbilled=is_overbilled,
        limit=limit
    )

@router.get("/{work_order_id}", response_model=WorkOrderResponse)
def get_work_order(request: Request, work_order_id: str = Path(...)):
    wo_service = request.app.state.work_order_service
    wo = wo_service.get_work_order(work_order_id)
    if not wo:
        raise HTTPException(status_code=404, detail=f"Work Order '{work_order_id}' not found.")
    return wo

@router.get("/{work_order_id}/evidence", response_model=AuditEvidenceResponse)
def get_work_order_evidence(request: Request, work_order_id: str = Path(...)):
    wo_service = request.app.state.work_order_service
    evidence = wo_service.get_work_order_evidence(work_order_id)
    if not evidence:
        raise HTTPException(status_code=404, detail=f"Work Order '{work_order_id}' not found.")

    contractor_dict = evidence.contractor.dict() if evidence.contractor else None
    rate_card_dict = evidence.rate_card.dict() if evidence.rate_card else None
    traffic_dict = evidence.traffic.dict() if evidence.traffic else None
    facilities_list = [f.dict() for f in evidence.nearby_facilities]

    return AuditEvidenceResponse(
        work_order=evidence.work_order,
        linked_complaints=evidence.linked_complaints,
        road=evidence.road,
        ward=evidence.ward,
        contractor=contractor_dict,
        rate_card=rate_card_dict,
        traffic=traffic_dict,
        nearby_facilities=facilities_list,
        sla_and_reopening=evidence.sla_and_reopening,
        financial_audit=evidence.financial_audit,
        provenances=evidence.provenances
    )
