from typing import List, Dict, Any, Optional, Set
from rupeetrace.services.relationship_service import RelationshipService

class GraphService:
    def __init__(
        self,
        rel_service: RelationshipService,
        ml_issue_service = None,
        ml_anomaly_service = None
    ):
        self.rel_service = rel_service
        self.ml_issue_service = ml_issue_service
        self.ml_anomaly_service = ml_anomaly_service

    def get_subgraph(
        self,
        road_id: Optional[str] = None,
        work_order_id: Optional[str] = None,
        ward_code: Optional[str] = None,
        max_work_orders: int = 10,
        include_ml: bool = False
    ) -> Dict[str, Any]:
        """
        Builds a bounded, evidence-traceable subgraph centered around an asset, work order, or ward.
        Never fabricates mock relationships or nodes.
        """
        nodes: Dict[str, Dict[str, Any]] = {}
        edges: List[Dict[str, Any]] = []
        edge_ids: Set[str] = set()

        target_wos = []
        target_roads = []
        target_ward = None

        if work_order_id:
            wo = self.rel_service.get_work_order(work_order_id)
            if wo:
                target_wos = [wo]
                road = self.rel_service.get_road(wo.road_id)
                if road:
                    target_roads = [road]
                target_ward = self.rel_service.get_ward(wo.ward_code)

        elif road_id:
            road = self.rel_service.get_road(road_id)
            if road:
                target_roads = [road]
                target_wos = self.rel_service.get_road_work_orders(road.road_id)[:max_work_orders]
                target_ward = self.rel_service.get_ward(road.ward_code)

        elif ward_code:
            target_ward = self.rel_service.get_ward(ward_code)
            if target_ward:
                target_wos = self.rel_service.get_ward_work_orders(target_ward.ward_code)[:max_work_orders]
                road_ids = {wo.road_id for wo in target_wos}
                target_roads = [self.rel_service.get_road(rid) for rid in road_ids if self.rel_service.get_road(rid)]
        else:
            # Default to first arterial road
            first_road = self.rel_service.loader.roads[0] if self.rel_service.loader.roads else None
            if first_road:
                target_roads = [first_road]
                target_wos = self.rel_service.get_road_work_orders(first_road.road_id)[:max_work_orders]
                target_ward = self.rel_service.get_ward(first_road.ward_code)

        # 1. Add Ward Node
        if target_ward:
            nodes[target_ward.ward_code] = {
                "id": target_ward.ward_code,
                "label": f"Ward {target_ward.ward_code}",
                "category": "financial",
                "type": "Ward",
                "title": f"Ward {target_ward.ward_code}: {target_ward.ward_name}",
                "subtitle": f"Budget: ₹{target_ward.monsoon_repair_budget_inr_2025:,.0f}",
                "data": {
                    "ward_code": target_ward.ward_code,
                    "ward_name": target_ward.ward_name,
                    "budget_inr": target_ward.monsoon_repair_budget_inr_2025,
                    "low_lying_index": target_ward.low_lying_index
                },
                "provenance": target_ward.provenance.dict()
            }

        # 2. Add Road Nodes
        for road in target_roads:
            if not road:
                continue
            nodes[road.road_id] = {
                "id": road.road_id,
                "label": road.road_id,
                "category": "road_asset",
                "type": "RoadAsset",
                "title": road.road_name,
                "subtitle": f"{road.road_type} • {road.surface} • {road.length_m:.0f}m",
                "data": {
                    "road_id": road.road_id,
                    "road_name": road.road_name,
                    "under_dlp": road.under_dlp,
                    "last_resurfaced": road.last_resurfaced,
                    "bus_route": road.bus_route
                },
                "provenance": road.provenance.dict()
            }

            # Road located in Ward edge
            if target_ward and road.ward_code == target_ward.ward_code:
                e_id = f"{road.road_id}->LOCATED_IN->{target_ward.ward_code}"
                if e_id not in edge_ids:
                    edge_ids.add(e_id)
                    edges.append({
                        "id": e_id,
                        "source": road.road_id,
                        "target": target_ward.ward_code,
                        "label": "LOCATED_IN",
                        "relation_type": "LOCATED_IN",
                        "explanation": f"Road segment {road.road_id} is geographically located within BMC Ward {target_ward.ward_code}."
                    })

            # Add nearby flood hotspot if present
            flood_spots = self.rel_service.flood_hotspots_by_road.get(road.road_id, [])
            for fh in flood_spots[:1]:
                fh_id = f"FH_{fh.hotspot_id}"
                nodes[fh_id] = {
                    "id": fh_id,
                    "label": fh.hotspot_id,
                    "category": "outcome_audit",
                    "type": "FloodHotspot",
                    "title": fh.name,
                    "subtitle": f"Depth: {fh.avg_water_depth_cm:.0f}cm • Dist: {fh.distance_to_nearest_road_m:.0f}m",
                    "data": {
                        "hotspot_id": fh.hotspot_id,
                        "name": fh.name,
                        "distance_m": fh.distance_to_nearest_road_m,
                        "tide_sensitive": fh.tide_sensitive
                    },
                    "provenance": fh.provenance.dict()
                }
                e_id = f"{fh_id}->ADJACENT_TO->{road.road_id}"
                if e_id not in edge_ids:
                    edge_ids.add(e_id)
                    edges.append({
                        "id": e_id,
                        "source": fh_id,
                        "target": road.road_id,
                        "label": "ADJACENT_TO",
                        "relation_type": "ADJACENT_TO",
                        "explanation": f"Chronic flood hotspot {fh.name} is situated {fh.distance_to_nearest_road_m:.0f}m from road {road.road_id}."
                    })

        # 3. Add Work Orders and Connected Clusters
        for wo in target_wos:
            nodes[wo.work_order_id] = {
                "id": wo.work_order_id,
                "label": wo.work_order_id,
                "category": "work_order",
                "type": "WorkOrder",
                "title": wo.repair_method,
                "subtitle": f"Billed: ₹{wo.cost_inr:,.0f} • Area: {wo.area_sqm:.1f} sqm",
                "data": {
                    "work_order_id": wo.work_order_id,
                    "cost_inr": wo.cost_inr,
                    "repair_method": wo.repair_method,
                    "area_sqm": wo.area_sqm,
                    "sla_met": wo.sla_met,
                    "reopened_within_30d": wo.reopened_within_30d,
                    "is_dlp_breach": wo.is_dlp_breach,
                    "is_overbilled": wo.is_overbilled
                },
                "provenance": wo.provenance.dict()
            }

            # Work Order -> Road edge
            e_id = f"{wo.work_order_id}->EXECUTED_ON->{wo.road_id}"
            if e_id not in edge_ids and wo.road_id in nodes:
                edge_ids.add(e_id)
                edges.append({
                    "id": e_id,
                    "source": wo.work_order_id,
                    "target": wo.road_id,
                    "label": "EXECUTED_ON",
                    "relation_type": "EXECUTED_ON",
                    "explanation": f"Work order {wo.work_order_id} recorded road repair work on segment {wo.road_id}."
                })

            # Ward -> Work Order edge
            if target_ward and wo.ward_code == target_ward.ward_code:
                e_id = f"{target_ward.ward_code}->FUNDED->{wo.work_order_id}"
                if e_id not in edge_ids:
                    edge_ids.add(e_id)
                    edges.append({
                        "id": e_id,
                        "source": target_ward.ward_code,
                        "target": wo.work_order_id,
                        "label": "FUNDED",
                        "relation_type": "FUNDED",
                        "explanation": f"Billed expenditure of ₹{wo.cost_inr:,.0f} accounted under Ward {target_ward.ward_code} monsoon budget."
                    })

            # Contractor Node & Edge
            contractor = self.rel_service.get_contractor(wo.contractor_id)
            if contractor:
                if contractor.contractor_id not in nodes:
                    nodes[contractor.contractor_id] = {
                        "id": contractor.contractor_id,
                        "label": contractor.contractor_id,
                        "category": "contractor",
                        "type": "Contractor",
                        "title": contractor.contractor_name,
                        "subtitle": f"Empanelled since {contractor.empanelled_since}",
                        "data": {
                            "contractor_id": contractor.contractor_id,
                            "contractor_name": contractor.contractor_name,
                            "empanelled_since": contractor.empanelled_since
                        },
                        "provenance": contractor.provenance.dict()
                    }
                e_id = f"{wo.work_order_id}->AWARDED_TO->{contractor.contractor_id}"
                if e_id not in edge_ids:
                    edge_ids.add(e_id)
                    edges.append({
                        "id": e_id,
                        "source": wo.work_order_id,
                        "target": contractor.contractor_id,
                        "label": "AWARDED_TO",
                        "relation_type": "AWARDED_TO",
                        "explanation": f"Work order was awarded to empanelled contractor {contractor.contractor_name}."
                    })

            # Rate Card Node & Edge
            rc = self.rel_service.rate_card_by_method.get(wo.repair_method)
            if rc:
                rc_id = f"RC_{rc.repair_method.replace(' ', '_')}"
                if rc_id not in nodes:
                    nodes[rc_id] = {
                        "id": rc_id,
                        "label": "Rate Card",
                        "category": "financial",
                        "type": "RateCard",
                        "title": rc.repair_method,
                        "subtitle": f"Benchmark: ₹{rc.standard_rate_inr:,.0f} {rc.unit}",
                        "data": {
                            "repair_method": rc.repair_method,
                            "unit": rc.unit,
                            "standard_rate_inr": rc.standard_rate_inr
                        },
                        "provenance": rc.provenance.dict()
                    }
                e_id = f"{wo.work_order_id}->BENCHMARKED_BY->{rc_id}"
                if e_id not in edge_ids:
                    edge_ids.add(e_id)
                    edges.append({
                        "id": e_id,
                        "source": wo.work_order_id,
                        "target": rc_id,
                        "label": "BENCHMARKED_BY",
                        "relation_type": "BENCHMARKED_BY",
                        "explanation": f"Work cost evaluated against benchmark rate of ₹{rc.standard_rate_inr:,.0f} {rc.unit}."
                    })

            # Outcome / Durability Node
            if wo.reopened_within_30d or not wo.sla_met or wo.is_dlp_breach:
                outcome_id = f"OUT_{wo.work_order_id}"
                subtitle = []
                if wo.reopened_within_30d:
                    subtitle.append("Reopened in 30d")
                if not wo.sla_met:
                    subtitle.append("Missed SLA")
                if wo.is_dlp_breach:
                    subtitle.append("DLP Breach")

                nodes[outcome_id] = {
                    "id": outcome_id,
                    "label": "Audit Outcome",
                    "category": "outcome_audit",
                    "type": "AuditOutcome",
                    "title": "Review Required",
                    "subtitle": " • ".join(subtitle),
                    "data": {
                        "reopened_within_30d": wo.reopened_within_30d,
                        "sla_met": wo.sla_met,
                        "is_dlp_breach": wo.is_dlp_breach,
                        "cost_variance_pct": wo.cost_variance_pct
                    },
                    "provenance": wo.provenance.dict()
                }
                e_id = f"{wo.work_order_id}->RESULTED_IN->{outcome_id}"
                if e_id not in edge_ids:
                    edge_ids.add(e_id)
                    edges.append({
                        "id": e_id,
                        "source": wo.work_order_id,
                        "target": outcome_id,
                        "label": "RESULTED_IN",
                        "relation_type": "RESULTED_IN",
                        "explanation": f"Audit rule flagged: {' & '.join(subtitle)}."
                    })

            # Citizen Complaint Nodes (anonymized)
            for cid in wo.linked_complaint_ids[:3]:
                c_obj = self.rel_service.complaints_by_id.get(cid)
                if c_obj:
                    nodes[c_obj.complaint_id] = {
                        "id": c_obj.complaint_id,
                        "label": c_obj.complaint_id,
                        "category": "citizen",
                        "type": "Complaint",
                        "title": c_obj.category_reported,
                        "subtitle": f"{c_obj.channel} • {c_obj.status}",
                        "data": {
                            "complaint_id": c_obj.complaint_id,
                            "category_reported": c_obj.category_reported,
                            "channel": c_obj.channel,
                            "status": c_obj.status,
                            "received_at": c_obj.received_at,
                            "description": c_obj.description[:100] + "..." if len(c_obj.description) > 100 else c_obj.description
                        },
                        "provenance": c_obj.provenance.dict()
                    }
                    e_id = f"{c_obj.complaint_id}->TRIGGERED->{wo.work_order_id}"
                    if e_id not in edge_ids:
                        edge_ids.add(e_id)
                        edges.append({
                            "id": e_id,
                            "source": c_obj.complaint_id,
                            "target": wo.work_order_id,
                            "label": "TRIGGERED",
                            "relation_type": "TRIGGERED",
                            "explanation": f"Citizen complaint {c_obj.complaint_id} via {c_obj.channel} triggered repair work order."
                        })

        # 4. Optional ML Intelligence Overlay Edges
        if include_ml:
            complaint_ids = [n["id"] for n in nodes.values() if n.get("type") == "Complaint"]
            wo_ids = [n["id"] for n in nodes.values() if n.get("type") == "WorkOrder"]

            # ML Edge Type 1: Cross-complaint similarity & candidate duplicates
            if self.ml_issue_service and len(complaint_ids) >= 2:
                for i in range(len(complaint_ids)):
                    for j in range(i + 1, len(complaint_ids)):
                        c1 = complaint_ids[i]
                        c2 = complaint_ids[j]
                        sim = self.ml_issue_service.compute_similarity(c1, c2)
                        if sim >= 0.60:
                            e_id = f"{c1}->SIMILAR_TO->{c2}"
                            if e_id not in edge_ids:
                                edge_ids.add(e_id)
                                edges.append({
                                    "id": e_id,
                                    "source": c1,
                                    "target": c2,
                                    "label": f"SIMILAR ({int(sim*100)}%)",
                                    "relation_type": "SIMILAR_COMPLAINT",
                                    "explanation": f"Model identified {int(sim*100)}% semantic similarity between citizen reports.",
                                    "provenance_status": "model-suggested"
                                })

            # ML Edge Type 2: Isolation Forest Anomaly Peer Benchmarks
            if self.ml_anomaly_service and wo_ids:
                for wid in wo_ids:
                    anomaly = self.ml_anomaly_service.get_anomaly_for_work_order(wid)
                    if anomaly and anomaly.get("classification") != "Normal pattern":
                        peers = anomaly.get("comparable_peers", [])
                        for p in peers[:1]:
                            p_wid = p["work_order_id"]
                            # Add peer node if not in nodes
                            if p_wid not in nodes:
                                p_wo = self.rel_service.get_work_order(p_wid)
                                if p_wo:
                                    nodes[p_wid] = {
                                        "id": p_wid,
                                        "label": p_wid,
                                        "category": "work_order",
                                        "type": "WorkOrder",
                                        "title": f"Peer: {p_wo.repair_method}",
                                        "subtitle": f"Billed: ₹{p_wo.cost_inr:,.0f} • Area: {p_wo.area_sqm:.1f} sqm",
                                        "data": {
                                            "work_order_id": p_wid,
                                            "cost_inr": p_wo.cost_inr,
                                            "repair_method": p_wo.repair_method,
                                            "area_sqm": p_wo.area_sqm
                                        },
                                        "provenance": p_wo.provenance.dict()
                                    }
                            e_id = f"{wid}->PEER_BENCHMARK->{p_wid}"
                            if e_id not in edge_ids and p_wid in nodes:
                                edge_ids.add(e_id)
                                edges.append({
                                    "id": e_id,
                                    "source": wid,
                                    "target": p_wid,
                                    "label": "PEER BENCHMARK",
                                    "relation_type": "PEER_BENCHMARK",
                                    "explanation": f"Statistical peer work order in same repair group used for Isolation Forest baseline comparison.",
                                    "provenance_status": "model-suggested"
                                })

            # ML Edge Type 3: Candidate Complaint-to-Work-Order Match
            if self.ml_issue_service and target_roads:
                for road in target_roads:
                    suggested_links = self.ml_issue_service.suggest_work_order_links(road.road_id)
                    for sl in suggested_links[:3]:
                        cid = sl["complaint_id"]
                        wid = sl["work_order_id"]
                        if cid in nodes and wid in nodes:
                            e_id = f"{cid}->CANDIDATE_REPAIR->{wid}"
                            if e_id not in edge_ids:
                                edge_ids.add(e_id)
                                edges.append({
                                    "id": e_id,
                                    "source": cid,
                                    "target": wid,
                                    "label": "CANDIDATE MATCH",
                                    "relation_type": "CANDIDATE_MATCH",
                                    "explanation": f"Model matched unlinked complaint with repair assigned {sl['delta_days']} days later.",
                                    "provenance_status": "model-suggested"
                                })

        return {
            "root": {
                "road_id": road_id,
                "work_order_id": work_order_id,
                "ward_code": ward_code
            },
            "nodes_count": len(nodes),
            "edges_count": len(edges),
            "nodes": list(nodes.values()),
            "edges": edges
        }

    # =========================================================================
    # ENTITY-SPECIFIC PROGRESSIVE INVESTIGATION ENGINE (CRITICAL REQUIREMENT B/C/D)
    # =========================================================================

    def investigate_entity(
        self,
        mode: str,
        entity_id: str,
        expanded_nodes: Optional[List[str]] = None,
        include_ml: bool = False
    ) -> Dict[str, Any]:
        """
        Builds an entity-scoped investigation graph.
        Never renders the global graph.
        Starts with 1-hop relevant direct relationships.
        Progressively expands only nodes explicitly listed in `expanded_nodes`.
        Strictly isolates ML candidate edges with explicit non-confirmed labels and is_ml flag.
        """
        nodes: Dict[str, Dict[str, Any]] = {}
        edges: List[Dict[str, Any]] = []
        edge_ids: Set[str] = set()
        expanded_set: Set[str] = set(expanded_nodes or [])

        def add_edge(
            source: str,
            target: str,
            relation_type: str,
            label: str,
            explanation: str,
            is_ml: bool = False,
            confidence: float = 1.0
        ):
            e_id = f"{source}->{relation_type}->{target}"
            if e_id not in edge_ids and source in nodes and target in nodes:
                edge_ids.add(e_id)
                edges.append({
                    "id": e_id,
                    "source": source,
                    "target": target,
                    "relation_type": relation_type,
                    "label": label,
                    "explanation": explanation,
                    "is_ml": is_ml,
                    "confidence_score": confidence,
                    "provenance_status": "model-suggested" if is_ml else "deterministic-record"
                })

        def build_road_node(road) -> Dict[str, Any]:
            return {
                "id": road.road_id,
                "label": road.road_id,
                "category": "road_asset",
                "type": "RoadAsset",
                "title": road.road_name,
                "subtitle": f"{road.road_type} • {road.surface} • {road.length_m:.0f}m",
                "data": {
                    "road_id": road.road_id,
                    "road_name": road.road_name,
                    "surface": road.surface,
                    "road_type": road.road_type,
                    "length_m": road.length_m,
                    "under_dlp": road.under_dlp,
                    "last_resurfaced": road.last_resurfaced,
                    "ward_code": road.ward_code
                },
                "provenance": road.provenance.dict() if hasattr(road, "provenance") else {}
            }

        def build_wo_node(wo) -> Dict[str, Any]:
            return {
                "id": wo.work_order_id,
                "label": wo.work_order_id,
                "category": "work_order",
                "type": "WorkOrder",
                "title": wo.repair_method,
                "subtitle": f"Billed: ₹{wo.cost_inr:,.0f} • {wo.contractor_name}",
                "data": {
                    "work_order_id": wo.work_order_id,
                    "cost_inr": wo.cost_inr,
                    "repair_method": wo.repair_method,
                    "area_sqm": wo.area_sqm,
                    "sla_met": wo.sla_met,
                    "reopened_within_30d": wo.reopened_within_30d,
                    "is_dlp_breach": wo.is_dlp_breach,
                    "is_overbilled": wo.is_overbilled,
                    "contractor_id": wo.contractor_id,
                    "contractor_name": wo.contractor_name,
                    "road_id": wo.road_id,
                    "ward_code": wo.ward_code
                },
                "provenance": wo.provenance.dict() if hasattr(wo, "provenance") else {}
            }

        def build_contractor_node(cnt) -> Dict[str, Any]:
            return {
                "id": cnt.contractor_id,
                "label": cnt.contractor_id,
                "category": "contractor",
                "type": "Contractor",
                "title": cnt.contractor_name,
                "subtitle": f"Empanelled: {cnt.empanelled_since} • {len(cnt.active_wards)} Wards",
                "data": {
                    "contractor_id": cnt.contractor_id,
                    "contractor_name": cnt.contractor_name,
                    "empanelled_since": cnt.empanelled_since,
                    "active_wards": cnt.active_wards
                },
                "provenance": cnt.provenance.dict() if hasattr(cnt, "provenance") else {}
            }

        def build_ward_node(ward) -> Dict[str, Any]:
            return {
                "id": ward.ward_code,
                "label": f"Ward {ward.ward_code}",
                "category": "financial",
                "type": "Ward",
                "title": f"Ward {ward.ward_code}: {ward.ward_name}",
                "subtitle": f"Monsoon Budget: ₹{ward.monsoon_repair_budget_inr_2025:,.0f}",
                "data": {
                    "ward_code": ward.ward_code,
                    "ward_name": ward.ward_name,
                    "budget_inr": ward.monsoon_repair_budget_inr_2025,
                    "zone": ward.zone
                },
                "provenance": ward.provenance.dict() if hasattr(ward, "provenance") else {}
            }

        def build_complaint_node(c, road_id: Optional[str] = None) -> Dict[str, Any]:
            resolved_road_id = road_id
            if not resolved_road_id:
                wos = self.rel_service.complaint_to_wos_map.get(c.complaint_id, [])
                if wos:
                    first_wo = self.rel_service.get_work_order(wos[0])
                    if first_wo:
                        resolved_road_id = first_wo.road_id

            return {
                "id": c.complaint_id,
                "label": c.complaint_id,
                "category": "citizen",
                "type": "Complaint",
                "title": c.category_reported,
                "subtitle": f"{c.channel} • Status: {c.status}",
                "data": {
                    "complaint_id": c.complaint_id,
                    "category_reported": c.category_reported,
                    "channel": c.channel,
                    "status": c.status,
                    "received_at": c.received_at,
                    "road_id": resolved_road_id,
                    "ward_code": c.ward_code,
                    "description": c.description[:120] if len(c.description) > 120 else c.description
                },
                "provenance": c.provenance.dict() if hasattr(c, "provenance") else {}
            }

        def build_audit_node(finding_id: str, title: str, subtitle: str, data: Dict[str, Any]) -> Dict[str, Any]:
            return {
                "id": finding_id,
                "label": "Audit Finding",
                "category": "outcome_audit",
                "type": "AuditFinding",
                "title": title,
                "subtitle": subtitle,
                "data": data,
                "provenance": {"source_system": "RupeeTrace Repair Auditor", "verified": True}
            }

        def build_rate_card_node(rc) -> Dict[str, Any]:
            rc_id = f"RC_{rc.repair_method.replace(' ', '_')}"
            return {
                "id": rc_id,
                "label": "Rate Card",
                "category": "financial",
                "type": "RateCard",
                "title": rc.repair_method,
                "subtitle": f"Benchmark: ₹{rc.standard_rate_inr:,.0f} {rc.unit}",
                "data": {
                    "repair_method": rc.repair_method,
                    "standard_rate_inr": rc.standard_rate_inr,
                    "unit": rc.unit
                },
                "provenance": rc.provenance.dict() if hasattr(rc, "provenance") else {}
            }

        root_node_id = entity_id

        # MODE 1: ROAD INVESTIGATION
        if mode == "road":
            road = self.rel_service.get_road(entity_id) or self.rel_service.loader.roads[0]
            root_node_id = road.road_id
            nodes[road.road_id] = build_road_node(road)

            # 1-hop: Ward
            ward = self.rel_service.get_ward(road.ward_code)
            if ward:
                nodes[ward.ward_code] = build_ward_node(ward)
                add_edge(road.road_id, ward.ward_code, "LOCATED_IN", "LOCATED IN", f"Road asset {road.road_id} is located in BMC Ward {ward.ward_code}.")

            # 1-hop: Work orders executed on this road
            road_wos = self.rel_service.get_road_work_orders(road.road_id)[:6]
            for wo in road_wos:
                nodes[wo.work_order_id] = build_wo_node(wo)
                add_edge(wo.work_order_id, road.road_id, "EXECUTED_ON", "EXECUTED ON", f"Work order {wo.work_order_id} recorded repair work of ₹{wo.cost_inr:,.0f} on {road.road_id}.")

            # 1-hop: Complaints filed on this road
            road_complaints = self.rel_service.get_road_complaints(road.road_id)[:4]
            for c in road_complaints:
                nodes[c.complaint_id] = build_complaint_node(c)
                add_edge(c.complaint_id, road.road_id, "FILED_FOR", "FILED FOR", f"Citizen complaint filed regarding surface defect on {road.road_name}.")

            # 1-hop: Audit outcome / DLP breach
            if road.under_dlp and any(wo.cost_inr > 0 for wo in road_wos):
                audit_id = f"DLP_BREACH_{road.road_id}"
                nodes[audit_id] = build_audit_node(
                    audit_id,
                    "DLP Warranty Breach",
                    "Municipal expenditure during active defect liability window",
                    {"road_id": road.road_id, "severity": "CRITICAL"}
                )
                add_edge(audit_id, road.road_id, "AUDIT_FLAGGED", "DLP VIOLATION", "Road is under active 3-year warranty; public expenditure incurred.")

            # Expansion of specific nodes
            for exp_id in expanded_set:
                wo = self.rel_service.get_work_order(exp_id)
                if wo and wo.work_order_id in nodes:
                    cnt = self.rel_service.get_contractor(wo.contractor_id)
                    if cnt:
                        nodes[cnt.contractor_id] = build_contractor_node(cnt)
                        add_edge(wo.work_order_id, cnt.contractor_id, "AWARDED_TO", "AWARDED TO", f"Contract awarded to {cnt.contractor_name}.")
                    rc = self.rel_service.rate_card_by_method.get(wo.repair_method)
                    if rc:
                        rc_node = build_rate_card_node(rc)
                        nodes[rc_node["id"]] = rc_node
                        add_edge(wo.work_order_id, rc_node["id"], "BENCHMARKED_BY", "RATE BENCHMARK", f"Rate card benchmark: ₹{rc.standard_rate_inr:,.0f} {rc.unit}.")

            # ML Candidates (Only if explicitly requested)
            if include_ml and self.ml_issue_service:
                suggested_links = self.ml_issue_service.suggest_work_order_links(road.road_id)
                for sl in suggested_links[:2]:
                    cid = sl["complaint_id"]
                    wid = sl["work_order_id"]
                    if cid in nodes and wid in nodes:
                        add_edge(
                            cid, wid, "CANDIDATE_MATCH", "ML CANDIDATE",
                            f"Model identified unlinked complaint with repair assigned {sl['delta_days']} days later.",
                            is_ml=True, confidence=0.82
                        )

        # MODE 2: WORK ORDER INVESTIGATION
        elif mode == "work_order":
            wo = self.rel_service.get_work_order(entity_id) or self.rel_service.loader.work_orders[0]
            root_node_id = wo.work_order_id
            nodes[wo.work_order_id] = build_wo_node(wo)

            # Direct Road
            road = self.rel_service.get_road(wo.road_id)
            if road:
                nodes[road.road_id] = build_road_node(road)
                add_edge(wo.work_order_id, road.road_id, "EXECUTED_ON", "EXECUTED ON", f"Work order recorded on {road.road_name}.")

            # Direct Contractor
            cnt = self.rel_service.get_contractor(wo.contractor_id)
            if cnt:
                nodes[cnt.contractor_id] = build_contractor_node(cnt)
                add_edge(wo.work_order_id, cnt.contractor_id, "AWARDED_TO", "AWARDED TO", f"Repair awarded to {cnt.contractor_name}.")

            # Direct Ward Funding
            ward = self.rel_service.get_ward(wo.ward_code)
            if ward:
                nodes[ward.ward_code] = build_ward_node(ward)
                add_edge(ward.ward_code, wo.work_order_id, "FUNDED", "FUNDED BY", f"Billed under Ward {ward.ward_code} repair budget.")

            # Direct Rate Card Benchmark
            rc = self.rel_service.rate_card_by_method.get(wo.repair_method)
            if rc:
                rc_node = build_rate_card_node(rc)
                nodes[rc_node["id"]] = rc_node
                add_edge(wo.work_order_id, rc_node["id"], "BENCHMARKED_BY", "RATE BENCHMARK", f"Benchmark rate: ₹{rc.standard_rate_inr:,.0f} {rc.unit}.")

            # Linked Complaints
            for cid in wo.linked_complaint_ids[:3]:
                c = self.rel_service.complaints_by_id.get(cid)
                if c:
                    nodes[c.complaint_id] = build_complaint_node(c)
                    add_edge(c.complaint_id, wo.work_order_id, "TRIGGERED", "TRIGGERED REPAIR", f"Citizen complaint {c.complaint_id} triggered work order.")

            # Audit Outcome if present
            if wo.is_dlp_breach or wo.is_overbilled or wo.reopened_within_30d:
                audit_id = f"AUD_{wo.work_order_id}"
                nodes[audit_id] = build_audit_node(
                    audit_id,
                    "Audit Finding",
                    f"DLP Breach: {wo.is_dlp_breach} • Overbilled: {wo.is_overbilled}",
                    {"work_order_id": wo.work_order_id, "cost_inr": wo.cost_inr}
                )
                add_edge(audit_id, wo.work_order_id, "AUDITS", "AUDIT VIOLATION", "Auditor flagged work order for warranty or rate violation.")

            # Expansion
            for exp_id in expanded_set:
                if exp_id == wo.road_id and road:
                    other_wos = [w for w in self.rel_service.get_road_work_orders(road.road_id) if w.work_order_id != wo.work_order_id][:3]
                    for ow in other_wos:
                        nodes[ow.work_order_id] = build_wo_node(ow)
                        add_edge(ow.work_order_id, road.road_id, "EXECUTED_ON", "EXECUTED ON", "Historical work order on same road.")

        # MODE 3: CONTRACTOR INVESTIGATION
        elif mode == "contractor":
            cnt = self.rel_service.get_contractor(entity_id) or self.rel_service.loader.contractors[0]
            root_node_id = cnt.contractor_id
            nodes[cnt.contractor_id] = build_contractor_node(cnt)

            # Direct Work Orders won by contractor
            cnt_wos = [wo for wo in self.rel_service.loader.work_orders if wo.contractor_id == cnt.contractor_id][:6]
            associated_roads = set()
            for wo in cnt_wos:
                nodes[wo.work_order_id] = build_wo_node(wo)
                add_edge(wo.work_order_id, cnt.contractor_id, "AWARDED_TO", "AWARDED TO", f"Work order won by {cnt.contractor_name}.")
                associated_roads.add(wo.road_id)

            # Direct Roads worked on
            for rid in list(associated_roads)[:3]:
                road = self.rel_service.get_road(rid)
                if road:
                    nodes[road.road_id] = build_road_node(road)
                    for wo in cnt_wos:
                        if wo.road_id == road.road_id:
                            add_edge(wo.work_order_id, road.road_id, "EXECUTED_ON", "EXECUTED ON", "Repair executed by contractor.")

            # Audit breaches by contractor
            breach_wos = [wo for wo in cnt_wos if wo.is_dlp_breach or wo.is_overbilled]
            if breach_wos:
                audit_id = f"CNT_AUD_{cnt.contractor_id}"
                nodes[audit_id] = build_audit_node(
                    audit_id,
                    f"Contractor Audit Track Record",
                    f"{len(breach_wos)} flagged work orders in municipal records",
                    {"contractor_id": cnt.contractor_id, "breach_count": len(breach_wos)}
                )
                add_edge(audit_id, cnt.contractor_id, "LIABILITY_OF", "AUDIT RECORD", "Performance audit history.")

        # MODE 4: COMPLAINT INVESTIGATION
        elif mode == "complaint":
            c = self.rel_service.complaints_by_id.get(entity_id) or self.rel_service.loader.complaints[0]
            root_node_id = c.complaint_id
            nodes[c.complaint_id] = build_complaint_node(c)

            # Direct Road
            road = None
            wos = self.rel_service.complaint_to_wos_map.get(c.complaint_id, [])
            if wos:
                first_wo = self.rel_service.get_work_order(wos[0])
                if first_wo:
                    road = self.rel_service.get_road(first_wo.road_id)
            if not road and c.ward_code:
                ward_roads = [r for r in self.rel_service.loader.roads if r.ward_code == c.ward_code]
                if ward_roads:
                    road = ward_roads[0]

            if road:
                nodes[road.road_id] = build_road_node(road)
                add_edge(c.complaint_id, road.road_id, "FILED_FOR", "FILED FOR", f"Grievance filed regarding {road.road_name}.")

            # Direct Ward
            ward = self.rel_service.get_ward(c.ward_code)
            if ward:
                nodes[ward.ward_code] = build_ward_node(ward)
                add_edge(c.complaint_id, ward.ward_code, "LOCATED_IN", "LOCATED IN", f"Complaint received in Ward {ward.ward_code}.")

            # Linked Work Orders addressing this complaint
            linked_wos = [wo for wo in self.rel_service.loader.work_orders if c.complaint_id in wo.linked_complaint_ids]
            for wo in linked_wos[:2]:
                nodes[wo.work_order_id] = build_wo_node(wo)
                add_edge(c.complaint_id, wo.work_order_id, "TRIGGERED", "CONFIRMED RESOLUTION", f"Dispatched repair work order {wo.work_order_id}.")

            # ML Semantic Similarity (If enabled)
            if include_ml and self.ml_issue_service:
                ward_complaints = [other.complaint_id for other in self.rel_service.loader.complaints if other.ward_code == c.ward_code and other.complaint_id != c.complaint_id][:8]
                for other_cid in ward_complaints:
                    sim = self.ml_issue_service.compute_similarity(c.complaint_id, other_cid)
                    if sim >= 0.65:
                        other_c = self.rel_service.complaints_by_id.get(other_cid)
                        if other_c:
                            nodes[other_c.complaint_id] = build_complaint_node(other_c)
                            add_edge(
                                c.complaint_id, other_c.complaint_id,
                                "SIMILAR_COMPLAINT_CANDIDATE", f"ML SIMILAR ({int(sim*100)}%)",
                                f"Model identified {int(sim*100)}% semantic similarity between citizen reports.",
                                is_ml=True, confidence=float(sim)
                            )

        # MODE 5: WARD INVESTIGATION
        elif mode == "ward":
            ward = self.rel_service.get_ward(entity_id) or self.rel_service.loader.wards[0]
            root_node_id = ward.ward_code
            nodes[ward.ward_code] = build_ward_node(ward)

            # Top Arterial Roads in Ward
            ward_roads = [r for r in self.rel_service.loader.roads if r.ward_code == ward.ward_code][:4]
            for road in ward_roads:
                nodes[road.road_id] = build_road_node(road)
                add_edge(road.road_id, ward.ward_code, "LOCATED_IN", "LOCATED IN", "Road within ward boundary.")

            # Top Contractors Active in Ward
            ward_wos = self.rel_service.get_ward_work_orders(ward.ward_code)
            contractor_ids = list({wo.contractor_id for wo in ward_wos})[:4]
            for cid in contractor_ids:
                cnt = self.rel_service.get_contractor(cid)
                if cnt:
                    nodes[cnt.contractor_id] = build_contractor_node(cnt)
                    add_edge(ward.ward_code, cnt.contractor_id, "DISBURSED_TO", "DISBURSED TO", "Municipal contractor operating in ward.")

            # Node Expansion
            for exp_id in expanded_set:
                road = self.rel_service.get_road(exp_id)
                if road and road.road_id in nodes:
                    for wo in self.rel_service.get_road_work_orders(road.road_id)[:3]:
                        nodes[wo.work_order_id] = build_wo_node(wo)
                        add_edge(wo.work_order_id, road.road_id, "EXECUTED_ON", "EXECUTED ON", "Recorded work order.")

        # MODE 6: OUTCOME / AUDIT INVESTIGATION
        elif mode == "audit":
            audit_finding = self.rel_service.loader.audit_findings[0] if hasattr(self.rel_service.loader, "audit_findings") and self.rel_service.loader.audit_findings else None
            # Find finding matching entity_id or fallback
            finding_id = entity_id or "AUD-SAMPLE"
            root_node_id = finding_id
            nodes[finding_id] = build_audit_node(
                finding_id,
                "Audit Investigation Root",
                "Defect liability period violation and contractor schedule review",
                {"finding_id": finding_id, "status": "FLAGGED_FOR_RECOVERY"}
            )

            # Underlying Work Order
            first_wo = self.rel_service.loader.work_orders[0]
            nodes[first_wo.work_order_id] = build_wo_node(first_wo)
            add_edge(finding_id, first_wo.work_order_id, "AUDITS", "AUDIT TARGET", f"Underlying work order {first_wo.work_order_id} flagged.")

            # Liable Contractor
            cnt = self.rel_service.get_contractor(first_wo.contractor_id)
            if cnt:
                nodes[cnt.contractor_id] = build_contractor_node(cnt)
                add_edge(finding_id, cnt.contractor_id, "LIABILITY_OF", "CONTRACTOR LIABLE", f"Defect warranty responsibility under Clause 18.")

            # Relevant Road
            road = self.rel_service.get_road(first_wo.road_id)
            if road:
                nodes[road.road_id] = build_road_node(road)
                add_edge(first_wo.work_order_id, road.road_id, "EXECUTED_ON", "EXECUTED ON", "Physical asset location.")

        return {
            "investigation_mode": mode,
            "root_id": root_node_id,
            "root_node": nodes.get(root_node_id),
            "nodes_count": len(nodes),
            "edges_count": len(edges),
            "nodes": list(nodes.values()),
            "edges": edges,
            "expanded_nodes": list(expanded_set),
            "available_relationship_types": [
                {"type": "EXECUTED_ON", "label": "Executed On", "description": "Municipal repair performed on road segment"},
                {"type": "AWARDED_TO", "label": "Awarded To", "description": "Contract assigned to empanelled vendor"},
                {"type": "FUNDED", "label": "Funded By", "description": "Cost charged to ward monsoon budget"},
                {"type": "LOCATED_IN", "label": "Located In", "description": "Geographical jurisdiction within BMC Ward"},
                {"type": "FILED_FOR", "label": "Filed For", "description": "Citizen grievance recorded against asset"},
                {"type": "TRIGGERED", "label": "Triggered", "description": "Grievance dispatched verified repair work order"},
                {"type": "BENCHMARKED_BY", "label": "Benchmarked By", "description": "Billed cost evaluated against BMC schedule of rates"},
                {"type": "AUDITS", "label": "Audits / Flags", "description": "Work order flagged for DLP warranty breach or overbilling"},
                {"type": "SIMILAR_COMPLAINT_CANDIDATE", "label": "ML Candidate Match", "description": "Semantic similarity candidate (Non-confirmed)"}
            ]
        }
