from typing import List, Dict, Any, Optional
from rupeetrace.services.relationship_service import RelationshipService
from rupeetrace.models.entities import WorkOrder, Ward, RoadAsset, Contractor, RateCard

class MoneyTrailService:
    def __init__(self, rel_service: RelationshipService):
        self.rel_service = rel_service

    def get_ward_money_trail(self, ward_code: str) -> Optional[Dict[str, Any]]:
        """
        Engine 1: Ward-level financial money trail.
        Reconciles ward budget vs recorded work-order expenditure with drill-downs.
        """
        ward = self.rel_service.get_ward(ward_code)
        if not ward:
            return None

        w_orders = self.rel_service.get_ward_work_orders(ward.ward_code)
        
        # Calculations
        budget = ward.monsoon_repair_budget_inr_2025
        total_expenditure = round(sum(wo.cost_inr for wo in w_orders), 2)
        remaining_budget = round(budget - total_expenditure, 2)
        utilization_pct = round((total_expenditure / budget) * 100.0, 2) if budget > 0 else 0.0

        contractors_active = {wo.contractor_id for wo in w_orders}
        reopened_wos = [wo for wo in w_orders if wo.reopened_within_30d]
        reopened_expenditure = round(sum(wo.cost_inr for wo in reopened_wos), 2)
        reopened_rate_pct = round((len(reopened_wos) / len(w_orders)) * 100.0, 2) if w_orders else 0.0

        dlp_breach_wos = [wo for wo in w_orders if wo.is_dlp_breach]
        dlp_breach_expenditure = round(sum(wo.cost_inr for wo in dlp_breach_wos), 2)

        # Contractor expenditure breakdown
        contractor_map: Dict[str, Dict[str, Any]] = {}
        for wo in w_orders:
            cid = wo.contractor_id
            if cid not in contractor_map:
                contractor_map[cid] = {
                    "contractor_id": cid,
                    "contractor_name": wo.contractor_name,
                    "total_recorded_billed_cost_inr": 0.0,
                    "work_order_count": 0,
                    "reopened_jobs_count": 0,
                    "reopened_expenditure_inr": 0.0,
                    "methods_used": {},
                    "work_order_ids": []
                }
            contractor_map[cid]["total_recorded_billed_cost_inr"] += wo.cost_inr
            contractor_map[cid]["work_order_count"] += 1
            contractor_map[cid]["work_order_ids"].append(wo.work_order_id)
            contractor_map[cid]["methods_used"][wo.repair_method] = (
                contractor_map[cid]["methods_used"].get(wo.repair_method, 0) + 1
            )
            if wo.reopened_within_30d:
                contractor_map[cid]["reopened_jobs_count"] += 1
                contractor_map[cid]["reopened_expenditure_inr"] += wo.cost_inr

        contractors_breakdown = []
        for cdata in contractor_map.values():
            cnt = cdata["work_order_count"]
            tot = cdata["total_recorded_billed_cost_inr"]
            contractors_breakdown.append({
                "contractor_id": cdata["contractor_id"],
                "contractor_name": cdata["contractor_name"],
                "total_recorded_billed_cost_inr": round(tot, 2),
                "work_order_count": cnt,
                "average_job_cost_inr": round(tot / cnt, 2) if cnt > 0 else 0.0,
                "repair_methods_used": cdata["methods_used"],
                "reopened_jobs_count": cdata["reopened_jobs_count"],
                "reopened_expenditure_inr": round(cdata["reopened_expenditure_inr"], 2),
                "work_order_ids": cdata["work_order_ids"]
            })
        contractors_breakdown.sort(key=lambda x: x["total_recorded_billed_cost_inr"], reverse=True)

        # Repair method expenditure breakdown
        method_map: Dict[str, Dict[str, Any]] = {}
        for wo in w_orders:
            m = wo.repair_method
            if m not in method_map:
                rc = self.rel_service.rate_card_by_method.get(m)
                method_map[m] = {
                    "repair_method": m,
                    "unit": rc.unit if rc else "unknown",
                    "standard_rate_inr": rc.standard_rate_inr if rc else None,
                    "total_recorded_billed_cost_inr": 0.0,
                    "work_order_count": 0,
                    "total_area_sqm": 0.0,
                    "work_order_ids": []
                }
            method_map[m]["total_recorded_billed_cost_inr"] += wo.cost_inr
            method_map[m]["work_order_count"] += 1
            method_map[m]["total_area_sqm"] += wo.area_sqm
            method_map[m]["work_order_ids"].append(wo.work_order_id)

        methods_breakdown = []
        for mdata in method_map.values():
            cnt = mdata["work_order_count"]
            tot = mdata["total_recorded_billed_cost_inr"]
            area = mdata["total_area_sqm"]
            methods_breakdown.append({
                "repair_method": mdata["repair_method"],
                "unit": mdata["unit"],
                "standard_rate_inr": mdata["standard_rate_inr"],
                "total_recorded_billed_cost_inr": round(tot, 2),
                "work_order_count": cnt,
                "average_job_cost_inr": round(tot / cnt, 2) if cnt > 0 else 0.0,
                "average_job_size_sqm": round(area / cnt, 2) if cnt > 0 and mdata["unit"] == "per sqm" else None,
                "work_order_ids": mdata["work_order_ids"]
            })
        methods_breakdown.sort(key=lambda x: x["total_recorded_billed_cost_inr"], reverse=True)

        # Road expenditure breakdown
        road_map: Dict[str, Dict[str, Any]] = {}
        for wo in w_orders:
            rid = wo.road_id
            if rid not in road_map:
                road_obj = self.rel_service.get_road(rid)
                road_map[rid] = {
                    "road_id": rid,
                    "road_name": road_obj.road_name if road_obj else "Unknown",
                    "under_dlp": road_obj.under_dlp if road_obj else False,
                    "surface": road_obj.surface if road_obj else "Unknown",
                    "total_recorded_expenditure_inr": 0.0,
                    "work_order_count": 0,
                    "reopened_jobs_count": 0,
                    "work_order_ids": []
                }
            road_map[rid]["total_recorded_expenditure_inr"] += wo.cost_inr
            road_map[rid]["work_order_count"] += 1
            road_map[rid]["work_order_ids"].append(wo.work_order_id)
            if wo.reopened_within_30d:
                road_map[rid]["reopened_jobs_count"] += 1

        roads_breakdown = []
        for rdata in road_map.values():
            cnt = rdata["work_order_count"]
            tot = rdata["total_recorded_expenditure_inr"]
            roads_breakdown.append({
                "road_id": rdata["road_id"],
                "road_name": rdata["road_name"],
                "under_dlp": rdata["under_dlp"],
                "surface": rdata["surface"],
                "total_recorded_expenditure_inr": round(tot, 2),
                "work_order_count": cnt,
                "reopened_jobs_count": rdata["reopened_jobs_count"],
                "repeat_repair_indicator": cnt > 1,
                "work_order_ids": rdata["work_order_ids"]
            })
        roads_breakdown.sort(key=lambda x: x["total_recorded_expenditure_inr"], reverse=True)

        return {
            "ward_code": ward.ward_code,
            "ward_name": ward.ward_name,
            "monsoon_repair_budget_inr_2025": budget,
            "total_recorded_work_order_expenditure_inr": total_expenditure,
            "remaining_budget_estimate_inr": remaining_budget,
            "budget_utilization_pct": utilization_pct,
            "total_work_orders": len(w_orders),
            "contractors_count": len(contractors_active),
            "reopened_jobs_count": len(reopened_wos),
            "reopened_expenditure_inr": reopened_expenditure,
            "reopened_rate_pct": reopened_rate_pct,
            "dlp_breach_jobs_count": len(dlp_breach_wos),
            "dlp_breach_expenditure_inr": dlp_breach_expenditure,
            "underlying_work_order_ids": [wo.work_order_id for wo in w_orders],
            "contractor_expenditure": contractors_breakdown,
            "repair_method_expenditure": methods_breakdown,
            "road_expenditure": roads_breakdown,
            "provenance": ward.provenance
        }

    def get_road_financial_history(self, road_id: str) -> Optional[Dict[str, Any]]:
        """
        Engine 1: Road-level financial history and repeat repair analysis.
        """
        road = self.rel_service.get_road(road_id)
        if not road:
            return None

        w_orders = self.rel_service.get_road_work_orders(road.road_id)
        # Sort chronologically by assigned_at / completed_at
        sorted_wos = sorted(w_orders, key=lambda wo: wo.assigned_at)

        total_expenditure = round(sum(wo.cost_inr for wo in sorted_wos), 2)
        reopened_count = sum(1 for wo in sorted_wos if wo.reopened_within_30d)
        dlp_breach_spend = round(sum(wo.cost_inr for wo in sorted_wos if wo.is_dlp_breach), 2)

        # Build chronological repair event log with full financial audit context
        history = []
        for wo in sorted_wos:
            history.append({
                "work_order_id": wo.work_order_id,
                "assigned_at": wo.assigned_at,
                "completed_at": wo.completed_at,
                "contractor_id": wo.contractor_id,
                "contractor_name": wo.contractor_name,
                "work_type": wo.work_type,
                "repair_method": wo.repair_method,
                "area_sqm": wo.area_sqm,
                "recorded_billed_cost_inr": wo.cost_inr,
                "expected_cost_inr": wo.expected_cost_inr,
                "cost_variance_pct": wo.cost_variance_pct,
                "is_overbilled": wo.is_overbilled,
                "is_dlp_breach": wo.is_dlp_breach,
                "sla_hours": wo.sla_hours,
                "sla_met": wo.sla_met,
                "reopened_within_30d": wo.reopened_within_30d,
                "linked_complaint_ids": wo.linked_complaint_ids,
                "engineer_remark": wo.engineer_remark
            })

        return {
            "road_id": road.road_id,
            "road_name": road.road_name,
            "ward_code": road.ward_code,
            "road_type": road.road_type,
            "surface": road.surface,
            "length_m": road.length_m,
            "under_dlp": road.under_dlp,
            "last_resurfaced": road.last_resurfaced,
            "total_recorded_expenditure_inr": total_expenditure,
            "total_work_orders": len(sorted_wos),
            "reopened_jobs_count": reopened_count,
            "repeat_repair_count": len(sorted_wos) if len(sorted_wos) > 1 else 0,
            "dlp_breach_recorded_spend_inr": dlp_breach_spend,
            "repair_history": history,
            "provenance": road.provenance
        }
