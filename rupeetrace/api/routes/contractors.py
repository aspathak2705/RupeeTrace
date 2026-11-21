from typing import List
from fastapi import APIRouter, Request, HTTPException, Path
from rupeetrace.schemas.api_schemas import ContractorScorecardResponse

router = APIRouter(prefix="/contractors", tags=["Contractors"])

@router.get("", response_model=List[ContractorScorecardResponse])
def get_contractors(request: Request):
    ac_service = request.app.state.accountability_service
    return ac_service.list_contractor_scorecards()

@router.get("/{contractor_id}/scorecard", response_model=ContractorScorecardResponse)
def get_contractor_scorecard(request: Request, contractor_id: str = Path(...)):
    ac_service = request.app.state.accountability_service
    scorecard = ac_service.get_contractor_scorecard(contractor_id)
    if not scorecard:
        raise HTTPException(status_code=404, detail=f"Contractor '{contractor_id}' not found.")
    return scorecard
