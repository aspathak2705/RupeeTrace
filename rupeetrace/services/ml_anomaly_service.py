import math
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from rupeetrace.services.relationship_service import RelationshipService
from rupeetrace.models.entities import WorkOrder, RateCard

class MLAnomalyService:
    """
    Model B — Context-Aware Repair Anomaly Intelligence Service.
    Applies peer-group partitioned Isolation Forests and statistical screening
    to identify unusual expenditure, turnaround, or outcome patterns without
    presuming fraud or corruption.
    """

    def __init__(self, rel_service: RelationshipService):
        self.rel_service = rel_service
        self._cached_anomalies: Optional[List[Dict[str, Any]]] = None
        self._anomaly_by_id: Dict[str, Dict[str, Any]] = {}
        self._peer_groups_data: Dict[str, Dict[str, Any]] = {}
        
        # Fit models and precompute
        self._compute_all_anomalies()

    def _compute_all_anomalies(self):
        """Fits peer-grouped Isolation Forest models across all work orders."""
        work_orders = self.rel_service.loader.work_orders
        if not work_orders:
            return

        # 1. Build DataFrame of features
        records = []
        for wo in work_orders:
            rc = self.rel_service.rate_card_by_method.get(wo.repair_method)
            std_rate = rc.standard_rate_inr if rc else 1000.0
            unit = rc.unit if rc else "per sqm"
            is_per_sqm = (unit == "per sqm")

            # Unit-aware cost
            area = max(1.0, wo.area_sqm)
            unit_cost = (wo.cost_inr / area) if is_per_sqm else float(wo.cost_inr)
            
            # Variance from rate card
            if is_per_sqm:
                variance_pct = ((unit_cost - std_rate) / std_rate) * 100.0
            else:
                variance_pct = ((wo.cost_inr - std_rate) / std_rate) * 100.0

            # Turnaround in hours
            try:
                t_start = datetime.strptime(wo.work_started_at, "%Y-%m-%d %H:%M:%S") if ":" in wo.work_started_at else datetime.strptime(wo.work_started_at, "%Y-%m-%d")
                t_end = datetime.strptime(wo.completed_at, "%Y-%m-%d %H:%M:%S") if ":" in wo.completed_at else datetime.strptime(wo.completed_at, "%Y-%m-%d")
                duration_hours = max(0.5, (t_end - t_start).total_seconds() / 3600.0)
            except Exception:
                duration_hours = 24.0

            # Environmental low-lying context from ward
            ward = self.rel_service.get_ward(wo.ward_code)
            flood_index = ward.low_lying_index if ward else 5.0

            # Contractor volume in ward
            cont_wos = self.rel_service.work_orders_by_contractor.get(wo.contractor_id, [])
            cont_volume = len([cw for cw in cont_wos if cw.ward_code == wo.ward_code])

            records.append({
                "work_order_id": wo.work_order_id,
                "road_id": wo.road_id,
                "ward_code": wo.ward_code,
                "contractor_id": wo.contractor_id,
                "contractor_name": wo.contractor_name,
                "repair_method": wo.repair_method,
                "unit": unit,
                "is_per_sqm": is_per_sqm,
                "cost_inr": float(wo.cost_inr),
                "area_sqm": float(wo.area_sqm),
                "unit_cost": float(unit_cost),
                "std_rate": float(std_rate),
                "variance_pct": float(variance_pct),
                "duration_hours": float(duration_hours),
                "sla_met": 1.0 if wo.sla_met else 0.0,
                "reopened_within_30d": 1.0 if wo.reopened_within_30d else 0.0,
                "flood_index": float(flood_index),
                "contractor_volume": float(cont_volume)
            })

        df = pd.DataFrame(records)

        feature_cols = [
            "unit_cost", "variance_pct", "area_sqm", "duration_hours",
            "sla_met", "reopened_within_30d", "flood_index", "contractor_volume"
        ]

        all_anomalies = []
        peer_groups = df["repair_method"].unique()

        for method in peer_groups:
            group_df = df[df["repair_method"] == method].copy().reset_index(drop=True)
            n_samples = len(group_df)
            if n_samples < 3:
                continue

            X = group_df[feature_cols].values
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)

            # IsolationForest execution with robust fallback
            if n_samples >= 15:
                clf = IsolationForest(
                    n_estimators=100,
                    contamination=0.06,
                    random_state=42
                )
                clf.fit(X_scaled)
                raw_scores = clf.decision_function(X_scaled)  # Lower means more anomalous
            else:
                # Small sample fallback: Mahalanobis or Euclidean distance to centroid
                centroid = np.median(X_scaled, axis=0)
                dists = np.linalg.norm(X_scaled - centroid, axis=1)
                # Invert so higher distance means lower score
                raw_scores = -dists / (np.std(dists) + 1e-6)

            # Store peer group stats for fast lookups
            medians = group_df[feature_cols].median().to_dict()
            iqrs = (group_df[feature_cols].quantile(0.75) - group_df[feature_cols].quantile(0.25)).to_dict()
            self._peer_groups_data[method] = {
                "count": n_samples,
                "medians": medians,
                "iqrs": iqrs,
                "unit": group_df["unit"].iloc[0],
                "std_rate": group_df["std_rate"].iloc[0],
                "df": group_df,
                "X_scaled": X_scaled
            }

            # Calibrate scores to [0, 1] anomaly score
            # Score scaling: raw_score is typically between -0.25 and +0.20
            # We map: raw_score < -0.10 => high anomaly (> 0.70)
            min_s = float(np.min(raw_scores))
            max_s = float(np.max(raw_scores))
            denom = (max_s - min_s) if max_s > min_s else 1.0

            for i in range(n_samples):
                row = group_df.iloc[i]
                r_score = raw_scores[i]

                # Normalized inverted score: 1.0 = most anomalous, 0.0 = most normal
                norm_score = float((max_s - r_score) / denom)
                
                # Boost if multiple flags are active
                boost = 0.0
                if row["variance_pct"] > 35.0:
                    boost += 0.15
                if row["reopened_within_30d"] == 1.0:
                    boost += 0.12
                if row["sla_met"] == 0.0:
                    boost += 0.08
                
                calibrated_score = round(min(0.98, max(0.05, norm_score * 0.75 + boost)), 3)

                # Classification into 3 neutral screening levels
                if calibrated_score >= 0.70:
                    classification = "High-priority investigation candidate"
                elif calibrated_score >= 0.45:
                    classification = "Unusual pattern"
                else:
                    classification = "Normal pattern"

                # Calculate feature deviations
                deviations = []
                for feat in ["unit_cost", "variance_pct", "duration_hours", "area_sqm"]:
                    val = float(row[feat])
                    med = float(medians.get(feat, 0.0))
                    pct_diff = round(((val - med) / (med + 1e-6)) * 100.0, 1)
                    if abs(pct_diff) > 25.0:
                        deviations.append({
                            "feature": feat,
                            "observed_value": round(val, 2),
                            "peer_median": round(med, 2),
                            "deviation_pct": pct_diff,
                            "direction": "higher" if pct_diff > 0 else "lower"
                        })

                # Missing evidence checklist
                missing_evidence = []
                if row["variance_pct"] > 25.0:
                    missing_evidence.append("Bitumen / material batch mix invoice & weighbridge slip")
                if row["duration_hours"] < 6.0:
                    missing_evidence.append("Detailed site logbook verifying rapid cure/compaction timeline")
                if row["reopened_within_30d"] == 1.0:
                    missing_evidence.append("Post-repair quality engineer inspection report and core sample analysis")
                if not missing_evidence:
                    missing_evidence.append("Standard pre/post geotagged high-resolution photographs")

                # Actionable neutral recommendation
                if classification == "High-priority investigation candidate":
                    action = "Verify plant batch weighbridge receipts and request post-monsoon pavement core sample test before budget sign-off."
                elif classification == "Unusual pattern":
                    action = "Review site supervisor logbook and check road dimension records against invoiced metric quantities."
                else:
                    action = "Routine procedural verification; within expected statistical peer baseline."

                # Find 3 closest comparable peers
                cur_vec = X_scaled[i]
                dists = np.linalg.norm(X_scaled - cur_vec, axis=1)
                peer_indices = np.argsort(dists)[1:4]  # skip self
                peers = []
                for p_idx in peer_indices:
                    p_row = group_df.iloc[p_idx]
                    peers.append({
                        "work_order_id": p_row["work_order_id"],
                        "road_id": p_row["road_id"],
                        "cost_inr": p_row["cost_inr"],
                        "area_sqm": p_row["area_sqm"],
                        "unit_cost": p_row["unit_cost"],
                        "duration_hours": p_row["duration_hours"],
                        "reopened_within_30d": bool(p_row["reopened_within_30d"]),
                        "distance_score": round(float(dists[p_idx]), 3)
                    })

                anomaly_record = {
                    "work_order_id": row["work_order_id"],
                    "road_id": row["road_id"],
                    "ward_code": row["ward_code"],
                    "contractor_id": row["contractor_id"],
                    "contractor_name": row["contractor_name"],
                    "repair_method": row["repair_method"],
                    "cost_inr": row["cost_inr"],
                    "area_sqm": row["area_sqm"],
                    "unit_cost": row["unit_cost"],
                    "unit": row["unit"],
                    "standard_rate_inr": row["std_rate"],
                    "rate_card_variance_pct": row["variance_pct"],
                    "duration_hours": row["duration_hours"],
                    "sla_met": bool(row["sla_met"]),
                    "reopened_within_30d": bool(row["reopened_within_30d"]),
                    "anomaly_score": calibrated_score,
                    "classification": classification,
                    "peer_group_size": n_samples,
                    "differentiating_features": deviations,
                    "comparable_peers": peers,
                    "missing_evidence": missing_evidence,
                    "recommended_action": action,
                    "provenance_type": "[ML IsolationForest]"
                }

                all_anomalies.append(anomaly_record)
                self._anomaly_by_id[row["work_order_id"]] = anomaly_record

        # Sort all anomalies by score descending
        all_anomalies.sort(key=lambda x: x["anomaly_score"], reverse=True)
        self._cached_anomalies = all_anomalies

    def get_anomalies(
        self,
        ward_code: Optional[str] = None,
        road_id: Optional[str] = None,
        classification: Optional[str] = None,
        repair_method: Optional[str] = None,
        min_score: float = 0.0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Returns filtered work-order anomalies."""
        results = self._cached_anomalies or []

        if ward_code:
            results = [a for a in results if a["ward_code"] == ward_code]
        if road_id:
            results = [a for a in results if a["road_id"] == road_id]
        if classification:
            results = [a for a in results if a["classification"] == classification]
        if repair_method:
            results = [a for a in results if a["repair_method"] == repair_method]
        if min_score > 0.0:
            results = [a for a in results if a["anomaly_score"] >= min_score]

        return results[:limit]

    def get_anomaly_for_work_order(self, work_order_id: str) -> Optional[Dict[str, Any]]:
        return self._anomaly_by_id.get(work_order_id)

    def get_comparable_peers(self, work_order_id: str) -> List[Dict[str, Any]]:
        rec = self._anomaly_by_id.get(work_order_id)
        if rec:
            return rec.get("comparable_peers", [])
        return []

    def get_road_anomaly_summary(self, road_id: str) -> Dict[str, Any]:
        """Provides ML anomaly statistics for a specific road asset."""
        road_anomalies = [a for a in (self._cached_anomalies or []) if a["road_id"] == road_id]
        high_pri = sum(1 for a in road_anomalies if a["classification"] == "High-priority investigation candidate")
        unusual = sum(1 for a in road_anomalies if a["classification"] == "Unusual pattern")
        normal = sum(1 for a in road_anomalies if a["classification"] == "Normal pattern")

        return {
            "total_work_orders_evaluated": len(road_anomalies),
            "high_priority_candidates": high_pri,
            "unusual_patterns": unusual,
            "normal_patterns": normal,
            "anomalies": road_anomalies[:5]
        }
