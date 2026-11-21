from typing import List, Optional
from fastapi import APIRouter, Request, HTTPException, Path
from rupeetrace.schemas.api_schemas import AuditFindingResponse

router = APIRouter(prefix="/audits", tags=["Repair Auditor"])

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
