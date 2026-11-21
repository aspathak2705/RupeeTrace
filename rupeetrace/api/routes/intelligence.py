from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Request, HTTPException, Depends
from rupeetrace.core.auth import require_role

router = APIRouter(prefix="/intelligence", tags=["ML Intelligence"])

# -------------------------------------------------------------
# MODEL A: MULTILINGUAL ISSUE INTELLIGENCE
# -------------------------------------------------------------

@router.get("/issues/clusters")
def get_incident_clusters(
    request: Request,
    ward_code: Optional[str] = None,
    road_id: Optional[str] = None,
    min_cluster_size: int = 2,
    limit: int = 50
):
    """
    Returns multilingual complaint incident clusters grouped across English, Hindi,
    Marathi, and Hinglish. Discovers unified incidents without merging records.
    """
    issue_svc = request.app.state.ml_issue_service
    return issue_svc.get_incident_clusters(
        ward_code=ward_code,
        road_id=road_id,
        min_cluster_size=min_cluster_size,
        limit=limit
    )

@router.get("/issues/{cluster_id}")
def get_cluster_by_id(request: Request, cluster_id: str):
    """Returns detailed incident cluster with all member complaints."""
    issue_svc = request.app.state.ml_issue_service
    cluster = issue_svc.get_cluster_by_id(cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail=f"Incident cluster '{cluster_id}' not found.")
    return cluster

@router.get("/duplicates")
def get_duplicate_candidates(
    request: Request,
    ward_code: Optional[str] = None,
    road_id: Optional[str] = None,
    spatial_threshold_m: float = 250.0,
    temporal_threshold_hours: float = 72.0,
    min_composite_score: float = 0.65,
    limit: int = 100
):
    """
    Returns candidate duplicate complaints evaluated across semantic text similarity,
    GPS spatial distance (<=250m), temporal proximity (<=72h), and category match.
    """
    issue_svc = request.app.state.ml_issue_service
    return issue_svc.find_duplicate_candidates(
        ward_code=ward_code,
        road_id=road_id,
        spatial_threshold_m=spatial_threshold_m,
        temporal_threshold_hours=temporal_threshold_hours,
        min_composite_score=min_composite_score,
        limit=limit
    )

@router.get("/complaints/{complaint_id}/similar")
def get_similar_complaints(
    request: Request,
    complaint_id: str,
    limit: int = 10
):
    """Finds complaints semantically and spatially similar to a target complaint."""
    issue_svc = request.app.state.ml_issue_service
    rel_svc = request.app.state.rel_service
    target = rel_svc.get_complaint(complaint_id)
    if not target:
        raise HTTPException(status_code=404, detail=f"Complaint '{complaint_id}' not found.")

    duplicates = issue_svc.find_duplicate_candidates(
        ward_code=target.ward_code,
        spatial_threshold_m=500.0,
        temporal_threshold_hours=168.0,
        min_composite_score=0.50,
        limit=200
    )

    # Filter where complaint_1 or complaint_2 matches target
    matches = []
    for d in duplicates:
        if d["complaint_1"]["complaint_id"] == complaint_id:
            matches.append({
                "matched_complaint": d["complaint_2"],
                "match_score": d["match_score"],
                "signal_breakdown": d["signal_breakdown"],
                "cross_lingual": d["cross_lingual"]
            })
        elif d["complaint_2"]["complaint_id"] == complaint_id:
            matches.append({
                "matched_complaint": d["complaint_1"],
                "match_score": d["match_score"],
                "signal_breakdown": d["signal_breakdown"],
                "cross_lingual": d["cross_lingual"]
            })

    return matches[:limit]

@router.get("/social-signals")
def get_social_signals(
    request: Request,
    ward_code: Optional[str] = None,
    only_actionable: bool = True,
    limit: int = 50
):
    """
    Returns filtered civic social posts, separating actionable road condition reports
    from greetings, noise, and non-civic chat.
    """
    issue_svc = request.app.state.ml_issue_service
    return issue_svc.get_social_signals(
        ward_code=ward_code,
        only_actionable=only_actionable,
        limit=limit
    )

# -------------------------------------------------------------
# MODEL B: CONTEXT-AWARE REPAIR ANOMALY INTELLIGENCE
# -------------------------------------------------------------

@router.get("/anomalies")
def get_repair_anomalies(
    request: Request,
    ward_code: Optional[str] = None,
    road_id: Optional[str] = None,
    classification: Optional[str] = None,
    repair_method: Optional[str] = None,
    min_score: float = 0.0,
    limit: int = 100,
    current_user: Dict[str, Any] = Depends(require_role("officer"))
):
    """
    Returns work-order repair anomalies flagged by peer-grouped Isolation Forest models.
    All outputs strictly maintain neutral terminology (never claims fraud or corruption).
    """
    anomaly_svc = request.app.state.ml_anomaly_service
    return anomaly_svc.get_anomalies(
        ward_code=ward_code,
        road_id=road_id,
        classification=classification,
        repair_method=repair_method,
        min_score=min_score,
        limit=limit
    )

@router.get("/anomalies/{work_order_id}")
def get_work_order_anomaly_details(
    request: Request,
    work_order_id: str,
    current_user: Dict[str, Any] = Depends(require_role("officer"))
):
    """
    Returns detailed ML anomaly diagnostic for a single work order, including
    peer group stats, feature deviations vs peer median, comparable peer work orders,
    missing evidence checklist, and recommended action.
    """
    anomaly_svc = request.app.state.ml_anomaly_service
    anomaly = anomaly_svc.get_anomaly_for_work_order(work_order_id)
    if not anomaly:
        raise HTTPException(status_code=404, detail=f"Work order '{work_order_id}' not found in anomaly index.")
    return anomaly

@router.get("/work-orders/{work_order_id}/peers")
def get_work_order_comparable_peers(
    request: Request,
    work_order_id: str
):
    """Returns comparable peer work orders from the same repair method group."""
    anomaly_svc = request.app.state.ml_anomaly_service
    peers = anomaly_svc.get_comparable_peers(work_order_id)
    return peers

# -------------------------------------------------------------
# ROAD PASSPORT INTEGRATED ML SIGNALS
# -------------------------------------------------------------

@router.get("/roads/{road_id}/signals")
def get_road_ml_signals(
    request: Request,
    road_id: str
):
    """
    Provides comprehensive ML intelligence signals for the Road Passport:
    - Cross-language incident clusters on this road
    - Candidate duplicate complaints
    - ML Anomaly screening summary for work orders executed on this road
    - Candidate complaint-to-work-order link suggestions
    - Social signals mentioning the road's locality
    """
    issue_svc = request.app.state.ml_issue_service
    anomaly_svc = request.app.state.ml_anomaly_service
    rel_svc = request.app.state.rel_service

    road = rel_svc.get_road(road_id)
    if not road:
        raise HTTPException(status_code=404, detail=f"Road asset '{road_id}' not found.")

    clusters = issue_svc.get_incident_clusters(road_id=road_id, limit=10)
    duplicates = issue_svc.find_duplicate_candidates(road_id=road_id, limit=15)
    anomaly_summary = anomaly_svc.get_road_anomaly_summary(road_id)
    wo_links = issue_svc.suggest_work_order_links(road_id=road_id)
    
    # Social signals in ward/locality
    social_signals = issue_svc.get_social_signals(ward_code=road.ward_code, only_actionable=True, limit=5)

    return {
        "road_id": road_id,
        "road_name": road.road_name,
        "ward_code": road.ward_code,
        "incident_clusters_count": len(clusters),
        "incident_clusters": clusters,
        "duplicate_candidates_count": len(duplicates),
        "duplicate_candidates": duplicates,
        "repair_anomaly_summary": anomaly_summary,
        "candidate_work_order_links": wo_links,
        "actionable_social_signals": social_signals
    }
