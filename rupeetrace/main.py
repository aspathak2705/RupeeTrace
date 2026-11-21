import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from rupeetrace.core.config import settings
from rupeetrace.data.data_loader import DataLoader
from rupeetrace.data.validation_service import ValidationService
from rupeetrace.services.relationship_service import RelationshipService
from rupeetrace.services.ward_service import WardService
from rupeetrace.services.road_service import RoadService
from rupeetrace.services.work_order_service import WorkOrderService
from rupeetrace.services.money_trail_service import MoneyTrailService
from rupeetrace.services.audit_service import AuditService
from rupeetrace.services.accountability_service import AccountabilityService
from rupeetrace.services.next_rupee_service import NextRupeeService
from rupeetrace.services.case_service import CaseService
from rupeetrace.services.graph_service import GraphService
from rupeetrace.services.assistant_service import AssistantService
from rupeetrace.services.ml_issue_service import MLIssueService
from rupeetrace.services.ml_anomaly_service import MLAnomalyService

from rupeetrace.api.routes import health, wards, roads, work_orders, audits, contractors, graph, cases, assistant, intelligence

def init_app_state(app: FastAPI):
    """Synchronously populates app.state so all routers and tests are immediately operational."""
    if hasattr(app.state, "loader") and app.state.loader is not None:
        return

    loader = DataLoader()
    loader.load_all()

    validation_svc = ValidationService(loader)
    val_report = validation_svc.run_full_validation()

    rel_service = RelationshipService(loader)

    app.state.loader = loader
    app.state.validation_report = val_report
    app.state.rel_service = rel_service
    app.state.ward_service = WardService(rel_service)
    app.state.road_service = RoadService(rel_service)
    app.state.work_order_service = WorkOrderService(rel_service)
    app.state.money_trail_service = MoneyTrailService(rel_service)
    app.state.audit_service = AuditService(rel_service)
    app.state.accountability_service = AccountabilityService(rel_service)
    app.state.next_rupee_service = NextRupeeService(rel_service)
    app.state.case_service = CaseService()
    app.state.ml_issue_service = MLIssueService(rel_service)
    app.state.ml_anomaly_service = MLAnomalyService(rel_service)
    app.state.graph_service = GraphService(
        rel_service,
        ml_issue_service=app.state.ml_issue_service,
        ml_anomaly_service=app.state.ml_anomaly_service
    )
    app.state.assistant_service = AssistantService(rel_service)

    # Pre-cache audit findings
    app.state.audit_service.get_all_findings(limit=1)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"Initializing RupeeTrace data foundation from: {settings.DATA_DIR}")
    init_app_state(app)
    print("RupeeTrace backend and intelligence engines ready.")
    yield
    print("RupeeTrace shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    description="RupeeTrace: Follow the Rupee — AI-Powered Road Repair Financial Accountability Platform"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(health.router, prefix=settings.API_PREFIX)
app.include_router(wards.router, prefix=settings.API_PREFIX)
app.include_router(roads.router, prefix=settings.API_PREFIX)
app.include_router(work_orders.router, prefix=settings.API_PREFIX)
app.include_router(audits.router, prefix=settings.API_PREFIX)
app.include_router(contractors.router, prefix=settings.API_PREFIX)
app.include_router(graph.router, prefix=settings.API_PREFIX)
app.include_router(cases.router, prefix=settings.API_PREFIX)
app.include_router(assistant.router, prefix=settings.API_PREFIX)
app.include_router(intelligence.router, prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {
        "message": "Welcome to RupeeTrace API",
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("rupeetrace.main:app", host="0.0.0.0", port=8000, reload=True)
