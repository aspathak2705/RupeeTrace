from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Request, HTTPException, Path, Depends, Body
from pydantic import BaseModel
from rupeetrace.schemas.api_schemas import AuditFindingResponse
from rupeetrace.core.auth import require_role

router = APIRouter(prefix="/audits", tags=["Repair Auditor"])

class ReviewAuditRequest(BaseModel):
    action: str = "ACKNOWLEDGE" # "ACKNOWLEDGE", "DISPATCH_RECOVERY_NOTICE", "DISMISS_DISPUTE"
    remedial_notes: str
    recovery_amount_inr: Optional[float] = None

@router.get("", response_model=List[AuditFindingResponse])
def get_audit_findings(
    request: Request,
    finding_type: Optional[str] = None,
    ward_code: Optional[str] = None,
    road_id: Optional[str] = None,
    contractor_id: Optional[str] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 100
):
    audit_service = request.app.state.audit_service
    return audit_service.get_all_findings(
        finding_type=finding_type,
        ward_code=ward_code,
        road_id=road_id,
        contractor_id=contractor_id,
        status=status,
        severity=severity,
        limit=limit
    )

@router.get("/{finding_id}", response_model=AuditFindingResponse)
def get_finding_by_id(request: Request, finding_id: str = Path(...)):
    audit_service = request.app.state.audit_service
    finding = audit_service.get_finding_by_id(finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail=f"Audit finding '{finding_id}' not found.")
    return finding

@router.post("/{finding_id}/review")
def review_audit_finding(
    request: Request,
    finding_id: str = Path(...),
    body: ReviewAuditRequest = Body(...),
    current_user: Dict[str, Any] = Depends(require_role("officer"))
):
    audit_service = request.app.state.audit_service
    finding = audit_service.get_finding_by_id(finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail=f"Audit finding '{finding_id}' not found.")

    return {
        "finding_id": finding_id,
        "action_taken": body.action,
        "reviewed_by": f"{current_user.get('name')} ({current_user.get('designation')})",
        "officer_notes": body.remedial_notes,
        "recovery_amount_inr": body.recovery_amount_inr or finding.recovery_opportunity_inr,
        "status": "RECOVERY_DISPATCHED" if body.action == "DISPATCH_RECOVERY_NOTICE" else "OFFICER_ACKNOWLEDGED"
    }
