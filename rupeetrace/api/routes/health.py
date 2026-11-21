from fastapi import APIRouter, Request
from rupeetrace.schemas.api_schemas import HealthResponse

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("", response_model=HealthResponse)
def get_health(request: Request):
    app_state = request.app.state
    summary = app_state.loader.ingestion_stats
    validation_status = app_state.validation_report.get("status", "UNKNOWN")
    return HealthResponse(
        status="HEALTHY",
        project="RupeeTrace",
        version="1.0.0",
        dataset_summary=summary,
        validation_status=validation_status
    )
