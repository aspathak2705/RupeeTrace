import os
import sys
from types import SimpleNamespace
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from rupeetrace.data.data_loader import DataLoader
from rupeetrace.data.validation_service import ValidationService
from rupeetrace.services.relationship_service import RelationshipService
from rupeetrace.services.ml_issue_service import MLIssueService
from rupeetrace.services.ml_anomaly_service import MLAnomalyService
from rupeetrace.services.graph_service import GraphService
from rupeetrace.api.routes import intelligence, graph

@pytest.fixture(scope="module")
def setup_services():
    loader = DataLoader()
    loader.load_all()
    rel = RelationshipService(loader)
    issue_svc = MLIssueService(rel)
    anomaly_svc = MLAnomalyService(rel)
    graph_svc = GraphService(rel, ml_issue_service=issue_svc, ml_anomaly_service=anomaly_svc)

    app_state = SimpleNamespace(
        loader=loader,
        rel_service=rel,
        ml_issue_service=issue_svc,
        ml_anomaly_service=anomaly_svc,
        graph_service=graph_svc
    )
    mock_request = SimpleNamespace(app=SimpleNamespace(state=app_state))

    return {
        "loader": loader,
        "rel": rel,
        "issue_svc": issue_svc,
        "anomaly_svc": anomaly_svc,
        "graph_svc": graph_svc,
        "mock_request": mock_request
    }

# -------------------------------------------------------------
# TEST MODEL A: MULTILINGUAL ISSUE INTELLIGENCE
# -------------------------------------------------------------

def test_model_a_embeddings_dimension_and_consistency(setup_services):
    issue_svc = setup_services["issue_svc"]
    complaints = setup_services["loader"].complaints
    assert len(complaints) > 0

    first_c = complaints[0]
    emb = issue_svc.get_embedding(first_c.complaint_id)
    assert emb is not None
    assert len(emb) == 384
    # Check unit norm
    norm = float(sum(x * x for x in emb)**0.5)
    assert abs(norm - 1.0) < 0.05

def test_model_a_cross_lingual_similarity(setup_services):
    issue_svc = setup_services["issue_svc"]
    # Verify semantic similarity calculation executes bounded in [0, 1]
    complaints = setup_services["loader"].complaints
    c1 = complaints[0]
    c2 = complaints[1]
    sim = issue_svc.compute_similarity(c1.complaint_id, c2.complaint_id)
    assert 0.0 <= sim <= 1.0

def test_model_a_duplicate_candidate_detection(setup_services):
    issue_svc = setup_services["issue_svc"]
    candidates = issue_svc.find_duplicate_candidates(min_composite_score=0.60, limit=20)
    assert isinstance(candidates, list)
    if candidates:
        cand = candidates[0]
        assert "candidate_id" in cand
        assert "match_score" in cand
        assert cand["match_score"] >= 0.60
        assert "signal_breakdown" in cand
        assert "semantic_similarity" in cand["signal_breakdown"]
        assert "distance_meters" in cand["signal_breakdown"]
        assert cand["provenance_status"] == "model-suggested"

def test_model_a_incident_clustering(setup_services):
    issue_svc = setup_services["issue_svc"]
    clusters = issue_svc.get_incident_clusters(limit=10)
    assert isinstance(clusters, list)
    if clusters:
        cluster = clusters[0]
        assert "cluster_id" in cluster
        assert "canonical_category" in cluster
        assert "representative_description" in cluster
        assert len(cluster["complaint_ids"]) >= 2
        assert "languages_present" in cluster
        assert "confidence_score" in cluster

def test_model_a_category_normalization(setup_services):
    issue_svc = setup_services["issue_svc"]
    norm1 = issue_svc.normalize_category("Other", "मोठा खड्डा पडला आहे रस्त्यावर")
    assert norm1 == "Pothole"

    norm2 = issue_svc.normalize_category("Road related", "Waterlogging near railway station")
    assert norm2 == "Waterlogging"

def test_model_a_social_post_filtering(setup_services):
    issue_svc = setup_services["issue_svc"]
    signals = issue_svc.get_social_signals(only_actionable=True, limit=20)
    assert isinstance(signals, list)
    if signals:
        sig = signals[0]
        assert sig["is_actionable"] is True
        assert sig["urgency"] in ["HIGH", "MEDIUM", "LOW"]
        assert "text" in sig

# -------------------------------------------------------------
# TEST MODEL B: REPAIR ANOMALY INTELLIGENCE
# -------------------------------------------------------------

def test_model_b_peer_group_partitioning_and_isolation_forest(setup_services):
    anomaly_svc = setup_services["anomaly_svc"]
    anomalies = anomaly_svc.get_anomalies(limit=50)
    assert isinstance(anomalies, list)
    assert len(anomalies) > 0

    first = anomalies[0]
    assert "anomaly_score" in first
    assert 0.0 <= first["anomaly_score"] <= 1.0
    assert first["classification"] in [
        "Normal pattern",
        "Unusual pattern",
        "High-priority investigation candidate"
    ]
    assert first["provenance_type"] == "[ML IsolationForest]"
    assert "comparable_peers" in first
    assert len(first["comparable_peers"]) > 0

def test_model_b_neutral_language_guarantee(setup_services):
    anomaly_svc = setup_services["anomaly_svc"]
    anomalies = anomaly_svc.get_anomalies(limit=100)
    forbidden_terms = ["fraud", "corrupt", "illegal", "criminal", "scam", "thief", "fake"]

    for a in anomalies:
        action = a.get("recommended_action", "").lower()
        classification = a.get("classification", "").lower()
        for term in forbidden_terms:
            assert term not in action, f"Non-neutral term '{term}' found in recommended_action: {action}"
            assert term not in classification, f"Non-neutral term '{term}' found in classification: {classification}"

def test_model_b_comparable_peers_consistency(setup_services):
    anomaly_svc = setup_services["anomaly_svc"]
    anomalies = anomaly_svc.get_anomalies(limit=5)
    target_wo = anomalies[0]["work_order_id"]
    peers = anomaly_svc.get_comparable_peers(target_wo)
    assert isinstance(peers, list)
    assert len(peers) > 0
    for p in peers:
        assert "work_order_id" in p
        assert "distance_score" in p

# -------------------------------------------------------------
# TEST COMBINED AUDIT FINDINGS
# -------------------------------------------------------------

def test_combined_audit_findings_provenance_separation(setup_services):
    rel = setup_services["rel"]
    anomaly_svc = setup_services["anomaly_svc"]
    from rupeetrace.services.audit_service import AuditService
    audit_svc = AuditService(rel)

    combined = audit_svc.get_combined_findings(ml_anomaly_service=anomaly_svc, limit=50)
    assert len(combined) > 0

    prov_types = {f.get("provenance_type") for f in combined}
    assert "[Deterministic]" in prov_types
    assert "[ML IsolationForest]" in prov_types

# -------------------------------------------------------------
# TEST API ENDPOINTS
# -------------------------------------------------------------

def test_intelligence_api_routes(setup_services):
    req = setup_services["mock_request"]

    # Clusters route
    clusters = intelligence.get_incident_clusters(req, limit=3)
    assert isinstance(clusters, list)

    # Duplicates route
    dups = intelligence.get_duplicate_candidates(req, limit=3)
    assert isinstance(dups, list)

    # Social route
    social = intelligence.get_social_signals(req, limit=3)
    assert isinstance(social, list)

    # Anomalies route
    anomalies = intelligence.get_repair_anomalies(req, limit=3)
    assert isinstance(anomalies, list)
    assert len(anomalies) > 0

    wo_id = anomalies[0]["work_order_id"]
    detail = intelligence.get_work_order_anomaly_details(req, wo_id)
    assert detail["work_order_id"] == wo_id

    # Road ML signals route
    first_road = setup_services["loader"].roads[0].road_id
    road_signals = intelligence.get_road_ml_signals(req, first_road)
    assert road_signals["road_id"] == first_road
    assert "repair_anomaly_summary" in road_signals

def test_graph_ml_overlay(setup_services):
    req = setup_services["mock_request"]
    first_road = setup_services["loader"].roads[0].road_id
    subgraph = graph.get_graph(req, road_id=first_road, include_ml=True)
    assert "nodes" in subgraph
    assert "edges" in subgraph
    assert subgraph["nodes_count"] > 0
    assert subgraph["edges_count"] > 0
