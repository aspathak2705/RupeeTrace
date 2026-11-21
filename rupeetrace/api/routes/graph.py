from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Request, Query

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

@router.get("/investigate", response_model=Dict[str, Any])
def investigate_entity_graph(
    request: Request,
    mode: str = Query("road", description="Investigation mode: road, work_order, contractor, complaint, ward, audit"),
    entity_id: str = Query("RD0140", description="ID of root entity to investigate"),
    expanded_nodes: Optional[str] = Query(None, description="Comma-separated node IDs to expand progressively"),
    include_ml: bool = Query(False, description="Whether candidate ML suggestions are visible")
):
    """
    Returns an entity-scoped investigation graph.
    Never returns the entire dataset network.
    Reveals direct relationships first, and expands selected nodes progressively.
    """
    graph_service = request.app.state.graph_service
    expanded_list = [n.strip() for n in expanded_nodes.split(",")] if expanded_nodes else []
    return graph_service.investigate_entity(
        mode=mode,
        entity_id=entity_id,
        expanded_nodes=expanded_list,
        include_ml=include_ml
    )
