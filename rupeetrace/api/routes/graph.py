from typing import Optional, Dict, Any
from fastapi import APIRouter, Request

router = APIRouter(prefix="/graph", tags=["Visual Money Trace Graph"])

@router.get("", response_model=Dict[str, Any])
def get_graph(
    request: Request,
    road_id: Optional[str] = None,
    work_order_id: Optional[str] = None,
    ward_code: Optional[str] = None,
    max_work_orders: int = 10,
    include_ml: bool = False
):
    graph_service = request.app.state.graph_service
    return graph_service.get_subgraph(
        road_id=road_id,
        work_order_id=work_order_id,
        ward_code=ward_code,
        max_work_orders=max_work_orders,
        include_ml=include_ml
    )
