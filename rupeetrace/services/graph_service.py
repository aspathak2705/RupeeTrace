from typing import List, Dict, Any, Optional, Set
from rupeetrace.services.relationship_service import RelationshipService

class GraphService:
    def __init__(self, rel_service: RelationshipService):
        self.rel_service = rel_service

    def get_subgraph(
        self,
        road_id: Optional[str] = None,
        work_order_id: Optional[str] = None,
        ward_code: Optional[str] = None,
        max_work_orders: int = 10
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
