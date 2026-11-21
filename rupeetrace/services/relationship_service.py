from typing import Dict, List, Optional, Any, Set
from rupeetrace.data.data_loader import DataLoader
from rupeetrace.models.entities import (
    Ward, RoadAsset, Complaint, WorkOrder, Contractor, RateCard,
    TrafficRecord, Accident, Facility, FloodHotspot, RainfallDaily,
    TideRecord, AuditEvidence, GraphRelationship
)
from rupeetrace.core.provenance import SourceProvenance

class RelationshipService:
    def __init__(self, loader: DataLoader):
        self.loader = loader

        # Primary key lookup maps (O(1))
        self.wards_by_code: Dict[str, Ward] = {}
        self.roads_by_id: Dict[str, RoadAsset] = {}
        self.complaints_by_id: Dict[str, Complaint] = {}
        self.contractors_by_id: Dict[str, Contractor] = {}
        self.rate_card_by_method: Dict[str, RateCard] = {}
        self.work_orders_by_id: Dict[str, WorkOrder] = {}
        self.traffic_by_road: Dict[str, TrafficRecord] = {}
        self.flood_hotspots_by_id: Dict[str, FloodHotspot] = {}

        # Relational grouping indices
        self.work_orders_by_road: Dict[str, List[WorkOrder]] = {}
        self.work_orders_by_ward: Dict[str, List[WorkOrder]] = {}
        self.work_orders_by_contractor: Dict[str, List[WorkOrder]] = {}

        self.complaints_by_road: Dict[str, List[Complaint]] = {}
        self.complaints_by_ward: Dict[str, List[Complaint]] = {}

        self.accidents_by_road: Dict[str, List[Accident]] = {}
        self.accidents_by_ward: Dict[str, List[Accident]] = {}

        self.facilities_by_road: Dict[str, List[Facility]] = {}
        self.facilities_by_ward: Dict[str, List[Facility]] = {}

        self.flood_hotspots_by_ward: Dict[str, List[FloodHotspot]] = {}
        self.flood_hotspots_by_road: Dict[str, List[FloodHotspot]] = {}

        # Complaint <-> Work Order M:N mapping
        self.wo_to_complaints_map: Dict[str, List[str]] = {}
        self.complaint_to_wos_map: Dict[str, List[str]] = {}

        # Temporal environmental indices
        self.rainfall_by_date: Dict[str, List[RainfallDaily]] = {}
        self.tides_by_date: Dict[str, List[TideRecord]] = {}

        # Complete graph representation
        self.graph_edges: List[GraphRelationship] = []

        # Build indices
        self._build_indices()

    def _build_indices(self):
        # 1. Primary lookups
        for w in self.loader.wards:
            self.wards_by_code[w.ward_code] = w

        for r in self.loader.roads:
            self.roads_by_id[r.road_id] = r

        for c in self.loader.complaints:
            self.complaints_by_id[c.complaint_id] = c
            if c.ward_code:
                self.complaints_by_ward.setdefault(c.ward_code, []).append(c)

        for cont in self.loader.contractors:
            self.contractors_by_id[cont.contractor_id] = cont

        for rc in self.loader.rate_cards:
            self.rate_card_by_method[rc.repair_method] = rc

        for tr in self.loader.traffic:
            self.traffic_by_road[tr.road_id] = tr

        for acc in self.loader.accidents:
            self.accidents_by_road.setdefault(acc.road_id, []).append(acc)
            self.accidents_by_ward.setdefault(acc.ward_code, []).append(acc)

        for fac in self.loader.facilities:
            self.facilities_by_road.setdefault(fac.ambulance_entry_road, []).append(fac)
            self.facilities_by_ward.setdefault(fac.ward_code, []).append(fac)

        for fh in self.loader.flood_hotspots:
            self.flood_hotspots_by_id[fh.hotspot_id] = fh
            self.flood_hotspots_by_ward.setdefault(fh.ward_code, []).append(fh)
            if fh.nearest_road_id:
                self.flood_hotspots_by_road.setdefault(fh.nearest_road_id, []).append(fh)

        for rf in self.loader.rainfall:
            self.rainfall_by_date.setdefault(rf.date, []).append(rf)

        for td in self.loader.tides:
            self.tides_by_date.setdefault(td.date, []).append(td)

        # 2. Work order relations & graph edge generation
        for wo in self.loader.work_orders:
            self.work_orders_by_id[wo.work_order_id] = wo
            self.work_orders_by_road.setdefault(wo.road_id, []).append(wo)
            self.work_orders_by_ward.setdefault(wo.ward_code, []).append(wo)
            self.work_orders_by_contractor.setdefault(wo.contractor_id, []).append(wo)

            # Link complaints
            self.wo_to_complaints_map[wo.work_order_id] = wo.linked_complaint_ids
            for cid in wo.linked_complaint_ids:
                self.complaint_to_wos_map.setdefault(cid, []).append(wo.work_order_id)
                # Map complaint to road through work order
                c_obj = self.complaints_by_id.get(cid)
                if c_obj:
                    # Avoid duplicates on road complaints list
                    existing_cids = {comp.complaint_id for comp in self.complaints_by_road.get(wo.road_id, [])}
                    if c_obj.complaint_id not in existing_cids:
                        self.complaints_by_road.setdefault(wo.road_id, []).append(c_obj)

                # Edge: Complaint -> Work Order
                self.graph_edges.append(
                    GraphRelationship(
                        source_id=cid,
                        source_type="Complaint",
                        target_id=wo.work_order_id,
                        target_type="WorkOrder",
                        relation_type="LINKED_TO_WORK_ORDER",
                        metadata={"work_type": wo.work_type, "repair_method": wo.repair_method},
                        provenance=wo.provenance
                    )
                )

            # Edge: Work Order -> Road
            self.graph_edges.append(
                GraphRelationship(
                    source_id=wo.work_order_id,
                    source_type="WorkOrder",
                    target_id=wo.road_id,
                    target_type="RoadAsset",
                    relation_type="EXECUTED_ON_ROAD",
                    metadata={"cost_inr": wo.cost_inr, "is_dlp_breach": wo.is_dlp_breach},
                    provenance=wo.provenance
                )
            )

            # Edge: Work Order -> Ward
            self.graph_edges.append(
                GraphRelationship(
                    source_id=wo.work_order_id,
                    source_type="WorkOrder",
                    target_id=wo.ward_code,
                    target_type="Ward",
                    relation_type="ASSIGNED_IN_WARD",
                    metadata={"cost_inr": wo.cost_inr},
                    provenance=wo.provenance
                )
            )

            # Edge: Work Order -> Contractor
            self.graph_edges.append(
                GraphRelationship(
                    source_id=wo.work_order_id,
                    source_type="WorkOrder",
                    target_id=wo.contractor_id,
                    target_type="Contractor",
                    relation_type="AWARDED_TO_CONTRACTOR",
                    metadata={"cost_inr": wo.cost_inr, "contractor_name": wo.contractor_name},
                    provenance=wo.provenance
                )
            )

            # Edge: Work Order -> RateCard
            self.graph_edges.append(
                GraphRelationship(
                    source_id=wo.work_order_id,
                    source_type="WorkOrder",
                    target_id=wo.repair_method,
                    target_type="RateCard",
                    relation_type="PRICED_BY_RATE_CARD",
                    metadata={
                        "expected_cost": wo.expected_cost_inr,
                        "cost_variance_pct": wo.cost_variance_pct,
                        "is_overbilled": wo.is_overbilled
                    },
                    provenance=wo.provenance
                )
            )

    # Reusable Data Access Layer Methods (Task 3)
    def get_ward(self, ward_code: str) -> Optional[Ward]:
        return self.wards_by_code.get(ward_code.strip())

    def get_road(self, road_id: str) -> Optional[RoadAsset]:
        return self.roads_by_id.get(road_id.strip())

    def get_work_order(self, work_order_id: str) -> Optional[WorkOrder]:
        return self.work_orders_by_id.get(work_order_id.strip())

    def get_contractor(self, contractor_id: str) -> Optional[Contractor]:
        return self.contractors_by_id.get(contractor_id.strip())

    def get_complaint(self, complaint_id: str) -> Optional[Complaint]:
        return self.complaints_by_id.get(complaint_id.strip())

    def get_linked_complaints(self, work_order_id: str) -> List[Complaint]:
        cids = self.wo_to_complaints_map.get(work_order_id.strip(), [])
        return [self.complaints_by_id[cid] for cid in cids if cid in self.complaints_by_id]

    def get_road_work_orders(self, road_id: str) -> List[WorkOrder]:
        return self.work_orders_by_road.get(road_id.strip(), [])

    def get_ward_work_orders(self, ward_code: str) -> List[WorkOrder]:
        return self.work_orders_by_ward.get(ward_code.strip(), [])

    def get_road_complaints(self, road_id: str) -> List[Complaint]:
        return self.complaints_by_road.get(road_id.strip(), [])

    def get_ward_complaints(self, ward_code: str) -> List[Complaint]:
        return self.complaints_by_ward.get(ward_code.strip(), [])

    def get_work_order_evidence(self, work_order_id: str) -> Optional[AuditEvidence]:
        """
        Builds complete audit evidence bundle preserving end-to-end source provenance.
        Does not fabricate any missing records.
        """
        wo = self.get_work_order(work_order_id)
        if not wo:
            return None

        road = self.get_road(wo.road_id)
        ward = self.get_ward(wo.ward_code)
        contractor = self.get_contractor(wo.contractor_id)
        rate_card = self.rate_card_by_method.get(wo.repair_method)
        linked_comps = self.get_linked_complaints(wo.work_order_id)
        traffic_rec = self.traffic_by_road.get(wo.road_id)
        facilities_near = self.facilities_by_road.get(wo.road_id, [])

        # SLA and reopening analysis
        sla_info = {
            "sla_hours": wo.sla_hours,
            "sla_met": wo.sla_met,
            "reopened_within_30d": wo.reopened_within_30d,
            "assigned_at": wo.assigned_at,
            "work_started_at": wo.work_started_at,
            "completed_at": wo.completed_at
        }

        # Financial audit reconciliation
        fin_info = {
            "billed_cost_inr": wo.cost_inr,
            "repair_method": wo.repair_method,
            "area_sqm": wo.area_sqm,
            "rate_card_standard_rate": rate_card.standard_rate_inr if rate_card else None,
            "rate_card_unit": rate_card.unit if rate_card else None,
            "expected_cost_inr": wo.expected_cost_inr,
            "cost_variance_inr": wo.cost_variance_inr,
            "cost_variance_pct": wo.cost_variance_pct,
            "is_overbilled_flag": wo.is_overbilled,
            "road_under_dlp": road.under_dlp if road else None,
            "is_dlp_breach_flag": wo.is_dlp_breach
        }

        # Provenance records aggregation
        provenances = [wo.provenance]
        if road:
            provenances.append(road.provenance)
        if ward:
            provenances.append(ward.provenance)
        if contractor:
            provenances.append(contractor.provenance)
        if rate_card:
            provenances.append(rate_card.provenance)
        for comp in linked_comps:
            provenances.append(comp.provenance)

        return AuditEvidence(
            work_order=wo,
            linked_complaints=linked_comps,
            road=road,
            ward=ward,
            contractor=contractor,
            rate_card=rate_card,
            traffic=traffic_rec,
            nearby_facilities=facilities_near,
            sla_and_reopening=sla_info,
            financial_audit=fin_info,
            provenances=provenances
        )
