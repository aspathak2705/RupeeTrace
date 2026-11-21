from datetime import datetime
from typing import List, Dict, Any, Optional
from rupeetrace.services.relationship_service import RelationshipService
from rupeetrace.models.entities import WorkOrder, RoadAsset, Contractor, RateCard

class AuditService:
    def __init__(self, rel_service: RelationshipService):
        self.rel_service = rel_service
        self._cached_findings: Optional[List[Dict[str, Any]]] = None

    def get_all_findings(
        self,
        finding_type: Optional[str] = None,
        ward_code: Optional[str] = None,
        road_id: Optional[str] = None,
        contractor_id: Optional[str] = None,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        provenance_type: Optional[str] = None,
        limit: int = 200
    ) -> List[Dict[str, Any]]:
        """
        Returns audit findings with deterministic rule-based screening.
        Precomputes and caches findings in memory for speed.
        """
        if self._cached_findings is None:
            self._compute_all_findings()

        results = self._cached_findings or []

        if finding_type:
            results = [f for f in results if f["finding_type"] == finding_type]
        if ward_code:
            results = [f for f in results if f["ward_code"] == ward_code]
        if road_id:
            results = [f for f in results if f["road_id"] == road_id]
        if contractor_id:
            results = [f for f in results if f["contractor_id"] == contractor_id]
        if status:
            results = [f for f in results if f["status"] == status]
        if severity:
            results = [f for f in results if f["severity"] == severity]
        if provenance_type:
            results = [f for f in results if f.get("provenance_type") == provenance_type]

        return results[:limit]

    def get_combined_findings(
        self,
        ml_anomaly_service = None,
        ward_code: Optional[str] = None,
        road_id: Optional[str] = None,
        limit: int = 200
    ) -> List[Dict[str, Any]]:
        """
        Combines deterministic rule findings with statistical metrics and ML IsolationForest anomalies.
        Provides distinct provenance tags: [Deterministic], [Statistical], and [ML IsolationForest].
        """
        det_limit = max(10, limit // 2) if ml_anomaly_service is not None else limit
        findings = list(self.get_all_findings(ward_code=ward_code, road_id=road_id, limit=det_limit))

        if ml_anomaly_service is not None:
            ml_limit = max(10, limit - len(findings))
            anomalies = ml_anomaly_service.get_anomalies(ward_code=ward_code, road_id=road_id, min_score=0.45, limit=ml_limit)
            for a in anomalies:
                findings.append({
                    "finding_id": f"AUD-ML-{a['work_order_id']}",
                    "finding_type": "ML_REPAIR_ANOMALY",
                    "severity": "HIGH" if a["anomaly_score"] >= 0.70 else "MEDIUM",
                    "status": "High priority review" if a["anomaly_score"] >= 0.70 else "Needs review",
                    "ward_code": a["ward_code"],
                    "road_id": a["road_id"],
                    "work_order_id": a["work_order_id"],
                    "contractor_id": a["contractor_id"],
                    "source_records": [
                        {"file": "work_orders.csv", "id": a["work_order_id"]}
                    ],
                    "calculation": {
                        "anomaly_score": a["anomaly_score"],
                        "classification": a["classification"],
                        "peer_group_size": a["peer_group_size"],
                        "differentiating_features": a["differentiating_features"]
                    },
                    "reason": f"Isolation Forest identified {a['classification'].lower()} (score: {a['anomaly_score']:.2f}) within peer group '{a['repair_method']}'.",
                    "limitations": "Unusual statistical profile does not prove defect or overbilling; requires physical measurement sheet review.",
                    "provenance_type": "[ML IsolationForest]",
                    "recommended_action": a["recommended_action"]
                })

        return findings[:limit]

    def get_finding_by_id(self, finding_id: str) -> Optional[Dict[str, Any]]:
        if self._cached_findings is None:
            self._compute_all_findings()
        for f in (self._cached_findings or []):
            if f["finding_id"] == finding_id:
                return f
        return None

    def _compute_all_findings(self):
        findings: List[Dict[str, Any]] = []

        # Check A: Rate-card deviation
        findings.extend(self._check_rate_card_deviations())

        # Check B: Possible duplicate work orders
        findings.extend(self._check_duplicate_work_orders())

        # Check C: DLP expenditure
        findings.extend(self._check_dlp_expenditure())

        # Check D: SLA and repair durability
        findings.extend(self._check_sla_and_durability())

        self._cached_findings = findings

    def _check_rate_card_deviations(self) -> List[Dict[str, Any]]:
        findings = []
        counter = 1
        for wo in self.rel_service.loader.work_orders:
            dev = wo.cost_variance_pct
            if dev is not None and dev > 20.0:
                is_high = dev > 30.0
                rc = self.rel_service.rate_card_by_method.get(wo.repair_method)
                rate = rc.standard_rate_inr if rc else 0.0
                unit = rc.unit if rc else "unknown"

                finding = {
                    "finding_id": f"AUD-RATE-{counter:04d}",
                    "finding_type": "RATE_CARD_DEVIATION",
                    "severity": "HIGH" if is_high else "MEDIUM",
                    "status": "High priority review" if is_high else "Needs review",
                    "ward_code": wo.ward_code,
                    "road_id": wo.road_id,
                    "work_order_id": wo.work_order_id,
                    "contractor_id": wo.contractor_id,
                    "source_records": [
                        {"file": "work_orders.csv", "id": wo.work_order_id},
                        {"file": "rate_card.csv", "id": wo.repair_method}
                    ],
                    "calculation": {
                        "billed_cost_inr": wo.cost_inr,
                        "expected_cost_inr": wo.expected_cost_inr,
                        "standard_rate_inr": rate,
                        "rate_card_unit": unit,
                        "area_sqm": wo.area_sqm,
                        "variance_inr": wo.cost_variance_inr,
                        "variance_pct": dev,
                        "formula": (
                            f"billed ({wo.cost_inr}) - expected ({wo.expected_cost_inr}) = {wo.cost_variance_inr} "
                            f"(+{dev}%) vs benchmark"
                        ),
                        "applied_threshold_pct": 30.0 if is_high else 20.0
                    },
                    "reason": (
                        f"Recorded billed cost of ₹{wo.cost_inr:,.0f} exceeds rate card baseline "
                        f"of ₹{wo.expected_cost_inr:,.0f} by {dev:.1f}%. Exceeds normal variance screening band."
                    ),
                    "limitations": (
                        "Screening threshold based on synthetic rate-card schedule. Normal field variance may reflect "
                        "specialized ground preparation, water pumping or subsurface pipe reinforcement."
                    ),
                    "provenance_type": "[Deterministic]",
                    "recommended_action": (
                        "Review measurement book and on-site itemized measurement sheets with ward executive engineer."
                    )
                }
                findings.append(finding)
                counter += 1
        return findings

    def _check_duplicate_work_orders(self) -> List[Dict[str, Any]]:
        findings = []
        counter = 1

        # Pre-parse timestamps once for O(1) time comparisons
        wo_ts: Dict[str, float] = {}
        for wo in self.rel_service.loader.work_orders:
            try:
                wo_ts[wo.work_order_id] = datetime.strptime(wo.completed_at, "%Y-%m-%d %H:%M:%S").timestamp()
            except Exception:
                wo_ts[wo.work_order_id] = 0.0

        # Group work orders by (road_id, repair_method)
        grouped: Dict[tuple, List[WorkOrder]] = {}
        for wo in self.rel_service.loader.work_orders:
            grouped.setdefault((wo.road_id, wo.repair_method), []).append(wo)

        for (road_id, method), group in grouped.items():
            if len(group) < 2:
                continue

            # Sort chronologically by completed_at timestamp
            sorted_group = sorted(group, key=lambda x: wo_ts.get(x.work_order_id, 0.0))
            for i in range(len(sorted_group)):
                w1 = sorted_group[i]
                t1 = wo_ts.get(w1.work_order_id, 0.0)

                for j in range(i + 1, len(sorted_group)):
                    w2 = sorted_group[j]
                    t2 = wo_ts.get(w2.work_order_id, 0.0)

                    days_diff = (t2 - t1) / 86400.0
                    if days_diff > 14.0:
                        # Since list is chronologically sorted, break early
                        break

                    # Check complaint overlap
                    c1 = set(w1.linked_complaint_ids)
                    c2 = set(w2.linked_complaint_ids)
                    shared_c = c1.intersection(c2)

                    same_contractor = (w1.contractor_id == w2.contractor_id)
                    is_close = (days_diff <= 7.0 and same_contractor)

                    finding = {
                        "finding_id": f"AUD-DUP-{counter:04d}",
                        "finding_type": "POSSIBLE_DUPLICATE",
                        "severity": "HIGH" if is_close else "MEDIUM",
                        "status": "High priority review" if is_close else "Needs review",
                        "ward_code": w1.ward_code,
                        "road_id": road_id,
                        "work_order_id": f"{w1.work_order_id} & {w2.work_order_id}",
                        "contractor_id": f"{w1.contractor_id}" if same_contractor else f"{w1.contractor_id}, {w2.contractor_id}",
                        "source_records": [
                            {"file": "work_orders.csv", "id": w1.work_order_id},
                            {"file": "work_orders.csv", "id": w2.work_order_id}
                        ],
                        "calculation": {
                            "wo1_id": w1.work_order_id,
                            "wo1_completed_at": w1.completed_at,
                            "wo1_cost_inr": w1.cost_inr,
                            "wo2_id": w2.work_order_id,
                            "wo2_completed_at": w2.completed_at,
                            "wo2_cost_inr": w2.cost_inr,
                            "total_combined_cost_inr": round(w1.cost_inr + w2.cost_inr, 2),
                            "days_between_completions": round(days_diff, 1),
                            "shared_complaint_ids": list(shared_c)
                        },
                        "reason": (
                            f"Two work orders ({w1.work_order_id} and {w2.work_order_id}) recorded on road {road_id} "
                            f"for '{method}' completed within {days_diff:.1f} days without shared complaint linkage. "
                            f"Combined recorded expenditure: ₹{(w1.cost_inr + w2.cost_inr):,.0f}."
                        ),
                        "limitations": (
                            "Work orders may address distinct potholes or road chainages along the same road segment. "
                            "Candidate duplicate screening does not prove redundant billing."
                        ),
                        "provenance_type": "[Deterministic]",
                        "recommended_action": (
                            "Inspect road chainage log and GPS coordinates in contractor work completion certificate."
                        )
                    }
                    findings.append(finding)
                    counter += 1
        return findings

    def _check_dlp_expenditure(self) -> List[Dict[str, Any]]:
        findings = []
        counter = 1
        for wo in self.rel_service.loader.work_orders:
            if wo.is_dlp_breach:
                road = self.rel_service.get_road(wo.road_id)
                finding = {
                    "finding_id": f"AUD-DLP-{counter:04d}",
                    "finding_type": "DLP_EXPENDITURE",
                    "severity": "HIGH" if wo.cost_inr >= 50000 else "MEDIUM",
                    "status": "High priority review" if wo.cost_inr >= 50000 else "Needs review",
                    "ward_code": wo.ward_code,
                    "road_id": wo.road_id,
                    "work_order_id": wo.work_order_id,
                    "contractor_id": wo.contractor_id,
                    "source_records": [
                        {"file": "work_orders.csv", "id": wo.work_order_id},
                        {"file": "roads.csv", "id": wo.road_id}
                    ],
                    "calculation": {
                        "billed_cost_inr": wo.cost_inr,
                        "road_last_resurfaced": road.last_resurfaced if road else None,
                        "under_dlp_flag": True
                    },
                    "reason": "Recorded work on a road marked under DLP — contract/warranty review required.",
                    "limitations": (
                        "Certain utility trench cuts, third-party pipeline bursts or emergency traffic police directives "
                        "may warrant BMC emergency expenditure outside original contractor warranty scope."
                    ),
                    "provenance_type": "[Deterministic]",
                    "recommended_action": (
                        "Verify whether original resurfacing contractor was notified to rectify under warranty terms "
                        "before issuing payment."
                    )
                }
                findings.append(finding)
                counter += 1
        return findings

    def _check_sla_and_durability(self) -> List[Dict[str, Any]]:
        findings = []
        counter = 1
        for wo in self.rel_service.loader.work_orders:
            # Check reopening within 30 days
            if wo.reopened_within_30d:
                finding = {
                    "finding_id": f"AUD-DUR-{counter:04d}",
                    "finding_type": "SLA_DURABILITY_BREACH",
                    "severity": "HIGH",
                    "status": "High priority review",
                    "ward_code": wo.ward_code,
                    "road_id": wo.road_id,
                    "work_order_id": wo.work_order_id,
                    "contractor_id": wo.contractor_id,
                    "source_records": [
                        {"file": "work_orders.csv", "id": wo.work_order_id}
                    ],
                    "calculation": {
                        "reopened_within_30d": True,
                        "billed_cost_inr": wo.cost_inr,
                        "repair_method": wo.repair_method,
                        "completed_at": wo.completed_at
                    },
                    "reason": (
                        f"Work order {wo.work_order_id} was recorded as completed but reopened within 30 days. "
                        f"Recorded billed expenditure of ₹{wo.cost_inr:,.0f} failed to provide durable road restoration."
                    ),
                    "limitations": (
                        "Rapid failure may result from heavy waterlogging, high-tide submergence, or structural subgrade "
                        "weakness rather than poor asphalt binder quality."
                    ),
                    "provenance_type": "[Deterministic]",
                    "recommended_action": (
                        "Evaluate environmental flood context and review contractor defect liability hold-back guarantee."
                    )
                }
                findings.append(finding)
                counter += 1

            # Check missed SLA
            if not wo.sla_met:
                finding = {
                    "finding_id": f"AUD-SLA-{counter:04d}",
                    "finding_type": "SLA_DURABILITY_BREACH",
                    "severity": "MEDIUM",
                    "status": "Needs review",
                    "ward_code": wo.ward_code,
                    "road_id": wo.road_id,
                    "work_order_id": wo.work_order_id,
                    "contractor_id": wo.contractor_id,
                    "source_records": [
                        {"file": "work_orders.csv", "id": wo.work_order_id}
                    ],
                    "calculation": {
                        "sla_hours_target": wo.sla_hours,
                        "sla_met_recorded": False,
                        "assigned_at": wo.assigned_at,
                        "completed_at": wo.completed_at
                    },
                    "reason": (
                        f"Work order {wo.work_order_id} breached target SLA ({wo.sla_hours} hours). "
                        "Delayed repair extends citizen exposure to road hazard."
                    ),
                    "limitations": (
                        "Continuous heavy monsoon rainfall or traffic police work permits may delay asphalt laying."
                    ),
                    "provenance_type": "[Deterministic]",
                    "recommended_action": (
                        "Cross-reference rainfall log on assignment dates to determine if force majeure applies."
                    )
                }
                findings.append(finding)
                counter += 1
        return findings
